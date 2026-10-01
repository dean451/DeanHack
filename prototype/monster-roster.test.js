import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MONSTERS,CLASSES} from './monster-roster.js';
import {createCreature} from './creatures.js';

// Re-reads the game's monster table (names, class symbols, colours) and checks the roster against it.
function parse(){
 const root=new URL('../',import.meta.url);
 const src=readFileSync(new URL('src/monst.c',root),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
 const sym=readFileSync(new URL('include/monsym.h',root),'utf8'),colour=readFileSync(new URL('include/color.h',root),'utf8');
 const defs={};for(const m of sym.matchAll(/#define\s+DEF_(\w+)\s+'(\\.|[^'])'/g))defs['S_'+m[1]]=m[2].length>1?m[2][1]:m[2];
 const cols={};for(const m of colour.matchAll(/#define\s+(CLR_\w+|HI_\w+|DRAGON_\w+)\s+(\w+)/g))cols[m[1]]=m[2];
 const value=c=>{while(!/^\d+$/.test(c))c=cols[c];return Number(c);};
 const out=[];
 for(const chunk of src.split('MON("').slice(1)){
  const m=chunk.match(/^([^"]+)",\s*(S_\w+),/);if(!m)continue;
  const c=[...chunk.matchAll(/\b(CLR_\w+|HI_\w+|DRAGON_\w+)\b/g)].map(x=>x[1]);
  out.push([m[1],defs[m[2]],value(c[c.length-1])]);
 }
 return out;
}

test('the gallery roster lists every monster in the game source, with its class and colour',()=>{
 assert.deepEqual(MONSTERS,parse());
 for(const [,symbol] of MONSTERS)assert(CLASSES[symbol],`class ${symbol} has no name`);
});

test('every monster in the roster builds a model with finite geometry',()=>{
 for(const [name,symbol,color] of MONSTERS){
  const a=createCreature({name,symbol:symbol.charCodeAt(0),color,kind:'monster'});
  assert(a?.g?.isObject3D,`${name} has no model`);
  let meshes=0;a.g.traverse(o=>{if(o.isMesh){meshes++;const p=o.geometry.attributes.position.array;for(let i=0;i<p.length;i+=7)assert(Number.isFinite(p[i]),`${name} has a bad vertex`);}});
  assert(meshes>0||a.asset,`${name} has no meshes`);
 }
});
