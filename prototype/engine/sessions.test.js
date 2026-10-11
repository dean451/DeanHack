import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {allocateUid,playerIdOf,createSession,FIRST_PLAYER_UID} from './server.js';
import {createApp} from './serve.js';

// A stand-in engine: records how it was launched and answers like the real one, without a build.
function fakeEngines(){
  const spawned=[];
  const spawnEngine=(binary,args,opts)=>{
    const child=new EventEmitter();
    child.stdout=Object.assign(new EventEmitter(),{setEncoding(){}});child.stderr=new EventEmitter();
    child.stdin={writes:[],ended:false,write(d){this.writes.push(d);},end(){if(this.ended)return;this.ended=true;setImmediate(()=>child.emit('close',0));}};
    child.say=obj=>child.stdout.emit('data',JSON.stringify(obj)+'\n');
    child.args=args;child.env=opts.env;spawned.push(child);
    return child;
  };
  return {spawned,spawnEngine};
}
// A folder shaped like a built engine, so the launcher's checks pass.
function fakeRoot(){
  const root=mkdtempSync(join(tmpdir(),'dh-engine-'));
  const prefix=join(root,'runtime'),cwd=join(prefix,'share'),home=join(prefix,'home');
  for(const d of [cwd,home,join(prefix,'var','unnethack','saves')])mkdirSync(d,{recursive:true});
  writeFileSync(join(prefix,'unnethack'),'');
  writeFileSync(join(root,'manifest.json'),JSON.stringify({binary:join(prefix,'unnethack'),prefix,cwd,home}));
  return root;
}

test('each player gets a stable four-digit number, kept in a file',()=>{
  const file=join(mkdtempSync(join(tmpdir(),'dh-players-')),'players.json');
  assert.equal(allocateUid(file,'alice'),FIRST_PLAYER_UID);
  assert.equal(allocateUid(file,'bob'),FIRST_PLAYER_UID+1);
  assert.equal(allocateUid(file,'alice'),FIRST_PLAYER_UID,'the same player keeps the same number');
  assert.equal(JSON.parse(readFileSync(file,'utf8')).players.bob,FIRST_PLAYER_UID+1,'and it is on disk for the next start');
  writeFileSync(file,'not json');
  assert.equal(allocateUid(file,'carol'),FIRST_PLAYER_UID,'a damaged file starts over rather than crashing');
  writeFileSync(file,JSON.stringify({next:10000,players:{}}));
  assert.throws(()=>allocateUid(file,'dave'),/No player numbers left/,'numbers stay four digits so save names split cleanly');
});

test('the player is the proxy login when trusted, one local player otherwise, and nobody if the login is missing',()=>{
  assert.equal(playerIdOf({},false),'local');
  assert.equal(playerIdOf({'x-player-id':'alice'},false),'local','without a proxy the header means nothing');
  assert.equal(playerIdOf({'x-player-id':'alice'},true),'alice');
  assert.equal(playerIdOf({'x-player-id':' Bob.Smith@x '},true),'Bob.Smith@x');
  for(const bad of [undefined,'','  ','../etc','a b','-x','x'.repeat(65),['a','b'],'a\nb'])assert.equal(playerIdOf({'x-player-id':bad},true),null,JSON.stringify(bad));
});

test('a session launches the engine with its own number, passes frames to the browser and saves on stop',async()=>{
  const {spawned,spawnEngine}=fakeEngines(),root=fakeRoot();
  const s=createSession({root,id:'alice',uid:2001,spawnEngine});
  assert.equal(s.running,false);
  s.start('Mary Jane');
  assert.equal(s.running,true);assert.equal(s.name,'Mary Jane');
  assert.equal(spawned.length,1);
  assert.equal(spawned[0].env.DEANHACK_UID,'2001');
  assert.equal(spawned[0].env.MAIL,'/dev/null','an engine with a made-up uid must not look up a passwd entry for mail');
  assert.ok(spawned[0].args.includes('Mary Jane'));
  s.start('Other');assert.equal(spawned.length,1,'starting twice does not launch a second engine');
  spawned[0].say({type:'frame',turn:1});spawned[0].say({type:'request',id:7,kind:'command'});spawned[0].say({type:'nonsense'});
  assert.deepEqual(s.poll(0).events.map(e=>e.type),['frame','request'],'unknown event types are dropped');
  assert.deepEqual(s.replay().map(e=>e.type),['frame','request'],'a stream that opens late catches up');
  s.input(JSON.stringify({id:7,value:46}));
  assert.deepEqual(spawned[0].stdin.writes,['46\n']);
  await s.stop();
  assert.equal(spawned[0].stdin.ended,true,'closing the engine input is how it is told to save');
  assert.equal(s.running,false);
  assert.equal(s.poll(0).events.at(-1).type,'ended');
});

