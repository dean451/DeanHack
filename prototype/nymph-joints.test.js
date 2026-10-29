import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const NYMPHS=['wood nymph','water nymph','mountain nymph'];
const tip=o=>{o.updateMatrixWorld(true);return new THREE.Box3().setFromObject(o).max.clone();};
const make=name=>createCreature({name,symbol:110,color:2});

test('every nymph has head, neck, arms and legs as named joints',()=>{
 for(const name of NYMPHS){
  const a=make(name),j=a.joints;
  assert(j,name+' joints');
  assert.equal(j.head,a.head);assert.equal(j.neck0,a.head);
  for(const side of ['l','r'])for(const stem of ['fore','leg1']){
   const o=j[side+stem];
   assert(o,name+' '+side+stem);assert.equal(o.name,side+stem);
   assert.equal(o.position.x<0,side==='l','left is -x');
  }
  assert.equal(a.arms,undefined,'fidget.js swings an actor\'s arms: the nymph keeps beckon-driven arms');
  assert.equal(j.rfore,a.beckonArm,'the beckoning arm is the right one');
 }
});

test('turning an arm moves that arm only',()=>{
 const a=make('wood nymph'),j=a.joints;
 for(const key of ['lfore','rfore']){
  const other=j[key==='lfore'?'rfore':'lfore'],legs=a.legs.map(tip),before=tip(j[key]),otherBefore=tip(other),head=tip(a.head);
  j[key].rotation.x=.6;
  assert(tip(j[key]).distanceTo(before)>.005,key+' swung');
  assert(tip(other).distanceTo(otherBefore)<1e-6);
  a.legs.forEach((l,i)=>assert(tip(l).distanceTo(legs[i])<1e-6));
  assert(tip(a.head).distanceTo(head)<1e-6);
  j[key].rotation.x=0;
 }
});

test('turning a hip moves that leg only, and the head carries only its face',()=>{
 const a=make('water nymph'),j=a.joints;
 for(const key of ['lleg1','rleg1']){
  const other=j[key==='lleg1'?'rleg1':'lleg1'],before=tip(j[key]),otherBefore=tip(other),arm=tip(j.rfore);
  j[key].rotation.x=.5;
  assert(tip(j[key]).distanceTo(before)>.005);
  assert(tip(other).distanceTo(otherBefore)<1e-6);assert(tip(j.rfore).distanceTo(arm)<1e-6);
  j[key].rotation.x=0;
 }
 const torso=tip(j.lfore);j.head.rotation.y=.5;
 assert(tip(j.lfore).distanceTo(torso)<1e-6);
});
