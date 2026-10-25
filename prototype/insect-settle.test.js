import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateInsectSettle, SETTLE, SETTLING, RISE, NEAR, restFor} from './insect-settle.js';

const NAMES=['giant ant','soldier ant','giant beetle','locust','killer bee','queen bee'];
const make=name=>{const a=createCreature({name,symbol:97,color:3});a.g.updateMatrixWorld(true);return a;};
const snap=a=>JSON.stringify([Object.values(a.joints).map(o=>o.rotation.toArray().slice(0,3)),a.body.position.toArray()]);
const run=(a,secs,busy=false,look=null)=>{let p=0;for(let i=0;i<Math.round(secs*20);i++)p=updateInsectSettle(a,.05,busy,look);return p;};

test('left alone, each settles to rest after the wait, and not before',()=>{
 for(const name of NAMES){const a=make(name),built=snap(a);
  assert.equal(run(a,SETTLE-.5),0,name);assert.equal(snap(a),built,`${name}: untouched while waiting`);
  assert.equal(run(a,SETTLING+1),1,name);assert.notEqual(snap(a),built,`${name}: moved`);
  assert(a.body.position.y<a.jointRest.body.y-1e-3,`${name}: body lowered`);}
});

test('never while moving or acting: a busy creature stays awake and the wait starts over',()=>{
 for(const name of NAMES){const a=make(name);run(a,SETTLE-1);
  assert.equal(run(a,5,true),0,name);
  assert.equal(run(a,SETTLE-1),0,`${name}: the wait began again`);}
});

test('a hero close by keeps it up; a far one does not',()=>{
 const a=make('giant ant'),p=a.g.position,near={x:p.x+NEAR-1,z:p.z},far={x:p.x+NEAR+3,z:p.z};
 assert.equal(run(a,SETTLE+SETTLING+1,false,near),0);
 assert.equal(run(a,SETTLE+SETTLING+1,false,far),1);
});

test('rising returns every joint and the body exactly to the awake values',()=>{
 for(const name of NAMES){const a=make(name),built=snap(a);
  run(a,SETTLE+SETTLING+1);assert.notEqual(snap(a),built);
  assert.equal(run(a,RISE+1,true),0,name);
  assert.equal(snap(a),built,`${name}: back exactly`);}
});

test('a mid-settle wake also returns exactly, and the pose is solved once per kind',()=>{
 const a=make('locust'),built=snap(a);
 run(a,SETTLE+SETTLING/2);const mid=updateInsectSettle(a,0,false);assert(mid>0&&mid<1);
 run(a,RISE+1,true);assert.equal(snap(a),built);
 assert.equal(restFor(a),restFor(make('locust')));
});

test('things that do not rest this way are left alone',()=>{
 const a=createCreature({name:'jackal',symbol:100,color:3});
 assert.equal(updateInsectSettle(a,1,false),0);assert.equal(a.insectRest,undefined);
});
