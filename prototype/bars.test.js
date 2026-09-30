import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBars} from './bars.js';

test('iron bars are finite, stay in their tile, merge into iron and stone and bend one upright by seed',()=>{
 const bent=new Set();
 for(let seed=0;seed<30;seed++){
  const bars=createBars(seed*53+seed*seed*29);
  bars.updateMatrixWorld(true);
  const meshes=bars.children.filter(o=>o.isMesh);
  assert.equal(meshes.length,bars.children.length,'nothing but merged meshes');
  assert.deepEqual(meshes.map(o=>o.userData.part).sort(),['iron','stone']);
  assert.equal(new Set(meshes.map(o=>o.material)).size,2,'one mesh per material');
  for(const o of meshes){
   assert(o.geometry.attributes.color,`${o.userData.part} has baked colours`);
   for(const [key,attr] of Object.entries(o.geometry.attributes))for(const x of attr.array)assert(Number.isFinite(x),`${o.userData.part} ${key} is not finite`);
  }
  const bounds=new THREE.Box3().setFromObject(bars);
  assert(bounds.min.y>=-.01,`sinks to ${bounds.min.y}`);
  assert(bounds.max.y>.95&&bounds.max.y<1.06,`top at ${bounds.max.y}`);
  assert(bounds.min.x>=-.5&&bounds.max.x<=.5,'leaves its tile on x');
  assert(bounds.min.z>=-.12&&bounds.max.z<=.12,'too deep for a grille');
  bent.add(bars.userData.bent);
  let disposed=0;for(const o of meshes)o.geometry.addEventListener('dispose',()=>disposed++);
  bars.userData.dispose();assert.equal(disposed,meshes.length);
 }
 assert(bent.size>=4,`only bends uprights ${[...bent]}`);
});

// The door shares this file because package.json is held by another open PR.
test('doors are finite, stay in their tile, merge into wood, iron and stone and vary their planks by seed',async()=>{
 const {createDoor}=await import('./door.js');
 const planks=new Set();
 for(let seed=0;seed<20;seed++){
  const door=createDoor(seed*61+seed*seed*37);
  door.updateMatrixWorld(true);
  const meshes=[];door.traverse(o=>{if(o.isMesh)meshes.push(o);});
  assert.equal(door.children.length,2,'the frame mesh and the leaf group');
  assert.deepEqual(meshes.map(o=>o.userData.part).sort(),['iron','stone','wood']);
  assert.equal(new Set(meshes.map(o=>o.material)).size,3,'one mesh per material');
  for(const o of meshes){
   assert(o.geometry.attributes.color,`${o.userData.part} has baked colours`);
   for(const [key,attr] of Object.entries(o.geometry.attributes))for(const x of attr.array)assert(Number.isFinite(x),`${o.userData.part} ${key} is not finite`);
  }
  const bounds=new THREE.Box3().setFromObject(door);
  assert(bounds.min.y>=-.01,`sinks to ${bounds.min.y}`);
  assert(bounds.max.y>1&&bounds.max.y<1.15,`top at ${bounds.max.y}`);
  assert(bounds.min.x>=-.5&&bounds.max.x<=.5,'leaves its tile on x');
  assert(bounds.min.z>=-.14&&bounds.max.z<=.14,'too deep for a door frame');
  planks.add(door.userData.planks);
  let disposed=0;for(const o of meshes)o.geometry.addEventListener('dispose',()=>disposed++);
  door.userData.dispose();assert.equal(disposed,meshes.length);
 }
 assert.deepEqual([...planks].sort(),[5,6]);
});

// The leaf hangs on the hinge axis so the animations lane can swing it; the frame and
// its pintles stay put, and the leaf's back corner stays clear of the jamb all the way open.
test('door leaves hang in their own group on the hinge axis and swing clear of the jamb',async()=>{
 const {createDoor,DOOR_LEAF}=await import('./door.js');
 const {width:W}=DOOR_LEAF;
 for(let seed=0;seed<8;seed++){
  const door=createDoor(seed*61+seed*seed*37);
  const leaf=door.userData.leaf,hinge=door.userData.hinge;
  assert(leaf?.isGroup&&leaf.parent===door,'leaf is a child group');
  assert.deepEqual(leaf.children.map(o=>o.userData.part).sort(),['iron','wood']);
  assert.deepEqual(door.children.filter(o=>o.isMesh).map(o=>o.userData.part),['stone']);
  assert.equal(leaf.position.x,hinge.x);assert.equal(leaf.position.z,hinge.z);
  assert(Math.abs(hinge.x+W/2)<.03&&hinge.z>0,'hinge sits on the front of the hinge edge');
  door.updateMatrixWorld(true);
  const closed=new THREE.Box3().setFromObject(leaf);
  assert(closed.min.x>=-W/2-.02&&closed.max.x<=W/2+.01,`closed leaf spans ${closed.min.x}…${closed.max.x}`);
  assert(closed.min.z>-.09&&closed.max.z<.1,`closed leaf depth ${closed.min.z}…${closed.max.z}`);
  const v=new THREE.Vector3();
  for(let k=0;k<=10;k++){
   leaf.rotation.y=DOOR_LEAF.open*k/10;door.updateMatrixWorld(true);
   for(const mesh of leaf.children){
    const p=mesh.geometry.attributes.position;
    for(let i=0;i<p.count;i+=3){
     v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);
     // Only the knuckles (radius .016) wrap the pintle close by the axis; everything
     // else must stay out of the jamb (inner face at about -W/2) within its depth.
     if(Math.hypot(v.x-hinge.x,v.z-hinge.z)<.02)continue;
     assert(!(v.x<-W/2-.012&&Math.abs(v.z)<.11),`leaf enters the jamb at ${k/10} open: ${v.x.toFixed(3)},${v.z.toFixed(3)}`);
    }
   }
  }
  const open=new THREE.Box3().setFromObject(leaf);
  assert(open.max.z>.75,'fully open, the latch edge swings out to +z');
  door.userData.dispose();
 }
});

// The torch sconce shares this file because package.json is held by another open PR.
test('torch sconces are finite, sit on the wall top, merge into wood and iron and put the flame on the torch',async()=>{
 const {createTorchSconce,WALL_TOP,TORCH_FLAME_Y}=await import('./torch.js');
 const prongs=new Set();
 for(let seed=0;seed<40;seed++){
  const sconce=createTorchSconce(seed*43+seed*seed*71);
  sconce.updateMatrixWorld(true);
  const meshes=sconce.children.filter(o=>o.isMesh);
  assert.deepEqual(meshes.map(m=>m.userData.part).sort(),['iron','wood']);
  const box=new THREE.Box3().setFromObject(sconce);
  for(const mesh of meshes){
   for(const name of ['position','normal','color']){
    const a=mesh.geometry.attributes[name];assert.ok(a,`${name} present`);
    for(const value of a.array)assert.ok(Number.isFinite(value),`${name} finite`);
   }
   for(const value of mesh.geometry.attributes.color.array)assert.ok(value>=0&&value<=1);
  }
  assert.ok(box.min.y>=WALL_TOP-.002&&box.max.y<1,`y ${box.min.y}..${box.max.y}`);
  assert.ok(Math.max(-box.min.x,box.max.x,-box.min.z,box.max.z)<.13,'stays near the tile centre');
  const flame=sconce.userData.flame;
  assert.ok(Math.abs(flame.y-TORCH_FLAME_Y)<.01&&Math.hypot(flame.x,flame.z)<.02);
  prongs.add(sconce.userData.prongs);
  sconce.userData.dispose();
 }
 assert.ok(prongs.size>1,'the prong count varies by seed');
});
