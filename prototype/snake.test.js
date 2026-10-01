import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('snakes coil and rear to strike, with a wedge head, a hinged jaw and their own markings',()=>{
 const colours={};
 for(const name of ['garter snake','snake','water moccasin','pit viper','python','cobra']){
  const a=createCreature({name});
  assert.equal(a.quirk,'snake');assert(a.head&&a.jaw&&a.body);
  assert(a.jaw.parent===a.head,'the jaw hangs from the head');
  assert(a.jaw.rotation.x>0&&a.jaw.userData.reach>0,'the jaw rests open and jaw.js may drive it');
  let meshes=0;a.g.traverse(o=>{if(o.isMesh){meshes++;for(const v of o.geometry.attributes.position.array)assert(Number.isFinite(v));}});
  assert.equal(meshes,4);
  const b=new THREE.Box3().setFromObject(a.g);
  assert(b.min.y>-.01,'rests on the floor');
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.5,`${name} fits its tile`);
  // the head is raised well off the coil
  const head=new THREE.Box3().setFromObject(a.head);assert(head.min.y>.15,`${name} head at ${head.min.y}`);
  const body=a.body.children.find(m=>m.name==='snake-body');colours[name]=body.geometry.attributes.color.array;
 }
 // the patterns differ
 assert.notDeepEqual(colours['pit viper'].slice(0,3000),colours.cobra.slice(0,3000));
 const cobra=new THREE.Box3().setFromObject(createCreature({name:'cobra'}).g),snake=new THREE.Box3().setFromObject(createCreature({name:'snake'}).g);
 assert(cobra.max.y>snake.max.y,'the cobra rears higher');
 assert.equal(createCreature({name:'odd snake',symbol:83,color:2}).quirk,'snake');
});
