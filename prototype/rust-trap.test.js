import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {jetPose, dropPose, puddlePose, fleckPose, strikePoint, isRustTrapMessage, createRustTrap, PENDING_WAIT, RUST} from './rust-trap.js';

test('only the hero being soaked triggers it', () => {
  assert(isRustTrapMessage('A gush of water hits you on the head!'));
  assert(isRustTrapMessage('A gush of water hits your left arm!'));
  assert(isRustTrapMessage('A gush of water hits you!'));
  assert(!isRustTrapMessage('A gush of water hits the jackal!'));
});

test('the jet strikes where the message says: head, either arm or the body', () => {
  assert.equal(strikePoint('A gush of water hits you on the head!').part, 'head');
  const l = strikePoint('A gush of water hits your left arm!'), r = strikePoint('A gush of water hits your right arm!');
  assert(l.x < 0 && r.x > 0 && l.y === r.y, 'arms either side, at arm height');
  assert(strikePoint('A gush of water hits you on the head!').y > strikePoint('A gush of water hits you!').y, 'the head is higher');
});

test('everything starts and ends at rest', () => {
  assert.equal(jetPose(0).alpha, 0); assert.equal(jetPose(RUST.jet).alpha, 0);
  for (let i = 0; i < RUST.drops; i++) { assert.equal(dropPose(i, 0).alpha, 0); assert.equal(dropPose(i, RUST.total).alpha, 0); }
  for (let i = 0; i < RUST.flecks; i++) assert.equal(fleckPose(i, RUST.total).alpha, 0);
  assert.equal(puddlePose(0).alpha, 0); assert.equal(puddlePose(RUST.total).alpha, 0);
});

test('the jet shoots up from the vent to the strike fast, then thins away', () => {
  assert(jetPose(.08).reach > .99, 'reaches the strike in under a tenth of a second');
  assert(jetPose(.12).alpha > jetPose(.27).alpha);
});

test('the spray bursts from the strike point, arcs out, falls and never goes below the floor', () => {
  const strike = strikePoint('A gush of water hits you on the head!');
  let spread = 0, landed = 0;
  for (let i = 0; i < RUST.drops; i++) {
    const first = dropPose(i, .12, strike);
    if (first.alpha) assert(Math.abs(first.y - strike.y) < .2, 'starts at the strike');
    let seen = false;
    for (let t = 0; t < RUST.total; t += 1 / 60) {
      const p = dropPose(i, t, strike);
      if (!p.alpha) { if (seen) { landed++; break; } continue; }
      seen = true; assert(p.y > 0 && Number.isFinite(p.x) && Number.isFinite(p.z));
      spread = Math.max(spread, Math.hypot(p.x - strike.x, p.z - strike.z));
    }
  }
  assert(spread > .3, `the spray spreads out (${spread})`);
  assert(landed >= RUST.drops * .8, 'and nearly all of it falls to the floor in time');
});

test('a wet patch spreads under the hero and dries; rust flecks drift down after the hit', () => {
  assert(puddlePose(.7).radius > puddlePose(.3).radius);
  assert(puddlePose(.7).alpha > puddlePose(1.6).alpha, 'drying');
  assert.equal(fleckPose(0, .2).alpha, 0, 'not before the hit');
  assert(fleckPose(0, 1).alpha > 0 && fleckPose(0, 1).y < fleckPose(0, .5).y, 'sinking');
});

test('the effect waits for the next frame, lands on the trap square and cleans up', () => {
  const parent = new THREE.Group(), fx = createRustTrap(THREE, parent);
  fx.message('A gush of water hits your right arm!', 1, 1, 0);
  assert.equal(fx.active, 0);
  fx.settle(4, 6);
  assert.equal(fx.active, 1);
  assert.deepEqual([parent.children[0].position.x, parent.children[0].position.z], [4, 6]);
  for (let i = 0; i < 30; i++) fx.update(1 / 60);
  const visible = []; parent.children[0].traverse(o => { if (o.isMesh && o.visible) visible.push(o); });
  assert(visible.length > 3, 'jet, spray and patch showing mid-effect');
  for (let i = 0; i < 200; i++) fx.update(1 / 60);
  assert.equal(fx.active, 0); assert.equal(parent.children.length, 0);
  fx.message('A gush of water hits you!', 2, 2, 0);
  for (let i = 0; i < Math.ceil(PENDING_WAIT * 60) + 2; i++) fx.update(1 / 60);
  assert.equal(fx.active, 1, 'starts on its own if no frame comes');
});
