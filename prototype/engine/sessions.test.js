import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {allocateUid,playerIdOf,createSession,forgetCharacter,FIRST_PLAYER_UID} from './server.js';
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
  for(const d of [cwd,home,join(prefix,'var','unnethack','saves'),join(prefix,'var','unnethack','level')])mkdirSync(d,{recursive:true});
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

test('the class a character was started as is remembered, but a resumed save keeps its own',async()=>{
  const {spawned,spawnEngine}=fakeEngines(),root=fakeRoot();
  const saves=join(root,'runtime','var','unnethack','saves');
  writeFileSync(join(saves,'2001Old.bz2'),'x');                          // alice already has a save called Old
  const app=createApp({dist:mkdtempSync(join(tmpdir(),'dh-dist-')),engine:{trustProxy:true,spawnEngine,root}});
  await new Promise(r=>app.listen(0,'127.0.0.1',r));const {port}=app.address();
  try{
    const t=(await call(port,'/engine/token',{player:'alice'})).json.token;
    const started=await call(port,'/engine/start',{player:'alice',method:'POST',token:t,body:{name:'Mira',role:'Wizard',race:'elf',gender:'female',align:'lawful'}});
    assert.deepEqual(started.json.choice,{role:'Wizard',race:'elf',gender:'female',align:'chaotic'},'the answer says what was really started');
    assert.ok(spawned[0].args.includes('Wizard')&&spawned[0].args.includes('elf'));
    await app.stopEngine();
    writeFileSync(join(saves,'2001Mira.bz2'),'x');
    const list=(await call(port,'/engine/saves',{player:'alice'})).json.saves;
    assert.equal(list.find(s=>s.name==='Mira').role,'Wizard','the saved-characters list knows the class');
    // starting under a name that already has a save resumes it and records nothing new
    await call(port,'/engine/start',{player:'alice',method:'POST',token:t,body:{name:'Old',role:'Barbarian'}});
    assert.equal((await call(port,'/engine/saves',{player:'alice'})).json.saves.find(s=>s.name==='Old').role,undefined);
  }finally{await app.stopEngine();app.closeAllConnections?.();await new Promise(r=>app.close(r));}
});

test('an ended event says why: the idle sweep, a server shutdown, a normal exit or a crash',async()=>{
  const {spawned,spawnEngine}=fakeEngines(),root=fakeRoot();
  const last=s=>s.poll(0).events.filter(e=>e.type==='ended').at(-1);
  const a=createSession({root,id:'a',uid:2001,spawnEngine});a.start('A');await a.stop(100,'idle');assert.equal(last(a).reason,'idle');
  const b=createSession({root,id:'b',uid:2002,spawnEngine});b.start('B');await b.stop(100,'shutdown');assert.equal(last(b).reason,'shutdown');
  const c=createSession({root,id:'c',uid:2003,spawnEngine});c.start('C');spawned[2].emit('close',0);assert.equal(last(c).reason,'exit','the player quit or died: the engine exited on its own');
  const d=createSession({root,id:'d',uid:2004,spawnEngine});d.start('D');spawned[3].emit('close',1);assert.equal(last(d).reason,'crash');assert.equal(last(d).code,1);
  a.start('A again');spawned[4].emit('close',0);assert.equal(last(a).reason,'exit','a stop reason does not leak into the next game');
});

test('forgetting a character deletes its save, levels and class note, and only its own',()=>{
  const root=fakeRoot(),dir=join(root,'runtime','var','unnethack');
  for(const f of ['saves/2001Mira.bz2','level/2001Mira.0','level/2001Mira.3','saves/2002Mira.bz2','level/2001Mirabel.0','saves/2001Old.bz2'])writeFileSync(join(dir,f),'x');
  writeFileSync(join(dir,'characters.json'),JSON.stringify({'2001:Mira':{role:'Wizard'},'2001:Old':{role:'Knight'}}));
  assert.equal(forgetCharacter(dir,2001,'Mira'),3);
  assert.deepEqual(readdirSync(join(dir,'saves')).sort(),['2001Old.bz2','2002Mira.bz2'],"another player's Mira and alice's other character stay");
  assert.deepEqual(readdirSync(join(dir,'level')).sort(),['2001Mirabel.0'],'a longer name that starts the same is not touched');
  assert.deepEqual(JSON.parse(readFileSync(join(dir,'characters.json'),'utf8')),{'2001:Old':{role:'Knight'}});
  assert.equal(forgetCharacter(dir,2001,'Mira'),0,'forgetting twice is harmless');
});

