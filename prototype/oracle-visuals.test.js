import {createFountain} from './fountain.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOracle,createCentaurStatue,createLiveFountain} from './oracle-visuals.js';

test('four adjacent fountains are visible, tile-sized, and animate independently',()=>{
  const wells=Array.from({length:4},()=>createLiveFountain());
  for(const w of wells){
    assert.equal(w.visible,true);
    const size=new THREE.Box3().setFromObject(w).getSize(new THREE.Vector3());
    assert.ok(size.x<1&&size.z<1,'must fit one tile beside the Oracle');
  }
  const pose=w=>w.children.map(c=>[c.position.toArray(),c.rotation.y,c.instanceMatrix?Array.from(c.instanceMatrix.array):null]);
  const before=pose(wells[1]);
  wells[0].visible=false;wells[0].userData.updateFountain(2);
  assert.equal(wells[1].visible,true);
  assert.deepEqual(pose(wells[1]),before);
  assert.notDeepEqual(pose(wells[0]),before);
  wells.forEach(w=>w.userData.dispose());
});

test('Oracle and statue assets release their owned resources without breaking another instance',()=>{
  for(const factory of [()=>createOracle().g,()=>createCentaurStatue()]){
    const a=factory(),b=factory();let disposed=0;
    a.traverse(m=>{if(m.geometry)m.geometry.addEventListener('dispose',()=>disposed++);});
    a.userData.dispose();assert.ok(disposed>0);
    b.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(b);
    assert.ok(!bounds.isEmpty()&&Number.isFinite(bounds.max.y));
    b.userData.updateOracle?.(10);b.userData.dispose();
  }
});

test('live fountain retains demo detail even when the demo is hidden',()=>{
  const demo=createFountain();demo.visible=false;
  const live=createLiveFountain(demo);
  assert.equal(live.visible,true);
  assert.equal(live.children.length,demo.children.length);
  for(let i=0;i<demo.children.length;i++){
    assert.equal(live.children[i].geometry.type,demo.children[i].geometry.type);
    assert.deepEqual(live.children[i].geometry.parameters,demo.children[i].geometry.parameters);
    assert.notEqual(live.children[i].material,demo.children[i].material);
  }
  const before=demo.children.map(o=>o.position.toArray());
  live.userData.updateFountain(2.4);
  assert.deepEqual(demo.children.map(o=>o.position.toArray()),before);
  live.userData.dispose();demo.userData.dispose();
});

test('the fountain is finite, merged per material, and its spray moves',()=>{
  const f=createFountain();f.updateMatrixWorld(true);
  assert.ok(f.children.length<=7,`${f.children.length} draws`);
  const parts=f.children.map(o=>o.userData.part);
  for(const part of ['stone','trim','gold','streams','pool','spray','ripples'])assert.ok(parts.includes(part),`missing ${part}`);
  for(const o of f.children)for(const key of ['position','normal'])for(const x of o.geometry.attributes[key].array)assert.ok(Number.isFinite(x),`${o.userData.part} ${key}`);
  for(const part of ['stone','trim'])assert.ok(f.children.find(o=>o.userData.part===part).geometry.attributes.color,`${part} has baked weathering`);
  const bounds=new THREE.Box3();for(const o of f.children)if(!o.isInstancedMesh)bounds.expandByObject(o);
  assert.ok(bounds.min.y>-.01&&bounds.max.y<1.05,`y ${bounds.min.y}..${bounds.max.y}`);
  for(const k of ['x','z'])assert.ok(bounds.min[k]>=-1&&bounds.max[k]<=1,`${k} ${bounds.min[k]}..${bounds.max[k]}`);
  const spray=f.children.find(o=>o.userData.part==='spray'),before=Array.from(spray.instanceMatrix.array);
  f.userData.updateFountain(1.3);
  assert.notDeepEqual(Array.from(spray.instanceMatrix.array),before);
  for(const x of spray.instanceMatrix.array)assert.ok(Number.isFinite(x));
  f.userData.dispose();
});
