import test from 'node:test';
import assert from 'node:assert/strict';
import {glowPose, glowAlignment, GLOW, GLOW_COLORS} from './altar-glow.js';

test('only the altar look message triggers it, and it names the alignment', () => {
  assert.equal(glowAlignment('There is an altar to Anhur (lawful) here.'), 'lawful');
  assert.equal(glowAlignment('There is an altar to Set (chaotic) here.'), 'chaotic');
  assert.equal(glowAlignment('There is an altar to Moloch (unaligned) here.'), 'unaligned');
  for (const t of ['There is a fountain here.', 'You see here a dagger.', null]) assert.equal(glowAlignment(t), null, String(t));
  for (const k of ['lawful', 'neutral', 'chaotic', 'unaligned']) assert.ok(GLOW_COLORS[k]);
});

test('the glow returns exactly to rest', () => {
  assert.equal(glowPose(0).alpha, 0); assert.equal(glowPose(GLOW.total).alpha, 0);
  assert.equal(glowPose(GLOW.total).radius, 0);
});

test('the glow stays in bounds, swells, hitches once and sinks', () => {
  let peak = 0;
  for (let t = 0; t <= GLOW.total; t += .01) {
    const p = glowPose(t);
    assert.ok(p.alpha >= 0 && p.alpha <= .6 + 1e-9 && p.radius >= 0 && p.radius < .6, String(t));
    peak = Math.max(peak, p.alpha);
  }
  assert.ok(peak > .4);
  assert.ok(glowPose(GLOW.total * .5).alpha < glowPose(GLOW.total * .4).alpha, 'hitch');
  assert.ok(glowPose(GLOW.total * .95).alpha < .1);
});

test('a chaotic altar gutters and a godless one sinks early; the rest are untouched', () => {
  const sweep = k => Array.from({length: 260}, (_, i) => glowPose(i * .01, k));
  for (const k of ['lawful', 'neutral', 'chaotic', 'unaligned']) for (const p of sweep(k)) assert.ok(p.alpha >= 0 && p.alpha <= .6 + 1e-9 && p.radius >= 0 && p.radius < .6, k);
  for (const k of ['chaotic', 'unaligned']) { assert.equal(glowPose(0, k).alpha, 0); assert.equal(glowPose(GLOW.total, k).radius, 0); }
  assert.deepEqual(sweep('lawful').map(p => p.alpha), sweep(undefined).map(p => p.alpha), 'a lawful altar changes only its radius');
  const flick = k => sweep(k).filter((p, i, a) => i && i < 255 && a[i + 1].alpha > p.alpha && p.alpha < a[i - 1].alpha && i > 60 && i < 180).length;
  assert.ok(flick('chaotic') > flick('lawful'), 'the flame stutters');
  assert.ok(glowPose(GLOW.total * .75, 'unaligned').radius < glowPose(GLOW.total * .75, 'neutral').radius);
});

test('a neutral altar hardly hitches: its dip is shallower than a lawful one', () => {
  const dip = k => 1 - glowPose(.5 * GLOW.total, k).alpha / glowPose(.4 * GLOW.total, k).alpha;
  assert.ok(glowPose(.5 * GLOW.total, 'neutral').alpha > 0);
  assert.ok(dip('neutral') < dip('lawful'), 'shallower');
});

test('a lawful swell climbs in held steps, and never overshoots the eased one by much', () => {
  const r = (t, k) => glowPose(t * GLOW.total, k).radius;
  // Plateaus: within a step the radius barely moves, between steps it jumps.
  const holds = Array.from({length: 40}, (_, i) => Math.abs(r(.6 * (i + 1) / 40 * 1 - 0, 'lawful') - r(.6 * i / 40, 'lawful'))).filter(d => d < 1e-3).length;
  assert.ok(holds >= 8, 'held steps');
  assert.ok(Math.abs(r(.6, 'lawful') - r(.6, 'neutral')) < 1e-9, 'same crest');
  assert.ok(Math.abs(r(.3, 'lawful') - r(.3, 'neutral')) < .13);
});
