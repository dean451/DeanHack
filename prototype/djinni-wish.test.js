import test from 'node:test';
import assert from 'node:assert/strict';
import {smokePose, eyePose, curlPose, isDjinniWish, createDjinniWish, DJINNI} from './djinni-wish.js';

test('only a bottle wish triggers it', () => {
  assert.ok(isDjinniWish({type: 'wish', source: 'bottle'}));
  for (const v of [{type: 'wish', source: 'wand'}, {type: 'wish', source: 'demon'}, {type: 'pickup', source: 'bottle'}, null]) assert.ok(!isDjinniWish(v), JSON.stringify(v));
});

test('every part starts and ends invisible', () => {
  for (const t of [0, DJINNI.total, DJINNI.total + 1]) for (const p of [smokePose(t), eyePose(t), curlPose(t)]) assert.equal(p.alpha, 0, String(t));
});

test('poses stay in bounds and the shape stands, stares and bows', () => {
  let tall = 0, eyeSeen = false, maxLean = 0;
  for (let t = 0; t <= DJINNI.total; t += .01) {
    const s = smokePose(t), e = eyePose(t), c = curlPose(t);
    for (const a of [s.alpha, e.alpha, c.alpha]) assert.ok(a >= 0 && a <= 1, String(t));
    assert.ok(s.height <= 2.61 && s.width <= 1.1 && Math.abs(s.lean) <= .9 && c.radius <= 1.31, String(t));
    tall = Math.max(tall, s.height); maxLean = Math.max(maxLean, s.lean); eyeSeen ||= e.alpha > .5;
  }
  assert.ok(tall > 2 && eyeSeen && maxLean > .3);
});

test('the eyes go out before the smoke does', () => {
  assert.equal(eyePose(DJINNI.total * .7).alpha, 0);
  assert.ok(smokePose(DJINNI.total * .7).alpha > 0);
});

test('the effect plays once per bottle wish and cleans up', () => {
  const THREE = new Proxy({}, {get: (_, k) => k === 'AdditiveBlending' ? 2 : class { constructor() { this.position = {set() {}, y: 0}; this.scale = {set() {}, setScalar() {}}; this.rotation = {}; this.material = {}; this.userData = {}; } add() {} dispose() {} }});
  const fx = createDjinniWish(THREE, {add() {}, remove() {}});
  fx.wish({type: 'wish', source: 'wand'}, 1, 1); assert.equal(fx.active, 0);
  fx.wish({type: 'wish', source: 'bottle'}, 1, 1); assert.equal(fx.active, 1);
  fx.update(1.6); assert.equal(fx.active, 1);
  fx.update(1.7); assert.equal(fx.active, 0);
  fx.wish({type: 'wish', source: 'bottle'}, 1, 1); fx.clear(); assert.equal(fx.active, 0);
});

test('the djinni blinks a second, quicker time after the first', () => {
  const size = u => eyePose(DJINNI.total * u).size;
  assert.ok(size(.465) < size(.4) * .5 && size(.52) < size(.4) * .5, 'two blinks');
  assert.ok(size(.5) > size(.52) * 2, 'eyes reopen between them');
});
