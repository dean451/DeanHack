import test from 'node:test';
import assert from 'node:assert/strict';
import {TUG, strandPose, isWebMessage, createWebSnare, PENDING_WAIT, WEB, SNAPPED, SNAP_AT, TUG2, TUG2_AT} from './web-snare.js';

test('stumbling into a web triggers it', () => {
  assert.ok(isWebMessage('You stumble into a spider web!'));
  for (const t of ['You are caught in a web.', 'You escape a web.', null]) assert.ok(!isWebMessage(t), String(t));
});

test('every strand starts and ends invisible', () => {
  for (let i = 0; i < WEB.strands; i++) for (const t of [0, WEB.total]) assert.equal(strandPose(i, t).alpha, 0, `${i} ${t}`);
});

test('strands snap out to a bounded reach, twang and fade', () => {
  for (let i = 0; i < WEB.strands; i++) {
    let top = 0, long = 0;
    for (let t = .005; t < WEB.total; t += .005) {
      const p = strandPose(i, t);
      assert.ok(p.len <= WEB.reach * 1.2 && p.lift >= 0 && p.lift <= .36 && p.alpha <= .8 + 1e-9, `${i} ${t}`);
      top = Math.max(top, p.alpha); long = Math.max(long, p.len);
    }
    assert.ok(top > .6 && long > .4, String(i));
  }
});

test('the stray strand twitches on after the others are still', () => {
  const t = WEB.total - .2;
  assert.equal(strandPose(0, t).alpha, 0);
  assert.ok(strandPose(WEB.strands - 1, t).alpha > .05);
});

test('the effect waits for the next frame and lands on the trap square', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createWebSnare(THREE, {add() {}, remove() {}});
  fx.message('You stumble into a spider web!', 1, 1);
  assert.equal(fx.active, 0);
  fx.settle(2, 1);
  assert.equal(fx.active, 1);
  assert.deepEqual(added[0], [2, 1]);
  fx.update(WEB.total + .1);
  assert.equal(fx.active, 0);
  fx.message('You stumble into a spider web!', 5, 5);
  fx.update(PENDING_WAIT + .01);
  assert.equal(fx.active, 1);
  fx.clear();
  assert.equal(fx.active, 0);
});

test('the stray strand gives one late extra snap, in bounds', () => {
  const n = WEB.strands - 1, base = t => strandPose(n, t).lift;
  assert.ok(base(1.225) > base(1.1) && base(1.225) > base(1.35), 'bump');
  for (let t = 0; t < WEB.total; t += .01) { const p = strandPose(n, t); assert.ok(p.lift >= 0 && p.lift <= .36); }
});

test('settled strands drift a little in a draught, and stay still at rest', () => {
  const swing = []; for (let t = .8; t < 1.3; t += .01) swing.push(strandPose(0, t).angle);
  assert.ok(Math.max(...swing) - Math.min(...swing) > .03);
  for (let i = 0; i < WEB.strands; i++) for (let t = .8; t < WEB.total; t += .01) assert.ok(Math.abs(strandPose(i, t).angle - i * 2.4) < .2);
  assert.equal(strandPose(0, WEB.total).angle, 0);
});

test('one strand parts early and whips back, while its neighbours still hang', () => {
  assert.equal(strandPose(SNAPPED, SNAP_AT + .01).alpha, 0);
  assert.ok(strandPose(SNAPPED + 1, SNAP_AT + .01).alpha > .1);
  assert.ok(strandPose(SNAPPED, SNAP_AT - .02).len < strandPose(SNAPPED, SNAP_AT - .15).len * .5, 'recoil');
  for (let t = 0; t < WEB.total; t += .005) { const p = strandPose(SNAPPED, t); assert.ok(p.lift >= 0 && p.lift <= .36 && p.len <= WEB.reach * 1.2, String(t)); }
});

test('the web tugs inward once at about .6s, then lets go', () => {
  for (const i of [0, 1, 2, 4, 5]) {
    const before = strandPose(i, .54).len, mid = strandPose(i, .61).len, after = strandPose(i, .68).len;
    assert.ok(mid < before * (1 - TUG * .7), String(i));
    assert.ok(after > mid, String(i));
    assert.ok(mid <= WEB.reach * 1.1);
  }
});

test('the strand about to part trembles, then is gone', () => {
  const end = SNAP_AT; let wob = 0;
  for (let t = end - .2; t < end - .1; t += .002) wob = Math.max(wob, Math.abs(strandPose(SNAPPED, t).len - strandPose(SNAPPED, t + .0005).len));
  assert.ok(wob > .0005);
  assert.equal(strandPose(SNAPPED, SNAP_AT).alpha, 0);
});

test('a second, smaller tug comes late and lets go', () => {
  for (const i of [0, 1, 2, 4, 5]) {
    const before = strandPose(i, TUG2_AT - .03).len, mid = strandPose(i, TUG2_AT + .05).len;
    assert.ok(mid < before, String(i));
    assert.ok(mid > before * (1 - TUG2 * 1.5) - .05, String(i));
  }
});

test('the second strand spasms once, mid-web, and is steady either side', () => {
  const calm = t => Math.abs(strandPose(1, t).lift - strandPose(1, t + .005).lift);
  let spasm = 0; for (let t = .75; t < .87; t += .001) spasm = Math.max(spasm, calm(t));
  assert.ok(spasm > .006, String(spasm));
  assert.ok(calm(.7) < spasm / 4 && calm(.95) < spasm / 4);
  for (let t = 0; t <= WEB.total; t += .005) assert.ok(strandPose(1, t).lift < .4 && strandPose(1, t).lift > -.2, String(t));
});
