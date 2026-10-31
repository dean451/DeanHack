import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {RAT_KINDS} from './enormous-rat.js';

const make=name=>createCreature({name,symbol:'r'.charCodeAt(0),color:7});
const tip=o=>{o.updateWorldMatrix(true,true);return new THREE.Box3().setFromObject(o).max.clone();};
// the one skinned hide: its vertices as skinned now (world space), and how much of each rides the bones under `root`
const hideOf=a=>{const m=[];a.g.traverse(o=>{if(o.isSkinnedMesh)m.push(o);});assert.equal(m.length,1,'one hide');return m[0];};
const verts=a=>{a.g.updateMatrixWorld(true);const h=hideOf(a),v=new THREE.Vector3(),out=[];for(let i=0;i<h.geometry.attributes.position.count;i++){h.getVertexPosition(i,v);out.push(v.applyMatrix4(h.matrixWorld).clone());}return out;};
const under=(b,root)=>{for(let p=b;p;p=p.parent)if(p===root)return true;return false;};
const shareOn=(a,root)=>{const h=hideOf(a),si=h.geometry.attributes.skinIndex,sw=h.geometry.attributes.skinWeight;
 return Array.from({length:si.count},(_,i)=>{let w=0;for(let k=0;k<4;k++)if(under(h.skeleton.bones[si.getComponent(i,k)],root))w+=sw.getComponent(i,k);return w;});};
// turns `joint` about x: the skin riding it moves, the skin with no weight on it stays
function movesPastOnly(a,joint,angle,name){
 const rest=verts(a),share=shareOn(a,joint),was=joint.rotation.x;
 joint.rotation.x+=angle;const bent=verts(a);joint.rotation.x=was;
 let before=0,past=0;rest.forEach((r,i)=>{const d=r.distanceTo(bent[i]);if(share[i]===0)before=Math.max(before,d);else if(share[i]>.5)past=Math.max(past,d);});
 assert(past>.003,`${name}: the skin past ${joint.name} moved ${past.toFixed(4)}`);
 assert(before<1e-6,`${name}: the skin before ${joint.name} stayed (${before})`);
}
const world=o=>{o.updateWorldMatrix(true,false);return o.getWorldPosition(new THREE.Vector3());};

test('every rat has head, neck, tail and four legs as named joints',()=>{
 for(const name of Object.keys(RAT_KINDS)){
  const a=make(name),j=a.joints;
  assert(j,`${name}: joints`);
  assert.equal(j.head,a.head,name);
  assert.equal(j.neck0,a.head,name);
  assert.equal(j.tail0,a.tail,name);
  for(const side of ['l','r'])for(const k of [0,1]){
   const leg=j[`${side}leg${k}`];
   assert(leg&&a.legs.includes(leg),`${name}: ${side}leg${k}`);
   assert.equal(leg.position.x<0,side==='l',`${name}: left is -x`);
   assert.equal(leg.position.z>0,k===0,`${name}: fore is +z`);
  }
  const {neck0,...rest}=j;
  assert.equal(new Set(Object.values(rest)).size,Object.keys(rest).length,`${name}: every joint its own`);
 }
});

test('turning a rat joint moves only what lies past it',()=>{
 for(const name of Object.keys(RAT_KINDS)){
  const a=make(name),j=a.joints;
  const headBefore=world(a.head),legBefore=a.legs.map(world),tailTip=tip(a.tail);
  j.tail0.rotation.x=.6;
  assert(tip(a.tail).distanceTo(tailTip)>.003,`${name}: the tail swung`);
  assert(world(a.head).distanceTo(headBefore)<1e-6,`${name}: head stayed`);
  a.legs.forEach((l,i)=>assert(world(l).distanceTo(legBefore[i])<1e-6,`${name}: leg ${i} stayed`));
  j.tail0.rotation.x=0;
  // each leg turns on its own: the skin on it moves, the skin with no weight on it (the trunk, the other legs) stays
  for(const leg of a.legs)movesPastOnly(a,leg,.5,name);
  const faceBefore=tip(a.head),legsBefore=verts(a);
  j.neck0.rotation.x=.5;
  assert(tip(a.head).distanceTo(faceBefore)>.003,`${name}: the head turned`);
  verts(a).forEach((v,i)=>assert(v.distanceTo(legsBefore[i])<1e-6,`${name}: the hide stayed under the head`));
 }
});

test('every rat is one skinned hide on three bones a leg, with the left legs mirrored and not flipped inside out',()=>{
 for(const name of Object.keys(RAT_KINDS)){
  const a=make(name),h=hideOf(a),names=h.skeleton.bones.map(b=>b.name);
  assert(names.includes('hips'),`${name}: hips`);
  for(const leg of a.legs)for(let k=0;k<3;k++)assert(names.includes(`${leg.name}_${k}`),`${name}: ${leg.name}_${k}`);
  // the left legs' feet lie on the left (-x) and the right's on the right, both on the floor with the others
  for(const side of ['l','r']){
   const bone=a.joints[`${side}leg1_2`],foot=world(bone);
   assert.equal(foot.x<0,side==='l',`${name}: ${side} hind foot on its side`);
  }
  // the winding faces out: the hide's mean normal-to-centre dot is positive
  const pos=h.geometry.attributes.position,nor=h.geometry.attributes.normal;let out=0;const c=new THREE.Vector3();
  for(let i=0;i<pos.count;i++)c.add(new THREE.Vector3().fromBufferAttribute(pos,i));c.divideScalar(pos.count);
  for(let i=0;i<pos.count;i++)out+=new THREE.Vector3().fromBufferAttribute(pos,i).sub(c).dot(new THREE.Vector3().fromBufferAttribute(nor,i))>0?1:-1;
  assert(out>0,`${name}: normals face out`);
 }
});
