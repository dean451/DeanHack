import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCreature} from './creatures.js';

// monsym.h class constants, in the order the engine numbers them, with the glyph letter each one draws.
const CLASS_LETTER={S_ANT:'a',S_BLOB:'b',S_COCKATRICE:'c',S_DOG:'d',S_EYE:'e',S_FELINE:'f',S_GREMLIN:'g',S_HUMANOID:'h',S_IMP:'i',S_JELLY:'j',S_KOBOLD:'k',S_LEPRECHAUN:'l',S_MIMIC:'m',S_NYMPH:'n',S_ORC:'o',S_PIERCER:'p',S_QUADRUPED:'q',S_RODENT:'r',S_SPIDER:'s',S_TRAPPER:'t',S_UNICORN:'u',S_VORTEX:'v',S_WORM:'w',S_XAN:'x',S_LIGHT:'y',S_ZRUTY:'z',S_ANGEL:'A',S_BAT:'B',S_CENTAUR:'C',S_DRAGON:'D',S_ELEMENTAL:'E',S_FUNGUS:'F',S_GNOME:'G',S_GIANT:'H',S_JABBERWOCK:'J',S_KOP:'K',S_LICH:'L',S_MUMMY:'M',S_NAGA:'N',S_OGRE:'O',S_PUDDING:'P',S_QUANTMECH:'Q',S_RUSTMONST:'R',S_SNAKE:'S',S_TROLL:'T',S_UMBER:'U',S_VAMPIRE:'V',S_WRAITH:'W',S_XORN:'X',S_YETI:'Y',S_ZOMBIE:'Z',S_HUMAN:'@',S_GHOST:' ',S_GOLEM:"'",S_DEMON:'&',S_EEL:';',S_LIZARD:':'};

function engineMonsters(){
 const src=readFileSync(new URL('../src/monst.c',import.meta.url),'utf8');
 return [...src.matchAll(/MON\("([^"]+)",\s*(S_[A-Z_]+)/g)].map(m=>({name:m[1],letter:CLASS_LETTER[m[2]]})).filter(m=>m.letter!==undefined);
}

test('every engine monster builds a model, and none falls through to the default guardian shape',()=>{
 const monsters=engineMonsters();
 assert(monsters.length>300,'monst.c should list the engine monsters');
 const fallen=[];
 for(const {name,letter} of monsters){
  const actor=createCreature({name,symbol:letter.charCodeAt(0)});
  assert(actor&&actor.g,name);
  if(actor.g.userData.fallback)fallen.push(`${name} (${letter})`);
 }
 console.log(`fallback audit: ${fallen.length} of ${monsters.length} monsters use the default shape${fallen.length?': '+fallen.join(', '):''}`);
 assert.deepEqual(fallen,[],'these monsters fall back to the default shape; give them a model');
});
