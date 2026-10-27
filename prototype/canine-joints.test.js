import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const FAMILY=['jackal','werejackal','coyote','fox','little dog','dog','large dog','wolf','warg','winter wolf cub','winter wolf','hell hound pup','hell hound','dingo','werewolf','cerberus'];
const make=name=>createCreature({name,symbol:100,color:11});
const world=o=>{o.updateWorldMatrix(true,false);return o.getWorldPosition(new THREE.Vector3());};
// the one skinned hide (canine-hide.js) and its vertices as skinned now (world space)
const hideOf=a=>{const m=[];a.g.traverse(o=>{if(o.isSkinnedMesh)m.push(o);});assert.equal(m.length,1,'one skinned hide');return m[0];};
const verts=a=>{a.g.updateMatrixWorld(true);const m=hideOf(a),v=new THREE.Vector3(),out=[];for(let i=0;i<m.geometry.attributes.position.count;i++){m.getVertexPosition(i,v);out.push(v.applyMatrix4(m.matrixWorld).clone());}return out;};
// how much of each vertex's weight is on `bone` or a bone under it
const under=(b,root)=>{for(let p=b;p;p=p.parent)if(p===root)return true;return false;};
const shareOn=(a,root)=>{const m=hideOf(a),bones=m.skeleton.bones,si=m.geometry.attributes.skinIndex,sw=m.geometry.attributes.skinWeight;
 return Array.from({length:si.count},(_,i)=>{let w=0;for(let k=0;k<4;k++)if(under(bones[si.getComponent(i,k)],root))w+=sw.getComponent(i,k);return w;});};
// bends `bone` by `angle` about x and checks: every vertex wholly past it moved, every vertex with no weight past it stayed
function bendsCleanly(a,bone,angle,name,minMove=.02){
 const rest=verts(a),share=shareOn(a,bone);
 const was=bone.rotation.x;bone.rotation.x+=angle;const bent=verts(a);bone.rotation.x=was;
 let before=0,past=0;rest.forEach((r,i)=>{const d=r.distanceTo(bent[i]);if(share[i]===0)before=Math.max(before,d);else if(share[i]>.999)past=Math.max(past,d);});
 assert(past>minMove,`${name}: the skin past ${bone.name} moved ${past.toFixed(3)}`);
 assert(before<1e-6,`${name}: the skin before ${bone.name} stayed (${before})`);
}

test('every wild and pet dog has its spine, neck, head, tail and four three-boned legs as named joints on one skinned hide',()=>{
 for(const name of FAMILY){
  const a=make(name),j=a.joints;
  assert(j,`${name}: joints`);
  hideOf(a);
  assert.equal(j.head,a.head,name);
  assert(j.spine0?.isBone,`${name}: spine0`);
  for(let i=0;i<4;i++)assert(j[`neck${i}`]?.isBone,`${name}: neck${i}`);
  assert.equal(a.head.parent,j.neck3,`${name}: the head rides the top of the neck`);
  for(let i=0;i<5;i++)assert(j[`tail${i}`]?.isBone,`${name}: tail${i}`);
  assert.equal(j.tail0.parent,a.tail,`${name}: the chain hangs from the tail's wag pivot`);
  for(const side of ['l','r'])for(let i=0;i<2;i++){
   const leg=j[`${side}leg${i}`];
   assert(leg&&a.legs.includes(leg),`${name}: ${side}leg${i}`);
   assert.equal(leg.position.x<0,side==='l',`${name}: left is -x`);
   assert.equal(leg.position.z>0,i===0,`${name}: leg${i} front to back`);
   for(let k=0;k<3;k++)assert(j[`${side}leg${i}_${k}`]?.isBone&&under(j[`${side}leg${i}_${k}`],leg),`${name}: ${side}leg${i}_${k} under its pivot`);
  }
  assert.equal(new Set(Object.values(j)).size,Object.keys(j).length,`${name}: every joint its own`);
 }
});

test("cerberus's side heads are joints too",()=>{
 const a=make('cerberus'),j=a.joints;
 assert.equal(j.head,a.heads[1]);
 assert.equal(j.head_0,a.heads[0]);assert.equal(j.head_1,a.heads[2]);
});

test('turning the tail moves the tail and nothing before it; turning a hip moves that leg only',()=>{
 for(const name of FAMILY){
  const a=make(name),j=a.joints,tailShare=shareOn(a,a.tail);
  const headBefore=world(a.head),rest=verts(a);
  j.tail0.rotation.y=.6;
  let swung=0,still=0;verts(a).forEach((v,i)=>{const d=v.distanceTo(rest[i]);if(tailShare[i]>.999)swung=Math.max(swung,d);else if(tailShare[i]===0)still=Math.max(still,d);});
  assert(swung>.01,`${name}: the tail swung`);assert(still<1e-6,`${name}: the rest stayed`);
  assert(world(a.head).distanceTo(headBefore)<1e-6,`${name}: head stayed`);
  j.tail0.rotation.y=0;
  const leg=j.rleg1,share=shareOn(a,leg);
  leg.rotation.x=.5;
  let moved=0,others=0;verts(a).forEach((v,i)=>{const d=v.distanceTo(rest[i]);if(share[i]>.999)moved=Math.max(moved,d);else if(share[i]===0)others=Math.max(others,d);});
  leg.rotation.x=0;
  assert(moved>.005,`${name}: the leg swung`);assert(others<1e-6,`${name}: the other legs and the body stayed`);
 }
});

test('bending a joint moves the skin past it and leaves the skin before it: the tail, the neck and every leg at its elbow or stifle and its wrist or hock',()=>{
 for(const name of FAMILY){
  const a=make(name),j=a.joints;
  bendsCleanly(a,j.tail2,.7,name,.04);
  bendsCleanly(a,j.neck1,.5,name);
  for(const side of ['l','r'])for(let i=0;i<2;i++){bendsCleanly(a,j[`${side}leg${i}_1`],.8,`${name} ${side}leg${i}`);bendsCleanly(a,j[`${side}leg${i}_2`],.6,`${name} ${side}leg${i}`,.01);}
 }
});

test('the neck carries the head: bending it lowers the head, the shoulders and the chest stay on the spine',()=>{
 for(const name of ['jackal','dog','wolf','hell hound','cerberus']){
  const a=make(name),j=a.joints,before=world(a.head),share=shareOn(a,j.neck0),rest=verts(a);
  j.neck1.rotation.x=.5;j.neck2.rotation.x=.4;
  assert(world(a.head).y<before.y-.03,`${name}: the head came down`);
  // (the torso behind the withers is all spine0: nothing there moved)
  let torso=0;verts(a).forEach((v,i)=>{if(share[i]===0&&rest[i].z<world(j.neck0).z-.05)torso=Math.max(torso,v.distanceTo(rest[i]));});
  assert(torso<1e-6,`${name}: the torso stayed (${torso})`);
 }
});
