import test from 'node:test';
import assert from 'node:assert/strict';
import {motePose, ringPose, isPolyTrapMessage, createPolyTrap, PENDING_WAIT, POLY} from './poly-trap.js';

test('only the hero\'s own change triggers it', () => {
  assert.ok(isPolyTrapMessage('You feel a change coming over you.'));
  for (const t of ['The newt turns into a rat!', 'You feel dizzy.', null]) assert.ok(!isPolyTrapMessage(t), String(t));
});

test('everything starts and ends invisible', () => {
  for (const t of [0, POLY.total]) { assert.equal(ringPose(t).alpha, 0); for (let i = 0; i < POLY.motes; i++) assert.equal(motePose(i, t).alpha, 0); }
});

test('motes are drawn inward, stutter on the way and stay in bounds', () => {
  for (let i = 0; i < POLY.motes; i++) {
    let seen = 0, reversed = 0, last = Infinity;
    for (let t = .01; t < POLY.crush; t += .005) {
      const p = motePose(i, t), r = Math.hypot(p.x, p.z);
      assert.ok(r <= .76 && p.y >= .5 && p.y <= 1.2 && p.alpha >= 0 && p.alpha <= .85 + 1e-9, `${i} ${t}`);
      if (r > last + 1e-9) reversed++; last = r; seen = Math.max(seen, p.alpha);
    }
    assert.ok(seen > .6 && reversed > 0, String(i));
    assert.ok(Math.hypot(motePose(i, .02).x, motePose(i, .02).z) > .5);
  }
});

test('one mote balks and flinches back out just before the crush', () => {
  const r = t => { const p = motePose(3, t); return Math.hypot(p.x, p.z); };
  assert.ok(r(.5) > r(.4) + .05, 'it backs away late');
  assert.ok(motePose(3, .59).alpha < .3);
});

test('the ring snaps outward after the crush and fades', () => {
  assert.equal(ringPose(POLY.crush - .01).alpha, 0);
  let last = 0, top = 0;
  for (let t = POLY.crush + .001; t < POLY.total; t += .005) { const p = ringPose(t); assert.ok(p.scale >= last && p.scale <= .65 + 1e-9 && p.alpha >= 0 && p.alpha <= .8 + 1e-9); last = p.scale; top = Math.max(top, p.alpha); }
  assert.ok(top > .7);
});

test('the effect waits for the next frame and lands on the trap square', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createPolyTrap(THREE, {add() {}, remove() {}});
  fx.message('You feel a change coming over you.', 1, 1);
  assert.equal(fx.active, 0);
  fx.settle(2, 1);
  assert.equal(fx.active, 1);
  assert.deepEqual(added[0], [2, 1]);
  fx.update(POLY.total + .1);
  assert.equal(fx.active, 0);
  fx.message('You feel a change coming over you.', 5, 5);
  fx.update(PENDING_WAIT + .01);
  assert.equal(fx.active, 1);
  fx.clear();
  assert.equal(fx.active, 0);
});

test('the ring gutters once as it wrenches out', () => {
  const at = u => ringPose(POLY.crush + u * (POLY.total - POLY.crush)).alpha;
  assert.ok(at(.3) < at(.1) * .6, 'dips mid-wrench');
  assert.ok(at(.45) > at(.3), 'recovers');
});

test('one mote winds the wrong way round while the rest spiral together', () => {
  const ang = (i, t) => { const p = motePose(i, t); return Math.atan2(p.z, p.x); };
  const turn = i => { let d = 0; for (let t = .1; t < .5; t += .01) { let e = ang(i, t + .01) - ang(i, t); e -= Math.round(e / (2 * Math.PI)) * 2 * Math.PI; d += e; } return d; };
  assert.ok(turn(7) * turn(6) < 0, 'opposite sense');
});

test('the last mote survives the crush and is flung out behind the ring', () => {
  const last = POLY.motes - 1, r = t => { const p = motePose(last, t); return Math.hypot(p.x, p.z); };
  assert.ok(motePose(last, POLY.crush + .05).alpha > .5, 'still there after the crush');
  assert.ok(r(POLY.total - .05) > r(POLY.crush + .02) + .3, 'flung outward');
  for (let t = POLY.crush; t < POLY.total; t += .005) { const p = motePose(last, t); assert.ok(p.alpha >= 0 && p.alpha <= .85 && p.y >= .5 && p.y <= .9 && Math.hypot(p.x, p.z) < .7, String(t)); }
  assert.equal(motePose(last, POLY.total).alpha, 0);
  assert.equal(motePose(0, POLY.crush + .05).alpha, 0, 'the others are gone');
});
