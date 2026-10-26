import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateCockatriceBob, bobAt, BOB} from './cockatrice-bob.js';
import {updateCockatriceCrow} from './cockatrice-crowing.js';
import {MEASURES} from './creature-measures.js';

const FAMILY=['chickatrice','cockatrice','pyrolisk'];
const make=name=>{const a=createCreature({name,symbol:99,color:11});a.g.updateMatrixWorld(true);return a;};
const snap=a=>JSON.stringify([Object.values(a.joints).map(o=>o.rotation.toArray().slice(0,3)),a.body.position.toArray()]);

test('the bob is a sawtooth in bounds: a slow hold, a quick thrust, once per cycle',()=>{
 assert.equal(BOB.rate*(Math.PI/22),MEASURES.fowl.bobPerStep);
 let lo=9,hi=-9;for(let i=0;i<=200;i++){const v=bobAt(i/200);lo=Math.min(lo,v);hi=Math.max(hi,v);assert(Math.abs(v)<=BOB.amp+1e-9);}
 assert(lo<-BOB.amp*.95&&hi>BOB.amp*.95);
 assert(Math.abs(bobAt(0)-bobAt(1))<1e-9,'continuous over the cycle');
 const hold=Math.abs(bobAt(BOB.hold)-bobAt(0)),thrust=Math.abs(bobAt(1)-bobAt(BOB.hold));
 assert(hold>0&&thrust>0);assert.equal(bobAt(NaN),0);
 // the thrust covers the same swing in a shorter time than the hold
 assert(BOB.hold>.5);
});

test('a walking bird bobs its neck and only its neck, within the amplitude',()=>{
 for(const name of FAMILY){const a=make(name),built=snap(a),neck=a.joints.neck0.rotation.x;
  const rot=()=>JSON.stringify(Object.entries(a.joints).filter(([,o])=>o!==a.joints.neck0).map(([,o])=>o.rotation.toArray().slice(0,3)));
  const others=rot();let lo=9,hi=-9,same=true;
  for(let i=0;i<60;i++){updateCockatriceBob(a,.05,true);const x=a.joints.neck0.rotation.x-neck;lo=Math.min(lo,x);hi=Math.max(hi,x);same=same&&rot()===others;}
  assert(lo<-.05&&hi>.05,`${name}: swings`);assert(lo>=-BOB.amp-1e-9&&hi<=BOB.amp+1e-9,`${name}: in bounds`);assert(same,`${name}: only the neck`);
  assert.notEqual(snap(a),built);}
});

test('standing again returns the neck exactly, also mid-walk',()=>{
 for(const name of FAMILY){const a=make(name),built=snap(a);
  for(let i=0;i<37;i++)updateCockatriceBob(a,.05,true);assert.notEqual(snap(a),built);
  for(let i=0;i<30;i++)updateCockatriceBob(a,.05,false);assert.equal(snap(a),built,`${name}: back exactly`);
  assert.equal(updateCockatriceBob(a,.05,false),0);}
});

test('not while lying down, dead, hissing or crowing; and other creatures are untouched',()=>{
 const rest=make('cockatrice'),built=snap(rest);rest.fowlRest={p:.4};for(let i=0;i<20;i++)updateCockatriceBob(rest,.05,true);assert.equal(snap(rest),built);
 const dead=make('pyrolisk'),b2=snap(dead);dead.actions={dead:true};for(let i=0;i<20;i++)updateCockatriceBob(dead,.05,true);assert.equal(snap(dead),b2);
 const hiss=make('chickatrice'),b3=snap(hiss);hiss.hissing={hiss:.5};for(let i=0;i<20;i++)updateCockatriceBob(hiss,.05,true);assert.equal(snap(hiss),b3);
 for(const name of ['jackal','giant ant','dragon']){const a=createCreature({name,symbol:97,color:3});assert.equal(updateCockatriceBob(a,1,true),0,name);assert.equal(a.fowlBob,undefined,name);}
 const a=make('cockatrice'),b4=snap(a);for(let i=0;i<40;i++){updateCockatriceBob(a,.05,true);updateCockatriceCrow(a,.05,i*.05,true,null);}
 for(let i=0;i<30;i++){updateCockatriceBob(a,.05,false);updateCockatriceCrow(a,.05,i*.05,false,{x:a.g.position.x+1,z:a.g.position.z});}
 assert.equal(snap(a),b4,'with the crow, still exact');
});

test('bad numbers do nothing',()=>{
 const a=make('cockatrice'),built=snap(a);updateCockatriceBob(a,NaN,true);updateCockatriceBob(a,-1,true);assert.equal(snap(a),built);
});
