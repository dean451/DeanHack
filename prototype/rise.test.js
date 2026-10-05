import test from 'node:test';
import assert from 'node:assert/strict';
import {reviveAction, riseActionFor, createRiseWatch, risePose, RISE_TIME} from './rise.js';
import {deathPose} from './deaths.js';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose, actionState} from './actions.js';
import {jawPose} from './jaw.js';

const KEYS = ['dx', 'dy', 'dz', 'pitch', 'roll', 'head', 'scale'];

test('revive events normalise, and only well-formed ones pass', () => {
  const r = reviveAction({type: 'revive', x: 10, z: 5, from: {x: 11, z: 5}, where: 'floor', name: 'troll', pet: false});
  assert.deepEqual(r, {x: 10, z: 5, from: {x: 11, z: 5}, where: 'floor', name: 'troll', pet: false});
  assert.equal(reviveAction({type: 'death', x: 1, z: 1}), null);
  assert.equal(reviveAction({type: 'revive', x: 'a', z: 1}), null);
  const odd = reviveAction({type: 'revive', x: 3, z: 4, where: 'moon', name: null});
  assert.deepEqual(odd.from, {x: 3, z: 4});
  assert.equal(odd.where, 'other');
  assert.equal(odd.name, null);
  assert.deepEqual(riseActionFor(r), {kind: 'rise', from: [1, 0], buried: false});
  // out of the hero's pack onto the next square; from far away it just gets up in place
  assert.deepEqual(riseActionFor({...r, from: {x: 20, z: 5}}).from, [0, 0]);
  assert.equal(riseActionFor({...r, where: 'buried'}).buried, true);
});

test('the rise watch hands each revival to the monster that appears there, once, before it expires', () => {
  const w = createRiseWatch(4000);
  w.add(reviveAction({type: 'revive', x: 10, z: 5, name: 'troll'}), 0);
  assert.equal(w.claim(10, 6, 'troll', 100), null);
  assert.equal(w.claim(10, 5, 'jackal', 100), null);
  assert.equal(w.claim(10, 5, 'troll', 100).name, 'troll');
  assert.equal(w.claim(10, 5, 'troll', 100), null);
  w.add(reviveAction({type: 'revive', x: 2, z: 2, name: 'ice troll'}), 0);
  assert.equal(w.claim(2, 2, 'ice troll', 5000), null, 'expired');
  // hallucination sends no name; either side missing a name still matches by square
  w.add(reviveAction({type: 'revive', x: 3, z: 3, name: null}), 0);
  assert(w.claim(3, 3, 'troll', 10));
  assert.equal(w.size, 0);
});

test('rise poses start where the topple ends, stay finite and bounded, and end at rest', () => {
  const end = deathPose('topple', 1, null);
  const start = risePose(0, null);
  for (const k of ['dy', 'pitch', 'roll', 'head', 'scale']) assert(Math.abs(start[k] - end[k]) < 1e-9, `${k} ${start[k]} vs ${end[k]}`);
  for (const buried of [false, true]) {
    const last = risePose(1, [1, -1], buried);
    for (const k of KEYS) assert(Math.abs(last[k] - (k === 'scale' ? 1 : 0)) < 1e-9, `${k} at rest ${last[k]}`);
    let prev = risePose(0, [1, -1], buried);
    assert.equal(prev.dx, 1); assert.equal(prev.dz, -1);
    for (let i = 1; i <= 600; i++) {
      const p = risePose(i / 600, [1, -1], buried);
      for (const k of KEYS) {
        assert(Number.isFinite(p[k]));
        // 600 samples over 1.8 s is 3 ms each; nothing jumps
        assert(Math.abs(p[k] - prev[k]) < .03, `${k} jumped at u=${i / 600}`);
      }
      assert(p.roll >= -.25 && p.roll <= 1.62 && p.scale >= .87 && p.scale <= 1 && p.dy <= 1e-12 && p.dy >= -.9);
      prev = p;
    }
  }
  assert(Math.abs(jawPose('rise', null, 0) - jawPose('die', null, 1)) < 1e-9);
  assert.equal(jawPose('rise', null, 1), 0);
});

test('a troll rises through the real action layer, puffs dust once, and ends exactly at rest', () => {
  const a = createCreature({name: 'troll', symbol: 'T'.charCodeAt(0), color: 1});
  a.species = 'troll';
  a.g.position.set(4, 0, 7);
  const rest = {pos: a.g.position.clone(), rot: a.g.rotation.clone(), scale: a.g.scale.clone(), head: a.head?.rotation.x};
  a.actions = createActionQueue();
  assert(enqueueAction(a.actions, riseActionFor(reviveAction({type: 'revive', x: 4, z: 7, from: {x: 5, z: 7}, where: 'invent', name: 'troll'}))));
  const dt = 1 / 60;
  let bursts = 0, first = null;
  for (let i = 0; i < Math.ceil(RISE_TIME / dt) + 30; i++) {
    clearActionPose(a, a.actions);
    const state = updateActions(a, a.actions, dt);
    if (i === 0) { first = {x: a.g.position.x, roll: a.g.rotation.z}; assert.equal(state, 'rise'); }
    if (a.actions.riseBurst) { bursts++; a.actions.riseBurst = null; }
    for (const v of [a.g.position.x, a.g.position.y, a.g.rotation.x, a.g.rotation.z, a.g.scale.y]) assert(Number.isFinite(v));
  }
  // it started lying on its side over the corpse's square, one tile east
  assert(first.x > 4.95 && first.roll > 1.3, JSON.stringify(first));
  assert.equal(bursts, 1);
  assert.equal(actionState(a.actions), 'idle');
  clearActionPose(a, a.actions);
  assert(a.g.position.distanceTo(rest.pos) < 1e-9);
  assert(Math.abs(a.g.rotation.x - rest.rot.x) < 1e-9 && Math.abs(a.g.rotation.z - rest.rot.z) < 1e-9 && Math.abs(a.g.rotation.y - rest.rot.y) < 1e-9);
  assert(a.g.scale.distanceTo(rest.scale) < 1e-9);
  if (a.head) assert(Math.abs(a.head.rotation.x - rest.head) < 1e-9);
});

test('a rising body cricks its neck the wrong way halfway up, then lolls back into place', () => {
  for (const buried of [false, true]) {
    const head = u => risePose(u, null, buried).head;
    assert.ok(head(.62) > head(.5) + .15, 'head jerks round');
    assert.ok(head(.62) > head(.8), 'and falls back');
    assert.ok(Math.abs(head(1)) < 1e-9);
  }
});
