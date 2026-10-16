import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,utimesSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {cleanName,startPlan,ago,wantsStartScreen,fetchSaves,DEFAULT_NAME,classView,pick,readChoice,saveChoice,endedNote,forgetSave,deathCard,fetchScores,scoreTable,installScoreboard,NO_SCORES} from './start-screen.js';
import {listSaves,cleanPlayerName} from './engine/server.js';

test('the name is cleaned exactly as the engine launcher cleans it',()=>{
  for(const raw of ['Dean',"  Mary Jane O'Neil  ",'Mary-Jane','a,b;c','-x','---','','x'.repeat(100),'Ünïcode'])assert.equal(cleanName(raw),cleanPlayerName(raw),JSON.stringify(raw));
  assert.equal(cleanName(undefined),DEFAULT_NAME);assert.equal(DEFAULT_NAME,'Adventurer');
});

test('the button resumes a saved character and begins a new one',()=>{
  const now=Date.now(),saves=[{name:'Dean',savedAt:now-5*60e3},{name:'Mary_Jane',savedAt:now-3*3600e3}];
  assert.equal(startPlan('Dean',saves).label,'Continue as Dean');
  assert.match(startPlan('Dean',saves).note,/^Saved 5 min ago/);
  assert.equal(startPlan('Mary Jane',saves).label,'Continue as Mary Jane','a space is saved as an underscore');
  assert.equal(startPlan('dean',saves).resume,null,'save files are case sensitive');
  assert.equal(startPlan('Frodo',saves).label,'Begin as Frodo');
  assert.equal(startPlan('',saves).label,`Begin as ${DEFAULT_NAME}`);
});

test('times read plainly',()=>{
  const now=1e12;
  assert.equal(ago(now-20e3,now),'just now');
  assert.equal(ago(now-90e3,now),'2 min ago');
  assert.equal(ago(now-5*3600e3,now),'5 h ago');
  assert.equal(ago(now-86400e3,now),'1 day ago');
  assert.equal(ago(now-4*86400e3,now),'4 days ago');
  assert.match(ago(now-30*86400e3,now),/[A-Z][a-z]{2} \d+/);
  assert.equal(ago(now+5000,now),'just now','a clock a little ahead never shows a negative time');
});

test('?demo skips the start screen',()=>{
  assert.equal(wantsStartScreen(''),true);
  assert.equal(wantsStartScreen('?debug'),true);
  assert.equal(wantsStartScreen('?demo'),false);
  assert.equal(wantsStartScreen('?stats&demo'),false);
});

test('a server without saves, or one that errors, just shows no saved characters',async()=>{
  assert.deepEqual(await fetchSaves(async()=>({ok:false})),[]);
  assert.deepEqual(await fetchSaves(async()=>{throw new Error('offline');}),[]);
  assert.deepEqual(await fetchSaves(async()=>({ok:true,json:async()=>({nope:1})})),[]);
  assert.deepEqual(await fetchSaves(async()=>({ok:true,json:async()=>({saves:[{name:'A',savedAt:1}]})})),[{name:'A',savedAt:1}]);
});

test('saved characters are read from the save folder, newest first, ignoring level files and strangers',()=>{
  const dir=mkdtempSync(join(tmpdir(),'dh-saves-')),at=(f,t)=>{writeFileSync(join(dir,f),'x');utimesSync(join(dir,f),t,t);};
  at('1000Old.bz2',1000);at('1000New.bz2',3000);at('1000Mary_Jane.bz2',2000);
  at('1000New.0',9000);                 // a level snapshot of a game in progress
  at('0Other.bz2',9000);                // a different user's save
  at('1000.bz2',9000);at('1000-bad.bz2',9000);at("1000"+'x'.repeat(40)+'.bz2',9000);
  assert.deepEqual(listSaves(dir,1000).map(s=>s.name),['New','Mary_Jane','Old']);
  assert.deepEqual(listSaves(join(dir,'missing'),1000),[]);
});

