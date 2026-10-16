import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCorpse, sprawl} from './corpse.js';
import {createCreature} from './creatures.js';

test('a person sprawls before falling: an arm flung past the head, legs splayed, head on its cheek, weapon dropped', () => {
  const a = createCreature({name: 'soldier', symbol: 64, color: 7});
  sprawl(a);
  const [left, right] = a.arms;
  assert(right.rotation.z > 2, 'one arm flung up past the head');
  assert(Math.abs(left.rotation.z) < .5, 'the other loose at the side');
  assert.notEqual(a.legs[0].rotation.z, a.legs[1].rotation.z, 'legs splayed unevenly');
  assert(Math.abs(a.head.rotation.y) > 1, 'head rolled onto its cheek');
  if (a.weaponSocket) assert.equal(a.weaponSocket.visible, false, 'the weapon is dropped');
});

test('human corpses lie flat on the floor, sprawled wider than a body lying straight', () => {
  for (const name of ['human', 'elf', 'soldier', 'watchman']) {
    const c = createCorpse(name, 7, 3, {creatureFactory: o => createCreature(o), symbol: 64});
    assert.equal(c.userData.lie, 'front', name);
    c.rotation.y = 0; c.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(c), size = b.getSize(new THREE.Vector3());
    assert(Math.abs(b.min.y) < .01, `${name} on the floor`);
    assert(size.y < .5, `${name} lies flat (${size.y})`);
    assert(size.x > .55, `${name} sprawls (${size.x})`);
    for (const m of c.children) for (const v of m.geometry.attributes.position.array) assert(Number.isFinite(v));
    c.userData.dispose();
  }
});
