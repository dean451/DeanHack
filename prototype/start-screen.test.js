import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,utimesSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {cleanName,startPlan,ago,wantsStartScreen,fetchSaves,DEFAULT_NAME,classView,pick,readChoice,saveChoice,endedNote,forgetSave,deathCard} from './start-screen.js';
import {listSaves,cleanPlayerName} from './engine/server.js';

test('the name is cleaned exactly as the engine launcher cleans it',()=>{
  for(const raw of ['Dean',"  Mary Jane O'Neil  ",'Mary-Jane','a,b;c','-x','---','','x'.repeat(100),'Ünïcode'])assert.equal(cleanName(raw),cleanPlayerName(raw),JSON.stringify(raw));
  assert.equal(cleanName(undefined),DEFAULT_NAME);
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
  assert.match(src,/<h1>An UnNetHack Fork<\/h1>/);
  assert.match(src,/class="start-mark"[^>]*>DEAN<b>HACK<\/b>/);
  assert.doesNotMatch(src,/A little light/);
  const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
  assert.match(css,/\.start-mark\{position:absolute;right:28px;bottom:22px/);
});
