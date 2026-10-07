import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fxTimeline, FX_TICK_MS} from './fx.js';
import {EXPLOSION_LOOKS, RING_SIDES, BURST_MS, BALL_R, RING_R, EMBERS_PER_BURST, explosionBursts, explosionFrame, createExplosions} from './explosions.js';

const expl = (type, part) => ({kind: 'explosion', explosion: type, part});
// explode() at (cx, cz): one beam sequence, a change + draw for each visible cell (x outer,
// y inner, as in explode.c), two ticks, then the end.
const blast = (type, cx, cz, skip = () => false) => {
  const steps = [];
  let first = true;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const part = j * 3 + i, x = cx + i - 1, z = cz + j - 1;
    if (skip(x, z)) continue;
    steps.push({op: first ? 'start' : 'change', mode: 'beam', glyph: 100 + part, effect: expl(type, part)}, {op: 'draw', x, z});
    first = false;
  }
  return [...steps, {op: 'tick'}, {op: 'tick'}, {op: 'end'}];
};
const finite = o => JSON.stringify(o, (k, v) => {
  if (typeof v === 'number') assert.ok(Number.isFinite(v), `${k} not finite`);
  return v;
});

test('an explosion is one burst at the centre of its 3×3 block', () => {
  const b = explosionBursts(fxTimeline({steps: blast('fiery', 10, 5)}));
  assert.equal(b.length, 1);
  assert.deepEqual([b[0].x, b[0].z, b[0].t, b[0].type], [10, 5, 0, 'fiery']);
});

test('the centre is found even when only a corner was in view', () => {
  const b = explosionBursts(fxTimeline({steps: blast('frosty', 4, 7, (x, z) => !(x === 5 && z === 8))}));
  assert.deepEqual([b[0].x, b[0].z], [4, 7]);
});

test('two explosions in one event stay separate, in order; rays and throws are ignored', () => {
  const zap = {op: 'start', mode: 'beam', glyph: 1, effect: {kind: 'zap', zap: 'fire', dir: 'horizontal'}};
  const tl = fxTimeline({steps: [zap, {op: 'draw', x: 1, z: 1}, {op: 'tick'}, {op: 'end'},
    ...blast('fiery', 3, 3), ...blast('magical', 8, 2)]});
  const b = explosionBursts(tl);
  assert.deepEqual(b.map(k => k.type), ['fiery', 'magical']);
  assert.equal(b[0].t, FX_TICK_MS);
  assert.ok(b[1].t > b[0].t);
  assert.deepEqual(explosionBursts(fxTimeline({steps: [zap, {op: 'draw', x: 1, z: 1}, {op: 'end'}]})), []);
});

test('every type plays finite, bounded frames and is gone after BURST_MS', () => {
  for (const type of Object.keys(EXPLOSION_LOOKS)) {
    const burst = {x: 0, z: 0, t: 0, type, seed: .37};
    let peakR = 0, peakLight = 0;
    for (let age = 0; age < BURST_MS; age += 10) {
      const f = explosionFrame(burst, age);
      assert.ok(f, `${type} at ${age}`);
      finite(f);
      for (const a of [f.ball.alpha, f.ring.alpha, f.light, ...(f.smoke ? [f.smoke.alpha] : [])]) assert.ok(a >= 0 && a <= 1, `${type} alpha ${a}`);
      assert.ok(f.ball.r > 0 && f.ball.r <= BALL_R && f.ring.r <= RING_R);
      assert.ok(f.embers.length <= EMBERS_PER_BURST);
      for (const p of f.embers) {
        assert.ok(p.y >= 0 && p.y < 2.5, `${type} ember y ${p.y}`);
        assert.ok(Math.hypot(p.x, p.z) < 1.2, `${type} ember spread`);
        assert.ok(p.alpha >= 0 && p.alpha <= 1);
      }
      peakR = Math.max(peakR, f.ball.r); peakLight = Math.max(peakLight, f.light);
    }
    assert.ok(peakR > BALL_R * .9, `${type} ball reaches full size`);
    assert.equal(explosionFrame(burst, BURST_MS), null);
    assert.equal(explosionFrame(burst, -1), null);
    if (type === 'dark') assert.equal(peakLight, 0); else assert.ok(peakLight > .15, type);
  }
});

test('the ball swells, then burns out; the ring outruns it and fades', () => {
  const b = {x: 0, z: 0, t: 0, type: 'fiery', seed: .5};
  const f = a => explosionFrame(b, a);
  assert.ok(f(200).ball.r > f(5).ball.r * 3);
  assert.ok(f(850).ball.alpha < .05 && f(200).ball.alpha > .5);
  assert.ok(f(300).ring.r > f(300).ball.r);
  assert.equal(f(460).ring.alpha, 0);
  // Fire's embers fall back to the floor; its smoke rises.
  assert.ok(f(880).embers.every(p => p.y < .2));
  assert.ok(f(700).smoke.y > f(350).smoke.y);
});

test('the renderer shows a burst, returns its light, and goes back to nothing', () => {
  const scene = new THREE.Group();
  const ex = createExplosions(THREE, scene);
  assert.equal(ex.add(fxTimeline({steps: blast('fiery', 12, 6)})), 1);
  let peak = 0, maxEmbers = 0;
  for (let i = 0; i < 70; i++) {
    const r = ex.update(1 / 60, {x: 10, z: 5});
    finite(r);
    if (r.light > peak) { peak = r.light; assert.deepEqual([r.x, r.z], [12, 6]); }
    maxEmbers = Math.max(maxEmbers, r.embers);
    if (i === 10) {
      const ball = scene.children.find(m => m.visible && m.geometry?.type === 'SphereGeometry');
      assert.deepEqual([ball.position.x, ball.position.z], [2, 1]);
      assert.equal(ball.material.blending, THREE.AdditiveBlending);
    }
  }
  assert.ok(peak > .8 && maxEmbers > 10);
  const end = ex.update(.5);
  assert.deepEqual([end.count, end.light, end.embers, ex.active], [0, 0, 0, 0]);
  assert.ok(scene.children.filter(m => m.isMesh).every(m => !m.visible));
  ex.add(fxTimeline({steps: blast('dark', 1, 1)}));
  ex.update(.1);
  assert.ok(scene.children.some(m => m.visible && m.material.blending === THREE.NormalBlending && m.geometry.type === 'SphereGeometry'));
  ex.clear();
  assert.equal(ex.active, 0);
  ex.dispose();
  assert.equal(scene.children.length, 0);
});

test('every explosion look has its own ring outline, so kinds differ without colour', () => {
  assert.deepEqual(Object.keys(RING_SIDES).sort(), Object.keys(EXPLOSION_LOOKS).sort());
  assert.equal(new Set(Object.values(RING_SIDES)).size, Object.keys(EXPLOSION_LOOKS).length);
  for (const type of Object.keys(EXPLOSION_LOOKS)) {
    const f = explosionFrame({type, seed: .3}, 100);
    assert.equal(f.ring.sides, RING_SIDES[type]);
  }
});
