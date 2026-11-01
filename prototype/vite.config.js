import {defineConfig} from 'vite';
import enginePlugin from './engine/server.js';
// allowedHosts also covers a Cloudflare quick tunnel (*.trycloudflare.com), used to
// share a running local instance without deploying anywhere.
// Document-Policy js-profiling lets slow-trace.js profile itself on the dev server, to catch a freeze on the
// player's machine.
export default defineConfig({plugins:[enginePlugin()],server:{host:'127.0.0.1',allowedHosts:['.trycloudflare.com'],headers:{'Document-Policy':'js-profiling'}}});
