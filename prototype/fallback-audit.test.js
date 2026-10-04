import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCreature} from './creatures.js';
import {createGroundModel} from './ground-models.js';
import {createLightItem,createShopItem} from './shop-visuals.js';
import {trapKind,createTrap} from './trap.js';

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

// Objects. live.js (pickupIcon) tries the light items, shop items and createGroundModel, and drops to a
// brown octahedron for the classes it has no class-wide model for. Weapons, armour, rings,
// amulets, potions, scrolls and coins each have a class-wide model there, so only the other
// classes can fall through; corpses and statues are built from their monster.
const OBJECT_CLASS={TOOL:6,CONTAINER:6,WEPTOOL:6,FOOD:7,SPELL:10,WAND:11,GEM:13,ROCK:13};
const OBJECT_PREFIX={10:'spellbook of ',11:'wand of '};

test('every tool, food, spellbook, wand and gem has a ground model, not the default octahedron',()=>{
 const src=readFileSync(new URL('../src/objects.c',import.meta.url),'utf8');
 const objects=[...src.matchAll(/^\s*(TOOL|CONTAINER|WEPTOOL|FOOD|SPELL|WAND|GEM|ROCK)\("([^"]+)"/gm)].map(m=>({cls:OBJECT_CLASS[m[1]],name:m[2]})).filter(o=>o.name!=='corpse');
 assert(objects.length>150,'objects.c should list the engine objects');
 const fallen=[];
 for(const {cls,name} of objects){
  const full=(OBJECT_PREFIX[cls]||'')+name,model=createLightItem(full)||createShopItem(full)||createGroundModel({name:full,class:cls});
  if(!model)fallen.push(`${full} (class ${cls})`);
 }
 assert.deepEqual(fallen,[],'these objects fall back to the default octahedron; give them a model');
});

// Traps. trapKind turns a map cell into a family and createTrap builds it; a family with no model of
// its own gets the bare pressure plate, which createTrap tags userData.fallback.
test('every engine trap builds a model of its own, not the bare pressure plate',()=>{
 const src=readFileSync(new URL('../src/drawing.c',import.meta.url),'utf8');
 const CLR={HI_METAL:6,CLR_GRAY:7,CLR_BROWN:3,CLR_RED:1,HI_ZAP:12,CLR_BLUE:4,CLR_ORANGE:9,CLR_BLACK:0,CLR_MAGENTA:5,CLR_BRIGHT_MAGENTA:13,CLR_WHITE:15,CLR_BRIGHT_GREEN:10};
 const traps=[...src.matchAll(/\{ '(\^|")', "([^"]+)",\s*C\((\w+)\) \}/g)].map(m=>({symbol:m[1].charCodeAt(0),name:m[2],color:CLR[m[3]]})).filter(t=>t.color!==undefined);
 assert(traps.length>=24,'drawing.c should list every trap');
 const fallen=[];
 for(const {symbol,name,color} of traps)for(const named of [name,undefined]){
  const kind=trapKind(symbol,color,named);
  // The vibrating square has its own model (vibrating-square.js), outside createTrap.
  if(kind==='vibrating')continue;
  const model=kind&&createTrap(kind,1);
  if(!model||model.userData.fallback)fallen.push(`${name}${named?'':' (unnamed)'} -> ${kind}`);
 }
 assert.deepEqual(fallen,[],'these traps fall back to the bare pressure plate; give them a model');
});
