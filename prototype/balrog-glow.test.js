import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

function glows(name){
 const c=createCreature({name,symbol:38,color:1}),out=[];
 c.g.traverse(o=>{if(o.isMesh&&o.material&&o.material.name==='evil-glow')out.push(o);});
 return out;
}

test('the balrog and Durin\'s Bane glow with evil: cracks in the hide and a hellglow pool underfoot',()=>{
 for(const name of ['balrog',"durin's bane",'pit fiend','asmodeus','nalzok']){
  const parts=glows(name);
  assert(parts.length>=2,name+' has evil-glow parts');
  assert(parts.some(m=>m.material.transparent&&m.material.opacity<.5),name+' has a pool of light on the floor');
  assert(parts.some(m=>!m.material.transparent&&m.material.emissiveIntensity>=2),name+' has bright molten cracks');
 }
});

test('lesser fiends carry no evil glow',()=>{
 assert.equal(glows('mail daemon').length,0);
 assert.equal(glows('succubus').length,0);
});

test('the balrog trails smoke and embers and towers over a pit fiend',()=>{
 const smoke=name=>{let n=0;createCreature({name,symbol:38,color:1}).g.traverse(o=>{if(o.isMesh&&o.material.name==='evil-smoke')n+=o.geometry.attributes.position.count;});return n;};
 // the six trailing cones are baked into one mesh (transparent, so mergeStatic would not), so count their vertices
 assert(smoke('balrog')>=6*7);assert(smoke("durin's bane")>=6*7);
 const h=name=>new THREE.Box3().setFromObject(createCreature({name,symbol:38,color:1}).g).getSize(new THREE.Vector3()).y;
 assert(h('balrog')>h('pit fiend'));assert(h("durin's bane")>h('balrog'));
});

test('demon lords and princes glow with evil in their own colours',()=>{
 const lords=['orcus','demogorgon','yeenoghu','geryon','dispater','baalzebub'],tints=new Set();
 for(const name of lords){
  const parts=glows(name);
  assert(parts.length>=2,name+' has evil-glow parts');
  assert(parts.some(m=>m.material.transparent&&m.material.opacity<.5),name+' has a hellglow pool');
  tints.add(parts[0].material.color.getHex());
 }
 assert(tints.size>=5,'each lord has its own glow colour');
});

test('Demogorgon has two heads',()=>{
 const eyes=name=>{let n=0;createCreature({name,symbol:38,color:1}).g.traverse(o=>{if(o.isMesh&&o.material.emissive&&o.material.emissive.getHex()===0xff3030)n++;});return n;};
 assert.equal(eyes('demogorgon'),2,'one pair of eye meshes per head');
});

test('the horned, barbed, bone and ice devils glow with evil in their own colours',()=>{
 const tints=new Set();
 for(const name of ['horned devil','barbed devil','bone devil','ice devil']){
  const parts=glows(name);
  assert(parts.length>=2,name+' has evil-glow parts');
  assert(parts.some(m=>m.material.transparent&&m.material.opacity<.5),name+' has a hellglow pool');
  tints.add(parts[0].material.color.getHex());
 }
 assert.equal(tints.size,4,'each devil has its own glow colour');
});

test('the vrock and nalfeshnee glow with evil',()=>{
 for(const name of ['vrock','nalfeshnee']){
  const parts=glows(name);
  assert(parts.length>=2,name+' has evil-glow parts');
  assert(parts.some(m=>m.material.transparent&&m.material.opacity<.5),name+' has a hellglow pool');
 }
});

test('the greater devils stand larger than ordinary demons',()=>{
 for(const name of ['horned devil','barbed devil','bone devil','ice devil','vrock','marilith','nalfeshnee']){
  const c=createCreature({name,symbol:38,color:1});
  assert(c.g.scale.y>=1.1,name+' is scaled up');
 }
});

test('lesser devils carry the mark of their torment: ribs, rime and iron',()=>{
 const has=(name,mark)=>{let n=0;createCreature({name,symbol:38,color:1}).g.traverse(o=>{if(o.isMesh&&o.material.name===mark)n++;});return n>0;};
 assert(has('bone devil','devil-ribs'),'bone devil shows ribs');
 assert(has('ice devil','devil-rime'),'ice devil hangs icicles');
 assert(has('horned devil','devil-iron'),'horned devil wears an iron collar and belt');
 assert(!has('barbed devil','devil-iron')&&!has('bone devil','devil-rime'),'marks stay with their own devil');
});

test('the vrock wears a carrion ruff and the nalfeshnee tusks and glowing boils',()=>{
 const has=(name,mark)=>{let n=0;createCreature({name,symbol:38,color:1}).g.traverse(o=>{if(o.isMesh&&o.material.name===mark)n++;});return n>0;};
 assert(has('vrock','devil-ruff'),'vrock has a ruff');
 assert(has('nalfeshnee','devil-tusks')&&has('nalfeshnee','devil-boils'),'nalfeshnee has tusks and boils');
 assert(!has('vrock','devil-boils')&&!has('nalfeshnee','devil-ruff'),'marks stay with their own devil');
});

test('the marilith wears a gilt torque of spikes and bloody slashes',()=>{
 const has=(name,mark)=>{let n=0;createCreature({name,symbol:38,color:1}).g.traverse(o=>{if(o.isMesh&&o.material.name===mark)n++;});return n>0;};
 assert(has('marilith','devil-gilt')&&has('marilith','devil-gore'),'marilith has a torque and gore');
 assert(!has('vrock','devil-gilt')&&!has('bone devil','devil-gore'),'marks stay with their own devil');
});

test('the marilith glows with evil too, within the mesh cap',()=>{
 const m=createCreature({name:'marilith',symbol:38,color:1});let glow=0,meshes=0;
 m.g.traverse(o=>{if(o.isMesh){meshes++;if(o.material.name==='evil-glow')glow++;}});
 assert(glow>=2,'marilith has evil-glow parts');assert(meshes<=25,'marilith stays within the mesh cap: '+meshes);
});

test('the lava demon glows with molten evil and stands bigger than a plain demon',()=>{
 const parts=glows('lava demon');
 assert(parts.length>=2);assert(parts.some(m=>m.material.transparent&&m.material.opacity<.5));
 const h=name=>new THREE.Box3().setFromObject(createCreature({name,symbol:38,color:1}).g).getSize(new THREE.Vector3()).y;
 assert(h('lava demon')>h('mail daemon'));
});

test('the water demon glows a drowned green-blue',()=>{
 const parts=glows('water demon');
 assert(parts.length>=2);assert(parts.some(m=>m.material.transparent&&m.material.opacity<.5));
});

test('the erinys glows with furious evil',()=>{
 const parts=glows('erinys');
 assert(parts.length>=2);assert(parts.some(m=>m.material.transparent&&m.material.opacity<.5));
});

test('the djinni and sandestin glow with their own fire and stand larger than a man',()=>{
 for(const name of ['djinni','sandestin']){const parts=glows(name);
 assert(parts.length>=2,name+' has evil-glow parts');
 assert(parts.some(m=>m.material.transparent&&m.material.opacity<.5),name+' has a pool of light below');}
});
