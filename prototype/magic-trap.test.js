import test from 'node:test';
import assert from 'node:assert/strict';
import {ringPose, gritPose, isMagicTrapMessage, isPackShakeMessage, isOmenMessage, isTiredMessage, TIRED_SLOW, createMagicTrap, PENDING_WAIT, MAGIC} from './magic-trap.js';

test('only the roar triggers it', () => {
  assert.ok(isMagicTrapMessage('You hear a deafening roar!'));
  for (const t of ['You hear distant howling.', 'You are momentarily blinded by a flash of light!', null]) assert.ok(!isMagicTrapMessage(t), String(t));
});

test('everything starts and ends invisible', () => {
  for (const t of [0, MAGIC.total]) {
    for (let i = 0; i < MAGIC.rings; i++) assert.equal(ringPose(i, t).alpha, 0);
    for (let i = 0; i < MAGIC.grit; i++) assert.equal(gritPose(i, t).alpha, 0);
  }
});

test('rings slam out in turn, grow, fade and stay in bounds', () => {
  let lastStart = -1;
  for (let i = 0; i < MAGIC.rings; i++) {
    let last = 0, top = 0, start = null;
    for (let t = 0; t < MAGIC.total; t += .005) {
      const p = ringPose(i, t);
      assert.ok((p.alpha === 0 || p.scale >= last - 1e-9) && p.scale <= 1.001 && p.alpha >= 0 && p.alpha <= .85 + 1e-9 && p.y >= 0 && p.y <= .2, `${i} ${t}`);
      if (p.alpha > .01 && start === null) start = t;
      last = p.scale; top = Math.max(top, p.alpha);
    }
    assert.ok(start > lastStart && top > .4, String(i)); lastStart = start;
  }
});

test('grit is thrown up and falls back to the floor', () => {
  for (let i = 0; i < MAGIC.grit; i++) {
    let peak = 0;
    for (let t = .005; t < MAGIC.total; t += .005) { const p = gritPose(i, t); assert.ok(p.y >= 0 && p.y <= 1.2 && Math.hypot(p.x, p.z) <= .5 + 1e-9 && p.alpha <= .8 + 1e-9); peak = Math.max(peak, p.y); }
    assert.ok(peak > .35);
    assert.ok(gritPose(i, MAGIC.total - .005).y < .05);
  }
});

test('the effect waits for the next frame and lands on the trap square', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createMagicTrap(THREE, {add() {}, remove() {}});
  fx.message('You hear a deafening roar!', 1, 1);
  assert.equal(fx.active, 0);
  fx.settle(2, 1);
  assert.equal(fx.active, 1);
  assert.deepEqual(added[0], [2, 1]);
  fx.update(MAGIC.total + .1);
  assert.equal(fx.active, 0);
  fx.message('You hear a deafening roar!', 5, 5);
  fx.update(PENDING_WAIT + .01);
  assert.equal(fx.active, 1);
  fx.clear();
  assert.equal(fx.active, 0);
});

test('the last mote stalls mid-air, trembling, while the rest fall', () => {
  const stray = MAGIC.grit - 1, y = (i, t) => gritPose(i, t).y;
  assert.ok(Math.abs(y(stray, .62 * MAGIC.total) - y(stray, .4 * MAGIC.total)) < .05 && y(stray, .5 * MAGIC.total) > .4, 'hangs');
  assert.ok(y(0, .9 * MAGIC.total) < .5 * y(0, .5 * MAGIC.total) && y(stray, .9 * MAGIC.total) > y(0, .9 * MAGIC.total) + .1, 'the others have fallen first');
  let xs = new Set();
  for (let t = .45; t < .6; t += .003) xs.add(gritPose(stray, t).x.toFixed(4));
  assert.ok(xs.size > 5, 'it trembles');
});

test('a shaking pack plays a quieter version at once, on the hero\'s square', () => {
  assert.ok(isPackShakeMessage('Your pack shakes violently!') && !isPackShakeMessage('You hear a deafening roar!') && !isMagicTrapMessage('Your pack shakes violently!'));
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createMagicTrap(THREE, {add() {}, remove() {}});
  fx.message('Your pack shakes violently!', 5, 6);
  assert.equal(fx.active, 1); assert.deepEqual(added[0], [5, 6]);
  fx.update(.5); fx.update(MAGIC.total); assert.equal(fx.active, 0);
});

test('the trap\'s omens play the quiet version at once, and only they do', () => {
  for (const t of ['A shiver runs up and down your spine!', 'You smell charred flesh.', 'You hear distant howling.', 'You suddenly yearn for your distant homeland.', 'You smell hamburgers.', 'You hear the moon howling at you.', 'You suddenly yearn for Cleveland.', 'You feel like the prodigal son.', 'You feel oddly like the prodigal son.']) assert.ok(isOmenMessage(t) && !isMagicTrapMessage(t) && !isPackShakeMessage(t), t);
  for (const t of ['You feel like a million bucks.', 'You hear a deafening roar!', null]) assert.ok(!isOmenMessage(t), String(t));
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set() {}, y: 0}; this.rotation = {}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createMagicTrap(THREE, {add() {}, remove() {}});
  fx.message('A shiver runs up and down your spine!', 3, 4);
  assert.equal(fx.active, 1);
  fx.update(MAGIC.total + .1); assert.equal(fx.active, 0);
});

test('"You feel tired." plays the quiet ring drowsily: slower, and it ends later', () => {
  assert.ok(isTiredMessage('You feel tired.') && !isTiredMessage('You feel tired of waiting') && !isTiredMessage(null));
  const run = text => {
    const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set() {}, y: 0}; this.rotation = {}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
    const m = createMagicTrap(THREE, {add() {}, remove() {}});
    m.message(text, 3, 4); let n = 0;
    while (m.active && n < 400) { m.update(.01); n++; }
    return n;
  };
  const quick = run('You smell charred flesh.'), slow = run('You feel tired.');
  assert.ok(slow > quick * 1.3 && slow < quick / TIRED_SLOW + 3, `${quick} vs ${slow}`);
});

test('the last ring gutters while the first holds steady', () => {
  const wob = i => { let up = 0, last = null; for (let s = .1; s < .4; s += .004) { const a = ringPose(i, i * MAGIC.gap + s).alpha, d = last === null ? 0 : a - last; if (d > 0) up++; last = a; } return up; };
  assert.equal(wob(0), 0);
  assert.ok(wob(MAGIC.rings - 1) > 5);
});

test('the first ring stalls once mid-spread, then carries on to rest', () => {
  const s = t => ringPose(0, t).scale;
  const u = x => s(x * MAGIC.life);
  assert.ok(u(.36) < (u(.3) + u(.42)) / 2 - .005, 'lags the smooth curve');
  assert.equal(ringPose(0, MAGIC.life + .01).alpha, 0);
});
