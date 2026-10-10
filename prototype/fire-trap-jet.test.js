import test from 'node:test';
import assert from 'node:assert/strict';
import {columnPose, tonguePose, flashPose, scorchPose, emberPose, ashPose, isFireTrapMessage, JET} from './fire-trap-jet.js';

test('only the tower of flame message triggers it', () => {
  assert.ok(isFireTrapMessage('A tower of flame bursts from the floor!'));
  assert.ok(isFireTrapMessage('A tower of flame erupts from the floor!'));
  for (const t of ['You are enveloped in flames.', 'A cascade of steamy bubbles erupts from the fountain!', null]) assert.ok(!isFireTrapMessage(t), String(t));
});

test('every part starts and ends invisible', () => {
  for (const t of [0, JET.total]) {
    assert.equal(columnPose(t).alpha, 0); assert.equal(flashPose(t).alpha, 0); assert.equal(scorchPose(t).alpha, 0);
    for (let i = 0; i < JET.tongues; i++) assert.equal(tonguePose(i, t).alpha, 0);
    for (let i = 0; i < JET.embers; i++) assert.equal(emberPose(i, t).alpha, 0);
  }
});

test('the column climbs past head height and stays in bounds', () => {
  let peak = 0;
  for (let t = 0; t <= JET.total; t += .005) {
    const c = columnPose(t); peak = Math.max(peak, c.height);
    assert.ok(c.height > 0 && c.height <= 1.5 && c.width > 0 && c.width <= .25 && c.alpha >= 0 && c.alpha <= .85 + 1e-9, String(t));
    for (let i = 0; i < JET.tongues; i++) { const p = tonguePose(i, t); assert.ok(p.height <= 1.5 && p.alpha >= 0 && p.alpha <= 1 && Math.hypot(p.x, p.z) <= .25, `${i} ${t}`); }
  }
  assert.ok(peak > 1.1);
});

test('the flash comes first and the embers rise and stay bounded', () => {
  assert.ok(flashPose(.02).alpha > .5 && flashPose(JET.flash).alpha === 0);
  for (let i = 0; i < JET.embers; i++) {
    let prev = -1;
    for (let t = 0; t <= JET.total; t += .01) { const p = emberPose(i, t); assert.ok(p.y >= prev - 1e-9 && p.y <= 1.85 && Math.hypot(p.x, p.z) < .4 && p.alpha <= .9 + 1e-9, `${i} ${t}`); prev = p.y; }
  }
});

test('the jet waits for the next frame and lands on the trap square, not the square the hero left', async () => {
  const {createFireTrapJet, PENDING_WAIT} = await import('./fire-trap-jet.js');
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const jet = createFireTrapJet(THREE, {add() {}, remove() {}});
  jet.message('A tower of flame bursts from the floor!', 1, 1);
  assert.equal(jet.active, 0);
  jet.settle(2, 1);
  assert.equal(jet.active, 1);
  assert.deepEqual(added[0], [2, 1]);
  jet.clear();
  added.length = 0;
  jet.message('A tower of flame bursts from the floor!', 5, 5);
  jet.update(PENDING_WAIT + .01);
  assert.equal(jet.active, 1);
  assert.deepEqual(added[0], [5, 5]);
  jet.clear();
});

test('ash flakes fall late, stay low and in bounds, and are gone at the end', () => {
  for (let i = 0; i < JET.ash; i++) {
    assert.equal(ashPose(i, 0).alpha, 0); assert.equal(ashPose(i, .9).alpha, 0); assert.equal(ashPose(i, JET.total).alpha, 0);
    let top = null, bottom = null, peak = 0;
    for (let t = 0; t <= JET.total; t += .005) {
      const p = ashPose(i, t);
      assert.ok(p.alpha >= 0 && p.alpha <= .6 + 1e-9 && p.y >= .05 && p.y <= .95 && Math.hypot(p.x, p.z) <= .3, `${i} ${t}`);
      if (p.alpha > .05) { top ??= p.y; bottom = p.y; }
      peak = Math.max(peak, p.alpha);
    }
    assert.ok(peak > .4 && bottom < top - .3, String(i));
  }
});

test('the last ember hangs on longer and climbs higher than the rest', () => {
  const i = JET.embers - 1;
  assert.ok(emberPose(i, 1.4).alpha > 0 && emberPose(0, 1.4).alpha === 0);
  assert.ok(emberPose(i, 1.4).y > emberPose(i - 3, .9 + .46).y);
  assert.equal(emberPose(i, JET.total).alpha, 0);
});

test('the scorch catches again once as it thins, and the first tongue snaps sideways', () => {
  const mid = scorchPose(.92).alpha, before = scorchPose(.8).alpha, after = scorchPose(1.0).alpha;
  assert.ok(mid > before * .9 + 1e-9 || mid > after, 'flare lifts the alpha above the steady fade');
  for (let t = 0; t <= JET.total + .1; t += .01) { const a = scorchPose(t).alpha; assert.ok(a >= 0 && a <= .9, `t=${t}`); }
  const base = tonguePose(1, .54).x - Math.cos(1 * 2.1 + .54 * 4) * columnPose(.54).width * .8;
  assert.ok(Math.abs(base) < 1e-9, 'other tongues do not snap');
  const snap = tonguePose(0, .54).x - Math.cos(.54 * 3) * columnPose(.54).width * .8;
  assert.ok(snap > .08, `snap ${snap}`);
  assert.equal(tonguePose(0, JET.total + .1).alpha, 0);
});

test('the third ember chokes out mid-climb and catches again', () => {
  const start = .1 + (2 % 4) * .12, a = u => emberPose(2, start + u * .9).alpha;
  assert.ok(a(.45) < a(.38) * .3 && a(.55) > a(.45) * 3, 'choke');
  assert.ok(Math.abs(a(.2) / a(.3) - (1 - .2) / (1 - .3)) < 1e-9, 'others burn on');
});

test('the second tongue goes dark for a heartbeat mid-hold and comes back', () => {
  const lit = tonguePose(1, .58).alpha, dark = tonguePose(1, .66).alpha, back = tonguePose(1, .74).alpha;
  assert.ok(dark < lit * .2 && back > dark * 4, `${lit} ${dark} ${back}`);
  assert.ok(tonguePose(0, .66).alpha > dark * 4, 'the others burn on');
});
