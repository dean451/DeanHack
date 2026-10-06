import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHealthBar, setHealth, placeAbove, healthFraction, BAR_WIDTH} from './health-bar.js';

test('only a wounded monster has a health fraction', () => {
  assert.equal(healthFraction(undefined), null);
  assert.equal(healthFraction(100), null);
  assert.equal(healthFraction(0), null);
  assert.equal(healthFraction(40), 0.4);
});

test('the bar starts hidden, grows with health, and hides again when the monster is whole', () => {
  const bar = createHealthBar();
  assert.equal(bar.visible, false);
  setHealth(bar, 0.5);
  assert.equal(bar.visible, true);
  assert.ok(Math.abs(bar.userData.fill.scale.x - BAR_WIDTH / 2) < 1e-9, 'length is the health');
  setHealth(bar, 0.1);
  assert.ok(bar.userData.fill.scale.x < BAR_WIDTH / 2);
  setHealth(bar, 0.001);
  assert.ok(bar.userData.fill.scale.x > 0, 'a nearly dead monster still shows a sliver');
  setHealth(bar, null);
  assert.equal(bar.visible, false);
});

test('the bar is small, quiet and cleans up after itself', () => {
  const bar = createHealthBar();
  assert.ok(BAR_WIDTH <= 0.8);
  let disposed = 0;
  for (const s of bar.children) { const d = s.material.dispose.bind(s.material); s.material.dispose = () => { disposed++; d(); }; }
  bar.userData.dispose();
  assert.equal(disposed, 2);
});

test('the bar sits above a model of any height, including a scaled actor', () => {
  const tall = new THREE.Group(); tall.add(new THREE.Mesh(new THREE.BoxGeometry(1, 3, 1), new THREE.MeshBasicMaterial()));
  tall.children[0].position.y = 1.5;
  const b1 = createHealthBar(); tall.add(b1); placeAbove(b1, tall);
  assert.ok(b1.position.y > 3, 'above the top of a 3-high model');
  const big = new THREE.Group(); big.scale.setScalar(2); big.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
  big.children[0].position.y = 0.5;
  const b2 = createHealthBar(); big.add(b2); placeAbove(b2, big);
  assert.ok(b2.position.y > 1 && b2.position.y < 2, 'in the group\'s own units: top of the unit box plus a margin');
});
