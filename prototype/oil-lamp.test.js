import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOilLamp,SPOUT_MOUTH} from './oil-lamp.js';
import {createLightItem} from './shop-visuals.js';
import {createWandAura} from './wand-auras.js';

test('the oil lamp is one merged brass mesh lying in its tile, the same for oil and magic lamps',()=>{
 for(const name of ['oil lamp','magic lamp','lamp']){
  const g=createLightItem(name),meshes=[];g.traverse(o=>{if(o.isMesh)meshes.push(o);});
  assert.deepEqual(meshes.map(m=>m.name),['lamp-brass']);
  const geo=meshes[0].geometry;for(const v of geo.attributes.position.array)assert(Number.isFinite(v));
  for(const v of geo.attributes.color.array)assert(v>=0&&v<=1);
  const b=new THREE.Box3().setFromObject(g);
  assert(b.min.y>-.002&&b.max.y<.34,`y ${b.min.y}..${b.max.y}`);
  for(const v of [b.min.x,b.max.x,b.min.z,b.max.z])assert(Math.abs(v)<.45);
  assert(b.max.x>SPOUT_MOUTH.x&&b.min.x<-.28,'spout and handle reach out each side');
  console.log(`${name}: ${geo.attributes.position.count} vertices, x ${b.min.x.toFixed(3)}..${b.max.x.toFixed(3)}, y ${b.min.y.toFixed(3)}..${b.max.y.toFixed(3)}, z ${b.min.z.toFixed(3)}..${b.max.z.toFixed(3)}`);
 }
 const a=createLightItem('oil lamp'),m=createLightItem('magic lamp');
 assert.deepEqual([...a.children[0].geometry.attributes.position.array.slice(0,300)],[...m.children[0].geometry.attributes.position.array.slice(0,300)],'unidentified twins must look alike');
});

test('a lit lamp adds a flame at the spout mouth for flame-flicker, and everything is freed',()=>{
 const g=createOilLamp('oil lamp (lit)'),flame=g.getObjectByName('lamp-flame');
 assert(flame&&flame.userData.part==='flame');
 assert(flame.position.distanceTo(SPOUT_MOUTH)<.03);
 const owned=new Set();g.traverse(o=>{if(o.geometry)owned.add(o.geometry);if(o.material)owned.add(o.material);});
 let freed=0;for(const r of owned)r.addEventListener('dispose',()=>freed++);g.userData.dispose();assert.equal(freed,owned.size);
});

test('the magic lamp hum still rises from the spout mouth',()=>{
 const aura=createWandAura('magic lamp','x');let near=Infinity;
 for(let t=0;t<6;t+=.05){aura.userData.update(t);aura.children[1].geometry.attributes.position.array.forEach((v,i,a)=>{if(i%3)return;near=Math.min(near,Math.hypot(a[i]-SPOUT_MOUTH.x,a[i+1]-SPOUT_MOUTH.y));});}
 assert(near<.03,`motes come no nearer the mouth than ${near}`);
});
