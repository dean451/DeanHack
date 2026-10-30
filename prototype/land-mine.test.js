import test from 'node:test';
import assert from 'node:assert/strict';
import {flashPose, ringPose, debrisPose, smokePose, isLandMineMessage, landMineSite, createLandMine, PENDING_WAIT, MINE} from './land-mine.js';

test('only the land mine blast message triggers it', () => {
  assert.ok(isLandMineMessage('KAABLAMM!!!  You triggered a land mine!'));
  for (const t of ['A board beneath you squeaks loudly.', 'You find a land mine.', null]) assert.ok(!isLandMineMessage(t), String(t));
});

test('everything starts and ends invisible', () => {
  for (const t of [0, MINE.total]) {
    assert.equal(flashPose(t).alpha, 0);
    assert.equal(ringPose(t).alpha, 0);
    assert.equal(smokePose(t).alpha, 0);
    for (let i = 0; i < MINE.debris; i++) assert.equal(debrisPose(i, t).alpha, 0);
  }
});

test('the flash is brief and bright, the ring spreads, the smoke outlasts the flash', () => {
  assert.ok(flashPose(.01).alpha > .9);
  assert.equal(flashPose(.3).alpha, 0);
  assert.ok(ringPose(.4).radius > ringPose(.1).radius);
  assert.ok(smokePose(.9).alpha > .1 && smokePose(.9).y > smokePose(.2).y);
  for (let t = 0; t <= MINE.total; t += .005) {
    for (const p of [flashPose(t), ringPose(t), smokePose(t)]) assert.ok(p.alpha >= 0 && p.alpha <= 1, String(t));
    assert.ok(smokePose(t).y <= 1.1 && ringPose(t).radius <= 1.2 + 1e-9);
  }
});

test('debris is thrown up, falls back to the floor and stays in bounds', () => {
  for (let i = 0; i < MINE.debris; i++) {
    let top = 0;
    for (let t = 0; t <= MINE.total; t += .005) {
      const p = debrisPose(i, t);
      assert.ok(p.y >= .03 - 1e-9 && p.y <= 1.5 && Math.hypot(p.x, p.z) <= 1.25 && p.alpha >= 0 && p.alpha <= .9 + 1e-9, `${i} ${t}`);
      top = Math.max(top, p.y);
    }
    assert.ok(top > .3, String(i));
    assert.equal(debrisPose(i, 1.0).y, .03);
  }
});

test('the effect waits for the next frame and lands on the trap square', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {set() {}}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createLandMine(THREE, {add() {}, remove() {}});
  fx.message('KAABLAMM!!!  You triggered a land mine!', 1, 1);
  assert.equal(fx.active, 0);
  fx.settle(2, 1);
  assert.equal(fx.active, 1);
  assert.deepEqual(added[0], [2, 1]);
  fx.update(MINE.total + .1);
  assert.equal(fx.active, 0);
  fx.message('KAABLAMM!!!  You triggered a land mine!', 5, 5);
  fx.update(PENDING_WAIT + .01);
  assert.equal(fx.active, 1);
  fx.clear();
  assert.equal(fx.active, 0);
});

test('the last debris chunk kicks up once more after it lands', () => {
  const i = MINE.debris - 1, v = 3.2 + (i % 3) * .5, flight = v / 7;
  let hop = 0; for (let t = flight; t < flight + .2; t += .005) hop = Math.max(hop, debrisPose(i, t).y);
  assert.ok(hop > .08, 'it hops');
  assert.equal(debrisPose(i, flight + .25).y, .03);
  assert.equal(debrisPose(i, MINE.total).alpha, 0);
  assert.equal(debrisPose(0, flight + .1).y, .03);
});

test('the ground rings once more: a faint echo of the shockwave returns after it has gone', () => {
  assert.equal(ringPose(.5).alpha, 0);
  let peak = 0;
  for (let t = .56; t < .85; t += .002) { const p = ringPose(t); assert.ok(p.alpha <= .18 + 1e-9 && p.radius <= 1.2 + 1e-9 && p.radius >= .5 - 1e-9, String(t)); peak = Math.max(peak, p.alpha); }
  assert.ok(peak > .1);
  assert.ok(ringPose(.8).radius < ringPose(.6).radius);
  assert.ok(ringPose(.85).alpha < 1e-9);
  assert.equal(ringPose(.9).alpha, 0);
});

