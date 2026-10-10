import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {KOBOLDS} from './kobold.js';

const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};

test('kobolds get their own scaly, tailed model instead of the short humanoid',()=>{
 const tops={};
 for(const name of KOBOLDS){
  const a=createCreature({name,symbol:107,color:1});
  assert.equal(a.g.name,name);assert.equal(a.quirk,'kobold');
  for(const key of ['body','head','arm','weaponSocket','eyes','tail'])assert(a[key]?.isObject3D,`${name} ${key}`);
  assert.equal(a.legs.length,2);assert.equal(a.arms.length,2);assert.equal(a.arm,a.arms[1]);
  assert.equal(a.weaponSocket.parent,a.arm,'the weapon is in the right fist');
  const parts=meshes(a);
  assert.equal(parts.length,9,`${name}: one mesh per moving part, plus the eyes`);
  let verts=0;
  for(const m of parts){
   const at=m.geometry.attributes;verts+=at.position.count;
   for(const key of ['position','normal'])for(const v of at[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
   if(at.color)for(const v of at.color.array)assert(v>=0&&v<=1,`${name} ${m.userData.part} colour`);
  }
  assert(verts<30000,`${name}: ${verts} vertices`);
  assert.equal(new Set(parts.filter(m=>m.userData.part!=='eyes').map(m=>m.material)).size,1,'one shared material');
  a.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(a.g);
  assert(b.min.y>-.04&&b.min.y<.03,`${name}: feet at ${b.min.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.5,`${name}: out of the tile`);
  const [l,r]=a.legs.map(leg=>new THREE.Box3().setFromObject(leg));
  assert(Math.abs((l.min.x+l.max.x)/2+(r.min.x+r.max.x)/2)<1e-6,'feet mirrored');
  // the tail trails out behind
  const t=new THREE.Box3().setFromObject(a.tail);
  assert(t.min.z<b.min.z+.01&&t.min.z<-.25,`${name}: tail reaches ${t.min.z}`);
  tops[name]=b.max.y;
 }
 // small folk: under a hobgoblin, with the large kobold and lord standing over the plain kobold
 const hob=new THREE.Box3().setFromObject(createCreature({name:'hobgoblin'}).g);
 assert(tops.kobold>.7&&tops.kobold<.95,`kobold top ${tops.kobold}`);
 for(const name of KOBOLDS)assert(tops[name]<hob.max.y,`${name} under a hobgoblin`);
 assert(tops['large kobold']>tops.kobold+.08&&tops['kobold lord']>tops.kobold+.08);
 // an unlisted k falls back on the plain kobold, and geometry is shared per kind
 assert.equal(createCreature({name:'kobold thing',symbol:107}).g.name,'kobold');
 const a=meshes(createCreature({name:'kobold lord'})),again=meshes(createCreature({name:'kobold lord'}));
 a.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry,'geometry shared'));
});

test('plain and large kobolds have snapped their left horn; the lord and shaman keep both',()=>{
 const top=(name,side)=>{const a=createCreature({name});let m=-1;a.head.traverse(o=>{if(o.isMesh&&o.userData.part==='head'){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);if(x*side>.03&&p.getZ(i)<.02)m=Math.max(m,y);}}});return m;};
 for(const n of ['kobold','large kobold'])assert(top(n,-1)<top(n,1)-.02,`${n}: left horn is a stub`);
 for(const n of ['kobold lord','kobold shaman'])assert(Math.abs(top(n,-1)-top(n,1))<1e-6,`${n}: matched horns`);
});

test('the kobold spear points its head forward, not back (forward is +z, see ORIENTATION.md)', async () => {
  const THREE = await import('three');
  const {createCreature} = await import('./creatures.js');
  const k = createCreature({name: 'kobold', symbol: 107, color: 3});
  const weapon = k.weaponSocket.children.find(o => o.userData.part === 'weapon');
  const pos = weapon.geometry.attributes.position;
  let tip = new THREE.Vector3(0, -1, 0), tail = new THREE.Vector3(0, 1, 0);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); if (v.y > tip.y) tip.copy(v); if (v.y < tail.y) tail.copy(v); }
  assert(tip.z > tail.z + .1, `the spearhead (${tip.z.toFixed(3)}) is ahead of the butt (${tail.z.toFixed(3)})`);
});
