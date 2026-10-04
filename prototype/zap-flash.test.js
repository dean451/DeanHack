import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fxTimeline, delayTimeline} from './fx.js';
import {zapSource, zapPose, createZapFlash, heroBreathes, BREATH_HEAD, BREATH_LEAN, ZAP_ARM, ZAP_RAISE_MS, ZAP_LOWER_MS, ZAP_HOLD_MAX_MS, ZAP_WINDUP_MS, ZAP_WINDUP_UP} from './zap-flash.js';

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
  assert.equal(fx.play(zap('sleep', [[4, 5], [3, 5], [2, 5], [1, 5], [0, 5], [-1, 5]]), {x: 5, z: 5}, hero), 'zap');
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

const heroFrame = (symbol, kind = 'monster') => ({player: {x: 5, z: 5},
  cells: [{x: 5, z: 5, kind, symbol: symbol.charCodeAt(0), visible: true}]});

test('a dragon or hound hero breathes: head and lean instead of the arm, flash at the mouth', () => {
  assert.equal(heroBreathes(heroFrame('D')), true);
  assert.equal(heroBreathes(heroFrame('d')), true);
  assert.equal(heroBreathes(heroFrame('@')), false);
  assert.equal(heroBreathes(heroFrame('D', 'object')), false);
  assert.equal(heroBreathes({player: {x: 5, z: 5}, cells: []}), false);
  assert.equal(heroBreathes(null), false);
  const cells = Array.from({length: 12}, (_, i) => [6 + i, 5]);
  assert.equal(zapSource(zap('fire', cells), {x: 5, z: 5}, heroFrame('@')).breath, false);
  const src = zapSource(zap('fire', cells), {x: 5, z: 5}, heroFrame('D'));
  assert.equal(src.breath, true);
  const end = src.from + Math.max(ZAP_RAISE_MS, src.until - src.from) + ZAP_LOWER_MS;
  let last = zapPose(src, 0, .8), maxStep = 0, minHead = 0, maxLean = 0;
  for (let t = 2; t < end; t += 2) {
    const p = zapPose(src, t, .8);
    for (const k of ['arm', 'head', 'body', 'yaw']) assert.ok(Number.isFinite(p[k]), `${k} at ${t}`);
    assert.equal(p.arm, 0);
    assert.ok(p.head >= BREATH_HEAD - .01 && p.head <= .15 && p.body >= 0 && p.body <= BREATH_LEAN + 1e-9);
    if (p.flash) assert.ok(p.flash.size > 0 && p.flash.size < .3 && p.flash.alpha <= 1);
    maxStep = Math.max(maxStep, Math.abs(p.head - last.head), Math.abs(p.body - last.body));
    minHead = Math.min(minHead, p.head); maxLean = Math.max(maxLean, p.body);
    last = p;
  }
  assert.ok(minHead < BREATH_HEAD + .1 && maxLean > BREATH_LEAN - .01);
  assert.ok(maxStep < .06, `step ${maxStep}`);
  assert.ok(Math.abs(last.head) < .01 && Math.abs(last.body) < .01 && Math.abs(last.yaw) < .01);
  assert.equal(zapPose(src, end, .8), null);

  // On the model: the head and body come back exactly, the arm is never touched, and the
  // flash sits in front of the face.
  const group = new THREE.Group(), g = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group(), arm = new THREE.Group();
  head.position.set(0, 1.23, .02); body.add(head); body.add(arm); g.add(body); group.add(g);
  head.rotation.x = .05; body.rotation.x = -.02; arm.rotation.x = .1;
  const hero = {g, body, head, arm};
  const fx = createZapFlash(THREE, group);
  assert.equal(fx.play(zap('fire', cells), {x: 5, z: 5}, hero, heroFrame('D')), 'breath');
  let sawGlow = false;
  for (let i = 0; i < 150; i++) {
    fx.unpose(hero);
    assert.ok(Math.abs(head.rotation.x - .05) < 1e-9 && Math.abs(body.rotation.x + .02) < 1e-9 && arm.rotation.x === .1);
    fx.update(1 / 60, hero);
    assert.equal(arm.rotation.x, .1);
    if (fx.glow.visible) {
      sawGlow = true;
      const p = fx.glow.position;
      assert.ok(p.y > 1 && p.y < 1.4 && Math.hypot(p.x, p.z) > .15 && p.x >= -1e-9, `mouth ${p.toArray()}`);
    }
  }
  assert.ok(sawGlow && !fx.active);
  fx.unpose(hero);
  assert.ok(Math.abs(head.rotation.x - .05) < 1e-9 && Math.abs(body.rotation.x + .02) < 1e-9);
  fx.dispose();
});

