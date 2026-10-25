import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateInsectAlarm, raisedFor, ALARM, LIFT, LOWER, TREMBLE} from './insect-alarm.js';
import {rolesOf} from './body-roles.js';

const ANTS=['giant ant','soldier ant','snow ant','fire ant'];
const make=name=>{const a=createCreature({name,symbol:97,color:3});a.g.updateMatrixWorld(true);return a;};
const snap=a=>JSON.stringify([Object.values(a.joints).map(o=>o.rotation.toArray().slice(0,3)),a.body.position.toArray()]);
const run=(a,secs,busy=false,look=null,t0=0)=>{let p=0;const n=Math.round(secs*20);for(let i=0;i<n;i++)p=updateInsectAlarm(a,.05,t0+i*.05,busy,look);return p;};
const heroAt=(a,d)=>({x:a.g.position.x+d,z:a.g.position.z});

test('a hero close by raises the gaster over the back; a far one does not',()=>{
 for(const name of ANTS){const a=make(name),built=snap(a);
  assert.equal(run(a,3,false,heroAt(a,ALARM+2)),0,name);assert.equal(snap(a),built,`${name}: untouched`);
  assert.equal(run(a,LIFT+.5,false,heroAt(a,ALARM-1)),1,name);
  a.g.updateMatrixWorld(true);const P=rolesOf(a);
  assert(P.tailtip().y>P.withers().y,`${name}: sting over the withers`);}
});

test('once up it trembles within the set amount',()=>{
 const a=make('giant ant'),look=heroAt(a,1),xs=[];
 run(a,LIFT+.5,false,look);
 for(let i=0;i<40;i++){updateInsectAlarm(a,.05,10+i*.05,false,look);xs.push(a.joints.tail0.rotation.x);}
 assert(Math.max(...xs)-Math.min(...xs)>TREMBLE,'moves');
 assert(Math.max(...xs)-Math.min(...xs)<=2*TREMBLE+1e-9,'but only a little');
});

test('never while moving or acting',()=>{
 const a=make('giant ant'),built=snap(a);
 assert.equal(run(a,3,true,heroAt(a,1)),0);assert.equal(snap(a),built);
});

test('the hero leaving, or the ant moving, brings the gaster down and back exactly',()=>{
 for(const name of ANTS){const a=make(name),built=snap(a);
  run(a,LIFT+1,false,heroAt(a,1));assert.notEqual(snap(a),built);
  assert.equal(run(a,LOWER+.5,false,heroAt(a,ALARM+3)),0,name);assert.equal(snap(a),built,`${name}: back exactly`);
  run(a,LIFT+1,false,heroAt(a,1));
  assert.equal(run(a,LOWER+.5,true,heroAt(a,1)),0,name);assert.equal(snap(a),built,`${name}: back exactly when it moves`);}
});

test('a half-raised gaster also returns exactly, and the pose is solved once per kind',()=>{
 const a=make('soldier ant'),built=snap(a);
 run(a,LIFT/2,false,heroAt(a,1));const mid=updateInsectAlarm(a,0,0,false,heroAt(a,1));assert(mid>0&&mid<1);
 run(a,LOWER+.5,false,null);assert.equal(snap(a),built);
 assert.equal(raisedFor(a),raisedFor(make('soldier ant')));
});

test('beetles, locusts, bees and other creatures are left alone',()=>{
 for(const name of ['giant beetle','locust','killer bee','jackal']){const a=createCreature({name,symbol:97,color:3});
  assert.equal(updateInsectAlarm(a,1,0,false,{x:0,z:0}),0,name);assert.equal(a.antAlarm,undefined,name);}
});