test('the class screen offers only valid options and keeps the character valid as parts change',()=>{
  const v=classView({role:'Valkyrie'});
  assert.deepEqual(v.genders.map(g=>g.label),['Female'],'Valkyries are women');
  assert.deepEqual(v.races.map(r=>r.id),['human','dwarf']);
  assert.match(v.blurb,/long sword/);
  // choosing an elf Wizard fixes the alignment to chaotic, the only one an elf can be
  let c=pick({role:'Wizard',race:'human',gender:'male',align:'neutral'},'race','elf');
  assert.deepEqual(c,{role:'Wizard',race:'elf',gender:'male',align:'chaotic'});
  // switching the class corrects what no longer fits: a Knight is a lawful human
  c=pick(c,'role','Knight');
  assert.deepEqual(c,{role:'Knight',race:'human',gender:'male',align:'lawful'});
  assert.deepEqual(classView(c).aligns.map(a=>a.id),['lawful']);
  assert.equal(classView(c).aligns[0].on,true);
  c=pick(c,'role','Valkyrie');
  assert.equal(c.gender,'female');
});

test('the last class chosen is remembered, and nonsense in storage falls back to the Valkyrie',()=>{
  const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
  assert.equal(readChoice(storage).role,'Valkyrie');
  saveChoice({role:'Wizard',race:'elf',gender:'female',align:'chaotic'},storage);
  assert.deepEqual(readChoice(storage),{role:'Wizard',race:'elf',gender:'female',align:'chaotic'});
  store.set('deanhack.class','{"role":"Wizard","race":"dwarf"}');
  assert.equal(readChoice(storage).race,'human','an impossible race is corrected');
  store.set('deanhack.class','not json');
  assert.equal(readChoice(storage).role,'Valkyrie');
});

test('the splash says what happened when a game ends',()=>{
  assert.equal(endedNote('exit',null),'Saved.');
  assert.equal(endedNote(undefined,null),'Saved.','an older server sends no reason');
  assert.equal(endedNote('idle',null),'Your game was saved after 20 minutes idle.');
  assert.match(endedNote('shutdown',null),/server restarted/);
  assert.match(endedNote('crash',null),/stopped unexpectedly/);
  assert.equal(endedNote('exit','killed by a jackal'),'You died: killed by a jackal.','death wins over the reason');
});

test('forgetting a character sends its name with the session token and reports a refusal',async()=>{
  const calls=[];
  const fetchImpl=async(url,init)=>{calls.push({url,init});if(url==='/engine/token')return {json:async()=>({token:'t0k'})};return {ok:true,json:async()=>({ok:true,removed:2})};};
  assert.deepEqual(await forgetSave('Mira',fetchImpl),{ok:true,removed:2});
  assert.equal(calls[1].url,'/engine/forget');assert.equal(calls[1].init.headers['X-Engine-Token'],'t0k');assert.equal(JSON.parse(calls[1].init.body).name,'Mira');
  const refusing=async(url)=>url==='/engine/token'?{json:async()=>({token:'t'})}:{ok:false,json:async()=>({error:'That character is playing right now. Save and quit first.'})};
  await assert.rejects(forgetSave('Mira',refusing),/playing right now/);
});

