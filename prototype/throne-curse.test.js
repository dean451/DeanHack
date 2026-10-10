import test from 'node:test';
import assert from 'node:assert/strict';
import {ringPose, columnPose, fleckPose, isThroneCurseMessage, createThroneCurse, CURSE} from './throne-curse.js';

test('only the throne\'s curse triggers it', () => {
  assert.ok(isThroneCurseMessage('A curse upon thee for sitting upon this most holy throne!'));
  for (const t of ['A voice echoes:', 'You sit on the throne.', 'Your vision becomes clear.', null]) assert.ok(!isThroneCurseMessage(t), String(t));
});

test('everything starts and ends invisible', () => {
  for (const t of [0, CURSE.total]) {
    assert.equal(ringPose(t).alpha, 0);
    assert.equal(columnPose(t).alpha, 0);
    for (let i = 0; i < CURSE.flecks; i++) assert.equal(fleckPose(i, t).alpha, 0);
  }
});

test('the ring slams down hard and fast, then jolts, in bounds', () => {
  let last = 2;
  for (let t = .001; t < .18; t += .004) { const p = ringPose(t); assert.ok(p.y <= last + 1e-9, String(t)); last = p.y; }
  assert.ok(ringPose(.18).y < .1);
  let rebound = 0;
  for (let t = .19; t < .5; t += .004) rebound = Math.max(rebound, ringPose(t).y);
  assert.ok(rebound > .06);
  for (let t = .001; t < CURSE.total; t += .004) { const p = ringPose(t); assert.ok(p.y >= .04 && p.y <= 1.2 && p.alpha >= 0 && p.alpha <= .8 + 1e-9 && p.scale > .7 && p.scale < 1.3, String(t)); }
});

test('the column stands up fast and thins, in bounds', () => {
  assert.ok(columnPose(.25).height > .8);
  for (let t = 0; t < CURSE.total; t += .004) { const p = columnPose(t); assert.ok(p.height >= 0 && p.height <= 1.1 + 1e-9 && p.alpha <= .5 + 1e-9); }
  assert.ok(columnPose(.7).alpha < columnPose(.2).alpha);
});

test('flecks are driven up and fall back, in bounds', () => {
  for (let i = 0; i < CURSE.flecks; i++) {
    let peak = 0;
    for (let t = .17; t < CURSE.total; t += .004) { const p = fleckPose(i, t); assert.ok(p.y >= 0 && p.y <= .7 && Math.hypot(p.x, p.z) <= .46 && p.alpha <= .85 + 1e-9); peak = Math.max(peak, p.y); }
    assert.ok(peak > .25); assert.ok(fleckPose(i, CURSE.total - .005).y < .15);
  }
});

test('it plays on the hero\'s square and cleans up', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createThroneCurse(THREE, {add() {}, remove() {}});
  fx.message('A curse upon thee for sitting upon this most holy throne!', 3, 4);
  assert.equal(fx.active, 1); assert.deepEqual(added[0], [3, 4]);
  fx.update(CURSE.total + .1); assert.equal(fx.active, 0);
  fx.message('A curse upon thee for sitting upon this most holy throne!', 0, 0); fx.clear(); assert.equal(fx.active, 0);
});

test('the column gutters: it dims twice mid-stand and comes back', () => {
  const a = t => columnPose(t).alpha;
  assert.ok(a(.43) < a(.38) * .5 && a(.485) > a(.43) && a(.535) < a(.485) * .5 && a(.6) > a(.535));
});
