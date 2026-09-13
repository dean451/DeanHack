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
  const before=wells[1].children.map(c=>c.position.toArray());
  wells[0].visible=false;wells[0].userData.updateFountain(2);
  assert.equal(wells[1].visible,true);
  assert.deepEqual(wells[1].children.map(c=>c.position.toArray()),before);
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
