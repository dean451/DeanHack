import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const FAMILY=['jackal','werejackal','coyote','fox','little dog','dog','large dog','wolf','warg','winter wolf cub','winter wolf','hell hound pup','hell hound','dingo','werewolf','cerberus'];
const make=name=>createCreature({name,symbol:100,color:11});
const world=o=>{o.updateWorldMatrix(true,false);return o.getWorldPosition(new THREE.Vector3());};
const tip=o=>{o.updateMatrixWorld(true);return new THREE.Box3().setFromObject(o).max.clone();};
// the farthest tail vertex back, as skinned now (world space)
const tailEnd=a=>{a.g.updateMatrixWorld(true);const m=a.tail.children.find(o=>o.isSkinnedMesh),v=new THREE.Vector3();let end=null;
 for(let i=0;i<m.geometry.attributes.position.count;i++){m.getVertexPosition(i,v);v.applyMatrix4(m.matrixWorld);if(!end||v.z<end.z)end=v.clone();}return end;};

test('every wild and pet dog has head, neck, tail and four legs as named joints',()=>{
 for(const name of FAMILY){
  const a=make(name),j=a.joints;
  assert(j,`${name}: joints`);
  assert.equal(j.head,a.head,name);
  assert.equal(j.neck0,a.head,`${name}: the neck pivot is the head group`);
  for(let i=0;i<5;i++)assert(j[`tail${i}`]?.isBone,`${name}: tail${i}`);
  assert.equal(j.tail0.parent.parent,a.tail,`${name}: the chain hangs under the tail pivot`);
  assert(a.tail.children.some(o=>o.isSkinnedMesh&&o.userData.part==='tail'),`${name}: one skinned tail`);
  for(const side of ['l','r'])for(let i=0;i<2;i++){
   const leg=j[`${side}leg${i}`];
   assert(leg&&a.legs.includes(leg),`${name}: ${side}leg${i}`);
   assert.equal(leg.position.x<0,side==='l',`${name}: left is -x`);
   assert.equal(leg.position.z>0,i===0,`${name}: leg${i} front to back`);
  }
  assert.equal(new Set(Object.values(j)).size,Object.keys(j).length-1,`${name}: only head and neck0 share a group`);
 }
});

test("cerberus's side heads are joints too",()=>{
 const a=make('cerberus'),j=a.joints;
 assert.equal(j.head,a.heads[1]);
 assert.equal(j.head_0,a.heads[0]);assert.equal(j.head_1,a.heads[2]);
});

test('turning the tail moves the tail and nothing before it; turning a hip moves that leg only',()=>{
 for(const name of FAMILY){
  const a=make(name),j=a.joints;
  const headBefore=world(a.head),legBefore=a.legs.map(world),tailTip=tailEnd(a);
  j.tail0.rotation.y=.6;
  assert(tailEnd(a).distanceTo(tailTip)>.01,`${name}: the tail swung`);
  assert(world(a.head).distanceTo(headBefore)<1e-6,`${name}: head stayed`);
  a.legs.forEach((l,i)=>assert(world(l).distanceTo(legBefore[i])<1e-6,`${name}: leg ${i} stayed`));
  j.tail0.rotation.y=0;
  assert(tailEnd(a).distanceTo(tailTip)<1e-6,`${name}: back at rest`);
  const leg=j.rleg1,before=tip(leg),others=a.legs.filter(l=>l!==leg).map(l=>[l,tip(l)]);
  leg.rotation.x=.5;
  assert(tip(leg).distanceTo(before)>.005,`${name}: the leg swung`);
  for(const [l,b] of others)assert(tip(l).distanceTo(b)<1e-6,`${name}: other legs stayed`);
 }
});

test('bending a tail joint moves the tail past it and leaves the tail before it',()=>{
 for(const name of FAMILY){
  const a=make(name),j=a.joints,m=a.tail.children.find(o=>o.isSkinnedMesh);
  const verts=()=>{a.g.updateMatrixWorld(true);const v=new THREE.Vector3(),out=[];for(let i=0;i<m.geometry.attributes.position.count;i++){m.getVertexPosition(i,v);out.push(v.applyMatrix4(m.matrixWorld).clone());}return out;};
  const rest=verts(),root=world(j.tail0);
  j.tail2.rotation.x=.7;
  const bent=verts();let before=0,past=0;
  const si=m.geometry.attributes.skinIndex,sw=m.geometry.attributes.skinWeight;
  // a vertex is "before" the joint when none of its weight is on tail2 or past it, "past" when all is
  rest.forEach((r,i)=>{const d=r.distanceTo(bent[i]);let onPast=0;for(let k=0;k<4;k++)if(si.getComponent(i,k)>=2)onPast+=sw.getComponent(i,k);
   if(onPast===0)before=Math.max(before,d);else if(onPast>.999)past=Math.max(past,d);});
  assert(past>.04,`${name}: the tail past the joint moved ${past}`);
  assert(before<1e-6,`${name}: the tail before the joint stayed (${before})`);
  assert(world(j.tail0).distanceTo(root)<1e-9,`${name}: the root stayed`);
 }
});
