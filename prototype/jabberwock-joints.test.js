import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

// The creature plan, family J stage 1: the jabberwock's named joints, its tail on five bones and each arm and leg
// on its own bones, all skinned into one mesh per material (hide, blades, glow).
const KINDS=['jabberwock','vorpal jabberwock'];
const make=name=>createCreature({name,symbol:74,color:5});
const world=o=>{o.updateWorldMatrix(true,false);return o.getWorldPosition(new THREE.Vector3());};
const box=o=>{o.updateWorldMatrix(true,true);return new THREE.Box3().setFromObject(o);};
const skins=a=>a.body.children.filter(o=>o.isSkinnedMesh);
const ARM=['_0','_1','_2'],LEG=['_0','_1','_2','_3'],TRUNK=['hips','spine0','spine1','neck0','neck1','neck2','neck3'];
// every skinned vertex in world space, as the skin places it, with the bones it rides
const verts=a=>{
 a.g.updateMatrixWorld(true);const v=new THREE.Vector3(),out=[];
 for(const m of skins(a)){
  const si=m.geometry.attributes.skinIndex,sw=m.geometry.attributes.skinWeight;
  for(let i=0;i<m.geometry.attributes.position.count;i++){
   m.getVertexPosition(i,v);const on=[];
   for(let k=0;k<4;k++)if(sw.getComponent(i,k)>0)on.push([m.skeleton.bones[si.getComponent(i,k)],sw.getComponent(i,k)]);
   out.push({m,i,on,p:v.applyMatrix4(m.matrixWorld).clone()});
  }
 }
 return out;
};
// Turns `joint` and measures: how far the vertices riding only on it and the bones past it moved (per material),
// and how far those riding none of them moved.
function bend(a,joint,axis,by){
 const past=new Set();joint.traverse(o=>past.add(o));
 const rest=verts(a);joint.rotation[axis]+=by;const bent=verts(a);joint.rotation[axis]-=by;
 let before=0,moved=0;const byMaterial=new Map();
 rest.forEach(({m,on,p},n)=>{
  const w=on.reduce((t,[b,x])=>t+(past.has(b)?x:0),0),d=p.distanceTo(bent[n].p);
  if(w===0)before=Math.max(before,d);
  else if(w>.999){moved=Math.max(moved,d);byMaterial.set(m.material,Math.max(byMaterial.get(m.material)||0,d));}
 });
 return {before,moved,byMaterial};
}

test('every jabberwock has its head, jaw, arms, legs, wings, limb bones and five tail bones as named joints',()=>{
 for(const name of KINDS){
  const a=make(name),j=a.joints;
  assert(j,`${name}: joints`);
  assert.equal(j.head,a.head,name);
  // the trunk and neck: a chain of bones from the pelvis up the back and the neck, the head on the last
  TRUNK.forEach((n,i)=>{assert(j[n]?.isBone,`${name}: ${n}`);if(i)assert.equal(j[n].parent,j[TRUNK[i-1]],`${name}: ${n} on ${TRUNK[i-1]}`);});
  assert.equal(a.head.parent,j.neck3,`${name}: the head hangs on the top of the neck`);
  for(const o of [...a.arms,...a.wings])assert.equal(o.parent,j.spine1,`${name}: ${o.name} hangs on the chest`);
  for(const o of [...a.legs,a.tail])assert.equal(o.parent,a.body,`${name}: ${o.name} stays on the pelvis`);
  assert.equal(j.jaw,a.jaw,name);assert.equal(j.jaw.parent,j.head,`${name}: the jaw hangs on the head`);
  for(const [stem,list,bones] of [['fore',a.arms,ARM],['leg1',a.legs,LEG],['wing',a.wings,[]]])for(const side of ['l','r']){
   const o=j[side+stem];
   assert(o&&list.includes(o),`${name}: ${side}${stem}`);
   assert.equal(o.position.x<0,side==='l',`${name}: ${side}${stem}, left is -x`);
   assert.equal(a.g.getObjectByName(side+stem),o,`${name}: ${side}${stem} named`);
   bones.forEach((b,i)=>{
    const bone=j[side+stem+b];
    assert(bone?.isBone,`${name}: ${side}${stem}${b}`);
    assert.equal(bone.parent,i?j[side+stem+bones[i-1]]:o,`${name}: ${side}${stem}${b} hangs on the one before (the first on the limb group)`);
   });
  }
  for(let i=0;i<5;i++)assert(j[`tail${i}`]?.isBone,`${name}: tail${i}`);
  assert.equal(j.tail0.parent,a.tail,`${name}: the chain hangs on the tail pivot`);
  for(let i=1;i<5;i++)assert.equal(j[`tail${i}`].parent,j[`tail${i-1}`],`${name}: tail${i} on tail${i-1}`);
  const s=skins(a);
  assert.equal(s.length,3,`${name}: hide, blades and glow, each one skinned mesh`);
  assert.equal(new Set(s.map(m=>m.material)).size,3,`${name}: one skin per material`);
  for(const o of [a.tail,...a.arms,...a.legs]){let loose=0;o.traverse(m=>{if(m.isMesh)loose++;});assert.equal(loose,0,`${name}: nothing left on ${o.name} but its bones`);}
  let n=0,skinned=0;a.g.traverse(o=>{if(o.isMesh){n++;if(o.isSkinnedMesh)skinned++;}});
  assert(n<=14,`${name}: the trunk joins the limbs' skins (14 meshes, 17 before): ${n}`);
  assert.equal(skinned,3,`${name}: three skinned draws for trunk, limbs and tail, as when only the tail was skinned`);
  assert(!a.body.children.some(o=>o.isMesh&&!o.isSkinnedMesh),`${name}: nothing plain left on the body`);
  assert.equal(new Set(Object.values(j)).size,Object.keys(j).length,`${name}: every joint its own`);
 }
});

