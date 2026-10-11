import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ROLES,RACES,ROLE_NAMES,DEFAULT_CHOICE,alignsFor,optionsFor,resolveChoice} from './roles.js';
import {engineLaunch} from './engine/server.js';

// What the engine itself allows, read from src/role.c, so the table cannot drift from the game.
const source=readFileSync(new URL('../src/role.c',import.meta.url),'utf8');
const MASK=/((?:MH_[A-Z]+\s*\|?\s*)+)((?:ROLE_(?:MALE|FEMALE)\s*\|?\s*)+)((?:ROLE_(?:LAWFUL|NEUTRAL|CHAOTIC)\s*\|?\s*)+)/;
const words=(text,prefix)=>[...text.matchAll(new RegExp(prefix+'([A-Z]+)','g'))].map(m=>m[1].toLowerCase());
function parseTable(heading,names){
  const start=source.indexOf(heading),out={};
  for(const name of names){
    const at=source.indexOf(`{"${name}"`,start)>=0?source.indexOf(`{"${name}"`,start):source.indexOf(`{   "${name}"`,start);
    const m=MASK.exec(source.slice(at,at+3000));
    out[name]={races:words(m[1],'MH_'),genders:words(m[2],'ROLE_'),aligns:words(m[3],'ROLE_')};
  }
  return out;
}
const tidy=a=>[...a].sort();

test('the role table matches the engine source',()=>{
  const engine=parseTable('const struct Role roles[]',ROLE_NAMES);
  for(const name of ROLE_NAMES){
    assert.deepEqual(tidy(ROLES[name].races),tidy(engine[name].races),`${name} races`);
    assert.deepEqual(tidy(ROLES[name].genders),tidy(engine[name].genders),`${name} genders`);
    assert.deepEqual(tidy(ROLES[name].aligns),tidy(engine[name].aligns),`${name} alignments`);
  }
  assert.equal(ROLE_NAMES.length,14);
});

test('the race table matches the engine source',()=>{
  const engine=parseTable('const struct Race races[]',Object.keys(RACES));
  for(const race of Object.keys(RACES))assert.deepEqual(tidy(RACES[race].aligns),tidy(engine[race].aligns),`${race} alignments`);
});

test('every role has at least one valid character, and the default is one of them',()=>{
  for(const role of ROLE_NAMES){
    const {races,genders}=optionsFor(role);
    assert.ok(races.length&&genders.length,role);
    for(const race of races)assert.ok(alignsFor(role,race).length,`${role} ${race} has an alignment`);
    const c=resolveChoice({role});
    assert.equal(c.role,role);assert.ok(ROLES[role].races.includes(c.race));assert.ok(alignsFor(role,c.race).includes(c.align));assert.ok(ROLES[role].genders.includes(c.gender));
  }
  assert.deepEqual(resolveChoice(DEFAULT_CHOICE),DEFAULT_CHOICE);
  assert.deepEqual(resolveChoice(undefined),DEFAULT_CHOICE);
});

test('impossible or hostile choices become the nearest valid character',()=>{
  assert.deepEqual(resolveChoice({role:'Valkyrie',gender:'male'}),{role:'Valkyrie',race:'human',gender:'female',align:'lawful'},'Valkyries are women');
  assert.equal(resolveChoice({role:'Knight',align:'chaotic'}).align,'lawful');
  assert.deepEqual(resolveChoice({role:'Wizard',race:'elf',align:'lawful'}),{role:'Wizard',race:'elf',gender:'female',align:'chaotic'},'elves are chaotic');
  assert.equal(resolveChoice({role:'Tourist',race:'elf'}).race,'human');
  assert.equal(resolveChoice({role:'Valkyrie',race:'dwarf',align:'chaotic'}).align,'lawful');
  assert.equal(resolveChoice({role:'Archeologist',race:'dwarf'}).align,'lawful');
  for(const junk of [null,'Wizard',42,[],{role:'Wizard; rm -rf'},{role:'__proto__'},{role:'constructor',race:'toString'}])assert.deepEqual(resolveChoice(junk),DEFAULT_CHOICE,JSON.stringify(junk));
});

test('the engine is launched as the chosen character',()=>{
  const l=engineLaunch('Mira',{cwd:'/runtime'},{role:'Wizard',race:'elf',gender:'female',align:'chaotic'});
  assert.deepEqual(l.args.slice(l.args.indexOf('-p'),l.args.indexOf('-p')+4),['-p','Wizard','-r','elf']);
  assert.match(l.options,/name:Mira,role:Wizard,race:elf,gender:female,align:chaotic,/);
  assert.deepEqual(l.choice,{role:'Wizard',race:'elf',gender:'female',align:'chaotic'});
  assert.match(engineLaunch('Mira',{cwd:'/r'}).options,/role:Valkyrie,race:human,gender:female,align:lawful,/,'no choice still means the Valkyrie');
  const sneaky=engineLaunch('Mira',{cwd:'/r'},{role:'Wizard,pettype:dog',race:'elf -d /etc'});
  assert.equal(sneaky.args.filter(a=>a.startsWith('-')).length,4,'a choice can never add command-line options');
  assert.ok(!sneaky.options.includes('pettype:dog'));
});

test('the production image ships the shared roles file the server imports',()=>{
  const docker=readFileSync(new URL('../Dockerfile',import.meta.url),'utf8'),server=readFileSync(new URL('./engine/server.js',import.meta.url),'utf8');
  for(const [,file] of server.matchAll(/from '\.\.\/([\w.-]+\.js)'/g))assert.match(docker,new RegExp(`/app/prototype/${file.replace('.','\\.')} `),`the Dockerfile copies ${file}`);
});
