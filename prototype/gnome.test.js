import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {GNOMES} from './gnome.js';

const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};

test('gnomes, gnome lords, gnome kings and gnomish wizards get their own model instead of the box humanoid',()=>{
 const tops={};
 for(const name of GNOMES){
  const a=createCreature({name,symbol:71,color:3});
  assert.equal(a.g.name,name);assert.equal(a.quirk,'gnome');
  for(const key of ['body','head','arm','weaponSocket','hat','beard'])assert(a[key]?.isObject3D,`${name} ${key}`);
  assert.equal(a.legs.length,2);assert.equal(a.arms.length,2);assert.equal(a.arm,a.arms[1]);
  assert(a.weaponSocket.parent===a.joints.rfore_2,'the weapon is in the right fist, on the wrist bone');
  assert(a.hat.parent===a.head&&a.beard.parent===a.head,`${name}: the cap and beard ride the head`);
  const parts=meshes(a);
  // the tunic, arms and legs are one skinned hide; the head, cap, beard and weapon stay rigid
  assert.equal(parts.length,5,`${name}: the hide, head, cap, beard and weapon`);
  assert.equal(parts.filter(m=>m.isSkinnedMesh).length,1,`${name}: one skinned hide`);
  let verts=0;
  for(const m of parts){
   const at=m.geometry.attributes;verts+=at.position.count;
   for(const key of ['position','normal'])for(const v of at[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
   for(const v of at.color.array)assert(v>=0&&v<=1,`${name} ${m.userData.part} colour`);
  }
  assert(verts<40000,`${name}: ${verts} vertices`);
  assert.equal(new Set(parts.map(m=>m.material)).size,1,'one shared material');
  a.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(a.g);
  assert(b.min.y>-.03&&b.min.y<.03,`${name}: feet at ${b.min.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.5,`${name}: out of the tile`);
  // the gait turns the cap about its brim and the beard about the chin: those pivots sit on the head
  const brim=a.hat.localToWorld(new THREE.Vector3(0,-.18,0)),chin=a.beard.localToWorld(new THREE.Vector3(0,.19,0)),head=a.head.getWorldPosition(new THREE.Vector3());
  assert(brim.y>head.y&&brim.distanceTo(head)<.12,`${name}: cap brim on the crown`);
  assert(chin.y<head.y&&chin.distanceTo(head)<.13,`${name}: beard at the chin`);
  // the cap's tip (its highest-reaching lathe ring, the last vertices) flops back behind the brim
  const pos=a.hat.geometry.attributes.position,top=new THREE.Vector3(),tip=new THREE.Vector3(-1,-1,1e9);
  for(let i=0;i<pos.count;i++){top.fromBufferAttribute(pos,i);if(top.distanceTo(new THREE.Vector3(0,-.18,0))>.2&&top.z<tip.z)tip.copy(top);}
  a.hat.localToWorld(tip);
  assert(tip.z<brim.z-.1&&tip.y>brim.y+.12,`${name}: cap tip flops back (${tip.z-brim.z}, ${tip.y-brim.y})`);
  // (the legs are bones in the hide now: their ankles stand mirrored)
  const [l,r]=a.legs.map(leg=>leg.getObjectByName(leg.name+'_2').getWorldPosition(new THREE.Vector3()));
  assert(Math.abs(l.x+r.x)<1e-6&&Math.abs(l.y-r.y)<1e-6&&Math.abs(l.z-r.z)<1e-6,`${name}: feet mirrored`);
  tops[name]=b.max.y;
  const again=meshes(createCreature({name}));
  parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry,'geometry shared'));
 }
 for(const [name,top] of Object.entries(tops))assert(top>.95&&top<1.4,`${name} top ${top}`);
 assert(tops['gnome king']>tops.gnome,'the king stands taller');
 // an unlisted G still gets a gnome; gnome zombies and mummies keep their own models
 assert.equal(createCreature({name:'gnome ancestor',symbol:71}).quirk,'gnome');
 assert.notEqual(createCreature({name:'gnome zombie'}).g.name,'gnome');
});
