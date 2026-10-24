import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const FAMILY=['giant ant','soldier ant','fire ant','snow ant','killer bee','queen bee','giant beetle','locust'];
const make=name=>createCreature({name,symbol:97,color:3});
const world=o=>{o.updateWorldMatrix(true,false);return o.getWorldPosition(new THREE.Vector3());};
const lowest=o=>{o.updateMatrixWorld(true);let p=null;o.traverse(m=>{if(!m.isMesh)return;const b=new THREE.Box3().setFromObject(m);if(!p||b.min.y<p.min.y)p=b;});return p;};

test('every ant, bee, beetle and locust has its head, neck and six legs as named joints',()=>{
 for(const name of FAMILY){
  const a=make(name),j=a.joints;
  assert(j,`${name}: joints`);
  assert.equal(j.head,a.head,name);
  assert.equal(j.neck0,a.head,`${name}: the neck pivot is the head group`);
  for(const side of ['l','r'])for(let i=0;i<3;i++){
   const leg=j[`${side}leg${i}`];
   assert(leg,`${name}: ${side}leg${i}`);
   assert(a.legs.includes(leg),`${name}: ${side}leg${i} is one of the six legs`);
   assert.equal(leg.position.x<0,side==='l',`${name}: left is -x`);
  }
  assert.equal(new Set(Object.values(j)).size,Object.keys(j).length-1,`${name}: only head and neck0 share a group`);
 }
 for(const name of ['giant ant','soldier ant','fire ant','snow ant']){
  const j=make(name).joints;
  assert(j.ljaw&&j.rjaw&&j.rjaw.position.x>0&&j.ljaw.position.x<0,`${name}: jaws`);
 }
 for(const name of ['killer bee','queen bee']){
  const j=make(name).joints;
  assert(j.lwing&&j.rwing&&j.lwing.position.x<0&&j.rwing.position.x>0,`${name}: wings`);
 }
});

test('turning the neck moves the head, jaws and feelers and nothing behind it; turning a hip moves that leg only',()=>{
 for(const name of FAMILY){
  const a=make(name),j=a.joints;
  const body=a.body.children.find(o=>o.userData.part==='body');
  const before=new Map(a.legs.map(l=>[l,world(l)]));
  const headTip=new THREE.Box3().setFromObject(a.head).max.clone();
  j.neck0.rotation.y=.5;a.g.updateMatrixWorld(true);
  const after=new THREE.Box3().setFromObject(a.head).max;
  assert(headTip.distanceTo(after)>.01,`${name}: the head tip moved ${headTip.distanceTo(after)}`);
  for(const l of a.legs)assert.equal(world(l).distanceTo(before.get(l)),0,`${name}: legs stay`);
  assert(body&&body.parent===a.body,`${name}: the body mesh stays`);
  j.neck0.rotation.y=0;
  const foot=new THREE.Box3().setFromObject(j.rleg1),other=new THREE.Box3().setFromObject(j.lleg1),headBox=new THREE.Box3().setFromObject(a.head);
  j.rleg1.rotation.z=.5;a.g.updateMatrixWorld(true);
  const moved=new THREE.Box3().setFromObject(j.rleg1);
  assert(moved.min.distanceTo(foot.min)>.01||moved.max.distanceTo(foot.max)>.01,`${name}: the leg followed its hip`);
  assert(new THREE.Box3().setFromObject(j.lleg1).min.distanceTo(other.min)<1e-9,`${name}: the other leg stays`);
  assert(new THREE.Box3().setFromObject(a.head).min.distanceTo(headBox.min)<1e-9,`${name}: the head stays`);
 }
});

test('an ant\'s gaster hangs on tail0: turning it moves the gaster and sting and nothing in front of the waist',()=>{
 for(const name of ['giant ant','soldier ant','fire ant','snow ant']){
  const a=make(name),j=a.joints;
  assert(j.tail0,`${name}: tail0`);
  assert.equal(j.tail0.children.filter(o=>o.isMesh).length,1,`${name}: the gaster is one mesh`);
  assert(j.tail0.position.z<0,`${name}: the pivot is behind the thorax`);
  a.g.updateMatrixWorld(true);
  const gaster=new THREE.Box3().setFromObject(j.tail0),legs=a.legs.map(l=>new THREE.Box3().setFromObject(l)),head=new THREE.Box3().setFromObject(a.head);
  const body=a.body.children.find(o=>o.userData.part==='body'),bodyBox=new THREE.Box3().setFromObject(body);
  assert(bodyBox.min.z>gaster.min.z+.05,`${name}: the body mesh no longer holds the gaster`);
  j.tail0.rotation.x=.5;a.g.updateMatrixWorld(true);
  const turned=new THREE.Box3().setFromObject(j.tail0);
  assert(turned.min.distanceTo(gaster.min)>.01||turned.max.distanceTo(gaster.max)>.01,`${name}: the gaster followed its joint`);
  a.legs.forEach((l,i)=>assert(new THREE.Box3().setFromObject(l).min.distanceTo(legs[i].min)<1e-9,`${name}: legs stay`));
  assert(new THREE.Box3().setFromObject(a.head).min.distanceTo(head.min)<1e-9,`${name}: the head stays`);
  assert(new THREE.Box3().setFromObject(body).min.distanceTo(bodyBox.min)<1e-9,`${name}: the body stays`);
 }
});

