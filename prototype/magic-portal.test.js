import test from 'node:test';
import assert from 'node:assert/strict';
import {ringPose, sourPose, isPortalMessage, createMagicPortal, PORTAL} from './magic-portal.js';

test('only the magic portal message triggers it', () => {
  assert.ok(isPortalMessage('You activated a magic portal!'));
  for (const t of ['You feel a wrenching sensation.', 'You are momentarily blinded by a flash of light.', null]) assert.ok(!isPortalMessage(t), String(t));
});

test('every ring starts and ends at rest, and stays in bounds', () => {
  for (const dir of [-1, 1]) {
    const life = dir < 0 ? PORTAL.out : PORTAL.arrive;
    for (let i = 0; i < PORTAL.rings; i++) {
      for (const t of [0, life, 9]) assert.equal(ringPose(i, t, dir).alpha, 0);
      for (let t = 0; t <= life; t += .005) {
        const p = ringPose(i, t, dir);
        assert.ok(p.radius >= .1 - 1e-9 && p.radius <= 1.2 + 1e-9 && p.alpha >= 0 && p.alpha <= .7 + 1e-9, `${dir} ${i} ${t}`);
      }
    }
  }
  assert.equal(sourPose(0), 0); assert.equal(sourPose(9), 1);
});

test('rings wind inward on departure and outward on arrival', () => {
  assert.ok(ringPose(0, .1, -1).radius > ringPose(0, .6, -1).radius);
  assert.ok(ringPose(0, .1, 1).radius < ringPose(0, .5, 1).radius);
  assert.notEqual(ringPose(0, .3, -1).spin, ringPose(1, .3, -1).spin);
});

test('the last ring on the arrival hangs back at the centre, then tears loose', () => {
  const last = PORTAL.rings - 1;
  assert.equal(ringPose(last, .06, 1).radius, .1);
  assert.ok(ringPose(0, .06, 1).radius > .1 + .05, 'the others are already moving');
  assert.ok(ringPose(last, .06, 1).alpha > 0);
  assert.ok(ringPose(last, .4, 1).radius > ringPose(last, .2, 1).radius);
});

function fakeThree() {
  class V { constructor() { this.position = {set() {}, y: 0}; this.rotation = {}; this.scale = {setScalar() {}}; this.material = {color: new C()}; this.color = new C(); } add() {} dispose() {} }
  class C { copy() { return this; } lerp() { return this; } }
  return new Proxy({Color: C}, {get: (o, k) => o[k] || V});
}

test('the arrival only follows a portal, and everything finishes', () => {
  const b = createMagicPortal(fakeThree(), {add() {}, remove() {}});
  b.levelChanged(0, 0); assert.equal(b.active, 0, 'an ordinary level change shows nothing');
  b.message('You activated a magic portal!', 2, 3); assert.equal(b.active, 1);
  b.levelChanged(0, 0); assert.equal(b.active, 1, 'only the arrival remains');
  for (let t = 0; t < PORTAL.arrive + .2; t += 1 / 60) b.update(1 / 60);
  assert.equal(b.active, 0);
  b.message('You activated a magic portal!', 0, 0); b.clear();
  b.levelChanged(0, 0); assert.equal(b.active, 0, 'clear disarms');
});

test('the middle ring hitches once on the way down and nowhere else', () => {
  const plain = (i, t) => { const u = t / PORTAL.out; return (i % 2 ? -1 : 1) * (u * 9 + i) * -1 * -1; };
  assert.ok(Math.abs(ringPose(1, .55 * PORTAL.out, -1).spin - plain(1, .55 * PORTAL.out)) > .3, 'hitch moves the spin');
  assert.ok(Math.abs(ringPose(1, .3 * PORTAL.out, -1).spin - plain(1, .3 * PORTAL.out)) < 1e-9);
  assert.ok(Math.abs(ringPose(1, .9 * PORTAL.out - 1e-6, -1).spin - plain(1, .9 * PORTAL.out - 1e-6)) < 1e-9);
  assert.ok(Math.abs(ringPose(0, .6 * PORTAL.out, -1).spin - plain(0, .6 * PORTAL.out)) < 1e-9);
  assert.equal(ringPose(1, PORTAL.out, -1).alpha, 0);
});