test('at rest the skins sit exactly where the plain parts did',()=>{
 for(const name of KINDS){
  const a=make(name);
  for(const {m,i,p} of verts(a)){
   const plain=new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,i).applyMatrix4(m.matrixWorld);
   assert(p.distanceTo(plain)<1e-6,`${name}: vertex ${i} moved ${p.distanceTo(plain)}`);
  }
 }
});

test('bending a tail joint moves the tail past it, crescent blade and glow too, and nothing before it',()=>{
 for(const name of KINDS){
  const a=make(name),j=a.joints,root=world(j.tail0),head=world(a.head),legs=a.legs.map(world);
  const {before,moved,byMaterial}=bend(a,j.tail2,'x',.7);
  assert(moved>.03,`${name}: the tail past the joint moved ${moved}`);
  assert(before<1e-6,`${name}: everything before the joint stayed (${before})`);
  for(const m of skins(a))assert((byMaterial.get(m.material)||0)>.03,`${name}: the ${m.material.emissiveIntensity>1?'glow':'blade or hide'} followed`);
  assert(world(j.tail0).distanceTo(root)<1e-9,`${name}: the root stayed`);
  assert(world(a.head).distanceTo(head)<1e-9,`${name}: the head stayed`);
  a.legs.forEach((l,i)=>assert(world(l).distanceTo(legs[i])<1e-9,`${name}: leg ${i} stayed`));
 }
});

test('bending a neck or spine joint carries the neck, head, fins and everything past it, and nothing before it',()=>{
 for(const name of KINDS){
  const a=make(name),j=a.joints,legs=a.legs.map(world),tail=world(a.tail);
  for(const [n,axis,by] of [['neck1','x',.6],['neck2','y',.6],['spine1','x',.4],['spine0','x',.4]]){
   const head=world(a.head),eyes=world(a.head.children.find(o=>o.userData.part==='eyes')),wing=world(a.wings[0]);
   const {before,moved,byMaterial}=bend(a,j[n],axis,by);
   assert(moved>.02,`${name}: past ${n} moved ${moved}`);
   assert(before<1e-6,`${name}: everything not on ${n} or past it stayed (${before})`);
   for(const m of skins(a))assert((byMaterial.get(m.material)||0)>.01,`${name}: ${n} carried its ${m.material.emissiveIntensity>1?'glow':'blade or hide'}`);
   // the head (plain meshes on its group) goes with the neck, and with the trunk the wings too
   j[n].rotation[axis]+=by;
   assert(world(a.head).distanceTo(head)>.02,`${name}: the head followed ${n}`);
   assert(world(a.head.children.find(o=>o.userData.part==='eyes')).distanceTo(eyes)>.02,`${name}: the eyes followed ${n}`);
   if(n.startsWith('spine'))assert(world(a.wings[0]).distanceTo(wing)>.01,`${name}: the wing followed ${n}`);
   else assert(world(a.wings[0]).distanceTo(wing)<1e-9,`${name}: the wing stayed when ${n} turned`);
   a.legs.forEach((l,i)=>assert(world(l).distanceTo(legs[i])<1e-9,`${name}: leg ${i} stayed`));
   assert(world(a.tail).distanceTo(tail)<1e-9,`${name}: the tail stayed`);
   j[n].rotation[axis]-=by;
  }
 }
});

