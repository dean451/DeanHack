import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {isLevelUp, ringPose, moteFlight, createLevelUp, LEVEL} from './level-up.js';

test('only the level message counts', () => {
  assert.ok(isLevelUp('Welcome to experience level 5.'));
  for (const t of ['Welcome to level 5.', 'You feel more experienced.', null]) assert.ok(!isLevelUp(t), String(t));
});

test('the ring draws tight, motes stay above the floor and in reach, all end at nothing', () => {
  assert.ok(ringPose(0).radius > ringPose(LEVEL.ring).radius);
  assert.equal(ringPose(-1).alpha, 0);
  assert.equal(ringPose(LEVEL.total).alpha, 0);
  for (let i = 0; i < LEVEL.motes; i++) {
    assert.equal(moteFlight(i, 0).alpha, 0);
    assert.equal(moteFlight(i, LEVEL.total).alpha, 0);
    for (let t = 0; t < LEVEL.total; t += .03) {
      const f = moteFlight(i, t);
      assert.ok(f.alpha >= 0 && f.alpha <= 1.001, `alpha ${f.alpha}`);
      assert.ok(f.y >= 0 && f.y <= 2, `y ${f.y}`);
      assert.ok(Math.hypot(f.x, f.z) <= .23);
    }
  }
});

test('a flourish plays, expires and leaves nothing in the scene', () => {
  const parent = new THREE.Group(), fx = createLevelUp(THREE, parent);
  assert.equal(fx.message('You hit the newt.', 1, 1), null);
  assert.equal(fx.message('Welcome to experience level 2.', Number.NaN, 0), null);
  assert.ok(fx.message('Welcome to experience level 2.', 3, 4));
  fx.update(.5);
  assert.equal(fx.active, 1);
  for (let i = 0; i < 30; i++) fx.update(.1);
  assert.equal(fx.active, 0);
  assert.equal(parent.children.length, 0);
  fx.message('Welcome to experience level 3.', 0, 0); fx.clear();
  assert.equal(parent.children.length, 0);
  fx.dispose();
});
