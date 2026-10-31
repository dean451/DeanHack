import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {partBox} from './part-box.js';
import {GOBLINS} from './goblin.js';

const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};

test('goblins and hobgoblins get their own models instead of the orc humanoid',()=>{
 const tops={};
 for(const name of GOBLINS){
  const a=createCreature({name,symbol:111,color:7});
  assert.equal(a.g.name,name);assert.equal(a.quirk,'orc');
  for(const key of ['body','head','arm','weaponSocket','eyes'])assert(a[key]?.isObject3D,`${name} ${key}`);
  assert.equal(a.legs.length,2);assert.equal(a.arms.length,2);assert.equal(a.arm,a.arms[1]);
  assert(a.weaponSocket.parent===a.joints.rfore_2&&a.arm.getObjectByName('rfore_2'),'the weapon is in the right fist, on the wrist bone');
  const parts=meshes(a);
  assert.equal(parts.length,4,`${name}: the hide, the head, the eyes and the weapon`);
  let verts=0;
  for(const m of parts){
   const at=m.geometry.attributes;verts+=at.position.count;
   for(const key of ['position','normal'])for(const v of at[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
   if(at.color)for(const v of at.color.array)assert(v>=0&&v<=1,`${name} ${m.userData.part} colour`);
  }
  assert(verts<40000,`${name}: ${verts} vertices`);
  assert.equal(new Set(parts.filter(m=>m.userData.part!=='eyes').map(m=>m.material)).size,1,'one shared material');
  a.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(a.g);
  assert(b.min.y>-.04&&b.min.y<.03,`${name}: feet at ${b.min.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.5,`${name}: out of the tile`);
  // the feet mirror each other
  const [l,r]=a.legs.map(leg=>partBox(a,leg));
  assert(Math.abs((l.min.x+l.max.x)/2+(r.min.x+r.max.x)/2)<1e-6,`${name}: feet mirrored`);
  tops[name]=b.max.y;
  const again=meshes(createCreature({name}));
  parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry,'geometry shared'));
 }
 assert(tops.goblin>.75&&tops.goblin<1,`goblin top ${tops.goblin}`);
 assert(tops.hobgoblin>1.05&&tops.hobgoblin<1.3,`hobgoblin top ${tops.hobgoblin}`);
 assert(tops.hobgoblin>tops.goblin+.2,'the hobgoblin stands well over the goblin');
 // real orcs keep the orc humanoid
 assert.notEqual(createCreature({name:'hill orc'}).g.name,'goblin');
});

test('the goblin trunk is faceted and its shoulders reach the arm joints',()=>{
 const a=createCreature({name:'goblin',symbol:111,color:7});
 const body=meshes(a).find(m=>m.userData.part==='body').geometry;
 body.computeBoundingBox();
 for(const arm of a.arms){
  const gap=Math.abs(arm.position.x)-body.boundingBox[arm.position.x<0?'min':'max'].x*Math.sign(arm.position.x);
  assert(gap<.04,`a shoulder joint stands ${gap.toFixed(3)} outboard of the trunk`);
 }
 // the gap between trunk and arm joint on each side is filled by a shoulder yoke
 const p=body.attributes.position;const yoke={'-1':0,'1':0};
 for(let i=0;i<p.count;i++)if(p.getY(i)>.6&&p.getY(i)<.7&&Math.abs(p.getX(i))>.135&&Math.abs(p.getX(i))<.155)yoke[Math.sign(p.getX(i))]++;
 assert(yoke[-1]>0&&yoke[1]>0,'both shoulders have a yoke');
 assert.equal(body.index,null,'flat faces, not a smoothed egg');
 // the trunk's own faces carry one normal each: a good share of the hide is flat, not smoothed
 const n=body.attributes.normal;let flat=0,tri=0;
 for(let i=0;i+8<n.count*3;i+=9){tri++;if(Math.abs(n.array[i]-n.array[i+3])+Math.abs(n.array[i+1]-n.array[i+4])+Math.abs(n.array[i+2]-n.array[i+5])<1e-4)flat++;}
 assert(flat/tri>.15,`only ${flat} of ${tri} faces are flat`);
});
