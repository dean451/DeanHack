import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const tip=o=>{o.updateMatrixWorld(true);return new THREE.Box3().setFromObject(o).max.clone();};

test('the leprechaun has head, neck, arms and legs as named joints',()=>{
 const a=createCreature({name:'leprechaun',symbol:108,color:2}),j=a.joints;
 assert(j,'joints');
 assert.equal(j.head,a.head);assert.equal(j.neck0,a.head);
 for(const side of ['l','r'])for(const stem of ['fore','leg1']){
  const o=j[side+stem];
  assert(o,side+stem);assert.equal(o.name,side+stem);
  assert.equal(o.position.x<0,side==='l','left is -x');
 }
 assert.equal(a.arms,undefined,'fidget.js swings an actor\'s arms: the leprechaun keeps its own pose');
});

test('turning an arm moves that arm only; the shillelagh and the sack stay put',()=>{
 const a=createCreature({name:'leprechaun',symbol:108,color:2}),j=a.joints;
 for(const key of ['lfore','rfore']){
  const other=j[key==='lfore'?'rfore':'lfore'],legs=a.legs.map(tip),before=tip(j[key]),otherBefore=tip(other),sack=tip(a.loot),head=tip(a.head);
  j[key].rotation.x=.6;
  assert(tip(j[key]).distanceTo(before)>.005,key+' swung');
  assert(tip(other).distanceTo(otherBefore)<1e-6);
  a.legs.forEach((l,i)=>assert(tip(l).distanceTo(legs[i])<1e-6));
  assert(tip(a.loot).distanceTo(sack)<1e-6);assert(tip(a.head).distanceTo(head)<1e-6);
  j[key].rotation.x=0;
 }
});