test('an elbow, wrist, knee or ankle carries the arm or leg past it, talons, claws and blades too, and nothing else',()=>{
 for(const name of KINDS){
  const a=make(name),j=a.joints;
  for(const side of ['l','r'])for(const n of [`${side}fore_1`,`${side}fore_2`,`${side}leg1_1`,`${side}leg1_2`,`${side}leg1_3`]){
   const {before,moved,byMaterial}=bend(a,j[n],'x',.6);
   assert(moved>.02,`${name}: past ${n} moved ${moved}`);
   assert(before<1e-6,`${name}: everything not on ${n} or past it stayed (${before})`);
   for(const m of skins(a))assert((byMaterial.get(m.material)||0)>.005,`${name}: ${n} carried its ${m.material.emissiveIntensity>1?'glow':'blade or hide'}`);
  }
 }
});

test('the toes and their claws ride the foot bone alone, the talons the wrist',()=>{
 for(const name of KINDS){
  const a=make(name),j=a.joints,all=verts(a);
  for(const side of ['l','r']){
   // past each limb's last joint, along the line from the joint before it
   for(const [last,prev] of [[`${side}leg1_3`,`${side}leg1_2`],[`${side}fore_2`,`${side}fore_1`]]){
    const at=world(j[last]),dir=at.clone().sub(world(j[prev])).normalize(),stem=last.slice(0,-1);
    const tips=all.filter(v=>v.on.some(([o])=>o.name.startsWith(stem))&&v.p.clone().sub(at).dot(dir)>.03);
    assert(tips.length>50,`${name}: ${tips.length} vertices past ${last}`);
    assert(tips.every(v=>v.on.length===1&&v.on[0][0]===j[last]),`${name}: everything past ${last} rides it alone`);
   }
  }
 }
});

test('turning a limb, wing or the head moves that part only',()=>{
 for(const name of KINDS){
  const a=make(name),j=a.joints;
  for(const n of ['lfore','rfore','lleg1','rleg1']){
   const {before,moved}=bend(a,j[n],'x',.5);
   assert(moved>.01,`${name}: ${n} turned`);
   assert(before<1e-6,`${name}: the other skins stayed when ${n} turned (${before})`);
  }
  const parts=['lwing','rwing','head'];
  for(const n of parts){
   const o=j[n],others=parts.filter(k=>k!==n).map(k=>[k,box(j[k])]),turned=box(o).max.clone(),rest=verts(a);
   o.rotation.x+=.5;
   assert(box(o).max.distanceTo(turned)>.01,`${name}: ${n} turned`);
   for(const [k,b] of others)assert(box(j[k]).equals(b),`${name}: ${k} stayed when ${n} turned`);
   const now=verts(a);assert(rest.every((v,i)=>v.p.distanceTo(now[i].p)<1e-9),`${name}: the skins stayed when ${n} turned`);
   o.rotation.x-=.5;
  }
 }
});

test('a freshly built jabberwock measures the same before its first frame as after it',()=>{
 for(const name of KINDS){
  // (a skinned mesh caches its box, so the box after a frame is measured on a second jabberwock)
  const fresh=new THREE.Box3().setFromObject(make(name).g),b=make(name);
  b.g.updateMatrixWorld(true);
  const after=new THREE.Box3().setFromObject(b.g);
  assert(fresh.min.distanceTo(after.min)<1e-6&&fresh.max.distanceTo(after.max)<1e-6,`${name}: box ${fresh.min.toArray()} ${fresh.max.toArray()} against ${after.min.toArray()} ${after.max.toArray()}`);
 }
});