test('a bee\'s abdomen hangs on tail0: turning it moves the abdomen and stinger and nothing in front of the waist',()=>{
 for(const name of ['killer bee','queen bee']){
  const a=make(name),j=a.joints;
  assert(j.tail0,`${name}: tail0`);
  assert.equal(j.tail0.children.filter(o=>o.isMesh).length,1,`${name}: the abdomen is one mesh`);
  assert(j.tail0.position.z<0,`${name}: the pivot is behind the thorax`);
  a.g.updateMatrixWorld(true);
  const abdomen=new THREE.Box3().setFromObject(j.tail0),legs=a.legs.map(l=>new THREE.Box3().setFromObject(l)),head=new THREE.Box3().setFromObject(a.head);
  const wings=a.wings.map(w=>new THREE.Box3().setFromObject(w));
  const body=a.body.children.find(o=>o.userData.part==='body'),bodyBox=new THREE.Box3().setFromObject(body);
  assert(bodyBox.min.z>abdomen.min.z+.1,`${name}: the body mesh no longer holds the abdomen`);
  j.tail0.rotation.x=.5;a.g.updateMatrixWorld(true);
  const turned=new THREE.Box3().setFromObject(j.tail0);
  assert(turned.min.distanceTo(abdomen.min)>.01||turned.max.distanceTo(abdomen.max)>.01,`${name}: the abdomen followed its joint`);
  a.legs.forEach((l,i)=>assert(new THREE.Box3().setFromObject(l).min.distanceTo(legs[i].min)<1e-9,`${name}: legs stay`));
  a.wings.forEach((w,i)=>assert(new THREE.Box3().setFromObject(w).min.distanceTo(wings[i].min)<1e-9,`${name}: wings stay`));
  assert(new THREE.Box3().setFromObject(a.head).min.distanceTo(head.min)<1e-9,`${name}: the head stays`);
  assert(new THREE.Box3().setFromObject(body).min.distanceTo(bodyBox.min)<1e-9,`${name}: the body stays`);
 }
});

test('a beetle\'s and a locust\'s abdomen hangs on tail0: turning it moves the abdomen and nothing else',()=>{
 for(const name of ['giant beetle','locust']){
  const a=make(name),j=a.joints;
  assert(j.tail0,`${name}: tail0`);
  assert.equal(j.tail0.children.filter(o=>o.isMesh).length,1,`${name}: the abdomen is one mesh`);
  assert(j.tail0.position.z<.04,`${name}: the pivot is at the waist, not the head`);
  a.g.updateMatrixWorld(true);
  const abdomen=new THREE.Box3().setFromObject(j.tail0),legs=a.legs.map(l=>new THREE.Box3().setFromObject(l)),head=new THREE.Box3().setFromObject(a.head);
  const body=a.body.children.find(o=>o.userData.part==='body'),bodyBox=new THREE.Box3().setFromObject(body);
  j.tail0.rotation.x=.5;a.g.updateMatrixWorld(true);
  const turned=new THREE.Box3().setFromObject(j.tail0);
  assert(turned.min.distanceTo(abdomen.min)>.01||turned.max.distanceTo(abdomen.max)>.01,`${name}: the abdomen followed its joint`);
  a.legs.forEach((l,i)=>assert(new THREE.Box3().setFromObject(l).min.distanceTo(legs[i].min)<1e-9,`${name}: legs stay`));
  assert(new THREE.Box3().setFromObject(a.head).min.distanceTo(head.min)<1e-9,`${name}: the head stays`);
  assert(new THREE.Box3().setFromObject(body).min.distanceTo(bodyBox.min)<1e-9,`${name}: the body stays`);
 }
});

test('each leg bends at its coxa, femur and tibia: turning one moves only that leg past the joint, mesh counts unchanged',()=>{
 const skinned=leg=>leg.children.find(o=>o.isSkinnedMesh);
 // every vertex of a leg in world space, posed by its bones
 const verts=leg=>{const m=skinned(leg),p=m.geometry.attributes.position,v=new THREE.Vector3(),out=[];m.updateMatrixWorld(true);m.skeleton.update();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);m.applyBoneTransform(i,v);out.push(v.clone().applyMatrix4(m.matrixWorld));}return out;};
 for(const name of FAMILY){
  const a=make(name),j=a.joints;
  for(const side of ['l','r'])for(let i=0;i<3;i++){
   const legName=`${side}leg${i}`,leg=j[legName];
   assert(skinned(leg),`${name}: ${legName} is one skinned mesh`);
   assert.equal(leg.children.filter(o=>o.isMesh).length,1,`${name}: ${legName} stays one mesh`);
   for(let k=0;k<3;k++){
    const bone=j[`${legName}_${k}`];
    assert(bone&&bone.isBone,`${name}: ${legName}_${k}`);
    a.g.updateMatrixWorld(true);
    const rest=verts(leg),others=a.legs.filter(l=>l!==leg).map(l=>[l,verts(l)]);
    // which vertices hang wholly on this bone or one past it
    const m=skinned(leg),si=m.geometry.attributes.skinIndex,sw=m.geometry.attributes.skinWeight;
    bone.rotation.x+=.6;a.g.updateMatrixWorld(true);
    const now=verts(leg);let past=0,before=0;
    for(let n=0;n<now.length;n++){
     const d=now[n].distanceTo(rest[n]),b=si.getX(n),w=sw.getX(n),b2=si.getY(n),w2=sw.getY(n);
     if(w===1&&b>=k&&now[n].distanceTo(bone.getWorldPosition(new THREE.Vector3()))>.002)past=Math.max(past,d);
     if(w===1&&b<k||(w<1&&Math.max(b,b2)<k&&w2>0))before=Math.max(before,d);
    }
    assert(past>.002,`${name}: ${legName}_${k} moves the leg past it (${past})`);
    assert(before<1e-9,`${name}: ${legName}_${k} leaves the leg before it (${before})`);
    for(const [l,v] of others){const w=verts(l);assert(v.every((p,n)=>p.distanceTo(w[n])<1e-9),`${name}: ${legName}_${k} leaves ${l.name}`);}
    bone.rotation.x-=.6;
   }
  }
 }
});
