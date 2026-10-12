import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import * as M from './pet-watch.js';

const dt = 1 / 60;
const dog = () => createCreature({name: 'little dog', symbol: 'd'.charCodeAt(0), color: 1, kind: 'pet'});

test('only pet dogs and pet cats watch', () => {
  assert.ok(M.watches(dog()));
  const j = createCreature({name: 'jackal', symbol: 'd'.charCodeAt(0), color: 1});
  assert.equal(M.updatePetWatch(j, dt, 0, false, {x: 1, z: 0}), null);
});

test('a standing pet turns to the hero, overshoots, stays in bounds and rests exactly', () => {
  const a = dog(), y0 = a.head.rotation.y, look = {x: 2, y: 0, z: 1};
  a.g.position.set(0, 0, 0); a.g.rotation.y = 0;
  const goal = M.targetYaw(a, look);
  assert.ok(goal > .3 && goal <= M.MAX_YAW);
  let peak = 0;
  for (let i = 0; i < 240; i++) {
    M.updatePetWatch(a, dt, i * dt, false, look);
    peak = Math.max(peak, a.head.rotation.y - y0);
    assert.ok(Math.abs(a.head.rotation.y - y0) <= M.MAX_YAW * 1.4 + 1e-9);
  }
  assert.ok(peak > goal, 'overshoots');
  assert.ok(Math.abs(a.head.rotation.y - y0 - goal) < 1e-3, 'settles on the hero');
  for (let i = 0; i < 600; i++) M.updatePetWatch(a, dt, i * dt, true, look);
  assert.ok(Math.abs(a.head.rotation.y - y0) < 1e-6, 'walking lets it go');
});

test('out of range, behind-range or no hero gives no stare', () => {
  const a = dog();
  assert.equal(M.targetYaw(a, {x: 30, z: 0}), 0);
  assert.equal(M.targetYaw(a, null), 0);
});
