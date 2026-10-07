import test from 'node:test';
import assert from 'node:assert/strict';
import {runePose, isStudyMessage, createSpellStudy, STUDY} from './spell-study.js';

test('only opening a book triggers it', () => {
  assert.ok(isStudyMessage('You begin to memorize the runes.'));
  assert.ok(isStudyMessage('You begin to recite the runes.'));
  for (const t of ['You fail to cast the spell correctly.', 'You learn the spell.', null]) assert.ok(!isStudyMessage(t), String(t));
});

test('every rune starts and ends invisible, and all are gone by the end', () => {
  for (let i = 0; i < STUDY.runes; i++) for (const t of [0, STUDY.total]) assert.equal(runePose(i, t).alpha, 0, `${i}@${t}`);
});

test('runes stay in bounds and the last one outlives the rest', () => {
  let lastAlive = 0;
  for (let i = 0; i < STUDY.runes; i++) {
    let seen = false;
    for (let t = .001; t < STUDY.total; t += .005) {
      const p = runePose(i, t);
      assert.ok(Math.hypot(p.x, p.z) <= .4 && p.y >= 0 && p.y <= 1.1 && p.alpha >= 0 && p.alpha <= .8 + 1e-9, `${i}@${t}`);
      if (p.alpha > .01) { seen = true; if (i === STUDY.runes - 1) lastAlive = t; }
    }
    assert.ok(seen, `rune ${i} shows`);
  }
  assert.ok(lastAlive > 1.5 && runePose(0, lastAlive).alpha === 0, 'the first is gone while the last still gutters');
});

test('runes are dragged inward: radius shrinks to nothing before they fade', () => {
  for (let i = 0; i < STUDY.runes; i++) {
    const pull = .7 + i * .12;
    assert.ok(Math.hypot(runePose(i, pull - .01).x, runePose(i, pull - .01).z) > .2);
    assert.ok(Math.hypot(runePose(i, pull + .3).x, runePose(i, pull + .3).z) < .1, `rune ${i} reaches the head`);
  }
});

test('it plays on the hero\'s square and cleans up', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z])}; this.scale = {setScalar() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createSpellStudy(THREE, {add() {}, remove() {}});
  fx.message('You begin to memorize the runes.', 2, 5);
  assert.equal(fx.active, 1); assert.deepEqual(added[0], [2, 5]);
  fx.update(STUDY.total + .1); assert.equal(fx.active, 0);
  fx.message('You begin to memorize the runes.', 0, 0); fx.clear(); assert.equal(fx.active, 0);
});

test('one rune loses its nerve and bolts for the floor before the pull', () => {
  const pull = .7 + 2 * .12;
  assert.ok(runePose(2, pull - .11).y < runePose(2, pull - .3).y - .05);
});

test('a rune flinches outward as the one before it is dragged in, staying in bounds', () => {
  for (let i = 1; i < STUDY.runes; i++) {
    const r = t => Math.hypot(runePose(i, t).x, runePose(i, t).z);
    let rose = 0;
    for (let t = .7 + i * .12; t < STUDY.total; t += .01) if (r(t + .01) > r(t) + 1e-6) rose++;
    assert.ok(rose > 0, `rune ${i} lurches back out mid-pull`);
    for (let t = 0; t < STUDY.total; t += .005) assert.ok(r(t) <= .38 * 1.22 + 1e-9, `${i}@${t}`);
  }
});

test('the last rune sags as it gutters, then is gone', () => {
  const n = STUDY.runes - 1, end = .7 + n * .12 + .35;
  assert.ok(runePose(n, end + .2).y < runePose(n, end + .01).y - .04, 'sags');
  assert.ok(runePose(n, end + .2).y >= 0);
});

test('rune 3 blinks out mid-orbit and comes back, staying in bounds', () => {
  assert.ok(runePose(3, .46).alpha < runePose(3, .38).alpha * .3, 'dims');
  assert.ok(runePose(3, .56).alpha > runePose(3, .46).alpha * 2, 'returns');
  assert.equal(runePose(3, STUDY.total).alpha, 0);
});
