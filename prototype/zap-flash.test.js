import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fxTimeline} from './fx.js';
import {zapSource, zapPose, createZapFlash, ZAP_ARM, ZAP_RAISE_MS, ZAP_LOWER_MS, ZAP_HOLD_MAX_MS} from './zap-flash.js';

const zap = (zapType, cells, dir = 'horizontal') => fxTimeline({steps: [
  {op: 'start', mode: 'beam', glyph: 1, effect: {kind: 'zap', zap: zapType, dir}},
  ...cells.flatMap(([x, z]) => [{op: 'draw', x, z}, {op: 'tick'}]),
  {op: 'end'},
]});

test('zapSource finds the hero\'s own beam and ignores beams coming at them', () => {
  const own = zapSource(zap('fire', [[6, 5], [7, 5], [8, 5]]), {x: 5, z: 5});
  assert.deepEqual(own.dir, [1, 0]);
  assert.equal(own.look.glow, 0xff5a14);
  assert.equal(own.from, 0);
  assert.deepEqual(zapSource(zap('cold', [[4, 4]]), {x: 5, z: 5}).dir, [-1, -1]);
  // A monster's beam arriving: its first cell is next to the hero but it runs towards them.
  assert.equal(zapSource(zap('fire', [[7, 5], [6, 5], [5, 5]]), {x: 5, z: 5}), null);
  assert.equal(zapSource(zap('fire', [[6, 5], [5, 5]]), {x: 5, z: 5}), null);
  // Far away, on the hero's own cell, or not a ray.
  assert.equal(zapSource(zap('fire', [[9, 5], [10, 5]]), {x: 5, z: 5}), null);
  assert.equal(zapSource(zap('fire', [[5, 5], [6, 5]]), {x: 5, z: 5}), null);
  assert.equal(zapSource(fxTimeline({steps: [{op: 'start', mode: 'flash', effect: {kind: 'object'}},
    {op: 'draw', x: 6, z: 5}, {op: 'tick'}, {op: 'end'}]}), {x: 5, z: 5}), null);
  assert.equal(zapSource(zap('fire', [[6, 5]]), null), null);
  assert.equal(zapSource(null, {x: 5, z: 5}), null);
});

test('the arm snaps up, holds through the beam, kicks, and returns exactly to rest', () => {
  const cells = Array.from({length: 40}, (_, i) => [6 + i, 5]);
  for (const [tl, face] of [[zap('fire', cells.slice(0, 4)), 0], [zap('death', cells), 1.2], [zap('lightning', cells.slice(0, 1)), -2]]) {
    const src = zapSource(tl, {x: 5, z: 5});
    assert.ok(src.until - src.from <= ZAP_HOLD_MAX_MS);
    assert.equal(zapPose(src, -1, face), null);
    let last = zapPose(src, 0, face), maxStep = 0, sawFlash = false, minArm = 0;
    assert.ok(Math.abs(last.arm) < 1e-9 && Math.abs(last.yaw) < 1e-9);
    const end = src.from + Math.max(ZAP_RAISE_MS, src.until - src.from) + ZAP_LOWER_MS;
    for (let t = 2; t < end; t += 2) {
      const p = zapPose(src, t, face);
      assert.ok(p, `pose at ${t}`);
      assert.ok(Number.isFinite(p.arm) && Number.isFinite(p.yaw));
      assert.ok(p.arm <= .01 && p.arm >= ZAP_ARM - .01, `arm ${p.arm}`);
      assert.ok(Math.abs(p.yaw) <= Math.abs(face) + 1e-9);
      if (p.flash) {
        sawFlash = true;
        for (const v of Object.values(p.flash)) assert.ok(Number.isFinite(v));
        assert.ok(p.flash.alpha >= 0 && p.flash.alpha <= 1 && p.flash.size > 0 && p.flash.size < .3);
      }
      maxStep = Math.max(maxStep, Math.abs(p.arm - last.arm));
      minArm = Math.min(minArm, p.arm);
      last = p;
    }
    assert.ok(sawFlash);
    assert.ok(minArm < ZAP_ARM + .2);
    assert.ok(maxStep < .06, `arm step ${maxStep}`);
    assert.ok(Math.abs(last.arm) < .01 && Math.abs(last.yaw) < .01 * Math.max(1, Math.abs(face)));
    assert.equal(zapPose(src, end, face), null);
  }
});

test('createZapFlash poses the hero\'s arm and heading, then takes it all back off', () => {
  const group = new THREE.Group();
  const g = new THREE.Group(), arm = new THREE.Group(), wrist = new THREE.Group();
  arm.position.set(.34, .92, 0); wrist.position.set(0, -.5, 0);
  g.add(arm); arm.add(wrist); group.add(g);
  g.rotation.y = .5; arm.rotation.x = .1;
  const hero = {g, arm, wrist};
  const fx = createZapFlash(THREE, group);
  assert.equal(fx.play(zap('sleep', [[4, 5], [3, 5], [2, 5], [1, 5], [0, 5], [-1, 5]]), {x: 5, z: 5}, hero), true);
  assert.equal(fx.play(zap('sleep', [[9, 5]]), {x: 5, z: 5}, hero), false);
  let sawGlow = false;
  for (let i = 0; i < 120; i++) {
    fx.unpose(hero);
    assert.ok(Math.abs(g.rotation.y - .5) < 1e-9 && Math.abs(arm.rotation.x - .1) < 1e-9);
    fx.update(1 / 60, hero);
    if (fx.glow.visible) {
      sawGlow = true;
      assert.ok([...fx.glow.position.toArray()].every(Number.isFinite));
      assert.ok(fx.glow.position.y > .2 && fx.glow.position.y < 1.2);
    }
    // Facing the beam (it runs towards -x): yaw -π/2, reached the short way from 0.5.
    if (i === 10) assert.ok(Math.abs(g.rotation.y + Math.PI / 2) < .05, `yaw ${g.rotation.y}`);
  }
  assert.ok(sawGlow);
  assert.equal(fx.active, false);
  fx.unpose(hero);
  assert.ok(Math.abs(g.rotation.y - .5) < 1e-9 && Math.abs(arm.rotation.x - .1) < 1e-9);
  assert.equal(fx.glow.visible, false);
  fx.dispose();
  assert.equal(group.children.length, 1);
});