test('a session with no number (local development) leaves the engine on its own uid',()=>{
  const {spawned,spawnEngine}=fakeEngines();
  createSession({root:fakeRoot(),id:'local',uid:null,spawnEngine}).start('Dean');
  assert.equal('DEANHACK_UID' in spawned[0].env,false);
});

async function call(port,path,{player,method='GET',token,body}={}){
  const headers={Host:'localhost:'+port};
  if(player)headers['x-player-id']=player;
  if(token)headers['x-engine-token']=token;
  const r=await fetch(`http://127.0.0.1:${port}${path}`,{method,headers:{...headers,...(body?{'content-type':'application/json'}:{})},body:body&&JSON.stringify(body)});
  return {status:r.status,json:await r.json().catch(()=>null)};
}

test('the server keeps players apart: own token, own engine, a cap, and no anonymous play',async()=>{
  const {spawned,spawnEngine}=fakeEngines(),root=fakeRoot();
  const app=createApp({dist:mkdtempSync(join(tmpdir(),'dh-dist-')),engine:{trustProxy:true,spawnEngine,root,maxEngines:2,idleMs:10*60e3}});
  await new Promise(r=>app.listen(0,'127.0.0.1',r));const {port}=app.address();
  try{
    assert.equal((await call(port,'/engine/token')).status,403,'a request that did not come through the login proxy is refused');
    const a=(await call(port,'/engine/token',{player:'alice'})).json.token,b=(await call(port,'/engine/token',{player:'bob'})).json.token;
    assert.notEqual(a,b);
    assert.equal((await call(port,'/engine/start',{player:'bob',method:'POST',token:a,body:{name:'Twin'}})).status,403,"alice's token does not work on bob's game");
    assert.equal((await call(port,'/engine/start',{player:'alice',method:'POST',token:a,body:{name:'Twin'}})).status,200);
    assert.equal((await call(port,'/engine/start',{player:'bob',method:'POST',token:b,body:{name:'Twin'}})).status,200);
    assert.equal(spawned.length,2);
    assert.deepEqual(spawned.map(c=>c.env.DEANHACK_UID),['2001','2002'],'the same character name for two players, two save namespaces');
    spawned[0].say({type:'message',text:"alice's secret"});
    assert.equal((await call(port,'/engine/poll?since=0',{player:'alice'})).json.events.length,1);
    assert.equal((await call(port,'/engine/poll?since=0',{player:'bob'})).json.events.length,0,"bob never sees alice's events");
    const c=(await call(port,'/engine/token',{player:'carol'})).json.token;
    const full=await call(port,'/engine/start',{player:'carol',method:'POST',token:c,body:{name:'Third'}});
    assert.equal(full.status,503);assert.match(full.json.error,/full/i);
    assert.equal(spawned.length,2,'a full server does not launch a third engine');
    assert.equal((await call(port,'/engine/start',{player:'alice',method:'POST',token:a,body:{name:'Twin'}})).status,200,'a player already in a game is never turned away');
  }finally{await app.stopEngine();app.closeAllConnections?.();await new Promise(r=>app.close(r));}
});

test('an engine nobody has talked to for a while is saved and stopped',async()=>{
  const {spawned,spawnEngine}=fakeEngines(),root=fakeRoot();
  const app=createApp({dist:mkdtempSync(join(tmpdir(),'dh-dist-')),engine:{trustProxy:true,spawnEngine,root,maxEngines:2,idleMs:60,sweepMs:20}});
  await new Promise(r=>app.listen(0,'127.0.0.1',r));const {port}=app.address();
  try{
    const t=(await call(port,'/engine/token',{player:'alice'})).json.token;
    await call(port,'/engine/start',{player:'alice',method:'POST',token:t,body:{name:'Idle'}});
    assert.equal(spawned[0].stdin.ended,false);
    for(let i=0;i<50&&!spawned[0].stdin.ended;i++)await new Promise(r=>setTimeout(r,20));
    assert.equal(spawned[0].stdin.ended,true,'the idle engine was told to save and exit');
  }finally{await app.stopEngine();app.closeAllConnections?.();await new Promise(r=>app.close(r));}
});
