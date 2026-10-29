import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createImp} from './imp.js';
import {createHomunculus} from './homunculus.js';
import {createQuasit} from './quasit.js';
import {createTengu} from './tengu.js';
import {createLemure} from './lemure.js';

const FAMILY=[['imp',createImp],['uranium imp',()=>createImp('uranium')],['homunculus',createHomunculus],
 ['quasit',createQuasit],['tengu',createTengu],['lemure',createLemure]];
const at=o=>{let r=o;while(r.parent)r=r.parent;r.updateMatrixWorld(true);return new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);};
const tip=o=>{
 let r=o;while(r.parent)r=r.parent;r.updateMatrixWorld(true);
 // (a limb's or the tail's pivot carries no mesh of its own now, its skin is in the hide: follow its bones to the end)
 if(!o.isBone&&o.children.some(c=>c.isBone))o=o.children.find(c=>c.isBone);
 if(!o.isBone)return new THREE.Box3().setFromObject(o).max.clone();
 while(o.children.some(c=>c.isBone))o=o.children.find(c=>c.isBone);
 return new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
};

test('every imp-family member has head, neck, arms and legs as named joints, and tail and wings where it has them',()=>{
 for(const [name,make] of FAMILY){
  const a=make(),j=a.joints;
  assert(j,`${name}: joints`);
  assert.equal(j.head,a.head,name);
  for(const n of ['hips','spine0','spine1','neck0','neck1','neck2','neck3'])assert(j[n]?.isBone,`${name}: ${n}`);
  assert.equal(a.head.parent,j.neck3,`${name}: the head rides the top of the neck`);
  for(const o of [...a.arms,...a.wings]){let p=o;while(p&&p!==j.spine1)p=p.parent;assert(p,`${name}: the arms and wings hang from the chest`);}
  for(const side of ['l','r']){
   for(const [stem,list] of [['fore',a.arms],['leg1',a.legs]]){
    const o=j[side+stem];
    assert(o&&list.includes(o),`${name}: ${side}${stem}`);
    assert.equal(o.position.x<0,side==='l',`${name}: left is -x`);
   }
   const w=j[side+'wing'];
   assert.equal(!!w,a.wings.length>0,`${name}: ${side}wing only where there are wings`);
   if(w)assert.equal(w.position.x<0,side==='l',`${name}: left wing is -x`);
  }
  assert.equal(!!j.tail0,!!a.tail,`${name}: tail0 only where there is a tail`);
  if(a.tail)assert(j.tail0===a.tail||j.tail0.isBone&&j.tail0.parent===a.tail,`${name}: tail0 is the tail group or the first bone under it`);
 }
});

test('turning a joint moves that part only; the head carries its face',()=>{
 for(const [name,make] of FAMILY){
  const a=make(),j=a.joints;
  const keys=['lfore','rfore','lleg1','rleg1','tail0','lwing','rwing'].filter(k=>j[k]);
  for(const key of keys){
   const joint=j[key],others=keys.filter(k=>k!==key).map(k=>[j[k],tip(j[k])]),before=tip(joint);
   joint.rotation.x+=.6;
   assert(tip(joint).distanceTo(before)>.003,`${name}: ${key} swung`);
   for(const [o,b] of others)assert(tip(o).distanceTo(b)<1e-6,`${name}: ${key} left ${o.name} alone`);
   joint.rotation.x-=.6;
  }
  const face=tip(a.head),limbs=keys.map(k=>tip(j[k]));
  a.head.rotation.x=.5;
  assert(tip(a.head).distanceTo(face)>.01,`${name}: the head turned with its face`);
  keys.forEach((k,i)=>assert(tip(j[k]).distanceTo(limbs[i])<1e-6,`${name}: ${k} stayed under the head`));
 }
});

test('the imp\'s, homunculus\'s and quasit\'s arms, legs and tail are skinned onto bones; bending an elbow, knee or tail joint carries what lies past it and leaves the root',()=>{
 for(const [kind,make] of [['red',()=>createImp('red')],['uranium',()=>createImp('uranium')],['homunculus',createHomunculus],['quasit',createQuasit]]){
  const a=make(),j=a.joints;
  for(const side of ['l','r'])for(const [stem,n] of [['fore',3],['leg1',4]]){
   const bones=Array.from({length:n},(_,k)=>j[`${side}${stem}_${k}`]);
   bones.forEach((b,k)=>assert(b?.isBone,`${kind}: ${side}${stem}_${k}`));
   assert(bones[0].parent===j[side+stem]||bones[0].parent?.parent===j[side+stem],`${kind}: ${side}${stem}'s bones hang from its pivot`);
   const root=at(bones[0]),end=tip(bones[n-1]);
   bones[1].rotation.x=.6;
   assert(tip(bones[n-1]).distanceTo(end)>.01,`${kind}: ${side}${stem} end followed the bend`);
   assert(at(bones[0]).distanceTo(root)<1e-9,`${kind}: ${side}${stem} root stayed`);
   bones[1].rotation.x=0;
  }
  for(let i=0;i<5;i++)assert(j[`tail${i}`]?.isBone,`${kind}: tail${i}`);
  assert(j.tail0.parent===a.tail,`${kind}: the chain hangs under the tail pivot`);
  const end=tip(j.tail4),root=at(j.tail0);
  j.tail2.rotation.x=.7;
  assert(tip(j.tail4).distanceTo(end)>.02,`${kind}: the tail tip followed`);
  assert(at(j.tail0).distanceTo(root)<1e-9,`${kind}: the tail root stayed`);
  j.tail2.rotation.x=0;
 }
});

