import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGridBug} from './grid-bug.js';

test('the grid bug has hooked mandibles in front of its mouth', () => {
  const {g} = createGridBug();
  let cones = 0;
  g.traverse(o => { if (o.geometry?.type === 'ConeGeometry' && o.parent !== g.children[0]) cones++; });
  assert.equal(cones, 2);
  g.userData.dispose();
});

test('the grid bug carries a ridge of razor spines down its back', () => {
  const {g, body} = createGridBug();
  const spines = body.children.filter(o => o.geometry?.type === 'ConeGeometry' && o.position.x === 0);
  assert.equal(spines.length, 5);
  assert(Math.max(...spines.map(o => o.geometry.parameters.height)) > Math.min(...spines.map(o => o.geometry.parameters.height)), 'tallest over the thorax');
  g.userData.dispose();
});

test('the grid bug has a head and six legs as named joints, front to hind, left is -x', () => {
  const a = createGridBug(), j = a.joints;
  assert.equal(j.head, a.head);
  assert.equal(j.neck0, a.head);
  for (const side of ['l', 'r']) {
    for (let i = 0; i < 3; i++) {
      const leg = j[`${side}leg${i}`];
      assert(leg && a.legs.includes(leg), `${side}leg${i} is one of the six legs`);
      assert.equal(leg.position.x < 0, side === 'l', 'left is -x');
    }
    assert(j[`${side}leg0`].position.z > j[`${side}leg1`].position.z && j[`${side}leg1`].position.z > j[`${side}leg2`].position.z, 'front to hind');
  }
  assert.equal(new Set(Object.values(j)).size, 7, 'six legs and the head, each one group');
  a.g.userData.dispose();
});

test('turning the head carries the skull, eyes, mandibles and feelers and nothing behind it; a hip moves its own leg only', () => {
  const a = createGridBug(), j = a.joints;
  const world = o => { o.updateWorldMatrix(true, false); return o.getWorldPosition(new THREE.Vector3()); };
  let meshes = 0; a.head.traverse(o => { if (o.isMesh) meshes++; });
  assert(meshes >= 15, `the head group holds its parts (${meshes})`);
  const before = new Map(a.legs.map(l => [l, world(l)]));
  const tip = new THREE.Box3().setFromObject(a.head).max.clone();
  j.neck0.rotation.y = .6; a.g.updateMatrixWorld(true);
  assert(tip.distanceTo(new THREE.Box3().setFromObject(a.head).max) > .01, 'the head tip moved');
  for (const l of a.legs) assert.equal(world(l).distanceTo(before.get(l)), 0, 'legs stay');
  j.neck0.rotation.y = 0;
  const box = new THREE.Box3().setFromObject(j.rleg1), other = new THREE.Box3().setFromObject(j.lleg1);
  j.rleg1.rotation.z = .5; a.g.updateMatrixWorld(true);
  const moved = new THREE.Box3().setFromObject(j.rleg1);
  assert(moved.min.distanceTo(box.min) > .01 || moved.max.distanceTo(box.max) > .01, 'the leg followed its hip');
  const still = new THREE.Box3().setFromObject(j.lleg1);
  assert(still.min.distanceTo(other.min) < 1e-9 && still.max.distanceTo(other.max) < 1e-9, 'the other leg stays');
  a.g.userData.dispose();
});
