import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {hitStyle, hitReactionPose, hitHeight, createHitFx, HIT_STYLES, HIT_TIME, HIT_SPRAY} from './hit-fx.js';
import {actionPose} from './actions.js';
import {IMPACTS} from './swing.js';
import {createCreature} from './creatures.js';

const KEYS = Object.keys(hitReactionPose('knock', 0));
const REST = hitReactionPose('knock', 0);

test('attack and blow types pick a reaction', () => {
  assert.equal(hitStyle('claw'), 'cut');
  assert.equal(hitStyle('bite'), 'bite');
  assert.equal(hitStyle('butt'), 'crush');
  assert.equal(hitStyle('tentacle'), 'hug');
  assert.equal(hitStyle('gaze'), 'jolt');
  assert.equal(hitStyle('weapon', 'pierce'), 'stab');
  assert.equal(hitStyle('weapon', 'blunt'), 'crush');
  assert.equal(hitStyle('weapon', null), 'knock');
  assert.equal(hitStyle(undefined), 'knock');
  assert.equal(hitStyle('nonsense'), 'knock');
  for (const s of HIT_STYLES) assert.ok(HIT_TIME[s] > 0 && s in HIT_SPRAY, s);
});

test('the knock reaction matches the old generic hit pose', () => {
  for (const dir of [[1, 0], [0, -1], null]) for (let u = 0; u <= 1; u += .05) {
    const a = hitReactionPose('knock', u, dir), b = actionPose({kind: 'hit', dir}, u, 0);
    for (const k of KEYS) assert.ok(Math.abs(a[k] - b[k]) < 1e-12, `${k} u=${u}`);
  }
});

test('every reaction is finite, bounded, distinct and returns to rest', () => {
  const shapes = {};
  for (const style of [...HIT_STYLES, 'unknown']) for (const dir of [[.6, .8], [-1, 0], null]) {
    for (const u of [0, 1, -.5, 1.5]) {
      const p = hitReactionPose(style, u, dir);
      for (const k of KEYS) assert.ok(Math.abs(p[k] - REST[k]) < 1e-9, `${style} ${k} at u=${u}`);
    }
    let peak = 0;
    for (let i = 0; i <= 240; i++) {
      const p = hitReactionPose(style, i / 240, dir);
      for (const k of KEYS) assert.ok(Number.isFinite(p[k]), `${style} ${k}`);
      assert.ok(Math.hypot(p.dx, p.dz) <= .21 && Math.abs(p.dy) <= .06, style);
      for (const k of ['yaw', 'pitch', 'roll', 'head', 'tail', 'arm', 'fore', 'leg', 'wing']) assert.ok(Math.abs(p[k]) <= .4, `${style} ${k}`);
      assert.ok(p.scale > .9 && p.scale < 1.1 && p.stretch > .84 && p.stretch < 1.12, style);
      peak = Math.max(peak, Math.abs(p.pitch) + Math.abs(p.roll) + Math.abs(p.yaw) + Math.abs(1 - p.stretch));
    }
    assert.ok(peak > .05, `${style} visibly moves`);
    if (dir?.[0] === .6) shapes[style] = JSON.stringify([.1, .3, .6].map(u => hitReactionPose(style, u, dir)));
  }
  const styles = HIT_STYLES;
  for (let i = 0; i < styles.length; i++) for (let j = i + 1; j < styles.length; j++)
    assert.notEqual(shapes[styles[i]], shapes[styles[j]], `${styles[i]} vs ${styles[j]}`);
  // A blow pushes the defender along it, never back into the attacker.
  for (const style of HIT_STYLES) for (let u = 0; u <= 1; u += .05) {
    const p = hitReactionPose(style, u, [.6, .8]);
    assert.ok(p.dx * .6 + p.dz * .8 >= -1e-12, style);
  }
});

