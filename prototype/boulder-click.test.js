import test from 'node:test';
import assert from 'node:assert/strict';
import {ringPose, gritPose, isBoulderClickMessage, createBoulderClick, PENDING_WAIT, CLICK} from './boulder-click.js';

test('only the rolling boulder trigger message starts it', () => {
  assert.ok(isBoulderClickMessage('Click! You trigger a rolling boulder trap!'));
  for (const t of ['Click! You trigger a rolling boulder trap', 'A board beneath you squeaks loudly.', 'Fortunately for you, no boulder was released.', null]) assert.equal(isBoulderClickMessage(t), t === 'Click! You trigger a rolling boulder trap');
});

test('everything starts and ends invisible', () => {
  for (const t of [0, CLICK.total]) {
    for (let i = 0; i < CLICK.rings; i++) assert.equal(ringPose(i, t).alpha, 0);
    for (let i = 0; i < CLICK.grit; i++) assert.equal(gritPose(i, t).alpha, 0);
  }
});

test('the click snaps first and tight, the shiver rings follow wide and dull', () => {
  const peak = i => { let a = 0, r = 0; for (let t = 0; t < CLICK.total; t += .005) { const p = ringPose(i, t); assert.ok(p.alpha >= 0 && p.alpha <= .8 + 1e-9 && p.radius >= .1 && p.radius <= 1.01, `${i} ${t}`); a = Math.max(a, p.alpha); r = Math.max(r, p.radius); } return {a, r}; };
  assert.ok(ringPose(0, .03).alpha > .3 && ringPose(1, .03).alpha === 0 && ringPose(2, .03).alpha === 0);
  assert.ok(peak(0).r < peak(1).r && peak(1).a < peak(0).a && peak(1).a > .1);
});

test('grit hops in place, lower as it goes, and the last grain outlasts the rest', () => {
  const top = (i, from, to) => { let m = 0; for (let t = from; t < to; t += .005) { const p = gritPose(i, t); assert.ok(p.y >= 0 && p.y <= .17 && Math.hypot(p.x, p.z) < .3 && p.alpha <= .6 + 1e-9); m = Math.max(m, p.y); } return m; };
  for (let i = 0; i < CLICK.grit; i++) assert.ok(top(i, .02, .3) > .05, String(i));
  assert.ok(top(0, .02, .3) > top(0, .8, .97));
  const last = CLICK.grit - 1;
  assert.equal(gritPose(0, CLICK.total * .8).alpha, 0);
  assert.ok(gritPose(last, CLICK.total * .8).alpha > 0);
});

test('the effect waits for the hero\'s square, then ends and clears', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createBoulderClick(THREE, {add() {}, remove() {}});
  fx.message('Click! You trigger a rolling boulder trap!', 1, 1);
  assert.equal(fx.active, 0);
  fx.settle(2, 1); assert.equal(fx.active, 1); assert.deepEqual(added[0], [2, 1]);
  fx.update(CLICK.total + .1); assert.equal(fx.active, 0);
  fx.message('Click! You trigger a rolling boulder trap!', 5, 5);
  fx.update(PENDING_WAIT + .01); assert.equal(fx.active, 1);
  fx.clear(); assert.equal(fx.active, 0);
});
