import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const make=()=>createCreature({name:'couatl',symbol:83,color:2});
const tip=o=>{o.updateWorldMatrix(true,true);return new THREE.Box3().setFromObject(o,true).max.clone();};
const world=o=>{o.updateWorldMatrix(true,false);return o.getWorldPosition(new THREE.Vector3());};

test('the couatl exposes head, neck0, tail0 and both wings as named joints',()=>{
 const a=make(),j=a.joints;
 assert(j,'joints');
 assert.equal(j.head,a.head);
 assert.equal(a.head.parent,j.neck0,'the head hangs on neck0');
 for(const [c,p] of [['neck3','spine0'],['neck2','neck3'],['neck1','neck2'],['neck0','neck1']])assert.equal(j[c].parent,j[p],`${c} hangs on ${p}`);
 assert.equal(a.body.children.filter(c=>c.isSkinnedMesh).length,1,'one body skin');
 assert.equal(j.tail0.name,'tail0');
 for(let i=1;i<5;i++)assert.equal(j['tail'+i].parent,j['tail'+(i-1)],`tail${i} hangs on tail${i-1}`);
 assert.equal(a.tail.children.filter(c=>c.isSkinnedMesh).length,1,'one tail skin');
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

test('bending a middle tail bone swings the tip and leaves the root and the head where they were',()=>{
 const a=make(),j=a.joints;a.g.updateMatrixWorld(true);
 const at=b=>b.getWorldPosition(new THREE.Vector3()),tipB=at(j.tail4),rootB=at(j.tail0),headB=world(a.head);
 j.tail2.rotation.y=.7;a.g.updateMatrixWorld(true);
 assert(at(j.tail4).distanceTo(tipB)>.03,'the tip swung');
 assert(at(j.tail0).distanceTo(rootB)<1e-9&&world(a.head).distanceTo(headB)<1e-9,'root and head stayed');
 const m=a.tail.children.find(c=>c.isSkinnedMesh),pos=m.geometry.attributes.position;
 let moved=0,still=0;const v=new THREE.Vector3();
 for(let i=0;i<pos.count;i+=7){m.getVertexPosition(i,v);const w0=v.clone();j.tail2.rotation.y=0;a.g.updateMatrixWorld(true);m.getVertexPosition(i,v);if(v.distanceTo(w0)>1e-4)moved++;else still++;j.tail2.rotation.y=.7;a.g.updateMatrixWorld(true);}
 assert(moved>50&&still>50,`the hide splits at the joint (${moved} moved, ${still} still)`);
});

test('bending neck2 swings the head and the wings on neck1 and leaves the spine root and the tail where they were',()=>{
 const a=make(),j=a.joints;a.g.updateMatrixWorld(true);
 const at=o=>o.getWorldPosition(new THREE.Vector3()),headB=at(a.head),wingB=at(j.rwing),rootB=at(j.spine0),tailB=at(j.tail4);
 j.neck2.rotation.z=.5;a.g.updateMatrixWorld(true);
 assert(at(a.head).distanceTo(headB)>.03,'the head swung');
 assert(at(j.rwing).distanceTo(wingB)>.02,'the wing came with it');
 assert(at(j.spine0).distanceTo(rootB)<1e-9&&at(j.tail4).distanceTo(tailB)<1e-9,'root and tail stayed');
 const m=a.body.children.find(c=>c.isSkinnedMesh),pos=m.geometry.attributes.position,v=new THREE.Vector3(),w=new THREE.Vector3();
 let moved=0,still=0;
 for(let i=0;i<pos.count;i+=5){m.getVertexPosition(i,v);j.neck2.rotation.z=0;a.g.updateMatrixWorld(true);m.getVertexPosition(i,w);if(v.distanceTo(w)>1e-4)moved++;else still++;j.neck2.rotation.z=.5;a.g.updateMatrixWorld(true);}
 assert(moved>50&&still>50,`the hide splits at the joint (${moved} moved, ${still} still)`);
});
