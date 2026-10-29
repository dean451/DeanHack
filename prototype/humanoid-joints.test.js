import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHobbit} from './hobbit.js';
import {createBugbear} from './bugbear.js';
import {DWARVES,createDwarf} from './dwarf.js';
import {MIND_FLAYER_KINDS,createMindFlayer} from './mind-flayer.js';

const FAMILY=[['hobbit',createHobbit],['bugbear',createBugbear],
 ...DWARVES.map(n=>[n,()=>createDwarf(n)]),
 ...Object.keys(MIND_FLAYER_KINDS).map(n=>[n,()=>createMindFlayer(n)])];
const world=o=>{o.updateWorldMatrix(true,false);return o.getWorldPosition(new THREE.Vector3());};
// the hide: the skinned mesh on the limbs' material (a dwarf's armour is a second skin on the same bones)
const usesArm=o=>{const k=o.skeleton.bones.findIndex(b=>b.name==='lfore_1'),si=o.geometry.attributes.skinIndex;for(let i=0;i<si.count;i++)if(si.getX(i)===k)return true;return false;};
const hideOf=a=>{const m=[];a.g.traverse(o=>{if(o.isSkinnedMesh&&usesArm(o))m.push(o);});assert.equal(m.length,1,'one hide');return m[0];};
// every skin on the hide's skeleton (the hide, and a dwarf's armour), its vertices as skinned now (world space)
const skins=a=>{const h=hideOf(a),out=[];a.g.traverse(o=>{if(o.isSkinnedMesh&&o.skeleton===h.skeleton)out.push(o);});return out;};
const verts=a=>{a.g.updateMatrixWorld(true);const v=new THREE.Vector3(),out=[];for(const m of skins(a))for(let i=0;i<m.geometry.attributes.position.count;i++){m.getVertexPosition(i,v);out.push(v.applyMatrix4(m.matrixWorld).clone());}return out;};
const under=(b,root)=>{for(let p=b;p;p=p.parent)if(p===root)return true;return false;};
const shareOn=(a,root)=>skins(a).flatMap(m=>{const bones=m.skeleton.bones,si=m.geometry.attributes.skinIndex,sw=m.geometry.attributes.skinWeight;
 return Array.from({length:si.count},(_,i)=>{let w=0;for(let k=0;k<4;k++)if(under(bones[si.getComponent(i,k)],root))w+=sw.getComponent(i,k);return w;});});
// turns `joint` about x and checks: the skin mostly past it moved (a dwarf's short neck blends into the trunk, so
// none of its skin rides the neck alone), the skin with no weight past it stayed
function movesPastOnly(a,joint,angle,name,minMove=.01){
 const rest=verts(a),share=shareOn(a,joint),was=joint.rotation.x;
 joint.rotation.x+=angle;const bent=verts(a);joint.rotation.x=was;
 let before=0,past=0;rest.forEach((r,i)=>{const d=r.distanceTo(bent[i]);if(share[i]===0)before=Math.max(before,d);else if(share[i]>.5)past=Math.max(past,d);});
 assert(past>minMove,`${name}: the skin past ${joint.name} moved ${past.toFixed(3)}`);
 assert(before<1e-6,`${name}: the skin before ${joint.name} stayed (${before})`);
}

test('every hobbit, dwarf, bugbear and mind flayer has its trunk, neck, head, arms and legs as named joints on one skinned hide',()=>{
 assert(FAMILY.length>=6);
 for(const [name,make] of FAMILY){
  const a=make(),j=a.joints;
  hideOf(a);
  assert.equal(j.head,a.head,name);
  for(const n of ['hips','spine0','spine1','neck0','neck1','neck2','neck3'])assert(j[n]?.isBone,`${name}: ${n}`);
  assert(a.head.parent===j.neck3,`${name}: the head rides the top of the neck`);
  for(const arm of a.arms)assert(under(arm,j.spine1),`${name}: the arms hang from the chest`);
  for(const side of ['l','r'])for(const [stem,list] of [['fore',a.arms],['leg1',a.legs]]){
   const o=j[side+stem];
   assert(o&&list.includes(o),`${name}: ${side}${stem}`);
   assert.equal(o.position.x<0,side==='l',`${name}: left is -x`);
   assert.equal(o.name,side+stem,name);
   for(let k=0;k<3;k++)assert(j[`${side}${stem}_${k}`]?.isBone,`${name}: ${side}${stem}_${k}`);
  }
  assert.equal(new Set(Object.values(j)).size,Object.keys(j).length,`${name}: every joint its own`);
  assert(a.weaponSocket.parent===j.rfore_2,`${name}: the weapon socket rides the right wrist bone`);
 }
});

test('turning an arm or a hip moves that limb only; the head turns alone',()=>{
 for(const [name,make] of FAMILY){
  const a=make(),j=a.joints;
  for(const key of ['lfore','rfore','lleg1','rleg1'])movesPastOnly(a,j[key],.6,`${name} ${key}`,.005);
  const rest=verts(a),face=world(j.head);
  a.head.rotation.x=.5;
  assert(verts(a).every((v,i)=>v.distanceTo(rest[i])<1e-6),`${name}: the head turns alone, the hide stays`);
  assert(world(j.head).distanceTo(face)<1e-9,name);
 }
});

test('bending a joint moves the skin past it and leaves the skin before it: every elbow and knee, the neck, the waist and the chest',()=>{
 for(const [name,make] of FAMILY){
  const a=make(),j=a.joints;
  for(const key of ['lfore','rfore','lleg1','rleg1'])movesPastOnly(a,j[`${key}_1`],.6,`${name} ${key}_1`,.02);
  for(const n of ['neck1','spine0','spine1'])movesPastOnly(a,j[n],.5,`${name} ${n}`);
 }
});

test('the weapon follows a bent right elbow, and a hunch carries the head and arms and leaves the legs',()=>{
 for(const [name,make] of FAMILY){
  const a=make(),j=a.joints,socket=()=>world(a.weaponSocket);
  const rest=socket();j.rfore_1.rotation.x=.8;
  assert(socket().distanceTo(rest)>.05,`${name}: the weapon followed the elbow`);
  j.rfore_1.rotation.x=0;
  const head=world(a.head),legs=a.legs.map(world);
  j.spine0.rotation.x=.4;j.spine1.rotation.x=.3;
  assert(world(a.head).y<head.y-.03&&world(a.head).z>head.z,`${name}: the head came forward and down`);
  assert(socket().distanceTo(rest)>.02,`${name}: the weapon arm went with the chest`);
  a.legs.forEach((l,i)=>assert(world(l).distanceTo(legs[i])<1e-9,`${name}: the legs stayed`));
 }
});
