import test from 'node:test';
import assert from 'node:assert/strict';
import {HIT_FEEL, STOP_MAX_MS, NUDGE_MAX, hitStopMs, nudgeSize, createHitFeel} from './hit-feel.js';

const cam = () => ({position: {x: 3, y: 12, z: -7}});
const run = (hf, camera, frames, dt = .016) => {
  const out = [];
  for (let i = 0; i < frames; i++) { const f = hf.update(dt); hf.apply(camera, f.offset); out.push(f); }
  return out;
};

test('hit-stop is at most 90 ms for any damage, and a hard hit on the hero is the longest', () => {
  for (const d of [0, 1, 5, 20, 200, 1e9, NaN, -3]) {
    assert.ok(hitStopMs(d) <= 90 && hitStopMs(d, true) <= 90);
  }
  assert.equal(STOP_MAX_MS, 90);
  assert.ok(hitStopMs(20, true) > hitStopMs(20, false));
  assert.ok(hitStopMs(15) > hitStopMs(2));
  assert.equal(hitStopMs(0), 0);
});

test('the nudge scales with damage and is capped', () => {
  assert.ok(nudgeSize(2) < nudgeSize(8));
  assert.ok(nudgeSize(8) < nudgeSize(20, true));
  assert.ok(nudgeSize(1e9, true) <= NUDGE_MAX);
  assert.equal(nudgeSize(0), 0);
});

test('hit-stop freezes time for its length, then time runs again', () => {
  const hf = createHitFeel(), camera = cam();
  hf.hit(20, {heroHurt: true});
  const fs = run(hf, camera, 20);
  const frozen = fs.filter(f => f.scale === 0).length;
  assert.ok(frozen >= 1 && frozen * 16 <= 90 + 16);
  assert.equal(fs.at(-1).scale, 1);
});

test('the nudge pushes along the blow and returns the camera to rest', () => {
  const hf = createHitFeel(), camera = cam();
  hf.hit(12, {heroHurt: true, dir: [1, 0]});
  const fs = run(hf, camera, 60);
  assert.ok(fs.some(f => f.offset[0] > 0));
  for (const f of fs) assert.ok(Math.hypot(...f.offset) <= NUDGE_MAX);
  assert.ok(Math.abs(camera.position.x - 3) < 1e-9);
  assert.ok(Math.abs(camera.position.y - 12) < 1e-9);
  assert.ok(Math.abs(camera.position.z + 7) < 1e-9);
  assert.equal(hf.active, false);
});

test('one flag turns both off', () => {
  const camera = cam();
  HIT_FEEL.enabled = false;
  try {
    const hf = createHitFeel();
    hf.hit(50, {heroHurt: true, dir: [0, 1]});
    const fs = run(hf, camera, 30);
    assert.ok(fs.every(f => f.scale === 1 && f.offset.every(v => v === 0)));
    assert.deepEqual(camera.position, {x: 3, y: 12, z: -7});
  } finally { HIT_FEEL.enabled = true; }
  assert.equal(createHitFeel({enabled: false}).hit(50), undefined);
});
