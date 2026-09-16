import {defineConfig} from 'vite';
import enginePlugin from './engine/server.js';
// allowedHosts also covers a Cloudflare quick tunnel (*.trycloudflare.com), used to
// share a running local instance without deploying anywhere.
export default defineConfig({plugins:[enginePlugin()],server:{host:'127.0.0.1',allowedHosts:['.trycloudflare.com']}});
