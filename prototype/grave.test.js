import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGrave} from './grave.js';
import {createTree} from './tree.js';

test('graves are finite, stay in their tile, merge per material and vary their headstone by seed',()=>{
 const kinds=new Set(),risen=new Set();
 for(let seed=0;seed<40;seed++){
  const grave=createGrave(seed*31+seed*seed*17);
  grave.updateMatrixWorld(true);
  const meshes=grave.children.filter(o=>o.isMesh);
  assert.equal(meshes.length+(grave.userData.risen?1:0),grave.children.length,'nothing but merged meshes and the hand');
  assert(meshes.length<=5,`${meshes.length} meshes`);
  assert.equal(new Set(meshes.map(o=>o.material)).size,meshes.length,'one mesh per material');
  for(const part of ['stone','earth','grass','wax','flame'])assert(meshes.some(o=>o.userData.part===part),`missing ${part}`);
  for(const o of meshes)for(const [key,attr] of Object.entries(o.geometry.attributes))for(const x of attr.array)assert(Number.isFinite(x),`${o.userData.part} ${key} is not finite`);
  for(const part of ['stone','earth','grass'])assert(meshes.find(o=>o.userData.part===part).geometry.attributes.color,`${part} has baked colours`);
  const bounds=new THREE.Box3().setFromObject(grave);
  assert(bounds.min.y>=-.02,`sinks to ${bounds.min.y}`);
  assert(bounds.max.y>.4&&bounds.max.y<.6,`top at ${bounds.max.y}`);
  for(const k of ['x','z'])assert(bounds.min[k]>=-.5&&bounds.max[k]<=.5,`leaves its tile on ${k}`);
  kinds.add(grave.userData.headstone);risen.add(grave.userData.risen);
  const all=[];grave.traverse(o=>{if(o.isMesh)all.push(o);});
  let disposed=0;for(const o of all)o.geometry.addEventListener('dispose',()=>disposed++);
  grave.userData.dispose();assert.equal(disposed,all.length);
 }
 assert.deepEqual([...kinds].sort(),['cross','gothic','round']);
 assert.deepEqual([...risen].sort(),[false,true],'some graves have a hand clawing out, some do not');
});

test('a risen grave has the hand as its own piece, pivoted at the wrist, with the fingers on a knuckle pivot',()=>{
 const above=(geo,matrix)=>{const p=geo.attributes.position,w=new THREE.Vector3();let n=0;
  for(let i=0;i<p.count;i++){w.fromBufferAttribute(p,i).applyMatrix4(matrix);if(w.z>-.2&&w.y>.17)n++;}return n;};
 let checked=0;
 for(let seed=0;seed<60&&checked<6;seed++){
  const g=createGrave(seed);g.updateMatrixWorld(true);
  const stone=g.children.find(o=>o.userData.part==='stone');
  assert.equal(above(stone.geometry,stone.matrixWorld),0,`seed ${seed}: nothing in the stone mesh stands on the mound`);
  const {hand,claw}=g.userData;
  if(!g.userData.risen){assert.equal(hand,undefined);assert.equal(claw,undefined);g.userData.dispose();continue;}
  checked++;
  assert.equal(hand.parent,g);assert.equal(claw.parent,hand);
  const palm=hand.children.find(o=>o.isMesh),fingers=claw.children.find(o=>o.isMesh);
  assert.equal(palm.userData.part,'hand');assert.equal(fingers.userData.part,'claw');
  assert.equal(palm.material,stone.material,'shares the stone material');assert.equal(fingers.material,stone.material);
  for(const o of [palm,fingers]){assert(o.geometry.attributes.color,'baked bone colours');
   for(const x of o.geometry.attributes.position.array)assert(Number.isFinite(x));}
  assert(above(palm.geometry,palm.matrixWorld)+above(fingers.geometry,fingers.matrixWorld)>50,`seed ${seed}: hand reaches above the mound`);
  // The pivots: the wrist sits at the soil line inside the hollow, the knuckles above it.
  const wrist=hand.getWorldPosition(new THREE.Vector3()),knuckles=claw.getWorldPosition(new THREE.Vector3());
  assert(wrist.y>0&&wrist.y<.12,`wrist pivot at ${wrist.y}`);
  assert(knuckles.y-wrist.y>.15&&knuckles.y-wrist.y<.2,`knuckles ${knuckles.y-wrist.y} above the wrist`);
  // Each part hangs off its own pivot: fingers start at the knuckles, the forearm at the wrist.
  const box=(o)=>new THREE.Box3().setFromBufferAttribute(o.geometry.attributes.position);
  assert(box(palm).min.y<.001&&box(palm).max.y>.1,'forearm and palm rise from the wrist pivot');
  assert(box(fingers).containsPoint(new THREE.Vector3()),'the knuckle pivot sits among the finger bones');
  // Rest pose is recorded for the animations routine to return to.
  assert(hand.userData.rest.position.equals(hand.position));assert(claw.userData.rest.quaternion.equals(claw.quaternion));
  // Flexing the claw keeps it attached and in the tile.
  claw.rotation.x=.6;hand.rotation.z+=.3;g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(g);for(const k of ['x','z'])assert(b.min[k]>=-.5&&b.max[k]<=.5);
  g.userData.dispose();
 }
 assert.equal(checked,6);
});

test('trees are finite, stay in their tile and merge into bark, leaves and litter',()=>{
 for(let seed=0;seed<24;seed++){
  const tree=createTree(seed*97+seed*seed*13);
  tree.updateMatrixWorld(true);
  const meshes=tree.children.filter(o=>o.isMesh);
  assert.equal(meshes.length,tree.children.length,'nothing but merged meshes');
  assert.deepEqual(meshes.map(o=>o.userData.part).sort(),['bark','leaves','litter']);
  assert.equal(new Set(meshes.map(o=>o.material)).size,3,'one mesh per material');
  assert.equal(tree.userData.canopy?.userData.part,'leaves');
  for(const o of meshes){
   assert(o.geometry.attributes.color,`${o.userData.part} has baked colours`);
   for(const [key,attr] of Object.entries(o.geometry.attributes))for(const x of attr.array)assert(Number.isFinite(x),`${o.userData.part} ${key} is not finite`);
  }
  const bounds=new THREE.Box3();for(const o of meshes)bounds.expandByObject(o);
  assert(bounds.min.y>=-.08,`sinks to ${bounds.min.y}`);
  assert(bounds.max.y<1.45&&bounds.max.y>1.1,`top at ${bounds.max.y}`);
  for(const k of ['x','z'])assert(bounds.min[k]>=-.48&&bounds.max[k]<=.48,`leaves its tile on ${k}`);
  let disposed=0;for(const o of meshes)o.geometry.addEventListener('dispose',()=>disposed++);
  tree.userData.dispose();assert.equal(disposed,meshes.length);
 }
});
