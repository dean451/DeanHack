import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTree} from './tree.js';
import {createCanopySway, canopyState, CANOPY_LEAN, CANOPY_RUSTLE, CANOPY_BREATHE} from './canopy-sway.js';

function snapshot(mesh) { return [...mesh.position.toArray(), ...mesh.quaternion.toArray(), ...mesh.scale.toArray()]; }

// World position of vertex i of the canopy.
function vertex(mesh, i) {
  mesh.updateWorldMatrix(true, false);
  return new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i).applyMatrix4(mesh.matrixWorld);
}

test('canopyState stays finite and small, and a draught comes now and then', () => {
  let gusts = 0, calm = 0;
  for (let t = 0; t < 120; t += 1 / 60) {
    const c = canopyState(t, 2.1);
    for (const v of Object.values(c)) assert(Number.isFinite(v));
    assert(Math.hypot(c.leanX, c.leanZ) <= CANOPY_LEAN + CANOPY_RUSTLE * 1.5, `lean ${c.leanX},${c.leanZ}`);
    assert(Math.abs(c.breathe - 1) <= CANOPY_BREATHE + 1e-9);
    if (c.gust > .8) gusts++;
    if (c.gust === 0) calm++;
  }
  assert(gusts > 0, 'a draught blows at least once in two minutes');
  assert(calm > 0, 'and it is still some of the time');
});

test('trees in the scene sway gently at the crown, hold at the base, and restore exactly', () => {
  const scene = new THREE.Scene(), trees = [createTree(5), createTree(1234)];
  trees.forEach((tree, i) => { tree.position.set(i * 3, 0, 0);tree.rotation.y = i * 1.1;scene.add(tree); });
  const canopies = trees.map(t => t.userData.canopy), bark = trees.map(t => t.children.find(c => c.userData.part === 'bark'));
  const rest = canopies.map(snapshot), barkRest = bark.map(snapshot);
  const geo = canopies[0].geometry;geo.computeBoundingBox();
  const pos = geo.attributes.position;
  let top = 0, low = 0;
  for (let i = 0; i < pos.count; i++) { if (pos.getY(i) > pos.getY(top)) top = i;if (pos.getY(i) < pos.getY(low)) low = i; }
  const top0 = vertex(canopies[0], top), low0 = vertex(canopies[0], low);
  const sway = createCanopySway(scene);
  let maxTop = 0, maxLow = 0, maxStep = 0, prev = top0.clone();
  for (let t = 0; t < 60; t += 1 / 60) {
    sway.update(t);
    for (const c of canopies) for (const v of snapshot(c)) assert(Number.isFinite(v));
    const p = vertex(canopies[0], top);
    maxTop = Math.max(maxTop, p.distanceTo(top0));maxStep = Math.max(maxStep, p.distanceTo(prev));prev = p;
    maxLow = Math.max(maxLow, vertex(canopies[0], low).distanceTo(low0));
  }
  assert.equal(sway.canopies.length, 2);
  assert(maxTop > .005 && maxTop < .05, `crown moves ${maxTop}`);
  assert(maxLow < maxTop * .5, `the lowest leaves move less (${maxLow} vs ${maxTop})`);
  assert(maxStep < .004, `no jumps (${maxStep}/frame)`);
  bark.forEach((b, i) => assert.deepEqual(snapshot(b), barkRest[i], 'the trunk never moves'));
  // A tree that leaves the scene is put back.
  scene.remove(trees[1]);sway.update(61);
  assert.equal(sway.canopies.length, 1);
  snapshot(canopies[1]).forEach((v, i) => assert(Math.abs(v - rest[1][i]) < 1e-12));
  sway.restore();
  snapshot(canopies[0]).forEach((v, i) => assert(Math.abs(v - rest[0][i]) < 1e-12));
});