test('the player flow has no demo-room toggle, no name box, and comes back to the splash',()=>{
  const live=readFileSync(new URL('./live.js',import.meta.url),'utf8'),screen=readFileSync(new URL('./start-screen.js',import.meta.url),'utf8');
  assert.match(live,/startScreen=installStartScreen\(/);
  assert.match(live,/if\(startScreen\)\{nameInput\.hidden=true;button\.hidden=true;\}/,'the footer hides the Live/Demo toggle and the name box');
  assert.match(live,/endedNote\(v\.reason,death\?\.killer\)/,'a session end reopens the splash with a note');
  assert.match(live,/Save & quit/);
  assert.doesNotMatch(screen,/start-demo|Look around/,'no demo-room link on the splash');
  assert.match(screen,/start-new/);assert.match(screen,/start-forget/);
});

test('the tombstone card says who, what and where, in the game\'s words, with nothing unescaped',()=>{
  const html=deathCard({name:'Mira',killer:'killed by a jackal',depth:2,dungeon:'The Dungeons of Doom'});
  assert.match(html,/REST IN PEACE/);assert.match(html,/<b>Mira<\/b>/);assert.match(html,/killed by a jackal on level 2 of The Dungeons of Doom/);
  assert.equal(deathCard(null),'');assert.equal(deathCard({name:'X'}),'','no cause, no card');
  assert.match(deathCard({name:'<b>x</b>',killer:'killed by a "jackal"',depth:1}),/&lt;b&gt;x&lt;\/b&gt;.*killed by a &quot;jackal&quot; on level 1</);
  assert.doesNotMatch(deathCard({name:'A',killer:'quit'}),/level/,'no depth, no where');
  assert.match(deathCard({name:'Mira',killer:'died of starvation',depth:3}),/<i>Ate well\. Slept badly\. Died quickly\.<\/i>/,'an epitaph under the cause');
});

test('the live game wires the link watch and the tombstone into the splash',()=>{
  const live=readFileSync(new URL('./live.js',import.meta.url),'utf8');
  assert.match(live,/createLinkWatch\(\{onLost:/);
  assert.match(live,/es\.onerror=\(\)=>\{[^}]*link\.lost\(\)/,'a stream error starts the grace period');
  assert.match(live,/es\.onopen=async\(\)=>/,'a reopened stream checks the session token');
  assert.match(live,/if\(seq<since\)\{link\.restart\(\);/,'polling notices a server restart');
  assert.match(live,/startScreen\.open\(\{note,death\}\)/,'the tombstone reaches the splash');
  assert.match(live,/id='link-banner'/);
});

test('the splash draws one of three dragon heads at random, uncredited, out of the way of screen readers',async()=>{
  const {DRAGONS,pickDragon,deriveHead}=await import('./dragon-art.js');
  assert.equal(DRAGONS.length,3);
  for(const d of DRAGONS){
    const lines=d.art.split('\n');
    assert.ok(lines.every(l=>l.length<=84),`${d.name} fits beside the card`);
    assert.ok(lines.length>=40&&lines.length<=60,`${d.name} is splash sized`);
    assert.doesNotMatch(d.art,/[<>&]/,`${d.name}: nothing that innerHTML would misread`);
    assert.equal(d.credit,undefined,`${d.name}: no credit line`);
  }
  assert.ok(!DRAGONS.some(d=>/Tua Xiong/.test(d.name+d.art)),'the Tua Xiong dragon is gone');
  // the third head is derived from the red one: mirrored, one tone darker
  const red=DRAGONS.find(d=>d.name==='red'),shadow=DRAGONS.find(d=>d.name==='shadow');
  assert.equal(shadow.art,deriveHead(red.art));
  assert.equal(shadow.art.split('\n').length,red.art.split('\n').length);
  assert.notEqual(shadow.art,red.art);
  assert.equal(pickDragon(()=>0),DRAGONS[0]);assert.equal(pickDragon(()=>.999),DRAGONS[2]);assert.equal(pickDragon(()=>1),DRAGONS[2]);
  const src=readFileSync(new URL('./start-screen.js',import.meta.url),'utf8');
  assert.match(src,/<pre class="start-dragon" aria-hidden="true"><\/pre>/);
  assert.doesNotMatch(src,/Dragon by|start-credit/);
  assert.match(src,/doc.body.classList.add\('start-open'\);showDragon\(\);/,'a fresh dragon each time the splash opens');
  const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
  assert.match(css,/@media\(max-width:760px\),\(max-height:400px\)\{\.start-dragon\{display:none\}\}/,'only really small screens keep the card alone');
  assert.match(css,/\.start-dragon\{[^}]*align-self:flex-start;font:max\(4\.5px,min\(12px,[^}]*var\(--cols,84\)[^}]*var\(--lines,58\)/,'each dragon is sized to its own art to fill the space, held centred in the window');
  assert.match(src,/dragon\.style\.setProperty\('--lines',lines\.length\)/);
  assert.match(src,/const placeDragon=\(\)=>/,'the dragon is centred in the window, not against the card');
});

test('the card says An UnNetHack Fork, with a small DeanHack wordmark bottom right and no tagline',()=>{
  const src=readFileSync(new URL('./start-screen.js',import.meta.url),'utf8');
  assert.match(src,/<h1>An <a class="start-link" href="https:\/\/github\.com\/UnNetHack\/UnNetHack"[^>]*>UnNetHack<\/a> Fork<\/h1>/);
  assert.match(src,/class="start-mark"><a class="start-link" href="https:\/\/github\.com\/dean451\/deanhack"[^>]*>DEAN<b>HACK<\/b><\/a>/);
  assert.doesNotMatch(src,/A little light/);
  const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
  assert.match(css,/\.start-mark\{position:absolute;right:28px;bottom:22px/);
  assert.match(css,/a\.start-link\{color:inherit;text-decoration:none/);

});

test('the splash is on screen before the app loads: a static cover with the dragon, adopted by the start screen',()=>{
  const html=readFileSync(new URL('./index.html',import.meta.url),'utf8'),css=readFileSync(new URL('./style.css',import.meta.url),'utf8'),screen=readFileSync(new URL('./start-screen.js',import.meta.url),'utf8');
  assert.ok(html.indexOf('id="start-cover"')<html.indexOf('<script type="module" src="/main.js">'),'the cover is in the HTML before the app script');
  assert.ok(html.indexOf('src="/start-cover.js"')<html.indexOf('src="/main.js"'),'the cover script loads before the app');
  assert.match(css,/#start-screen,#start-cover\{position:fixed;inset:0/);
  assert.match(css,/#start-cover\{z-index:61;background:#030609\}/,'opaque: no demo room shows through');
  assert.match(screen,/replaceWith\(coverDragon\)/,'the start screen adopts the cover\'s dragon element');
  assert.match(screen,/cover\?\.remove\(\)/);
});

test('the splash is opaque with a wavy ASCII field behind it, running only while it shows; nothing draws behind it',async()=>{
  const src=readFileSync(new URL('./start-screen.js',import.meta.url),'utf8'),css=readFileSync(new URL('./style.css',import.meta.url),'utf8'),main=readFileSync(new URL('./main.js',import.meta.url),'utf8');
  assert.match(src,/const waves=createAsciiWaves\(\{doc\}\);el\.prepend\(waves\.el\);/,'the field sits under everything in the splash');
  assert.match(src,/showDragon\(\);waves\.start\(\);/,'it runs when the splash opens');
  assert.match(src,/doc\.body\.classList\.remove\('start-open'\);waves\.stop\(\);/,'and stops when it closes');
  assert.match(css,/#start-screen,#start-cover\{[^}]*background:radial-gradient\(ellipse at 50% 42%,#050a0c 0%,#030609 62%,#020405 100%\)/,'no alpha: the demo room never shows through');
  assert.match(css,/\.start-waves\{position:absolute;inset:0;[^}]*pointer-events:none;[^}]*z-index:0\}/);
  assert.match(css,/\.start-stage\{position:relative;z-index:1;/,'the dragon and card sit above the field');
  assert.match(main,/if\(document\.body\.classList\.contains\('start-open'\)\)return;/,'the scene does not draw while the splash is open');
  // the cover gets one still frame of the field when it has a window to size it by
  const {fillCover}=await import('./start-cover.js');
  const pre={textContent:'',dataset:{},style:{vars:{},setProperty(k,v){this.vars[k]=v;}},getBoundingClientRect:()=>({height:100}),parentElement:{}};
  const made=[];const cover={children:[],prepend(e){this.children.unshift(e);},ownerDocument:{createElement(){const e={className:'',textContent:'',attrs:{},setAttribute(k,v){this.attrs[k]=v;}};made.push(e);return e;}},remove(){},querySelector:s=>s==='.start-dragon'?pre:null};
  fillCover(cover,{rand:()=>0,win:{innerWidth:780,innerHeight:300,getComputedStyle:()=>({paddingTop:'0'})}});
  assert.equal(cover.children.length,1);assert.equal(cover.children[0].className,'start-waves');assert.equal(cover.children[0].attrs['aria-hidden'],'true');
  assert.equal(cover.children[0].textContent.split('\n').length,21);
});

test('the cover picks a head, sizes it, and goes away for ?demo',async()=>{
  const {fillCover}=await import('./start-cover.js');
  const mk=()=>{const pre={textContent:'',dataset:{},style:{vars:{},setProperty(k,v){this.vars[k]=v;}}};const cover={removed:false,remove(){this.removed=true;},querySelector:s=>s==='.start-dragon'?pre:null};return {cover,pre};};
  let {cover,pre}=mk();const d=fillCover(cover,{rand:()=>0});
  assert.equal(d.name,'red');assert.equal(pre.dataset.dragon,'red');assert.ok(pre.textContent.length>1000);
  assert.equal(pre.style.vars['--lines'],pre.textContent.split('\n').length);
  ({cover,pre}=mk());assert.equal(fillCover(cover,{search:'?demo'}),null);assert.equal(cover.removed,true);
  assert.equal(fillCover(null),null);
});

test('a guest login is told its saves live with this browser',async()=>{
  const {fetchSaves,GUEST_NOTE}=await import('./start-screen.js');
  const saves=await fetchSaves(async()=>({ok:true,json:async()=>({saves:[{name:'Bo',savedAt:1}],guest:true})}));
  assert.equal(saves.length,1);assert.equal(saves.guest,true);
  const named=await fetchSaves(async()=>({ok:true,json:async()=>({saves:[]})}));
  assert.equal(named.guest,undefined,'a named login gets a plain list');
  assert.match(GUEST_NOTE,/stay with this browser/);
  const src=readFileSync(new URL('./start-screen.js',import.meta.url),'utf8');
  assert.match(src,/saves\.guest&&!guestNote/,'the note is added once for a guest');
  assert.match(src,/box\.hidden=!saves\.length&&!saves\.guest;/,'a guest with no saves yet still sees the note');
});

test('the leaderboard is fetched from the server, and a server without one just has no finished games',async()=>{
  assert.deepEqual(await fetchScores(async()=>({ok:false})),[]);
  assert.deepEqual(await fetchScores(async()=>{throw new Error('offline');}),[]);
  assert.deepEqual(await fetchScores(async()=>({ok:true,json:async()=>({nope:1})})),[]);
  const calls=[];
  assert.deepEqual(await fetchScores(async(url)=>{calls.push(url);return {ok:true,json:async()=>({scores:[{name:'Mira',points:700}]})};}),[{name:'Mira',points:700}]);
  assert.deepEqual(calls,['/engine/scores']);
});

test('the leaderboard table ranks the games with points, name, cause of death, depth and turns, nothing unescaped',()=>{
  const html=scoreTable([
    {name:'Mira',points:12340,death:'killed by a soldier ant',deathlev:4,maxlvl:5,turns:2310,role:'Val',race:'Hum',when:'2026-10-12'},
    {name:'<b>x</b>',points:88,death:'killed by a "newt"',deathlev:1,maxlvl:1,turns:null,role:null,race:null,when:null},
  ]);
  assert.match(html,/^<table class="start-scores"><thead><tr><th class="rank">#<\/th><th class="num">Points<\/th><th class="who">Name<\/th><th class="how">Cause of death<\/th><th class="num">Depth<\/th><th class="num">Turns<\/th><\/tr><\/thead>/);
  assert.match(html,/<tr><td class="rank">1<\/td><td class="num">12,340<\/td><td class="who"><b>Mira<\/b><i>Human Valkyrie<\/i><\/td><td class="how">killed by a soldier ant<\/td><td class="num">4<\/td><td class="num">2,310<\/td><\/tr>/);
  assert.match(html,/<td class="rank">2<\/td><td class="num">88<\/td><td class="who"><b>&lt;b&gt;x&lt;\/b&gt;<\/b><\/td><td class="how">killed by a &quot;newt&quot;<\/td><td class="num">1<\/td><td class="num"><\/td>/,'no class note without a role; a missing turns count is blank, not null');
  assert.doesNotMatch(html,/<b>x<\/b>/);
  assert.match(scoreTable([{name:'A',points:1,role:'Wiz'}]),/<i>Wizard<\/i>/,'the class alone when the race is missing');
  assert.match(scoreTable([{name:'A',points:1,role:'Xyz',race:'Vam'}]),/<i>Vampire Xyz<\/i>/,'an unknown code is shown as it came');
  assert.equal(scoreTable([]),`<p class="start-empty">${NO_SCORES}</p>`);
  assert.equal(scoreTable(undefined),scoreTable([]));
  assert.equal(NO_SCORES,'No games finished on this server yet.');
});

test('the Leaderboard button fetches once on the first click, shows the table, and hides it again on the next',async()=>{
  const mk=()=>{const handlers={};return {hidden:true,innerHTML:'',disabled:false,attrs:{},setAttribute(k,v){this.attrs[k]=v;},addEventListener(t,f){handlers[t]=f;},click(){return handlers.click();}};};
  const button=mk(),table=mk();let fetches=0,scores=[{name:'Mira',points:700,death:'killed by a jackal',deathlev:2,turns:300}];
  const board=installScoreboard({button,table,getScores:async()=>{fetches++;return scores;}});
  assert.equal(table.hidden,true,'closed until asked');
  await button.click();
  assert.equal(fetches,1);assert.equal(table.hidden,false);assert.equal(button.attrs['aria-expanded'],'true');assert.equal(button.disabled,false);
  assert.match(table.innerHTML,/<b>Mira<\/b>/);assert.equal(board.shown,true);
  await button.click();
  assert.equal(table.hidden,true,'a second click hides it');assert.equal(button.attrs['aria-expanded'],'false');assert.equal(fetches,1);
  await button.click();
  assert.equal(fetches,1,'reopening does not fetch again');assert.equal(table.hidden,false);
  // the splash reopening (a game just ended) marks the board stale: an open board refreshes at once, a closed one on the next click
  scores=[...scores,{name:'Bo',points:40,death:'killed by a newt',deathlev:1,turns:90}];
  board.stale();await new Promise(r=>setImmediate(r));
  assert.equal(fetches,2);assert.match(table.innerHTML,/<b>Bo<\/b>/);
  await button.click();board.stale();assert.equal(fetches,2,'closed: nothing fetched until it is wanted');
  await button.click();assert.equal(fetches,3);
  const empty=mk(),emptyTable=mk();installScoreboard({button:empty,table:emptyTable,getScores:async()=>[]});
  await empty.click();assert.match(emptyTable.innerHTML,/No games finished on this server yet\./);
  // the splash puts the button at the bottom of the page with the table below it
  const src=readFileSync(new URL('./start-screen.js',import.meta.url),'utf8'),css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
  assert.match(src,/<\/div><div class="start-board"><button type="button" class="start-scores-toggle" aria-expanded="false" aria-controls="start-scores">Leaderboard<\/button><div id="start-scores" class="start-scores-box" hidden><\/div><\/div>`;/,'after the stage, under everything else');
  assert.match(src,/const board=installScoreboard\(\{button:\$\('\.start-scores-toggle'\),table:\$\('#start-scores'\),getScores\}\);/);
  assert.match(src,/stepName\.hidden=false;board\.stale\(\);/,'a reopened splash refreshes the board');
  assert.match(css,/#start-screen \.start-scores-box\[hidden\]\{display:none\}/);
});
