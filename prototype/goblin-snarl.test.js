import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GOBLINS,createGoblin} from './goblin.js';
import {ORCS,createOrc} from './orc.js';
import {createBugbear} from './bugbear.js';
import {createHobbit} from './hobbit.js';
import {snarlPose, snarls, SNARL, updateOrcSnarl, NEAR, DROP, RISE} from './goblin-snarl.js';
import {birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';

const FAMILY=[...GOBLINS.map(n=>[n,()=>createGoblin(n)]),...ORCS.map(n=>[n,()=>createOrc(n)])];
const make=([,build])=>{const a=build();a.g.updateMatrixWorld(true);return a;};
const lowest=a=>{let y=Infinity;const v=new THREE.Vector3();
 a.g.traverse(m=>{if(!m.isSkinnedMesh)return;m.updateMatrixWorld(true);m.skeleton.update();const n=m.geometry.attributes.position.count;
  for(let i=0;i<n;i++){m.getVertexPosition(i,v).applyMatrix4(m.matrixWorld);y=Math.min(y,v.y);}});return y;};

test('goblins and orcs snarl; the bugbear, the hobbit and nothing else do',()=>{
 for(const f of FAMILY)assert(snarls(make(f)),f[0]);
 assert(!snarls(createBugbear())&&!snarls(createHobbit())&&!snarls(null)&&!snarls({joints:{}}));
});

test('the snarl meets every goal under 2 cm on every goblin and orc',()=>{
 for(const f of FAMILY){const r=snarlPose(make(f));
  const worst=Math.max(...r.residuals.flat().map(v=>Math.abs(v)*100));
  assert(worst<2,`${f[0]}: worst goal ${worst.toFixed(2)} cm`);}
});

test('snarling: heels down, pelvis low, chest forward, hands wide and up, nothing through the floor',()=>{
 for(const f of FAMILY){const a=make(f),floor=a.g.position.y,{apply}=birdPoser(a),P=rolesOf(a),r=snarlPose(a);
  apply(r.pose);
  for(const s of ['l','r']){
   assert(P[`paw:${s}h`]().y-floor<.02,`${f[0]}: ${s} heel on the floor`);
   assert(P[`paw:${s}f`]().y-floor>SNARL.hands*r.stand-.05,`${f[0]}: ${s} hand up`);}
  assert(P['paw:rf']().distanceTo(P['paw:lf']())>SNARL.spread*r.stand-.05,`${f[0]}: hands wide`);
  assert(P.rump().y-floor<=SNARL.drop*r.stand+.02,`${f[0]}: pelvis low`);
  assert(P.withers().z-P.rump().z>SNARL.lean*r.stand-.05,`${f[0]}: chest forward`);
  assert(lowest(a)>floor-.02,`${f[0]}: lowest point ${((lowest(a)-floor)*100).toFixed(1)} cm`);}
});

test('solving leaves every joint and the body exactly at the built values',()=>{
 const a=make(FAMILY[0]),built={};
 for(const [n,o] of Object.entries(a.joints))built[n]=o.rotation.toArray().slice(0,3);
 const body=a.body.position.toArray();
 snarlPose(a);
 for(const [n,o] of Object.entries(a.joints))assert.deepEqual(o.rotation.toArray().slice(0,3),built[n],n);
 assert.deepEqual(a.body.position.toArray(),body);
});

test('in play: the hero close drops it, far or busy leaves it, and leaving returns every joint exactly',()=>{
 const a=make(['orc',()=>createOrc('hill orc')]),built={};
 for(const [n,o] of Object.entries(a.joints))built[n]=o.rotation.toArray().slice(0,3);
 const body=a.body.position.toArray(), at=a.g.position;
 const far={x:at.x+NEAR+2,z:at.z}, close={x:at.x+1,z:at.z};
 let t=0;const run=(secs,look,busy=false)=>{let p=0;for(let i=0;i<secs*20;i++){t+=.05;p=updateOrcSnarl(a,.05,t,busy,look);}return p;};
 assert.equal(run(2,far),0);
 assert.equal(run(DROP+.2,close,true),0,'busy: no snarl');
 assert.equal(run(DROP+.2,close),1);
 assert(a.body.position.y<body[1]-.05,'body dropped');
 assert(run(1,close)===1);
 assert(run(RISE/2,far)<1);
 assert.equal(run(RISE+.5,far),0);
 for(const [n,o] of Object.entries(a.joints))assert.deepEqual(o.rotation.toArray().slice(0,3),built[n],n);
 assert.deepEqual(a.body.position.toArray(),body);
});
