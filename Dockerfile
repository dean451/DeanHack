# DeanHack: the built client, the UnNetHack engine and the production server in one image.
#   docker build -t deanhack .
#   docker run -p 8080:8080 -e DEANHACK_HOSTS=localhost -v deanhack-var:/app/prototype/.engine/runtime/var deanhack
# In production it runs behind Caddy; see deploy/DEPLOY.md and docker-compose.yml.

# Node comes from the official image so the build and runtime stages share one version.
FROM node:22-bookworm-slim AS node

FROM ubuntu:24.04 AS build
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential bison flex pkg-config python3 libncurses-dev liblua5.4-dev lua5.4 bsdextrautils ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=node /usr/local /usr/local
WORKDIR /app
COPY . .
RUN cd prototype && npm ci && npm run build
# The engine bakes its install prefix into the binary, so it is built where it will run (/app).
RUN cd prototype && USER=root npm run engine:build

FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends libncurses6 liblua5.4-0 ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /usr/sbin/nologin deanhack
COPY --from=node /usr/local/bin/node /usr/local/bin/node
WORKDIR /app/prototype
COPY --from=build /app/prototype/dist ./dist
COPY --from=build /app/prototype/engine ./engine
COPY --from=build /app/prototype/package.json ./package.json
# Only the built runtime and manifest: not the engine source tree or its build logs.
COPY --from=build /app/prototype/.engine/runtime ./.engine/runtime
COPY --from=build /app/prototype/.engine/manifest.json ./.engine/manifest.json
RUN chown -R deanhack:deanhack /app/prototype/.engine
USER deanhack
ENV USER=deanhack LOGNAME=deanhack HOST=0.0.0.0 PORT=8080
# Saves, bones and the high-score file live here: mount a volume to keep them across deploys.
VOLUME /app/prototype/.engine/runtime/var
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:8080/').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node","engine/serve.js"]
