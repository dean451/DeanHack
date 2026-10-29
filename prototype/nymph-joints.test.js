import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

// the one skinned hide (the trunk and both arms), its vertices as skinned now (world space) and each one's weight on
// a bone and what hangs under it
const hideOf=a=>{const m=[];a.g.traverse(o=>{if(o.isSkinnedMesh)m.push(o);});assert.equal(m.length,1,'one skinned hide');return m[0];};
const verts=a=>{a.g.updateMatrixWorld(true);const m=hideOf(a),v=new THREE.Vector3(),out=[];for(let i=0;i<m.geometry.attributes.position.count;i++){m.getVertexPosition(i,v);out.push(v.applyMatrix4(m.matrixWorld).clone());}return out;};
const under=(b,root)=>{for(let p=b;p;p=p.parent)if(p===root)return true;return false;};
const shareOn=(a,root)=>{const m=hideOf(a),bones=m.skeleton.bones,si=m.geometry.attributes.skinIndex,sw=m.geometry.attributes.skinWeight;
 return Array.from({length:si.count},(_,i)=>{let w=0;for(let k=0;k<4;k++)if(under(bones[si.getComponent(i,k)],root))w+=sw.getComponent(i,k);return w;});};
function movesPastOnly(a,joint,angle,name,minMove=.01){
 const rest=verts(a),share=shareOn(a,joint),was=joint.rotation.x;
 joint.rotation.x+=angle;const bent=verts(a);joint.rotation.x=was;
 let before=0,past=0;rest.forEach((r,i)=>{const d=r.distanceTo(bent[i]);if(share[i]===0)before=Math.max(before,d);else if(share[i]>.999)past=Math.max(past,d);});
 assert(past>minMove,`${name}: the skin past ${joint.name} moved ${past.toFixed(3)}`);
 assert(before<1e-6,`${name}: the skin before ${joint.name} stayed (${before})`);
}

const NYMPHS=['wood nymph','water nymph','mountain nymph'];
const tip=o=>{o.updateMatrixWorld(true);return new THREE.Box3().setFromObject(o).max.clone();};
const make=name=>createCreature({name,symbol:110,color:2});

test('every nymph has head, neck, arms and legs as named joints',()=>{
 for(const name of NYMPHS){
  const a=make(name),j=a.joints;
  assert(j,name+' joints');
  assert.equal(j.head,a.head);
  for(const n of ['hips','spine0','spine1','neck0','neck1','neck2','neck3'])assert(j[n]?.isBone,name+' '+n);
  assert.equal(a.head.parent,j.neck3,'the head rides the top of the neck');
  for(const side of ['l','r'])for(const stem of ['fore','leg1']){
   const o=j[side+stem];
   assert(o,name+' '+side+stem);assert.equal(o.name,side+stem);
   assert.equal(o.position.x<0,side==='l','left is -x');
  }
  assert.equal(a.arms,undefined,'fidget.js swings an actor\'s arms: the nymph keeps beckon-driven arms');
  assert.equal(j.rfore,a.beckonArm,'the beckoning arm is the right one');
 }
});

test('turning an arm moves that arm only',()=>{
 const a=make('wood nymph'),j=a.joints;
 for(const key of ['lfore','rfore']){
  const other=j[key==='lfore'?'rfore':'lfore'],legs=a.legs.map(tip),before=tip(j[key]),otherBefore=tip(other),head=tip(a.head);
  j[key].rotation.x=.6;
  assert(tip(j[key]).distanceTo(before)>.005,key+' swung');
  assert(tip(other).distanceTo(otherBefore)<1e-6);
  a.legs.forEach((l,i)=>assert(tip(l).distanceTo(legs[i])<1e-6));
  assert(tip(a.head).distanceTo(head)<1e-6);
  j[key].rotation.x=0;
 }
});

test('turning a hip moves that leg only, and the head carries only its face',()=>{
 const a=make('water nymph'),j=a.joints;
 for(const key of ['lleg1','rleg1']){
  const other=j[key==='lleg1'?'rleg1':'lleg1'],before=tip(j[key]),otherBefore=tip(other),arm=tip(j.rfore);
  j[key].rotation.x=.5;
  assert(tip(j[key]).distanceTo(before)>.005);
  assert(tip(other).distanceTo(otherBefore)<1e-6);assert(tip(j.rfore).distanceTo(arm)<1e-6);
  j[key].rotation.x=0;
 }
 const torso=tip(j.lfore);j.head.rotation.y=.5;
 assert(tip(j.lfore).distanceTo(torso)<1e-6);
});

