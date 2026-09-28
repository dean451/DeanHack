import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {grabMessage, grabShape, grabTint, createGrab, REACH_MS, COIL_MS, RELEASE_MS, DROWN_MS, COIL_BEADS} from './grab.js';

const frame = (x, z) => ({player: {x, z}, cells: []});
const finite = sh => [...sh.beads, ...sh.bubbles].every(b => Object.values(b).every(Number.isFinite));

test('grab messages are recognised with any monster name', () => {
  assert.deepEqual(grabMessage('The giant eel swings itself around you!'), {phase: 'wrap', name: 'giant eel', vegetation: false});
  assert.equal(grabMessage('The shrieking violet winds itself around you!').vegetation, true);
  assert.deepEqual(grabMessage('The kraken drowns you...'), {phase: 'drown', name: 'kraken'});
  assert.equal(grabMessage('You are being crushed.').phase, 'crush');
  assert.equal(grabMessage('You get released!').phase, 'release');
  assert.equal(grabMessage('You pull free from the giant eel.').phase, 'release');
  assert.equal(grabMessage('The electric eel brushes against your leg.').phase, 'brush');
  assert.equal(grabMessage('You hit the giant eel.'), null);
  assert.equal(grabMessage(null), null);
  assert.notEqual(grabTint('kraken'), grabTint('giant eel'));
});

test('the coil reaches out, wraps, squeezes, and unwinds back to nothing', () => {
  const g = {hero: {x: 5, z: 5}, holder: {x: 6, z: 5}, wrapAt: 1000};
  assert.equal(grabShape(g, 999), null);
  const early = grabShape(g, 1000 + REACH_MS * .5);
  assert.equal(early.wrap, 0);
  assert.ok(early.beads.length > 0);
  const held = grabShape(g, 1000 + REACH_MS + COIL_MS + 100);
  assert.equal(held.wrap, 1);
  assert.ok(held.beads.length >= COIL_BEADS);
  assert.ok(finite(held));
  // The arm starts on the holder's tile; the coil stays within a tile of the hero.
  assert.ok(Math.abs(held.beads[0].x - 1) < 1e-9 && Math.abs(held.beads[0].z) < 1e-9);
  for (const b of held.beads.slice(-COIL_BEADS)) assert.ok(Math.hypot(b.x, b.z) < .25 && b.y > 0 && b.y < .7);
  g.squeezeAt = 3000;
  const sq = grabShape(g, 3000 + 210);
  assert.ok(sq.squeeze > .9);
  assert.equal(grabShape(g, 3500).squeeze, 0);
  g.releaseAt = 4000;
  assert.ok(grabShape(g, 4000 + RELEASE_MS * .5).beads.length < held.beads.length);
  assert.equal(grabShape(g, 4000 + RELEASE_MS), null);
});

test('drowning pulls the hero under with bubbles', () => {
  const g = {hero: {x: 5, z: 5}, holder: null, wrapAt: 0, drownAt: 2000};
  let bubbles = 0, prev = 0;
  for (let t = 2000; t <= 2000 + DROWN_MS; t += 50) {
    const sh = grabShape(g, t);
    assert.ok(finite(sh));
    assert.ok(sh.sink <= prev + 1e-9 && sh.sink >= -.8);
    prev = sh.sink; bubbles = Math.max(bubbles, sh.bubbles.length);
    for (const b of sh.bubbles) assert.ok(b.alpha >= 0 && b.alpha <= 1);
  }
  assert.ok(prev < -.7);
  assert.ok(bubbles > 5);
});

test('createGrab follows messages, combat and frames and clears up', () => {
  const group = new THREE.Group();
  const splashes = [];
  const grab = createGrab(THREE, group, {onSplash: s => splashes.push(s)});
  grab.frame(frame(5, 5));
  grab.combat({heroDefends: true, attack: 'hug', attacker: {seen: true, x: 6, z: 4}});
  grab.message('The giant eel swings itself around you!', frame(5, 5));
  assert.deepEqual(grab.state.holder, {x: 6, z: 4});
  let r;
  for (let i = 0; i < 60; i++) r = grab.update(1 / 60, {x: 0, z: 0});
  assert.equal(r.held, true);
  assert.ok(r.beads > COIL_BEADS);
  // Killing the holder releases the hero; the coil is gone after the unwind.
  grab.death({x: 6, z: 4});
  for (let i = 0; i < 40; i++) r = grab.update(1 / 60, {x: 0, z: 0});
  assert.equal(r.held, false);
  assert.equal(r.beads, 0);
  assert.equal(grab.state, null);

  // A drown splashes on the hero's tile; a move away from the holder releases.
  grab.message('The kraken swings itself around you!', frame(2, 2));
  grab.message('The kraken drowns you...', frame(2, 2));
  assert.deepEqual(splashes, [{x: 2, z: 2, size: 'large'}]);
  for (let i = 0; i < 60; i++) r = grab.update(1 / 30, {x: 0, z: 0});
  assert.ok(r.sink < -.7 && r.bubbles >= 0);
  grab.clear();
  grab.message('The giant eel swings itself around you!', frame(2, 2));
  grab.update(.1);
  grab.frame(frame(9, 9));
  for (let i = 0; i < 40; i++) r = grab.update(1 / 60);
  assert.equal(r.held, false);
  grab.dispose();
  assert.equal(group.children.length, 0);
});
