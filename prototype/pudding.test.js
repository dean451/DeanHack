import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const make = name => createCreature({name, symbol: 80, color: 0});
const meshes = a => { const l = []; a.g.traverse(o => { if (o.isMesh) l.push(o); }); return l; };

test('both puddings stay within 14 meshes and keep the parts the heave finds', () => {
  for (const name of ['black pudding', 'brown pudding']) {
    const a = make(name), l = meshes(a);
    assert(l.length <= 14, name);
    const kids = a.body.children.filter(m => m.isMesh);
    assert(kids.some(m => m.geometry.type === 'SphereGeometry' && m.material.transparent && m.geometry.parameters.radius > .2), name + ' skin');
    assert(kids.some(m => m.geometry.type === 'SphereGeometry' && !m.material.transparent), name + ' nucleus');
    assert.equal(kids.filter(m => m.geometry.type === 'SphereGeometry' && m.material.transparent).length, 6, name + ' skin and five lobes');
  }
});

test('the puddings differ from each other: iron and a skull in the black, mould and ribs in the brown', () => {
  const parts = name => meshes(make(name)).map(m => m.userData.part);
  assert(['iron', 'skull', 'crust'].every(p => parts('black pudding').includes(p)));
  assert(['mould', 'ribs', 'strands'].every(p => parts('brown pudding').includes(p)));
  assert(!parts('brown pudding').includes('skull'));
});

test('no dressing floats: every piece sits within the skin or on it, and the mass stays off the floor', () => {
  for (const name of ['black pudding', 'brown pudding']) {
    const a = make(name); a.g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(a.g, true);
    assert(b.min.y > -.05, name);
    for (const m of meshes(a).filter(m => m.geometry.type === 'BufferGeometry')) {
      m.geometry.computeBoundingBox();
      const c = m.geometry.boundingBox.getCenter(new THREE.Vector3());
      assert(Math.hypot(c.x, c.z) < .3 && c.y < .5, name + ' ' + m.userData.part);
    }
  }
});
