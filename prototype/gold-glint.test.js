import test from 'node:test';
import assert from 'node:assert/strict';
import {coinCount, coinPose, glintPose, isGoldMessage, createGoldGlint, GOLD, PENDING_WAIT} from './gold-glint.js';

test('only the gold pickup message triggers it', () => {
  assert.ok(isGoldMessage('$ - 12 gold pieces.'));
  assert.ok(isGoldMessage('$ - 1 gold piece.'));
  for (const t of ['You see here 3 gold pieces.', 'a - a dagger.', 'You have no gold.', null]) assert.ok(!isGoldMessage(t), String(t));
});

test('every part starts and ends invisible', () => {
  for (const t of [0, GOLD.total]) {
    assert.equal(glintPose(t).alpha, 0);
    for (let i = 0; i < GOLD.coins; i++) assert.equal(coinPose(i, t).alpha, 0);
  }
});

test('coins stay in bounds, rise and land; the first hangs longer than the rest', () => {
  const peak = Array(GOLD.coins).fill(0), airborne = Array(GOLD.coins).fill(0);
  for (let t = 0; t <= GOLD.total; t += .005) {
    for (let i = 0; i < GOLD.coins; i++) {
      const p = coinPose(i, t);
      assert.ok(p.y >= 0 && p.y <= .45 && Math.hypot(p.x, p.z) <= .16 && p.alpha >= 0 && p.alpha <= 1, `${i} ${t}`);
      peak[i] = Math.max(peak[i], p.y); if (p.alpha > 0) airborne[i] += .005;
    }
    const g = glintPose(t); assert.ok(g.size > 0 && g.size <= .55 && g.alpha >= 0 && g.alpha <= 1);
  }
  assert.ok(peak.every(y => y > .3));
  assert.ok(airborne[0] > airborne[1] + .1);
});

test('the glint comes first and is over before the coins land', () => {
  assert.ok(glintPose(.05).alpha > .1 && glintPose(GOLD.glint).alpha === 0);
});

test('the sparkle waits for the next frame and lands on the hero\'s new square', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {set() {}}; this.scale = {set() {}}; this.material = {color: {setHex() {}}}; } add() {} dispose() {} }});
  const fx = createGoldGlint(THREE, {add() {}, remove() {}});
  fx.message('$ - 5 gold pieces.', 1, 1);
  assert.equal(fx.active, 0);
  fx.settle(2, 1);
  assert.equal(fx.active, 1);
  assert.deepEqual(added[0], [2, 1]);
  fx.clear(); added.length = 0;
  fx.message('$ - 5 gold pieces.', 5, 5);
  fx.update(PENDING_WAIT + .01);
  assert.equal(fx.active, 1);
  assert.deepEqual(added[0], [5, 5]);
  fx.update(GOLD.total + .1);
  assert.equal(fx.active, 0);
});

test('a fatter purse flicks more coins', () => {
  assert.deepEqual(['$ - 3 gold pieces.', '$ - 12 gold pieces.', '$ - 150 gold pieces.', '$ - 900 gold pieces.'].map(coinCount), [2, 3, 4, GOLD.coins]);
  assert.equal(coinCount(null), 2);
});