test('the smoke column belches: it swells and darkens for a beat mid-rise, within bounds', () => {
  const u = f => .05 + f * (MINE.total - .05);
  assert.ok(smokePose(u(.55)).alpha > .55 * (1 - .55 ** 2) * 1.1, 'denser than the plain curve');
  assert.ok(smokePose(u(.55)).scale > (.15 + .35 * Math.sqrt(.55)) * 1.1);
  for (let t = 0; t <= MINE.total + .1; t += .005) { const p = smokePose(t); assert.ok(p.alpha >= 0 && p.alpha <= .6 + 1e-9, String(t)); }
  assert.equal(smokePose(MINE.total).alpha, 0);
});

test('the flash gives a small dim second pop after it has gone', () => {
  assert.equal(flashPose(.28).alpha, 0);
  const pop = flashPose(.33);
  assert.ok(pop.alpha > 0 && pop.alpha < .35 && pop.scale < .5);
  assert.equal(flashPose(.4).alpha, 0);
  assert.ok(flashPose(.01).alpha > pop.alpha * 2);
});

test('the smoke column leans as it climbs and is upright at rest', () => {
  assert.equal(smokePose(0).x, 0);
  assert.equal(smokePose(MINE.total).x, 0);
  assert.ok(smokePose(.2).x < smokePose(.6).x && smokePose(.6).x < smokePose(1.1).x && smokePose(1.1).x > .05);
  for (let t = 0; t <= MINE.total + .1; t += .005) assert.ok(Math.abs(smokePose(t).x) <= .16 + 1e-9, String(t));
});

test('the smoke column flinches back near the top, then resumes its lean, in bounds', () => {
  const x = t => smokePose(t).x;
  const lean = u => .16 * u * u;
  const u = t => (t - .05) / (MINE.total - .05);
  assert.ok(x(.83) < lean(u(.83)) - .02, 'flinched');
  assert.ok(Math.abs(x(.4) - lean(u(.4))) < 1e-9 && Math.abs(x(1.25) - lean(u(1.25))) < 1e-9);
  for (let t = 0; t <= MINE.total + .1; t += .005) assert.ok(x(t) >= -1e-9 && x(t) <= .16 + 1e-9, String(t));
});

test('only the hero\'s own land mine goes off on the hero; a monster\'s goes off where it is; one heard in the distance, or a boulder\'s, draws nothing', () => {
  // the messages, as trap.c and hack.c print them
  for (const t of ['KAABLAMM!!!  You triggered a land mine!', 'KAABLAMM!!!  You triggered your land mine!', 'KAABLAMM!!!  Your inept attempt sets it off!', 'KAABLAMM!!!  The air currents set your land mine off!'])
    assert.deepEqual(landMineSite(t), {at: 'hero'}, t);
  assert.deepEqual(landMineSite('KAABLAMM!!!  The jackal triggers a land mine!'), {at: 'monster', name: 'jackal'});
  assert.deepEqual(landMineSite('KAABLAMM!!!  The hill orc triggers your land mine!'), {at: 'monster', name: 'hill orc'});
  for (const t of ['Kaablamm!  You hear an explosion in the distance!', 'KAABLAMM!!!  The boulder triggers a land mine.', 'KAABLAMM!!! The rolling boulder triggers a land mine.', 'KAABLAMM!!!', 'You find a land mine.'])
    assert.equal(landMineSite(t), null, t);

  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {set() {}}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createLandMine(THREE, {add() {}, remove() {}});
  // heard in the distance: nothing, not even after the wait or the next frame
  fx.message('Kaablamm!  You hear an explosion in the distance!', 1, 1, () => ({x: 9, z: 9}));
  fx.update(PENDING_WAIT + .01); fx.settle(1, 1);
  assert.equal(fx.active, 0);
  // a monster in view: at the monster, at once
  fx.message('KAABLAMM!!!  The jackal triggers a land mine!', 1, 1, name => name === 'jackal' ? {x: 4, z: 6} : null);
  assert.equal(fx.active, 1); assert.deepEqual(added.at(-1), [4, 6]);
  // a monster the map doesn't have: nothing (never on the hero)
  fx.clear(); added.length = 0;
  fx.message('KAABLAMM!!!  It triggers a land mine!', 1, 1, () => null);
  fx.update(PENDING_WAIT + .01); fx.settle(1, 1);
  assert.equal(fx.active, 0); assert.equal(added.length, 0);
});
