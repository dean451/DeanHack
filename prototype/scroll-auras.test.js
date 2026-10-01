import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGroundModel} from './ground-models.js';
import {SCROLL_AURAS,scrollAuraKind,syncScrollAura,particleAt,trembleAt} from './scroll-auras.js';

const scrollItem=name=>{const item=new THREE.Group();item.add(createGroundModel({class:9,name,appearance:'ZELGO MER'}));return item;};

test('scroll effects key on the true scroll type; blank paper, mail and other classes get none',()=>{
 assert.equal(scrollAuraKind({class:9,name:'fire'}),'fire');
 assert.equal(scrollAuraKind({class:9,name:'scroll of flood'}),'flood');
 assert.equal(scrollAuraKind({class:9,name:'2 scrolls of gold detection'}),'gold detection');
 assert.equal(scrollAuraKind({class:9,name:'blank paper'}),null);
 assert.equal(scrollAuraKind({class:9,name:'mail'}),null);
 assert.equal(scrollAuraKind({class:11,name:'fire'}),null);
 assert.equal(scrollAuraKind(null),null);
});

test('every scroll effect stays finite, subtle and near its scroll, and frees itself',()=>{
 for(const kind of Object.keys(SCROLL_AURAS)){
  const item=scrollItem(kind),aura=syncScrollAura(item,{class:9,name:kind},'3,4');
  assert(aura,`${kind} has no effect`);
  let scroll;item.traverse(o=>{if(o.userData.part==='scroll')scroll=o;});
  const rest=scroll.rotation.clone();
  for(let t=0;t<12;t+=1/30){
   aura.userData.update(t);
   aura.traverse(o=>{if(!o.isPoints)return;
    const pos=o.geometry.attributes.position.array,alpha=o.geometry.attributes.aAlpha.array,size=o.geometry.attributes.aSize.array;
    for(let i=0;i<alpha.length;i++){
     for(const v of [pos[i*3],pos[i*3+1],pos[i*3+2],alpha[i],size[i]])assert(Number.isFinite(v),`${kind} NaN`);
     assert(alpha[i]>=0&&alpha[i]<=.95,`${kind} alpha ${alpha[i]}`);
     if(alpha[i]>.01){assert(pos[i*3+1]>=-.001&&pos[i*3+1]<.5,`${kind} y ${pos[i*3+1]}`);assert(Math.abs(pos[i*3])<.35&&Math.abs(pos[i*3+2]-.08)<.35,`${kind} strays`);}
    }});
   for(const k of ['x','y','z'])assert(Math.abs(scroll.rotation[k]-rest[k])<.08,`${kind} trembles too far`);
  }
  // Same object again keeps it; disposing puts the scroll back and frees everything.
  assert.equal(syncScrollAura(item,{class:9,name:kind},'3,4'),aura);
  const owned=new Set();aura.traverse(o=>{if(o.geometry)owned.add(o.geometry);if(o.material)owned.add(o.material);});
  let freed=0;for(const r of owned)r.addEventListener('dispose',()=>freed++);
  syncScrollAura(item,{class:9,name:'blank paper'});
  assert.equal(freed,owned.size,`${kind} leaks`);
  assert(!aura.parent&&item.userData.scrollAura===null);
  for(const k of ['x','y','z'])assert.equal(scroll.rotation[k],rest[k]);
 }
});

test('flood drops bead, fall and land on the floor; the tremble dies back to rest',()=>{
 const seed=[.2,.5,.5,.5];
 assert(particleAt('drip',seed,.3).y>.01);
 assert(particleAt('drip',seed,.66).y<particleAt('drip',seed,.61).y);
 assert.equal(particleAt('drip',seed,.8).alpha,0);
 for(const extra of ['shiver','twitch']){let moved=false,still=0;
  for(let t=0;t<20;t+=1/60){const r=trembleAt(extra,t);if(Math.abs(r.x)+Math.abs(r.y)+Math.abs(r.z)>.005)moved=true;else still++;}
  assert(moved&&still>20*60*.7,`${extra} should be brief`);}
});
