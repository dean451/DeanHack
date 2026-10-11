import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,utimesSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {cleanName,startPlan,ago,wantsStartScreen,fetchSaves,DEFAULT_NAME,classView,pick,readChoice,saveChoice} from './start-screen.js';
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
