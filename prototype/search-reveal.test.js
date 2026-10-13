import test from 'node:test';
import assert from 'node:assert/strict';
import {echoPose, ECHO_LAG, ringPose, gritPose, isSearchFindMessage, createSearchReveal, SEARCH} from './search-reveal.js';

test('only the "You find" messages trigger it', () => {
  for (const t of ['You find a hidden door.', 'You find a hidden passage.', 'You find a bear trap.', 'You find a hidden land mine.']) assert.ok(isSearchFindMessage(t), t);
  for (const t of ['You find nothing.', 'You find yourself in a cavern.', 'You see here a hidden door.', null]) assert.ok(!isSearchFindMessage(t), String(t));
});

test('every part starts and ends invisible', () => {
  for (const t of [0, SEARCH.total]) {
    assert.equal(ringPose(t).alpha, 0);
    for (let i = 0; i < SEARCH.grit; i++) assert.equal(gritPose(i, t).alpha, 0);
  }
});

test('the ring stalls once, never shrinks, and stays in bounds', () => {
  let prev = 0, stalled = false;
  for (let t = .01; t < SEARCH.total; t += .01) {
    const r = ringPose(t);
    assert.ok(r.radius >= prev - 1e-9 && r.radius <= 1.45 && r.alpha >= 0 && r.alpha <= .7 + 1e-9, String(t));
    if (r.radius - prev < .002 && t > .2 && t < .5) stalled = true;
    prev = r.radius;
  }
  assert.ok(stalled);
});

test('grit only falls and stays near the hero', () => {
  for (let i = 0; i < SEARCH.grit; i++) {
    let prev = 9;
    for (let t = 0; t <= SEARCH.total; t += .005) {
      const p = gritPose(i, t);
      if (p.alpha === 0) continue;
      assert.ok(p.y <= prev + 1e-9 && p.y >= 0 && p.y <= 1.2 && Math.hypot(p.x, p.z) < .85 && p.alpha <= .8 + 1e-9, `${i} ${t}`);
      prev = p.y;
    }
  }
});

test('it plays on the hero\'s square and clears itself', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createSearchReveal(THREE, {add() {}, remove() {}});
  fx.message('You find nothing.', 3, 4); assert.equal(fx.active, 0);
  fx.message('You find a hidden door.', 3, 4); assert.equal(fx.active, 1);
  assert.deepEqual(added[0], [3, 4]);
  fx.update(SEARCH.total + ECHO_LAG + .1); assert.equal(fx.active, 0);
});

test('the last flake hangs mid-fall, then drops, never rising', () => {
  const i = SEARCH.grit - 1, start = .12 + (i % 4) * .07;
  let prev = 9, slow = 0;
  for (let t = start + .01; t < SEARCH.total; t += .005) {
    const p = gritPose(i, t);
    if (p.alpha === 0) continue;
    assert.ok(p.y <= prev + 1e-9, String(t));
    if (prev - p.y < .002) slow++;
    prev = p.y;
  }
  assert.ok(slow > 3, 'it hangs');
});

test('the echo ring trails the lead ring, fainter, and returns to rest', () => {
  assert.equal(echoPose(0).alpha, 0);
  assert.equal(echoPose(SEARCH.total + ECHO_LAG).alpha, 0);
  for (let t = .01; t < SEARCH.total + ECHO_LAG; t += .01) {
    const e = echoPose(t);
    assert.ok(e.alpha <= .28 + 1e-9, String(t));
    if (e.alpha > 0) assert.ok(e.radius <= 1.45 + 1e-9);
  }
  assert.ok(echoPose(.5).radius < ringPose(.5).radius);
});
