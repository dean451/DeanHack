import test from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {staticPath,createApp} from './serve.js';
import {hostAllowed} from './server.js';

test('static paths cannot escape the dist folder',()=>{
  const root=resolve('/srv/dist');
  assert.equal(staticPath(root,'/'),join(root,'index.html'));
  assert.equal(staticPath(root,'/assets/a.js'),join(root,'assets','a.js'));
  assert.equal(staticPath(root,'/../etc/passwd'),null);
  assert.equal(staticPath(root,'/%2e%2e/etc/passwd'),null);
  assert.equal(staticPath(root,'/a%00b'),null);
  assert.equal(staticPath(root,'/%zz'),null);
});

test('the engine API answers local, tunnel and configured hosts only',()=>{
  assert.equal(hostAllowed('localhost:5173',''),true);
  assert.equal(hostAllowed('127.0.0.1:8080',''),true);
  assert.equal(hostAllowed('abc-def.trycloudflare.com',''),true);
  assert.equal(hostAllowed('deanhack.online',''),false);
  assert.equal(hostAllowed('deanhack.online','deanhack.online'),true);
  assert.equal(hostAllowed('DeanHack.Online','deanhack.online, www.deanhack.online'),true);
  assert.equal(hostAllowed('www.deanhack.online','deanhack.online, www.deanhack.online'),true);
  assert.equal(hostAllowed('evil.example','deanhack.online'),false);
  assert.equal(hostAllowed('deanhack.online.evil.example','deanhack.online'),false);
  assert.equal(hostAllowed(undefined,'deanhack.online'),false);
});

const get=(port,path,headers={})=>new Promise((ok,fail)=>{
  const req=request({host:'127.0.0.1',port,path,headers},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>ok({status:res.statusCode,headers:res.headers,body}));});
  req.on('error',fail);req.end();
});

test('the production server serves the client and guards the engine API',async()=>{
  const dist=mkdtempSync(join(tmpdir(),'dh-dist-'));
  mkdirSync(join(dist,'assets'));
  writeFileSync(join(dist,'index.html'),'<title>DeanHack</title>');
  writeFileSync(join(dist,'assets','a-1.js'),'1');
  process.env.DEANHACK_HOSTS='deanhack.online';
  const server=createApp({dist});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const {port}=server.address();
  try{
    const page=await get(port,'/');
    assert.equal(page.status,200);assert.match(page.body,/DeanHack/);assert.equal(page.headers['cache-control'],'no-cache');
    const asset=await get(port,'/assets/a-1.js');
    assert.match(asset.headers['cache-control'],/immutable/);
    assert.equal((await get(port,'/missing.js')).status,404);
    assert.equal((await get(port,'/../../etc/passwd')).status,404);
    // a real domain is allowed once configured, and anything else is refused
    const ok=await get(port,'/engine/token',{Host:'deanhack.online'});
    assert.equal(ok.status,200);assert.ok(JSON.parse(ok.body).token);
    assert.equal((await get(port,'/engine/token',{Host:'evil.example'})).status,403);
    // a cross-origin page cannot talk to the engine even on an allowed host
    assert.equal((await get(port,'/engine/token',{Host:'deanhack.online',Origin:'https://evil.example'})).status,403);
  }finally{server.closeAllConnections?.();await new Promise(r=>server.close(r));delete process.env.DEANHACK_HOSTS;}
});

test('stopping with no engine running returns at once',async()=>{
  const server=createApp({dist:mkdtempSync(join(tmpdir(),'dh-dist-'))});
  const t=Date.now();
  await server.stopEngine();
  assert.ok(Date.now()-t<1000);
});