test('with a windup the arm and a charge come up first, and the flash bursts at the release', () => {
  const cells = Array.from({length: 6}, (_, i) => [6 + i, 5]);
  for (const breath of [false, true]) {
    const src = {...zapSource(zap('cold', cells), {x: 5, z: 5}), breath};
    src.from += ZAP_WINDUP_MS; src.until += ZAP_WINDUP_MS; src.windup = ZAP_WINDUP_MS;
    const face = -1.4, key = breath ? 'head' : 'arm';
    assert.equal(zapPose(src, -.5, face), null);
    const start = zapPose(src, 0, face);
    assert.ok(Math.abs(start[key]) < 1e-9 && Math.abs(start.yaw) < 1e-9 && start.flash.alpha < 1e-9);
    const end = src.from + Math.max(ZAP_RAISE_MS, src.until - src.from) + ZAP_LOWER_MS;
    let last = start, maxStep = 0, maxYawStep = 0, chargeMax = 0;
    for (let t = .5; t < end; t += .5) {
      const p = zapPose(src, t, face);
      for (const k of ['arm', 'head', 'body', 'yaw']) assert.ok(Number.isFinite(p[k]), `${k} at ${t}`);
      for (const v of Object.values(p.flash ?? {})) assert.ok(Number.isFinite(v));
      if (p.flash) assert.ok(p.flash.alpha >= 0 && p.flash.alpha <= 1 && p.flash.size > 0 && p.flash.size < .3);
      if (t < src.from) {
        chargeMax = Math.max(chargeMax, p.flash.alpha);
        assert.equal(p.flash.ringAlpha, 0);
      }
      maxStep = Math.max(maxStep, Math.abs(p[key] - last[key]));
      maxYawStep = Math.max(maxYawStep, Math.abs(p.yaw - last.yaw));
      last = p;
    }
    // Facing and most of the raise are done by the release, then it bursts.
    const before = zapPose(src, src.from - .5, face), at = zapPose(src, src.from, face);
    assert.ok(Math.abs(before.yaw - face) < .01);
    const full = breath ? BREATH_HEAD : ZAP_ARM;
    assert.ok(Math.abs(before[key] - full * ZAP_WINDUP_UP) < .01);
    assert.ok(chargeMax > .3 && chargeMax < .5 && at.flash.alpha > .95 && at.flash.ringAlpha > .7);
    assert.ok(maxStep < .02, `${key} step ${maxStep} per .5 ms`);
    assert.ok(maxYawStep < .02, `yaw step ${maxYawStep}`);
    assert.ok(Math.abs(last[key]) < .01 && Math.abs(last.yaw) < .01 && Math.abs(last.body) < .01);
    assert.equal(zapPose(src, end, face), null);
  }
});

test('play with a windup lines the release up with the delayed timeline', () => {
  const group = new THREE.Group(), g = new THREE.Group(), arm = new THREE.Group();
  g.add(arm); group.add(g);
  const hero = {g, arm};
  const fx = createZapFlash(THREE, group);
  const tl = zap('fire', [[6, 5], [7, 5]]);
  assert.equal(fx.play(tl, {x: 5, z: 5}, hero, null, {windup: ZAP_WINDUP_MS}), 'zap');
  const delayed = delayTimeline(tl, ZAP_WINDUP_MS);
  assert.equal(zapSource(delayed, {x: 5, z: 5}).from, ZAP_WINDUP_MS);
  // The arm is moving before the delayed beam's first cell appears.
  fx.update(.06, hero);
  assert.ok(arm.rotation.x < -.1 && arm.rotation.x > ZAP_ARM * ZAP_WINDUP_UP - 1e-9);
  assert.ok(fx.glow.visible && !fx.ring.visible);
  for (let i = 0; i < 120; i++) fx.update(1 / 60, hero);
  assert.ok(!fx.active);
  fx.unpose(hero);
  assert.equal(arm.rotation.x, 0);
  fx.dispose();
});

test('after a windup the arm snaps out of the release at once, then settles at full reach', () => {
  const cells = Array.from({length: 6}, (_, i) => [6 + i, 5]);
  const src = {...zapSource(zap('cold', cells), {x: 5, z: 5}), breath: false};
  src.from += ZAP_WINDUP_MS; src.until += ZAP_WINDUP_MS; src.windup = ZAP_WINDUP_MS;
  const arm = t => zapPose(src, src.from + t, 0).arm;
  const early = Math.abs(arm(10) - arm(0)), late = Math.abs(arm(ZAP_RAISE_MS) - arm(ZAP_RAISE_MS - 10));
  assert.ok(early > late * 3, `early ${early} late ${late}`);
  for (let t = 1; t <= ZAP_RAISE_MS; t++) assert.ok(Math.abs(arm(t)) >= Math.abs(arm(t - 1)) - 1e-9 || t > 40, `monotone at ${t}`);
});
