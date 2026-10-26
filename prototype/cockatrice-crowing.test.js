import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateCockatriceCrow, crowFor, crowWeight, RISE, FALL, FIRST, GAP, TREMBLE} from './cockatrice-crowing.js';
import {updateCockatriceSettle} from './cockatrice-settle.js';
import {rolesOf} from './body-roles.js';
import {CROW} from './cockatrice-crow.js';

const FAMILY=['chickatrice','cockatrice','pyrolisk'];
const make=name=>{const a=createCreature({name,symbol:99,color:11});a.g.updateMatrixWorld(true);return a;};
const snap=a=>JSON.stringify([Object.values(a.joints).map(o=>o.rotation.toArray().slice(0,3)),a.body.position.toArray()]);
const far=a=>({x:a.g.position.x+9,z:a.g.position.z});
// runs secs of game time, returns the largest weight seen
const run=(a,secs,busy=false,look=null,t0=0)=>{let m=0;const n=Math.round(secs*20);for(let i=0;i<n;i++)m=Math.max(m,updateCockatriceCrow(a,.05,t0+i*.05,busy,look));return m;};
const startCrow=a=>{updateCockatriceCrow(a,.05,0,false,far(a));a.fowlCrow.wait=0;run(a,.6,false,far(a),1);};
const FIRST_MAX=FIRST[0]+FIRST[1];

test('the weight rises fast, holds, falls slower, and is zero outside the crow',()=>{
 assert.equal(crowWeight(-1),0);assert.equal(crowWeight(0),0);assert.equal(crowWeight(CROW.seconds),0);assert.equal(crowWeight(NaN),0);
 assert.equal(crowWeight(RISE),1);assert.equal(crowWeight(CROW.seconds/2),1);
 assert(crowWeight(CROW.seconds-FALL/2)<1&&crowWeight(CROW.seconds-FALL/2)>0);
});

test('a standing bird crows after its wait, with the beak up, and not before',()=>{
 for(const name of FAMILY){const a=make(name),built=snap(a);
  assert.equal(run(a,FIRST[0]-.5,false,far(a)),0,name);assert.equal(snap(a),built,`${name}: untouched before`);
  run(a,FIRST_MAX+.5,false,far(a),10);
  const b=make(name);let top=0,mouth=-1e9;
  for(let i=0;i<Math.round((FIRST_MAX+CROW.seconds+1)*20);i++){const w=updateCockatriceCrow(b,.05,i*.05,false,far(b));if(w>top){top=w;b.g.updateMatrixWorld(true);mouth=Math.max(mouth,rolesOf(b).mouth().y);}}
  assert.equal(top,1,name);
  assert(mouth>rolesOf(make(name)).mouth().y+.05*b.g.scale.x,`${name}: beak thrown up`);}
});

test('it crows again after a gap, and each crow is no longer than the measured crow',()=>{
 const a=make('cockatrice');let starts=0,was=0,len=0,longest=0;
 for(let i=0;i<20*(FIRST_MAX+3*(GAP[0]+GAP[1])+4*CROW.seconds);i++){
  const w=updateCockatriceCrow(a,.05,i*.05,false,far(a));
  if(w>0&&!was){starts++;len=0;}if(w>0)len+=.05;longest=Math.max(longest,len);was=w;}
 assert(starts>=3,`crowed ${starts} times`);assert(longest<=CROW.seconds+.1);
});

test('never while walking, acting, the hero close by, or already settled',()=>{
 const a=make('cockatrice'),built=snap(a);
 assert.equal(run(a,FIRST_MAX+3,true,far(a)),0);assert.equal(snap(a),built);
 assert.equal(run(a,FIRST_MAX+3,false,{x:a.g.position.x+1,z:a.g.position.z}),0);assert.equal(snap(a),built);
 const dead=make('pyrolisk');dead.actions={dead:true};assert.equal(run(dead,FIRST_MAX+3,false,far(dead)),0);
 const resting=make('chickatrice');resting.fowlRest={p:.5};assert.equal(run(resting,FIRST_MAX+3,false,far(resting)),0);
});

test('while held it trembles only a little',()=>{
 const a=make('cockatrice'),xs=[];
 run(a,FIRST_MAX+.3,false,far(a));
 const prev=a.fowlCrow;prev.wait=0;
 for(let i=0;i<40;i++){updateCockatriceCrow(a,.05,i*.05,false,far(a));if(a.fowlCrow.s>RISE+.1&&a.fowlCrow.s<CROW.seconds-FALL)xs.push(a.joints.neck0.rotation.x);}
 assert(xs.length>5);assert(Math.max(...xs)-Math.min(...xs)<=2*TREMBLE+.05);
});

test('moving, acting or the hero coming near ends a crow, and every joint is back exactly (also mid-crow)',()=>{
 for(const name of FAMILY){for(const how of ['busy','near']){const a=make(name),built=snap(a);
  startCrow(a);assert.notEqual(snap(a),built,`${name}: crowing`);
  const look=how==='near'?{x:a.g.position.x+1,z:a.g.position.z}:far(a);
  run(a,1,how==='busy',look,100);assert.equal(snap(a),built,`${name} ${how}: back exactly`);}}
});

test('the pose is solved once per kind, and the settle and other creatures are unaffected',()=>{
 assert.equal(crowFor(make('cockatrice')),crowFor(make('cockatrice')));
 for(const name of ['jackal','giant ant','dragon']){const a=createCreature({name,symbol:97,color:3});
  assert.equal(updateCockatriceCrow(a,1,0,false,far(a)),0,name);assert.equal(a.fowlCrow,undefined,name);}
 const a=make('cockatrice');for(let i=0;i<400;i++){updateCockatriceSettle(a,.05,false,far(a));updateCockatriceCrow(a,.05,i*.05,false,far(a));}
 assert(a.fowlRest.p>0,'still settles');
});
