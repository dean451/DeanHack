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