test('each arm is three bones of the one hide; the gold cuffs and the hand ride them',()=>{
 for(const name of NYMPHS){
  const a=make(name),j=a.joints;
  for(const side of ['l','r']){
   const bones=hideOf(a).skeleton.bones;
   for(let i=0;i<3;i++){assert(j[side+'fore_'+i]?.isBone,name+' '+side+'fore_'+i);assert(bones.includes(j[side+'fore_'+i]),name+' '+side+'fore_'+i+' is in the hide');}
   // the elbow carries the forearm's cuff and the wrist its hand; the shoulder bone carries the upper cuff
   const wrist=j[side+'fore_2'],elbow=j[side+'fore_1'];
   const handBox=side==='r'?a.beckonHand:wrist.children.find(c=>c.isGroup);
   assert(handBox&&handBox.parent===wrist,name+' '+side+' hand on the wrist bone');
   assert(elbow.children.some(c=>c.isMesh&&!c.isSkinnedMesh),name+' '+side+' wrist cuff on the elbow bone');
   assert(j[side+'fore_0'].children.some(c=>c.isMesh&&!c.isSkinnedMesh),name+' '+side+' upper cuff on the shoulder bone');
  }
 }
});

test('bending an elbow carries the forearm, its cuff and the hand, and leaves the upper arm and the other arm',()=>{
 const a=make('wood nymph'),j=a.joints;
 for(const side of ['l','r']){
  const other=j[side==='l'?'rfore':'lfore'],hand=side==='r'?a.beckonHand:j[side+'fore_2'].children.find(c=>c.isGroup);
  const wristAt=()=>{a.g.updateMatrixWorld(true);return new THREE.Vector3().setFromMatrixPosition(j[side+'fore_2'].matrixWorld);};
  const w0=wristAt(),shoulder=new THREE.Vector3().setFromMatrixPosition(j[side+'fore_0'].matrixWorld),o0=tip(other);
  j[side+'fore_1'].rotation.x=-1;
  const w1=wristAt();a.g.updateMatrixWorld(true);
  assert(w1.distanceTo(w0)>.05,side+' wrist swung with the elbow');
  assert(new THREE.Vector3().setFromMatrixPosition(j[side+'fore_0'].matrixWorld).distanceTo(shoulder)<1e-6,'the shoulder stayed');
  assert(tip(other).distanceTo(o0)<1e-6,'the other arm stayed');
  a.g.updateMatrixWorld(true);assert(new THREE.Vector3().setFromMatrixPosition(hand.matrixWorld).distanceTo(w1)<1e-6,'the hand is at the wrist');
  j[side+'fore_1'].rotation.x=0;
 }
});

test('the waist, the chest and the neck bend the skin past them and leave the skin before them',()=>{
 for(const name of NYMPHS){
  const a=make(name),j=a.joints;
  for(const n of ['neck1','spine0','spine1'])movesPastOnly(a,j[n],.5,name+' '+n);
  for(const side of ['l','r'])assert(under(j[side+'fore'],j.spine1),name+' '+side+' arm hangs from the chest');
 }
});

test('a stoop carries the head and the arms and leaves the hips and legs',()=>{
 const a=make('wood nymph'),j=a.joints,at=o=>{o.updateWorldMatrix(true,false);return o.getWorldPosition(new THREE.Vector3());};
 const head=at(a.head),hand=at(j.rfore_2),legs=a.legs.map(at),chest=j.spine1.children.find(c=>c.isGroup&&!c.name&&c.children.length),band=at(chest.children[0]);
 j.spine0.rotation.x=.4;j.spine1.rotation.x=.3;
 assert(at(a.head).y<head.y-.02&&at(a.head).z>head.z,'the head came forward and down');
 assert(at(j.rfore_2).distanceTo(hand)>.02,'the arms went with the chest');
 assert(at(chest.children[0]).distanceTo(band)>.01,'the halter, choker and chest band went with the chest');
 a.legs.forEach((l,i)=>assert(at(l).distanceTo(legs[i])<1e-9,'the legs stayed'));
});
