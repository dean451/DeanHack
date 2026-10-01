import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGroundModel} from './ground-models.js';
import {potionStyle,syncPotionFx} from './potion-fx.js';
import {radiusAt as r2} from './potion.js';

const LOOKS=['bubbly','smoky','steamy','swirly','milky','murky','viscous','oily','dark','black','blood-red','glowing','luminescent','sparkling','ruby','emerald','clear'];

test('potion motion keys only on the shuffled look',()=>{
 assert.equal(potionStyle('effervescent').name,'bubbles');
 assert.equal(potionStyle('smoky').name,'smoke');
 assert.equal(potionStyle('dark green'),null,'dark green is a colour, not a dark potion');
 assert.equal(potionStyle('dark').name,'lurk');
 assert.equal(potionStyle('ruby'),null);
});

test('every potion look animates finitely inside or right by its bottles, and frees itself',()=>{
 for(const look of LOOKS)for(const quantity of [1,3]){
  const item=new THREE.Group(),model=createGroundModel({class:8,name:'healing',appearance:look,quantity});item.add(model);
  let liquid;model.traverse(o=>{if(o.name==='liquid')liquid=o;});const base=liquid.material.emissiveIntensity;
  const fx=syncPotionFx(item,{class:8},'1,2');assert(fx,`${look} has no fx`);
  assert.equal(syncPotionFx(item,{class:8},'1,2'),fx);
  const L=model.userData.potion;
  for(let t=0;t<20;t+=1/30){fx.userData.update(t);
   fx.traverse(o=>{if(!o.isPoints)return;const pos=o.geometry.attributes.position.array,al=o.geometry.attributes.aAlpha.array;
    for(let i=0;i<al.length;i++){const x=pos[i*3],y=pos[i*3+1],z=pos[i*3+2];
     for(const v of [x,y,z,al[i]])assert(Number.isFinite(v),`${look} NaN`);
     if(al[i]<.01)continue;
     assert(y>=0&&y<L.top+.25,`${look} y ${y}`);
     const d=Math.min(...L.bottles.map(b=>Math.hypot(x-b.x,z-b.z)));
     assert(d<r2(L.profile,Math.min(y,L.top))+.04||y>L.top,`${look} strays ${d} at y ${y}`);}});
   assert(Number.isFinite(liquid.material.emissiveIntensity));
  }
  assert.equal(fx.userData.glows,/glowing|luminescent|sparkling/.test(look));
  const owned=new Set();fx.traverse(o=>{if(o.geometry)owned.add(o.geometry);if(o.material)owned.add(o.material);});
  let freed=0;for(const r of owned)r.addEventListener('dispose',()=>freed++);
  fx.userData.dispose();assert.equal(freed,owned.size);assert.equal(liquid.material.emissiveIntensity,base);
 }
});

test('non-potions get no potion fx',()=>{
 const item=new THREE.Group();item.add(createGroundModel({class:9,name:'fire',appearance:'ZELGO MER'}));
 assert.equal(syncPotionFx(item,{class:9}),null);
});