test('the forget route is for the player\'s own saved characters, never one that is playing',async()=>{
  const {spawned,spawnEngine}=fakeEngines(),root=fakeRoot(),dir=join(root,'runtime','var','unnethack');
  writeFileSync(join(dir,'saves','2001Mira.bz2'),'x');writeFileSync(join(dir,'saves','2001Old.bz2'),'x');
  const app=createApp({dist:mkdtempSync(join(tmpdir(),'dh-dist-')),engine:{trustProxy:true,spawnEngine,root}});
  await new Promise(r=>app.listen(0,'127.0.0.1',r));const {port}=app.address();
  try{
    const t=(await call(port,'/engine/token',{player:'alice'})).json.token;
    assert.equal((await call(port,'/engine/forget',{player:'alice',method:'POST',body:{name:'Old'}})).status,403,'needs the session token');
    await call(port,'/engine/start',{player:'alice',method:'POST',token:t,body:{name:'Mira'}});
    const busy=await call(port,'/engine/forget',{player:'alice',method:'POST',token:t,body:{name:'Mira'}});
    assert.equal(busy.status,400);assert.match(busy.json.error,/playing right now/);
    const ok=await call(port,'/engine/forget',{player:'alice',method:'POST',token:t,body:{name:'Old'}});
    assert.deepEqual(ok.json,{ok:true,removed:1});
    assert.deepEqual(readdirSync(join(dir,'saves')),['2001Mira.bz2']);
    const other=(await call(port,'/engine/token',{player:'bob'})).json.token;
    assert.equal((await call(port,'/engine/forget',{player:'bob',method:'POST',token:other,body:{name:'Mira'}})).json.removed,0,"bob cannot delete alice's Mira");
  }finally{await app.stopEngine();app.closeAllConnections?.();await new Promise(r=>app.close(r));}
});

test('the operator gets one log line per session start, death and end, with no token in it',async()=>{
  const {spawned,spawnEngine}=fakeEngines(),root=fakeRoot(),lines=[];
  const app=createApp({dist:mkdtempSync(join(tmpdir(),'dh-dist-')),engine:{trustProxy:true,spawnEngine,root,maxEngines:1,idleMs:10*60e3,log:l=>lines.push(l)}});
  await new Promise(r=>app.listen(0,'127.0.0.1',r));const {port}=app.address();
  try{
    const a=(await call(port,'/engine/token',{player:'alice@example.com'})).json.token;
    assert.equal((await call(port,'/engine/start',{player:'alice@example.com',method:'POST',token:a,body:{name:'Mary Jane',role:'Wizard',race:'elf',gender:'female',align:'chaotic'}})).status,200);
    assert.equal(lines.length,1);
    assert.match(lines[0],/^deanhack session start player=alice@example\.com name="Mary Jane" role=Wizard race=elf gender=female align=chaotic resume=false running=1$/);
    const b=(await call(port,'/engine/token',{player:'bob'})).json.token;
    assert.equal((await call(port,'/engine/start',{player:'bob',method:'POST',token:b,body:{name:'Bob'}})).status,503);
    assert.match(lines[1],/^deanhack dungeon full player=bob running=1 max=1$/);
    spawned[0].say({type:'tombstone',name:'Mary_Jane',killer:'killed by a jackal, while helpless',depth:2,dungeon:'The Dungeons of Doom'});
    spawned[0].emit('close',0);
    await new Promise(r=>setTimeout(r,20));
    assert.match(lines[2],/^deanhack death player=alice@example\.com name=Mary_Jane killer="killed by a jackal, while helpless" depth=2 dungeon="The Dungeons of Doom"$/);
    assert.match(lines[3],/^deanhack session end player=alice@example\.com name="Mary Jane" reason=exit code=0 running=0$/);
    assert.ok(lines.every(l=>!l.includes(a)&&!l.includes(b)),'tokens never reach the log');
  }finally{await app.stopEngine();app.closeAllConnections?.();await new Promise(r=>app.close(r));}
});
