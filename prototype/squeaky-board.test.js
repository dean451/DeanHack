import test from 'node:test';
import assert from 'node:assert/strict';
import {ringStart, hushPose, HUSH_AT, ringPose, motePose, isSqueakMessage, createSqueakyBoard, PENDING_WAIT, SQUEAK} from './squeaky-board.js';

test('only the squeak message triggers it', () => {
  assert.ok(isSqueakMessage('A board beneath you squeaks loudly.'));
  for (const t of ['You hear a door open.', 'A tower of flame bursts from the floor!', null]) assert.ok(!isSqueakMessage(t), String(t));
});

test('every part starts and ends invisible', () => {
  for (const t of [0, SQUEAK.total]) {
    for (let i = 0; i < SQUEAK.rings; i++) assert.equal(ringPose(i, t).alpha, 0);
    for (let i = 0; i < SQUEAK.motes; i++) assert.equal(motePose(i, t).alpha, 0);
  }
});

test('rings snap out one after another and stay in bounds', () => {
  for (let i = 0; i < SQUEAK.rings; i++) {
    let prev = 0, peak = 0;
    for (let t = 0; t <= SQUEAK.total; t += .005) {
      const p = ringPose(i, t);
      assert.ok(p.alpha >= 0 && p.alpha <= .75 + 1e-9 && p.radius >= .1 && p.radius <= .85, `${i} ${t}`);
      if (p.alpha > 0) { assert.ok(p.radius >= prev - 1e-9, `${i} ${t}`); prev = p.radius; }
      peak = Math.max(peak, p.alpha);
    }
    assert.ok(peak > .3, String(i));
  }
  assert.equal(ringPose(1, SQUEAK.gap * .5).alpha, 0);
  assert.ok(ringPose(0, .05).alpha > 0);
});

test('dust jolts up and settles back, staying low', () => {
  for (let i = 0; i < SQUEAK.motes; i++) {
    let top = 0;
    for (let t = 0; t <= SQUEAK.total; t += .005) {
      const p = motePose(i, t);
      assert.ok(p.y >= .03 - 1e-9 && p.y <= .4 && Math.hypot(p.x, p.z) < .4 && p.alpha >= 0 && p.alpha <= .55 + 1e-9, `${i} ${t}`);
      top = Math.max(top, p.y);
    }
    assert.ok(top > .15, String(i));
  }
});

test('the effect waits for the next frame and lands on the trap square', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createSqueakyBoard(THREE, {add() {}, remove() {}});
  fx.message('A board beneath you squeaks loudly.', 1, 1);
  assert.equal(fx.active, 0);
  fx.settle(2, 1);
  assert.equal(fx.active, 1);
  assert.deepEqual(added[0], [2, 1]);
  fx.update(SQUEAK.total + .1);
  assert.equal(fx.active, 0);
  added.length = 0;
  fx.message('A board beneath you squeaks loudly.', 5, 5);
  fx.update(PENDING_WAIT + .01);
  assert.equal(fx.active, 1);
  assert.deepEqual(added[0], [5, 5]);
  fx.clear();
  assert.equal(fx.active, 0);
});

test('the last mote hangs on, trembling, after the others have settled', () => {
  const last = SQUEAK.motes - 1;
  assert.equal(motePose(0, .65).alpha, 0);
  assert.ok(motePose(last, .65).alpha > .01);
  assert.equal(motePose(last, SQUEAK.total).alpha, 0);
});

test('each squeak comes sooner after the last', () => {
  assert.equal(ringStart(0), 0);
  for (let i = 2; i < SQUEAK.rings; i++) assert.ok(ringStart(i) - ringStart(i - 1) < ringStart(i - 1) - ringStart(i - 2), String(i));
  assert.ok(ringStart(SQUEAK.rings - 1) + SQUEAK.ringLife <= SQUEAK.total);
  assert.ok(ringPose(SQUEAK.rings - 1, ringStart(SQUEAK.rings - 1) + .02).alpha > 0);
});

test('the hush ring creeps inward after the last squeak and leaves nothing behind', () => {
  const last = ringStart(SQUEAK.rings - 1) + SQUEAK.ringLife;
  assert.ok(HUSH_AT < last + .1);
  for (const t of [0, HUSH_AT, SQUEAK.total, SQUEAK.total + 1]) assert.equal(hushPose(t).alpha, 0, String(t));
  let prev = Infinity, peak = 0;
  for (let t = HUSH_AT + .001; t < SQUEAK.total; t += .01) { const h = hushPose(t); assert.ok(h.radius <= prev + 1e-9 && h.alpha >= 0 && h.alpha <= .3 + 1e-9, String(t)); prev = h.radius; peak = Math.max(peak, h.alpha); }
  assert.ok(peak > .2);
});

test('the hush drops one beat mid-creep and stays in bounds', async () => {
  const {hushPose, HUSH_AT, SQUEAK} = await import('./squeaky-board.js');
  const at = u => hushPose(HUSH_AT + u * (SQUEAK.total - HUSH_AT)).alpha;
  assert.ok(at(.5) < .3 * Math.sin(Math.PI * .5) * .31, 'dropped beat');
  assert.ok(at(.3) > .2 && at(.7) > .2);
  assert.equal(at(1), 0);
});
