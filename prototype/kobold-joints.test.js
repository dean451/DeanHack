import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {KOBOLDS,createKobold} from './kobold.js';

const world=o=>{o.updateWorldMatrix(true,false);return o.getWorldPosition(new THREE.Vector3());};
// the one skinned hide and its vertices as skinned now (world space)
const hideOf=a=>{const m=[];a.g.traverse(o=>{if(o.isSkinnedMesh)m.push(o);});assert.equal(m.length,1,'one skinned hide');return m[0];};
const verts=a=>{a.g.updateMatrixWorld(true);const m=hideOf(a),v=new THREE.Vector3(),out=[];for(let i=0;i<m.geometry.attributes.position.count;i++){m.getVertexPosition(i,v);out.push(v.applyMatrix4(m.matrixWorld).clone());}return out;};
// how much of each vertex's weight is on `root` or anything under it
const under=(b,root)=>{for(let p=b;p;p=p.parent)if(p===root)return true;return false;};
const shareOn=(a,root)=>{const m=hideOf(a),bones=m.skeleton.bones,si=m.geometry.attributes.skinIndex,sw=m.geometry.attributes.skinWeight;
 return Array.from({length:si.count},(_,i)=>{let w=0;for(let k=0;k<4;k++)if(under(bones[si.getComponent(i,k)],root))w+=sw.getComponent(i,k);return w;});};
// turns `joint` about `ax` and checks: the skin wholly past it moved, the skin with no weight past it stayed
function movesPastOnly(a,joint,ax,angle,name,minMove=.01){
 const rest=verts(a),share=shareOn(a,joint),was=joint.rotation[ax];
 joint.rotation[ax]+=angle;const bent=verts(a);joint.rotation[ax]=was;
 let before=0,past=0;rest.forEach((r,i)=>{const d=r.distanceTo(bent[i]);if(share[i]===0)before=Math.max(before,d);else if(share[i]>.999)past=Math.max(past,d);});
 assert(past>minMove,`${name}: the skin past ${joint.name} moved ${past.toFixed(3)}`);
 assert(before<1e-6,`${name}: the skin before ${joint.name} stayed (${before})`);
}

test('every kobold has its trunk, neck, head, tail, arms and legs as named joints on one skinned hide',()=>{
 assert(KOBOLDS.length>=4);
 for(const name of KOBOLDS){
  const a=createKobold(name),j=a.joints;
  hideOf(a);
  assert.equal(j.head,a.head,name);
  for(const n of ['hips','spine0','spine1','neck0','neck1','neck2','neck3'])assert(j[n]?.isBone,`${name}: ${n}`);
  assert.equal(a.head.parent,j.neck3,`${name}: the head rides the top of the neck`);
  for(const arm of a.arms)assert(under(arm,j.spine1),`${name}: the arms hang from the chest`);
  assert(j.tail0.isBone&&j.tail0.parent===a.tail,`${name}: tail0 is the first bone under the tail pivot`);
  for(let i=0;i<5;i++)assert(j['tail'+i]?.isBone,`${name}: tail${i}`);
  for(const side of ['l','r'])for(const [stem,list] of [['fore',a.arms],['leg1',a.legs]]){
   const o=j[side+stem];
   assert(o&&list.includes(o),`${name}: ${side}${stem}`);
   assert.equal(o.position.x<0,side==='l',`${name}: left is -x`);
   for(let k=0;k<3;k++)assert(j[`${side}${stem}_${k}`]?.isBone,`${name}: ${side}${stem}_${k}`);
  }
  assert.equal(new Set(Object.values(j)).size,Object.keys(j).length,`${name}: every joint its own`);
  assert.equal(a.weaponSocket.parent,j.rfore_2,`${name}: the weapon rides the wrist bone`);
 }
});

test('turning a limb or the tail moves that part only; the head carries its face and nothing else',()=>{
 for(const name of KOBOLDS){
  const a=createKobold(name),j=a.joints;
  for(const key of ['tail0','lfore','rfore','lleg1','rleg1'])movesPastOnly(a,j[key],'x',.6,`${name} ${key}`,.005);
  const rest=verts(a),face=world(j.head);
  a.head.rotation.x=.5;
  assert(verts(a).every((v,i)=>v.distanceTo(rest[i])<1e-6),`${name}: the head turns alone, the hide stays`);
  assert(world(j.head).distanceTo(face)<1e-9,name);
 }
});

test('bending a joint moves the skin past it and leaves the skin before it: the tail, the neck, the waist, the chest, every elbow and hock',()=>{
 for(const name of KOBOLDS){
  const a=createKobold(name),j=a.joints;
  movesPastOnly(a,j.tail2,'z',.7,`${name} tail2`,.03);
  for(const n of ['neck1','spine0','spine1'])movesPastOnly(a,j[n],'x',.5,`${name} ${n}`);
  for(const key of ['lfore','rfore','lleg1','rleg1'])movesPastOnly(a,j[`${key}_1`],'x',.7,`${name} ${key}_1`,.02);
 }
});

test('the back hunches: bending the waist and the chest carries the head, the arms and the weapon, and leaves the hips, legs and tail',()=>{
 for(const name of KOBOLDS){
  const a=createKobold(name),j=a.joints,head=world(a.head),hand=world(a.weaponSocket),legs=a.legs.map(world),tail=world(j.tail4);
  j.spine0.rotation.x=.4;j.spine1.rotation.x=.3;
  assert(world(a.head).y<head.y-.03&&world(a.head).z>head.z,`${name}: the head came forward and down`);
  assert(world(a.weaponSocket).distanceTo(hand)>.02,`${name}: the weapon arm went with the chest`);
  a.legs.forEach((l,i)=>assert(world(l).distanceTo(legs[i])<1e-9,`${name}: the legs stayed`));
  assert(world(j.tail4).distanceTo(tail)<1e-9,`${name}: the tail stayed`);
 }
});
