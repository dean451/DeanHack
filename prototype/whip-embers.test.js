import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {emberState,updateWhipEmbers,WHIP_EMBERS,EMBER_SIZE,EMBER_LIFE} from './whip-embers.js';

test('emberState is finite, bounded, falls, and rests between falls',()=>{
 let air=0,rest=0;
 for(let i=0;i<WHIP_EMBERS;i++)for(let t=0;t<60;t+=1/30){
  const e=emberState(t,i,1.2);
  for(const v of Object.values(e))assert(Number.isFinite(v));
  if(e.life<0){rest++;assert.equal(e.size,0);continue;}
  air++;assert(e.size<=EMBER_SIZE*1.2+1e-9&&e.size>=0);assert(e.heat>=0&&e.heat<=1);assert(e.y<=0&&e.y>-.5*.5*EMBER_LIFE[1]**2-1e-9);
  assert(e.at>=.25&&e.at<=1);assert(Math.abs(e.x)<.1&&Math.abs(e.z)<.1);
 }
 assert(air>0&&rest>air*.3,'now and then, never a stream');
});

test('balrogs shed embers off the whip; a whipless demon and the dead do not',()=>{
 const balrog=createCreature({name:'balrog',symbol:38,color:1});
 const group=()=>balrog.g.getObjectByName('WhipEmbers');
 assert.equal(group(),undefined);
 let seen=0;
 for(let t=0;t<20;t+=.1){
  updateWhipEmbers(balrog,.1,t);
  const g=group();assert(g);
  const lit=g.children.filter(m=>m.visible);seen+=lit.length;
  for(const m of lit){assert(m.position.toArray().every(Number.isFinite));assert(m.position.y>=.004-1e-9);}
 }
 assert(seen>0);
 assert.equal(group().parent!==null,true);
 balrog.actions={dead:true};updateWhipEmbers(balrog,.1,3);
 assert(group().children.every(m=>!m.visible),'a dead balrog sheds nothing');
 assert.equal(updateWhipEmbers(createCreature({name:'pit fiend',symbol:38,color:1}),.1,1),null);
});
