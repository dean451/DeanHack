import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {foreLegs} from './monster-attacks.js';

const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh&&o.userData.part!=='flame')l.push(o);});return l;};
const NAMES=['jackal','werejackal','coyote','fox','dingo','wolf','werewolf','warg','winter wolf cub','winter wolf','hell hound pup','hell hound'];

test('wild dogs get a shaped torso, a turning head with a muzzle and ears, jointed legs, a brush tail and a painted coat',()=>{
 const sizes={};
 for(const [name,extra] of [...NAMES.map(n=>[n,{}]),['dingo',{symbol:100,color:3}],['winter wolf',{symbol:100,color:6}],['jackalwere',{symbol:100,color:3}]]){
  const a=createCreature({name,...extra});
  assert.equal(a.quirk,'canine',name);
  assert.equal(a.legs.length,4,name);
  assert(a.body?.isObject3D&&a.head?.isObject3D&&a.tail?.isObject3D,name);
  assert(a.head.children.some(o=>o.isMesh&&o.userData.part==='head'),`${name}: the head handle carries the head`);
  assert(a.tail.children.some(o=>o.isMesh&&o.userData.part==='tail'),`${name}: the tail handle carries the tail`);
  const parts=meshes(a);
  assert.equal(parts.length,8,`${name}: body, head, eyes, four legs and the tail`);
  assert.equal(new Set(parts.map(m=>m.material)).size,2,`${name}: fur and eyes`);
  let verts=0;
  for(const m of parts){
   const at=m.geometry.attributes;verts+=at.position.count;
   for(const key of ['position','normal'])for(const v of at[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
   if(at.color)for(const v of at.color.array)assert(v>=0&&v<=1,`${name} colour`);
  }
  assert(verts<40000,`${name}: ${verts} vertices`);
  a.g.updateMatrixWorld(true);
  const b=new THREE.Box3();for(const m of parts)b.expandByObject(m);
  assert(Math.abs(b.min.y)<.02,`${name} feet at ${b.min.y}`);
  assert(Math.max(-b.min.x,b.max.x)<.5,`${name} width ${JSON.stringify(b)}`);
  assert(Math.max(-b.min.z,b.max.z)<.95,`${name} length ${JSON.stringify(b)}`);
  const hb=new THREE.Box3().setFromObject(a.head);
  assert(hb.max.z>b.max.z-.01,`${name}: the nose is the front of the dog`);
  assert.equal(foreLegs(a).length,2,`${name}: two forelegs`);
  const lx=a.legs.map(l=>new THREE.Box3().setFromObject(l)).map(bb=>(bb.min.x+bb.max.x)/2);
  assert(Math.abs(lx[0]+lx[2])<1e-6&&Math.abs(lx[1]+lx[3])<1e-6,`${name}: legs mirrored`);
  sizes[name]=b.max.y;
 }
 assert(sizes.warg>sizes.wolf&&sizes.wolf>sizes.jackal&&sizes.jackal>sizes.fox,'warg > wolf > jackal > fox');
 // the coat is painted: a fox's torso is mostly red with a white belly and chest
 const fox=meshes(createCreature({name:'fox'})).find(m=>m.userData.part==='body').geometry.attributes.color;
 let red=0,white=0;
 for(let i=0;i<fox.count;i++){const r=fox.getX(i),g=fox.getY(i),bl=fox.getZ(i);if(r>.5&&bl<.25)red++;if(g>.6&&bl>.5)white++;}
 assert(red>300&&white>100,`fox coat: ${red} red, ${white} white`);
 // geometry and materials are shared between dogs of one kind; kinds differ
 const [x,y]=[createCreature({name:'wolf'}),createCreature({name:'wolf'})].map(meshes);
 x.forEach((m,i)=>{assert.equal(m.geometry,y[i].geometry);assert.equal(m.material,y[i].material);});
 assert.notEqual(meshes(createCreature({name:'coyote'}))[0].geometry,x[0].geometry);
});

test('winter wolves are frost-white with ice-blue eyes, rime in the coat and icicles hanging from the belly and chin',()=>{
 for(const name of ['winter wolf cub','winter wolf']){
  const a=createCreature({name,symbol:100,color:6}),parts=meshes(a);
  const eye=parts.find(m=>m.userData.part==='eyes').material;
  assert(eye.emissive.b>eye.emissive.r&&eye.emissiveIntensity>=1,`${name}: glowing ice-blue eyes`);
  // the cyan glyph colour is not used: the coat is near white
  const body=parts.find(m=>m.userData.part==='body').geometry,c=body.attributes.color,p=body.attributes.position;
  let pale=0,ice=0,below=0;
  const Y=a.legs[0].position.y;
  for(let i=0;i<c.count;i++){
   const r=c.getX(i),g=c.getY(i),bl=c.getZ(i);
   if(r>.5&&g>.6&&bl>.65)pale++;
   if(bl>r+.25&&bl>.4){ice++;if(p.getY(i)<Y-.06)below++;}
  }
  assert(pale>c.count*.3,`${name}: pale coat ${pale}/${c.count}`);
  assert(ice>200&&below>60,`${name}: icicles below the belly (${ice} ice, ${below} hanging)`);
  const head=parts.find(m=>m.userData.part==='head').geometry;
  let chin=0;for(let i=0;i<head.attributes.color.count;i++)if(head.attributes.color.getZ(i)>head.attributes.color.getX(i)+.25&&head.attributes.position.getY(i)<-.07)chin++;
  assert(chin>10,`${name}: icicle beard ${chin}`);
 }
 const cub=new THREE.Box3().setFromObject(createCreature({name:'winter wolf cub'}).g),adult=new THREE.Box3().setFromObject(createCreature({name:'winter wolf'}).g);
 assert(adult.max.y>cub.max.y+.1,'the adult towers over the cub');
 // wolves without frost keep no icicles
 const wolf=meshes(createCreature({name:'wolf'})).find(m=>m.userData.part==='body').geometry.attributes.color;
 for(let i=0;i<wolf.count;i++)assert(!(wolf.getZ(i)>wolf.getX(i)+.25&&wolf.getZ(i)>.4),'grey wolf has no ice');
});

test('a were in human form is not drawn as a dog',()=>{
 for(const name of ['werejackal','werewolf']){
  assert.equal(createCreature({name,symbol:100,color:3}).quirk,'canine',name);
  assert.notEqual(createCreature({name,symbol:64,color:3}).quirk,'canine',`${name} as @`);
 }
});

test('pet dogs share the canine build with a collar, a tongue, breed ears and a raised tail for wagging',()=>{
 let last=0;
 for(const name of ['little dog','dog','large dog']){
  const a=createCreature({name,symbol:100,color:15});
  assert.equal(a.quirk,'dog',name);
  assert(a.head?.isObject3D&&a.tail?.isObject3D,name);
  const parts=meshes(a);
  assert.equal(parts.length,8,`${name}: body, head, eyes, four legs and the tail`);
  assert.equal(new Set(parts.map(m=>m.material)).size,2,name);
  for(const m of parts)for(const key of ['position','normal'])for(const v of m.geometry.attributes[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
  a.g.updateMatrixWorld(true);
  const b=new THREE.Box3();for(const m of parts)b.expandByObject(m);
  assert(Math.abs(b.min.y)<.02,`${name} feet at ${b.min.y}`);
  assert(Math.max(-b.min.x,b.max.x)<.4&&Math.max(-b.min.z,b.max.z)<.8,`${name} ${JSON.stringify(b)}`);
  assert.equal(foreLegs(a).length,2,name);
  // the tail is carried up: its tip is above where it leaves the rump
  const t=new THREE.Box3().setFromObject(a.tail),root=a.tail.getWorldPosition(new THREE.Vector3());
  assert(t.max.y>root.y+.1*a.g.scale.y,`${name}: tail up`);
  // collar and tongue colours are in the body and head (vertex colours are linear)
  const has=(part,test)=>{const c=parts.find(m=>m.userData.part===part).geometry.attributes.color;for(let i=0;i<c.count;i++)if(test(c.getX(i),c.getY(i),c.getZ(i)))return true;return false;};
  assert(has('head',(r,g,bl)=>r>.6&&g<.25&&bl>g&&bl<.3),`${name}: pink tongue`);
  assert(has('body',(r,g,bl)=>r>.6&&g>.35&&bl<.1),`${name}: brass tag`);
  assert(b.max.y>last,`${name} taller than the smaller breed`);last=b.max.y;
 }
});

test('Cerberus is a three-headed hound with spiked collars, a viper mane and a serpent tail, not a red jackal',()=>{
 const a=createCreature({name:'Cerberus',symbol:100,color:1});
 assert.equal(a.quirk,'canine');assert.equal(a.legs.length,4);
 assert.equal(a.heads.length,3,'three heads');
 assert.equal(a.heads[1],a.head,'the middle head is the head handle');
 assert(a.heads[0].position.x<0&&a.heads[2].position.x>0,'left, middle, right');
 assert(a.heads[0].rotation.y<0&&a.heads[2].rotation.y>0,'the side heads look outward');
 for(const h of a.heads)assert(h.children.some(o=>o.userData.part==='head')&&h.children.some(o=>o.userData.part==='eyes'));
 const parts=meshes(a);
 assert.equal(parts.length,12,'body, three heads, three eyes, four legs and the tail');
 assert.equal(new Set(parts.map(m=>m.material)).size,2,'fur and eyes');
 for(const m of parts)for(const key of ['position','normal'])for(const v of m.geometry.attributes[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
 a.g.updateMatrixWorld(true);
 const b=new THREE.Box3();for(const m of parts)b.expandByObject(m,true);
 const hound=new THREE.Box3().setFromObject(createCreature({name:'hell hound'}).g,true);
 assert(b.min.y>-.03&&b.max.y>hound.max.y,'stands on the floor, bigger than a hell hound');
 assert(b.max.x-b.min.x>hound.max.x-hound.min.x+.3,'the heads spread him wide');
 assert(a.tail.children[0].geometry.attributes.position.count>3000,'a scaled serpent tail with a head');
 assert.equal(createCreature({name:'jackal'}).heads,undefined,'one head on other dogs');
});
