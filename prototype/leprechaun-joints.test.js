import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const tip=o=>{o.updateMatrixWorld(true);return new THREE.Box3().setFromObject(o).max.clone();};

test('the leprechaun has head, neck, arms and legs as named joints',()=>{
 const a=createCreature({name:'leprechaun',symbol:108,color:2}),j=a.joints;
 assert(j,'joints');
 assert.equal(j.head,a.head);assert.equal(j.neck0,a.head);
 for(const side of ['l','r'])for(const stem of ['fore','leg1']){
  const o=j[side+stem];
  assert(o,side+stem);assert.equal(o.name,side+stem);
  assert.equal(o.position.x<0,side==='l','left is -x');
 }
 assert.equal(a.arms,undefined,'fidget.js swings an actor\'s arms: the leprechaun keeps its own pose');
});

test('turning an arm moves that arm only; the shillelagh and the sack stay put',()=>{
 const a=createCreature({name:'leprechaun',symbol:108,color:2}),j=a.joints;
 for(const key of ['lfore','rfore']){
  const other=j[key==='lfore'?'rfore':'lfore'],legs=a.legs.map(tip),before=tip(j[key]),otherBefore=tip(other),sack=tip(a.loot),head=tip(a.head);
  j[key].rotation.x=.6;
  assert(tip(j[key]).distanceTo(before)>.005,key+' swung');
  assert(tip(other).distanceTo(otherBefore)<1e-6);
  a.legs.forEach((l,i)=>assert(tip(l).distanceTo(legs[i])<1e-6));
  assert(tip(a.loot).distanceTo(sack)<1e-6);assert(tip(a.head).distanceTo(head)<1e-6);
  j[key].rotation.x=0;
 }
});

test('each arm is one skinned mesh on shoulder, elbow and wrist bones; bending the elbow moves the forearm and not the shoulder',()=>{
 const a=createCreature({name:'leprechaun',symbol:108,color:2}),j=a.joints;
 for(const side of ['l','r']){
  const arm=j[side+'fore'],meshes=[];arm.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});
  assert.equal(meshes.length,1,side+' arm is one skinned mesh');
  const [m]=meshes,elbow=j[side+'fore_1'];
  assert(j[side+'fore_0']&&elbow&&j[side+'fore_2'],'three bones');
  const verts=()=>{a.g.updateMatrixWorld(true);m.skeleton.update();return Array.from({length:m.geometry.attributes.position.count},(_,i)=>m.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(m.matrixWorld));};
  const before=verts();elbow.rotation.x=-.8;const after=verts();
  const w=m.geometry.attributes.skinWeight,ix=m.geometry.attributes.skinIndex;let still=0,moved=0;
  for(let i=0;i<before.length;i++){
   const d=before[i].distanceTo(after[i]);
   if(ix.getX(i)===0&&w.getX(i)===1){assert(d<1e-6,'a vertex on the shoulder bone alone stays');still++;}
   if(ix.getX(i)>=1&&w.getX(i)>=1-1e-6||ix.getY(i)===2&&w.getY(i)>.99){assert(d>.005,'a vertex past the elbow follows it');moved++;}
  }
  assert(still>0&&moved>0,'both kinds of vertex exist');
  elbow.rotation.x=0;
 }
});
