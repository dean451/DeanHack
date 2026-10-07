import test from 'node:test';
import assert from 'node:assert/strict';
import {fleckPose, isCrumbleMessage, createSpellCrumble, CRUMBLE} from './spell-crumble.js';

test('only the crumbling message triggers it', () => {
  assert.ok(isCrumbleMessage('The spellbook crumbles to dust!'));
  for (const t of ['You begin to memorize the runes.', 'The spellbook is too faded to read.', null]) assert.ok(!isCrumbleMessage(t), String(t));
});

test('everything starts and ends invisible', () => {
  for (const t of [0, CRUMBLE.total]) for (let i = 0; i < CRUMBLE.flecks; i++) assert.equal(fleckPose(i, t).alpha, 0);
});

test('flecks stay in bounds and sag to the floor', () => {
  for (let i = 0; i < CRUMBLE.flecks; i++) {
    let first = null, lastY = null;
    for (let t = .001; t < CRUMBLE.total; t += .005) {
      const p = fleckPose(i, t);
      if (p.alpha <= 0) continue;
      assert.ok(p.y >= .03 && p.y <= .5 + 1e-9 && Math.hypot(p.x, p.z) <= .4 && p.alpha <= .7 + 1e-9, `${i} ${t}`);
      first ??= p.y; lastY = p.y;
    }
    assert.ok(first > .4 && lastY < .2, `fleck ${i} falls`);
  }
});

test('the last fleck lingers well after the rest have settled', () => {
  const end = i => { let e = 0; for (let t = 0; t < CRUMBLE.total; t += .005) if (fleckPose(i, t).alpha > 0) e = t; return e; };
  const others = Math.max(...Array.from({length: CRUMBLE.flecks - 1}, (_, i) => end(i)));
  assert.ok(end(CRUMBLE.flecks - 1) > others + .5);
  assert.ok(Math.abs(fleckPose(CRUMBLE.flecks - 1, 1.2).spin) > Math.abs(fleckPose(0, .5).spin));
});

test('it plays on the hero\'s square and cleans up', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z])}; this.rotation = {set() {}}; this.scale = {set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createSpellCrumble(THREE, {add() {}, remove() {}});
  fx.message('The spellbook crumbles to dust!', 3, 4);
  assert.equal(fx.active, 1); assert.deepEqual(added[0], [3, 4]);
  fx.update(CRUMBLE.total + .1); assert.equal(fx.active, 0);
  fx.message('The spellbook crumbles to dust!', 0, 0); fx.clear(); assert.equal(fx.active, 0);
});

test('the last fleck stalls mid-fall, then drops and never rises', () => {
  const n = CRUMBLE.flecks - 1, born = .15, life = CRUMBLE.total - born;
  const y = u => fleckPose(n, born + u * life).y;
  assert.ok(y(.5) - y(.62) < .02, 'hangs');
  assert.ok(y(.62) - y(.8) > .05, 'then falls');
  let last = Infinity;
  for (let u = .02; u < .98; u += .01) { const v = y(u); assert.ok(v <= last + 1e-9, String(u)); last = v; }
});

test('plain flecks flutter as they sag, still falling overall and in bounds', () => {
  const i = 3;
  let flips = 0, last = 0, prevY = Infinity;
  for (let t = .3; t < 1.1; t += .004) {
    const a = fleckPose(i, t), b = fleckPose(i, t + .004);
    if (a.alpha > .01 && b.alpha > .01) { const d = b.x - a.x; if (last && Math.sign(d) !== Math.sign(last)) flips++; last = d; assert.ok(b.y <= a.y + 1e-9); }
    assert.ok(Math.hypot(a.x, a.z) <= .4);
  }
  assert.ok(flips >= 1, 'sways');
});

test('the first flake clings to the hand before it gives way', () => {
  const born = 0, life = .9;
  assert.equal(fleckPose(0, born + .2 * life).y, .5);
  assert.ok(fleckPose(0, born + .5 * life).y < .5);
  assert.ok(fleckPose(0, born + .9 * life).y >= .03);
  assert.equal(fleckPose(0, 0).alpha, 0);
  assert.equal(fleckPose(0, CRUMBLE.total).alpha, 0);
});

test('a settled flake skids sideways before it fades', () => {
  // Fleck 5 sits at 12 rad: its outward drift and the skid both push +x, so the skid shows as extra travel after the sag.
  const born = 5 * .06, life = .9 + .04 * 2, x = u => fleckPose(5, born + u * life).x;
  assert.ok(x(.9) - x(.6) > .05);
});

test('one flake is lifted just after it is born, then falls like the rest, in bounds', () => {
  const born = 5 * .06, life = .9 + .04 * (5 % 3), y = u => fleckPose(5, born + u * life).y;
  assert.ok(y(.15) > y(.01) + .04, 'it rises first');
  for (let u = .3; u < .98; u += .02) assert.ok(y(u + .02) <= y(u) + 1e-9, `falls only at ${u}`);
  for (let u = .01; u < 1; u += .01) assert.ok(y(u) >= .03 && y(u) <= .5 + 1e-9, `in bounds at ${u}`);
  assert.equal(fleckPose(5, 5).alpha, 0);
});
