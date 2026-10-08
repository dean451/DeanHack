import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {foreLegs} from './monster-attacks.js';

const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
const NAMES=['kitten','housecat','large cat','jaguar','lynx','panther','tiger','displacer beast'];

test('cats get a shaped torso, a turning head with ears and whiskers, jointed legs, a tail and a painted coat',()=>{
 const sizes={};
 for(const [name,extra] of [...NAMES.map(n=>[n,{}]),['wildcat',{symbol:102,color:3}]]){
  const a=createCreature({name,...extra});
  assert.equal(a.quirk,'feline',name);
  assert.equal(a.legs.length,4,name);
  assert(a.body?.isObject3D&&a.head?.isObject3D&&a.tail?.isObject3D,name);
  assert(a.head.children.some(o=>o.isMesh&&o.userData.part==='head'),`${name}: the head handle carries the head`);
  assert(a.tail.children.some(o=>o.isMesh),`${name}: the tail handle carries the tail`);
  const parts=meshes(a);
  assert.equal(parts.length,8,`${name}: body, head, eyes, four legs and the tail`);
  assert.equal(new Set(parts.map(m=>m.material)).size,2,`${name}: fur and eyes`);
  let verts=0;
  for(const m of parts){
   const at=m.geometry.attributes;verts+=at.position.count;
   for(const key of ['position','normal'])for(const v of at[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
   for(const v of at.color.array)assert(v>=0&&v<=1,`${name} colour`);
  }
  assert(verts<36000,`${name}: ${verts} vertices`);
  a.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(a.g);
  assert(Math.abs(b.min.y)<.02,`${name} feet at ${b.min.y}`);
  assert(Math.max(-b.min.x,b.max.x)<.5,`${name} width ${JSON.stringify(b)}`);
  assert(Math.max(-b.min.z,b.max.z)<.95,`${name} length ${JSON.stringify(b)}`);
  // the head leads, the forelegs are the front pair (the pounce and swipe lift them)
  const hb=new THREE.Box3().setFromObject(a.head);
  assert(hb.max.z>b.max.z-.01,`${name}: the nose is the front of the cat`);
  assert.equal(foreLegs(a).length,2,`${name}: two forelegs`);
  const lx=a.legs.map(l=>new THREE.Box3().setFromObject(l)).map(bb=>(bb.min.x+bb.max.x)/2);
  assert(Math.abs(lx[0]+lx[2])<1e-6&&Math.abs(lx[1]+lx[3])<1e-6,`${name}: legs mirrored`);
  sizes[name]=b.max.z-b.min.z;
 }
 assert(sizes.tiger>sizes.housecat&&sizes.housecat>sizes.kitten,'tiger > housecat > kitten');
 // the coat is actually painted: a tiger's torso has both orange and near-black vertices
 const tiger=meshes(createCreature({name:'tiger'})).find(m=>m.userData.part==='body').geometry.attributes.color;
 let dark=0,orange=0;
 for(let i=0;i<tiger.count;i++){const r=tiger.getX(i),g=tiger.getY(i),b=tiger.getZ(i);if(r+g+b<.3)dark++;if(r>.6&&b<.3)orange++;}
 assert(dark>200&&orange>200,`tiger stripes: ${dark} dark, ${orange} orange`);
 // geometry and materials are shared between cats of one kind; kinds differ
 const [x,y]=[createCreature({name:'jaguar'}),createCreature({name:'jaguar'})].map(meshes);
 x.forEach((m,i)=>{assert.equal(m.geometry,y[i].geometry);assert.equal(m.material,y[i].material);});
 assert.notEqual(meshes(createCreature({name:'panther'}))[0].geometry,x[0].geometry);
});

test('every paw carries dark hooked claws: four per foot, in the same single leg mesh',()=>{
 for(const name of ['kitten','housecat','tiger']){
  const a=createCreature({name});
  for(const leg of a.legs){
   const m=leg.children.find(o=>o.isMesh),col=m.geometry.attributes.color,pos=m.geometry.attributes.position;
   let dark=0;
   for(let i=0;i<col.count;i++)if(col.getX(i)<.13&&col.getY(i)<.12&&col.getZ(i)<.12&&pos.getY(i)<.06-leg.position.y+.03)dark++;
   assert(dark>=4*12,`${name}: claw vertices ${dark}`);
  }
 }
});

test('the pet cats are scruffy: more geometry than a wild cat of the same build, a shorter torn left ear',()=>{
 const tri=name=>meshes(createCreature({name,symbol:102,color:3})).reduce((n,m)=>n+m.geometry.attributes.position.count,0);
 for(const name of ['kitten','housecat','large cat'])assert(tri(name)>tri('wildcat'),`${name} has tufts and a torn ear`);
 const ear=name=>{const h=meshes(createCreature({name})).find(m=>m.userData.part==='head').geometry;h.computeBoundingBox();return h.boundingBox;};
 for(const name of ['kitten','housecat','large cat']){const b=ear(name);assert(b.max.y>.1&&b.max.y<.2,`${name} head height ${b.max.y}`);}
});

test('the pet cats have bright curious eyes and ragged cheek fur',()=>{
 const eyes=name=>meshes(createCreature({name})).find(m=>m.userData.part==='eyes')?.material??meshes(createCreature({name}))[2].material;
 for(const name of ['kitten','housecat','large cat'])assert(eyes(name).emissiveIntensity>eyes('lynx').emissiveIntensity,`${name} eyes burn brighter`);
 const head=name=>meshes(createCreature({name,symbol:102,color:3})).find(m=>m.userData.part==='head').geometry.attributes.position.count;
 for(const name of ['kitten','housecat','large cat'])assert(head(name)>head('wildcat'),`${name} has cheek tufts`);
});

test('the pet cats show a knuckled spine and a tucked flank',()=>{
 const body=name=>meshes(createCreature({name,symbol:102,color:3})).find(m=>m.userData.part==='body').geometry.attributes.position.count;
 for(const name of ['kitten','housecat','large cat'])assert(body(name)>=body('wildcat')+7*30,`${name} body ${body(name)}`);
});

test('the pet cats carry an old pale scar across the face; wild cats do not',()=>{
 const scar=name=>{
  const col=meshes(createCreature({name,symbol:102,color:3})).find(m=>m.userData.part==='head').geometry.attributes.color;
  let n=0;for(let i=0;i<col.count;i++)if(col.getX(i)>.7&&col.getY(i)>.5&&col.getZ(i)>.42)n++;
  return n;
 };
 for(const name of ['kitten','housecat','large cat'])assert(scar(name)>scar('wildcat')+3,`${name} scar ${scar(name)} vs ${scar('wildcat')}`);
});

test('the pet cats\' eyes sit in dark hollows: the fur round each eye is far darker than the fur beyond',()=>{
 for(const name of ['kitten','housecat','large cat']){
  const m=meshes(createCreature({name})).find(o=>o.userData.part==='head').geometry;
  const col=m.attributes.color,pos=m.attributes.position;let lo=9,hi=0;
  for(let i=0;i<col.count;i++){
   const d=Math.hypot(Math.abs(pos.getX(i))-.041,pos.getY(i)-.026,pos.getZ(i)-.128),v=col.getX(i)+col.getY(i)+col.getZ(i);
   if(v>.1&&d>.024&&d<.034){lo=Math.min(lo,v);hi=Math.max(hi,v);}
  }
  assert(lo<hi*.4,`${name} eye ring ${lo} vs ${hi}`);
 }
});
