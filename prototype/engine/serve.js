// Production server: the built client (dist/) plus the same /engine/* API the Vite dev server
// mounts. Run it with `node engine/serve.js` after `npm run build` and `npm run engine:build`.
//
//   PORT                    port to listen on (default 8080)
//   HOST                    address to bind (default 127.0.0.1; the Docker image sets 0.0.0.0)
//   DEANHACK_HOSTS          comma separated host names the engine API accepts, e.g. deanhack.online
//
// It speaks plain HTTP and has no login of its own: put a reverse proxy that does TLS and access
// control in front of it (deploy/Caddyfile). There is one engine and one character per server.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,extname,sep} from 'node:path';
import enginePlugin from './server.js';

const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.woff2':'font/woff2','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8','.map':'application/json'};

// The file a request path names inside `root`, or null if it escapes it.
export function staticPath(root,urlPath){
  let p;
  try{p=decodeURIComponent(urlPath);}catch{return null;}
  if(p.includes('\0'))return null;
  if(p.endsWith('/'))p+='index.html';
  const file=resolve(root,'.'+p);
  return file===root||file.startsWith(root+sep)?file:null;
}

export function createApp({dist=fileURLToPath(new URL('../dist/',import.meta.url))}={}){
  const root=resolve(dist);
  const server=createServer();
  const stack=[];
  // enginePlugin was written for Vite's connect middleware stack; give it the same two hooks.
  enginePlugin().configureServer({httpServer:server,middlewares:{use:fn=>stack.push(fn)}});
  stack.push(async(req,res,next)=>{
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
    const file=staticPath(root,req.url.split('?')[0]);
    let body;
    if(file)try{body=await readFile(file);}catch{}
    if(!body)return next();
    const type=MIME[extname(file).toLowerCase()]||'application/octet-stream';
    // Vite hashes everything under /assets, so those never change; the page itself must revalidate.
    const cache=file.startsWith(root+sep+'assets'+sep)?'public, max-age=31536000, immutable':'no-cache';
    res.writeHead(200,{'Content-Type':type,'Content-Length':body.length,'Cache-Control':cache,'X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:body);
  });
  server.on('request',(req,res)=>{
    let i=0;
    const next=()=>{
      const fn=stack[i++];
      if(!fn){res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');return;}
      Promise.resolve(fn(req,res,next)).catch(()=>{if(!res.headersSent)res.writeHead(500);res.end();});
    };
    next();
  });
  return server;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const port=Number(process.env.PORT)||8080,host=process.env.HOST||'127.0.0.1';
  createApp().listen(port,host,()=>console.log(`DeanHack listening on http://${host}:${port}`));
}
