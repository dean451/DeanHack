import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {updateSlither, slitherKind, rippleAt, lizardYaw, coilOf, SERPENT, LIZARD} from './slither.js';
import {addOutlines} from './readability.js';

const run = (a, secs, walking, t0 = 0) => { let t = t0; for (let i = 0; i < secs * 60; i++) { t += 1 / 60; updateSlither(a, 1 / 60, t, walking); } return t; };

test('snakes, cobras, vipers and nagas slither; newts and iguanas S-walk; others do not', () => {
  for (const name of ['snake', 'garter snake', 'cobra', 'pit viper', 'water moccasin', 'python', 'red naga', 'golden naga hatchling', 'guardian naga'])
    assert.equal(slitherKind(createCreature({name})), 'serpent', name);
  for (const name of ['newt', 'iguana', 'gecko', 'lizard', 'crocodile']) assert.equal(slitherKind(createCreature({name})), 'lizard', name);
  for (const name of ['jackal', 'kitten', 'rust monster']) assert.equal(slitherKind(createCreature({name})), null, name);
});

test('the ripple grows toward the tail end of the coil and travels', () => {
  assert.ok(Math.abs(rippleAt(1, .02, .3, 0, 1)) < 1e-9, 'still at the heart of the coil');
  let outer = 0, inner = 0;
  for (let a = 0; a < 6.3; a += .05) { outer = Math.max(outer, Math.abs(rippleAt(a, .28, .3, 0, 1))); inner = Math.max(inner, Math.abs(rippleAt(a, .1, .3, 0, 1))); }
  assert.ok(outer > .9 && inner < outer * .5, `${inner} ${outer}`);
  // the crest moves round the coil as the phase advances
  assert.notEqual(rippleAt(.4, .28, .3, 0, 1).toFixed(3), rippleAt(.4, .28, .3, 1, 1).toFixed(3));
});

test('a crawling snake ripples its own coil much more than a resting one, and other snakes are untouched', () => {
  const a = createCreature({name: 'cobra'}), b = createCreature({name: 'cobra'});
  addOutlines(a.g);
  const shared = coilOf(b).geometry, base = Float32Array.from(coilOf(a).geometry.attributes.position.array);
  const moved = () => { const p = coilOf(a).geometry.attributes.position.array; let m = 0; for (let i = 0; i < p.length; i++) m = Math.max(m, Math.abs(p[i] - base[i])); return m; };
  let t = run(a, 1.5, false);
  const idle = moved();
  run(a, 1.5, true, t);
  const crawl = moved();
  assert.ok(idle > 0 && crawl > idle * 3 && crawl < .05, `idle ${idle} crawl ${crawl}`);
  // the outline hull follows the same geometry
  const hull = coilOf(a).children.find(c => c.userData.outline);
  if (hull) assert.equal(hull.geometry, coilOf(a).geometry);
  assert.equal(coilOf(b).geometry, shared);
});

test('the body sways while the head turns back to hold steady, and all comes back to rest', () => {
  const a = createCreature({name: 'pit viper'}), head = a.jaw.parent;
  const y0 = a.body.rotation.y, h0 = head.rotation.y;
  let t = 0, sway = 0, worst = 0;
  for (let i = 0; i < 120; i++) { t += 1 / 60; updateSlither(a, 1 / 60, t, true); sway = Math.max(sway, Math.abs(a.body.rotation.y - y0)); worst = Math.max(worst, Math.abs(a.body.rotation.y - y0 + head.rotation.y - h0)); }
  assert.ok(sway > SERPENT.sway * .5, String(sway));
  assert.ok(worst < sway * .3, 'the head holds against the sway');
});

test('a lizard throws an S in step with its legs: trunk one way, tail the other, head back', () => {
  const y = lizardYaw(Math.PI / 2, 1);
  assert.ok(y.trunk > .1 && y.tail < -y.trunk && y.head < 0 && Math.abs(y.head) < y.trunk);
  for (const p of [0, Math.PI]) assert.ok(Math.abs(lizardYaw(p, 1).trunk) < 1e-9);
  assert.deepEqual(lizardYaw(1, 0), {trunk: 0, tail: -0, head: -0});
  const a = createCreature({name: 'iguana'}), y0 = a.body.rotation.y, tail0 = a.tail.rotation.y;
  let t = run(a, 1, true), max = 0;
  for (let i = 0; i < 30; i++) { t += 1 / 60; updateSlither(a, 1 / 60, t, true); max = Math.max(max, Math.abs(a.body.rotation.y - y0)); }
  assert.ok(max > LIZARD.trunk * .8, String(max));
  // stopping eases back to rest, with only the small idle tail wave left
  run(a, 2, false, t);
  assert.ok(Math.abs(a.body.rotation.y - y0) < 1e-6 && Math.abs(a.head.rotation.y) < 1e-6);
  assert.ok(Math.abs(a.tail.rotation.y - tail0) <= LIZARD.idleTail + 1e-9);
});

test('offsets layer: something that rewrites a rotation is not undone', () => {
  const a = createCreature({name: 'newt'});
  run(a, .5, true);
  a.body.rotation.y = 0;
  updateSlither(a, 1 / 60, 1, true);
  assert.ok(Math.abs(a.body.rotation.y - lizardYaw(LIZARD.rate, a.slither.w).trunk) < 1e-9);
});
