import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createScorpion} from './scorpion.js';

const NAMES=['cave spider','giant spider','recluse'];
const make=name=>createCreature({name,symbol:115,color:3});
const skinned=leg=>leg.children.find(o=>o.isSkinnedMesh);
const verts=leg=>{const m=skinned(leg),p=m.geometry.attributes.position,v=new THREE.Vector3(),out=[];m.updateMatrixWorld(true);m.skeleton.update();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);m.applyBoneTransform(i,v);out.push(v.clone().applyMatrix4(m.matrixWorld));}return out;};

test('every spider has its eight legs as named joints, front to hind, left on -x, each leg one skinned mesh on three bones',()=>{
 for(const name of NAMES){
  const a=make(name),j=a.joints;
  assert(j,`${name}: joints`);
  assert.equal(j.head,a.head,name);
  assert(!j.neck0,`${name}: a spider has no neck`);
  for(const side of ['l','r'])for(let i=0;i<4;i++){
   const legName=`${side}leg${i}`,leg=j[legName];
   assert(leg&&a.legs.includes(leg),`${name}: ${legName} is one of the eight legs`);
   assert.equal(leg.position.x<0,side==='l',`${name}: left is -x`);
   assert(skinned(leg),`${name}: ${legName} is skinned`);
   assert.equal(leg.children.filter(o=>o.isMesh).length,1,`${name}: ${legName} stays one mesh`);
   for(let k=0;k<3;k++)assert(j[`${legName}_${k}`]?.isBone,`${name}: ${legName}_${k}`);
  }
  assert.equal(new Set(a.legs.map(l=>l.name)).size,8,`${name}: eight different names`);
  let meshes=0;a.g.traverse(o=>{if(o.isMesh)meshes++;});
  assert.equal(meshes,10,`${name}: body, eyes and one mesh per leg, as before`);
 }
});

test('each spider leg bends at its coxa, femur and tibia: turning one moves only that leg past the joint',()=>{
 for(const name of NAMES){
  const a=make(name),j=a.joints;
  for(const side of ['l','r'])for(let i=0;i<4;i++){
   const legName=`${side}leg${i}`,leg=j[legName];
   for(let k=0;k<3;k++){
    const bone=j[`${legName}_${k}`];
    a.g.updateMatrixWorld(true);
    const rest=verts(leg),others=a.legs.filter(l=>l!==leg).map(l=>[l,verts(l)]);
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

test('a scorpion has its eight legs as named joints on three bones each, and the same bend moves only the leg past the joint',()=>{
 for(const name of ['scorpion','scorpius']){
  const a=createScorpion(name),j=a.joints;
  assert.equal(j.head,a.head,name);assert.equal(j.tail0,a.tail,name);assert(!j.neck0,name);
  assert.equal(new Set(a.legs.map(l=>l.name)).size,8,name);
  let meshes=0;a.g.traverse(o=>{if(o.isMesh)meshes++;});
  assert.equal(meshes,13,`${name}: still 13 meshes`);
  for(const side of ['l','r'])for(let i=0;i<4;i++){
   const legName=`${side}leg${i}`,leg=j[legName];
   assert(leg&&a.legs.includes(leg)&&skinned(leg),`${name}: ${legName}`);
   assert.equal(leg.position.x<0,side==='l',`${name}: left is -x`);
   for(let k=0;k<3;k++){
    const bone=j[`${legName}_${k}`];assert(bone?.isBone,`${name}: ${legName}_${k}`);
    a.g.updateMatrixWorld(true);
    const rest=verts(leg),others=a.legs.filter(l=>l!==leg).map(l=>[l,verts(l)]);
    bone.rotation.x+=.6;a.g.updateMatrixWorld(true);
    const now=verts(leg);
    assert(now.some((p,n)=>p.distanceTo(rest[n])>.002),`${name}: ${legName}_${k} moves the leg`);
       for(const [l,v] of others){const w=verts(l);assert(v.every((p,n)=>p.distanceTo(w[n])<1e-9),`${name}: ${legName}_${k} leaves ${l.name}`);}
    bone.rotation.x-=.6;
   }
  }
 }
});
