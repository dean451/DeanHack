import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const make=()=>createCreature({name:'couatl',symbol:83,color:2});
const tip=o=>{o.updateWorldMatrix(true,true);return new THREE.Box3().setFromObject(o).max.clone();};
const world=o=>{o.updateWorldMatrix(true,false);return o.getWorldPosition(new THREE.Vector3());};

test('the couatl exposes head, neck0, tail0 and both wings as named joints',()=>{
 const a=make(),j=a.joints;
 assert(j,'joints');
 assert.equal(j.head,a.head);
 assert.equal(j.neck0,a.head);
 assert.equal(j.tail0,a.tail);
 assert(j.lwing&&j.rwing&&a.wings.includes(j.lwing)&&a.wings.includes(j.rwing));
 assert(j.lwing.position.x<0&&j.rwing.position.x>0,'left is -x');
 assert.equal(new Set([j.head,j.tail0,j.lwing,j.rwing]).size,4);
});

test('turning the tail moves the tail only; a wing moves that wing only; the head carries its face',()=>{
 const a=make(),j=a.joints;
 const headB=world(a.head),wingB=a.wings.map(tip),tailB=tip(a.tail);
 j.tail0.rotation.y=.6;
 assert(tip(a.tail).distanceTo(tailB)>.01,'the tail swung');
 assert(world(a.head).distanceTo(headB)<1e-6,'head stayed');
 a.wings.forEach((w,i)=>assert(tip(w).distanceTo(wingB[i])<1e-6,'wing stayed'));
 j.tail0.rotation.y=0;
 const rB=tip(j.rwing),lB=tip(j.lwing);
 j.rwing.rotation.z=.4;
 assert(tip(j.rwing).distanceTo(rB)>.01,'the right wing moved');
 assert(tip(j.lwing).distanceTo(lB)<1e-6,'the left wing stayed');
 j.rwing.rotation.z=0;
 const faceB=tip(a.head),tailB2=tip(a.tail);
 j.neck0.rotation.x=.5;
 assert(tip(a.head).distanceTo(faceB)>.01,'the head turned with its face');
 assert(tip(a.tail).distanceTo(tailB2)<1e-6,'tail stayed under the head');
});