test('the tengu\'s and lemure\'s arms and legs are skinned onto three bones too; bending an elbow or knee carries what lies past it and leaves the root',()=>{
 for(const [kind,make] of [['tengu',createTengu],['lemure',createLemure]]){
  const a=make(),j=a.joints;
  for(const side of ['l','r'])for(const stem of ['fore','leg1']){
   const bones=[0,1,2].map(k=>j[`${side}${stem}_${k}`]);
   bones.forEach((b,k)=>assert(b?.isBone,`${kind}: ${side}${stem}_${k}`));
   assert(bones[0].parent===j[side+stem],`${kind}: ${side}${stem}'s bones hang from its pivot`);
   const root=at(bones[0]),end=at(bones[2]);
   bones[1].rotation.x=.6;
   assert(at(bones[2]).distanceTo(end)>.01,`${kind}: ${side}${stem} end followed the bend`);
   assert(at(bones[0]).distanceTo(root)<1e-9,`${kind}: ${side}${stem} root stayed`);
   bones[1].rotation.x=0;
  }
 }
});

// the trunk's skin (the body mesh, skinned onto hips, spine0, spine1 and the neck) as skinned now, and each
// vertex's weight on a bone or anything under it
const trunkOf=a=>a.body.children.find(o=>o.isSkinnedMesh&&o.userData.part==='body');
const trunkVerts=a=>{a.g.updateMatrixWorld(true);const m=trunkOf(a),v=new THREE.Vector3(),out=[];for(let i=0;i<m.geometry.attributes.position.count;i++){m.getVertexPosition(i,v);out.push(v.applyMatrix4(m.matrixWorld).clone());}return out;};
const under=(b,root)=>{for(let p=b;p;p=p.parent)if(p===root)return true;return false;};
const shareOn=(a,root)=>{const m=trunkOf(a),bones=m.skeleton.bones,si=m.geometry.attributes.skinIndex,sw=m.geometry.attributes.skinWeight;return Array.from({length:si.count},(_,i)=>{let w=0;for(let k=0;k<4;k++)if(under(bones[si.getComponent(i,k)],root))w+=sw.getComponent(i,k);return w;});};

test('the trunk, limbs and tail are one skinned hide (one draw; the head, eyes and wings stay plain parts for the batch)',()=>{
 for(const [name,make] of FAMILY){
  const a=make(),skinned=[];a.g.traverse(o=>{if(o.isSkinnedMesh&&o.userData.part!=='glow')skinned.push(o);});
  assert.equal(skinned.length,1,`${name}: one hide`);
  const names=new Set(skinned[0].skeleton.bones.map(b=>b.name));
  for(const n of ['hips','spine1','neck3','lfore_1','rleg1_1',...(a.tail?['tail4']:[])])assert(names.has(n),`${name}: the hide is skinned to ${n}`);
 }
});

test('the trunk and neck are on bones: bending the waist, chest or neck moves the skin past it and none before it, carries the head (and the arms from the chest), and leaves the legs and tail',()=>{
 for(const [name,make] of FAMILY){
  const a=make(),j=a.joints;
  assert(trunkOf(a),`${name}: the body is skinned`);
  for(const n of ['spine0','spine1','neck1']){
   const rest=trunkVerts(a),share=shareOn(a,j[n]),head=at(a.head),legs=a.legs.map(at),arm=at(a.arms[0]);
   j[n].rotation.x+=.5;const bent=trunkVerts(a);
   let before=0,past=0;rest.forEach((r,i)=>{const d=r.distanceTo(bent[i]);if(share[i]===0)before=Math.max(before,d);else if(share[i]>.999)past=Math.max(past,d);});
   assert(past>.01,`${name}: the skin past ${n} moved ${past.toFixed(3)}`);
   assert(before<1e-6,`${name}: the skin before ${n} stayed (${before})`);
   assert(at(a.head).distanceTo(head)>.01,`${name}: ${n} carried the head`);
   if(n!=='neck1')assert(at(a.arms[0]).distanceTo(arm)>.005,`${name}: ${n} carried the arms`);
   a.legs.forEach((l,i)=>assert(at(l).distanceTo(legs[i])<1e-9,`${name}: ${n} left the legs`));
   j[n].rotation.x-=.5;
  }
 }
});
