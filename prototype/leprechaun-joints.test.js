import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

// the one skinned hide (the trunk and both arms) and its vertices as skinned now (world space)
const hideOf=a=>{const m=[];a.g.traverse(o=>{if(o.isSkinnedMesh)m.push(o);});assert.equal(m.length,1,'one skinned hide');return m[0];};
const verts=a=>{a.g.updateMatrixWorld(true);const m=hideOf(a),v=new THREE.Vector3(),out=[];for(let i=0;i<m.geometry.attributes.position.count;i++){m.getVertexPosition(i,v);out.push(v.applyMatrix4(m.matrixWorld).clone());}return out;};
const under=(b,root)=>{for(let p=b;p;p=p.parent)if(p===root)return true;return false;};
// how much of each vertex's weight is on `root` or anything under it
const shareOn=(a,root)=>{const m=hideOf(a),bones=m.skeleton.bones,si=m.geometry.attributes.skinIndex,sw=m.geometry.attributes.skinWeight;
 return Array.from({length:si.count},(_,i)=>{let w=0;for(let k=0;k<4;k++)if(under(bones[si.getComponent(i,k)],root))w+=sw.getComponent(i,k);return w;});};
// turns `joint` about x and checks: the skin wholly past it moved, the skin with no weight past it stayed
function movesPastOnly(a,joint,angle,name,minMove=.01){
 const rest=verts(a),share=shareOn(a,joint),was=joint.rotation.x;
 joint.rotation.x+=angle;const bent=verts(a);joint.rotation.x=was;
 let before=0,past=0;rest.forEach((r,i)=>{const d=r.distanceTo(bent[i]);if(share[i]===0)before=Math.max(before,d);else if(share[i]>.999)past=Math.max(past,d);});
 assert(past>minMove,`${name}: the skin past ${joint.name} moved ${past.toFixed(3)}`);
 assert(before<1e-6,`${name}: the skin before ${joint.name} stayed (${before})`);
}
const tip=o=>{o.updateMatrixWorld(true);return new THREE.Box3().setFromObject(o).max.clone();};

test('the leprechaun has head, neck, arms and legs as named joints',()=>{
 const a=createCreature({name:'leprechaun',symbol:108,color:2}),j=a.joints;
 assert(j,'joints');
 assert.equal(j.head,a.head);
 for(const n of ['hips','spine0','spine1','neck0','neck1','neck2','neck3'])assert(j[n]?.isBone,n);
 assert.equal(a.head.parent,j.neck3,'the head rides the top of the neck');
 for(const arm of a.arms||[j.lfore,j.rfore])assert(under(arm,j.spine1),'the arms hang from the chest');
 for(const side of ['l','r'])for(const stem of ['fore','leg1']){
  const o=j[side+stem];
  assert(o,side+stem);assert.equal(o.name,side+stem);
  assert.equal(o.position.x<0,side==='l','left is -x');
 }
 assert.equal(a.arms,undefined,'fidget.js swings an actor\'s arms: the leprechaun keeps its own pose');
});

test('every arm, the waist, the chest and the neck bend the skin past them and leave the skin before them',()=>{
 const a=createCreature({name:'leprechaun',symbol:108,color:2}),j=a.joints;
 for(const side of ['l','r']){
  for(let k=0;k<3;k++)assert(j[`${side}fore_${k}`]?.isBone,`${side}fore_${k}`);
  movesPastOnly(a,j[side+'fore'],.6,side+'fore',.005);
  movesPastOnly(a,j[side+'fore_1'],-.8,side+'fore_1',.01);
 }
 for(const n of ['neck1','spine0','spine1'])movesPastOnly(a,j[n],.5,n);
});

test('turning an arm leaves the legs, the head, the shillelagh and the sack where they were',()=>{
 const a=createCreature({name:'leprechaun',symbol:108,color:2}),j=a.joints;
 for(const key of ['lfore','rfore']){
  const legs=a.legs.map(tip),sack=tip(a.loot),head=tip(a.head);
  j[key].rotation.x=.6;
  a.legs.forEach((l,i)=>assert(tip(l).distanceTo(legs[i])<1e-6));
  assert(tip(a.loot).distanceTo(sack)<1e-6);assert(tip(a.head).distanceTo(head)<1e-6);
  j[key].rotation.x=0;
 }
});

test('the back hunches: bending the waist and the chest carries the head and the arms and leaves the hips and legs',()=>{
 const a=createCreature({name:'leprechaun',symbol:108,color:2}),j=a.joints,at=o=>{o.updateWorldMatrix(true,false);return o.getWorldPosition(new THREE.Vector3());};
 const head=at(a.head),hand=at(j.rfore_2),legs=a.legs.map(at);
 j.spine0.rotation.x=.4;j.spine1.rotation.x=.3;
 assert(at(a.head).y<head.y-.02&&at(a.head).z>head.z,'the head came forward and down');
 assert(at(j.rfore_2).distanceTo(hand)>.02,'the arms went with the chest');
 a.legs.forEach((l,i)=>assert(at(l).distanceTo(legs[i])<1e-9,'the legs stayed'));
});