test('reactions posed on a real creature come back exactly to rest', () => {
  const c = createCreature({name: 'jackal'});
  const g = c.group ?? c.g ?? c;
  const before = JSON.stringify([g.position, g.rotation.toArray(), g.scale]);
  for (const style of HIT_STYLES) for (let u = 0; u <= 1; u += 1 / 30) {
    const p = hitReactionPose(style, u, [0, 1]);
    g.position.x += p.dx; g.position.y += p.dy; g.position.z += p.dz;
    g.rotation.y += p.yaw; g.rotation.x += p.pitch; g.rotation.z += p.roll;
    g.scale.multiplyScalar(p.scale); const w = Math.sqrt(p.stretch); g.scale.y *= p.stretch; g.scale.x /= w; g.scale.z /= w;
    const box = new THREE.Box3().setFromObject(g);
    assert.ok([box.min.y, box.max.y].every(Number.isFinite) && box.max.y < 2, style);
    g.scale.y /= p.stretch; g.scale.x *= w; g.scale.z *= w; g.scale.multiplyScalar(1 / p.scale);
    g.rotation.y -= p.yaw; g.rotation.x -= p.pitch; g.rotation.z -= p.roll;
    g.position.x -= p.dx; g.position.y -= p.dy; g.position.z -= p.dz;
  }
  const after = JSON.parse(JSON.stringify([g.position, g.rotation.toArray(), g.scale]));
  const want = JSON.parse(before);
  const flat = v => JSON.stringify(v, (k, x) => typeof x === 'number' ? Math.round(x * 1e9) / 1e9 : x);
  assert.equal(flat(after), flat(want));
});

function actor(name, x, z, hit, height) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  if (height) g.userData.height = height;
  return {g, species: name, actions: {current: hit}};
}

test('hit fx sprays once per hit by the defender\'s seen material, then clears', () => {
  const world = new THREE.Group(), fx = createHitFx(THREE, world);
  assert.ok(world.children.includes(fx.burst.points));
  const jelly = actor('ochre jelly', 3, 2, {kind: 'hit', attack: 'bite', dir: [1, 0]}, .5);
  const hero = actor('', 0, 0, {kind: 'hit', attack: 'claw', dir: [0, -1]});
  const struck = actor('jackal', 5, 5, {kind: 'hit', attack: 'weapon', blow: 'slash', dir: [0, 1], sprayed: true});
  const shivers = actor('newt', 7, 7, {kind: 'hit', attack: 'touch', dir: [1, 0]});
  const idle = actor('newt', 9, 9, null);
  const all = [jelly, hero, struck, shivers, idle, {g: null}, null];
  fx.update(all, 1 / 60);
  const ooze = Math.round(IMPACTS.ooze.count * .7), flesh = IMPACTS.flesh.count;
  assert.equal(fx.burst.alive, ooze + flesh);
  // Particles start at chest height, a little back toward the attacker.
  const p = fx.burst.points.geometry.attributes.position.array, ys = [];
  for (let i = 0; i < p.length; i += 3) if (p[i + 1] > -100) {
    assert.ok([p[i], p[i + 1], p[i + 2]].every(Number.isFinite));
    const near = Math.hypot(p[i] - 3, p[i + 2] - 2) < .4 || Math.hypot(p[i], p[i + 2]) < .4;
    assert.ok(near, `particle at ${p[i]},${p[i + 2]}`);
    ys.push(p[i + 1]);
  }
  assert.ok(ys.every(y => y > .1 && y < .7));
  // The same actions don't spray again; a new hit does.
  for (let i = 0; i < 10; i++) fx.update(all, 1 / 60);
  const now = fx.burst.alive;
  assert.ok(now <= ooze + flesh);
  jelly.actions.current = {kind: 'hit', attack: 'kick', dir: [0, 1]};
  fx.update(all, 1 / 60);
  assert.ok(fx.burst.alive > now);
  for (let i = 0; i < 120; i++) fx.update(all, 1 / 60);
  assert.equal(fx.burst.alive, 0);
  fx.update(null, 1 / 60); fx.update([], NaN);
  fx.dispose();
  assert.ok(!world.children.includes(fx.burst.points));
});

test('spray height follows the staged model height, within bounds', () => {
  assert.equal(hitHeight(null), .55);
  assert.equal(hitHeight({g: new THREE.Group()}), .55);
  assert.ok(Math.abs(hitHeight(actor('x', 0, 0, null, 1)) - .55) < 1e-12);
  assert.equal(hitHeight(actor('x', 0, 0, null, .1)), .15);
  assert.equal(hitHeight(actor('x', 0, 0, null, 9)), 1.6);
});
