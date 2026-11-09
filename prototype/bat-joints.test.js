import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const B=66;// 'B'
const boxOf=o=>{o.updateMatrixWorld(true);return new THREE.Box3().setFromObject(o);};

test('every bat has lwing and rwing; left is -x, and turning one moves only that wing',()=>{
 for(const [name,color] of [['bat',3],['giant bat',3],['vampire bat',3]]){
  const a=createCreature({name,symbol:B,color}),j=a.joints;
  assert(j,name);
  assert.equal(j.lwing.name,'lwing');assert.equal(j.rwing.name,'rwing');
  assert(j.lwing.position.x<0&&j.rwing.position.x>0,name+' left is -x');
  const rest=boxOf(j.rwing).clone(),other=boxOf(j.lwing).clone();
  j.rwing.rotation.z+=.6;
  assert(boxOf(j.rwing).max.y-rest.max.y>.02||rest.max.y-boxOf(j.rwing).max.y>.02||boxOf(j.rwing).min.y!==rest.min.y,name+' the wing turned');
  assert(boxOf(j.lwing).equals(other),name+' the other wing stayed');
  j.rwing.rotation.z-=.6;
 }
});

test('the raven has head, neck0, tail0, both wings and both legs, and each carries its mesh',()=>{
 const a=createCreature({name:'raven',symbol:B,color:0}),j=a.joints;
 assert(j,'joints');
 assert.equal(j.head,a.head);assert.equal(j.neck0,a.head);assert.equal(j.tail0,a.tail);
 for(const n of ['lwing','rwing','lleg1','rleg1'])assert.equal(j[n].name,n);
 assert(j.lwing.position.x<0&&j.rwing.position.x>0&&j.lleg1.position.x<0&&j.rleg1.position.x>0,'left is -x');
 const parts=o=>{const p=[];o.traverse(m=>{if(m.isMesh)p.push(m.userData.part);});return p.sort().join();};
 assert.equal(parts(j.head),'eyes,head');assert.equal(parts(j.tail0),'tail');
 assert.equal(parts(j.lwing),'wing');assert.equal(parts(j.rleg1),'leg');
 // turning the tail moves the tail's tip and leaves the head where it was
 const tip=()=>boxOf(j.tail0).getCenter(new THREE.Vector3()),head=boxOf(j.head).clone(),t0=tip();
 j.tail0.rotation.x+=.5;
 assert(tip().distanceTo(t0)>.02,'the tail moved');assert(boxOf(j.head).equals(head),'the head stayed');
});
