import test from 'node:test';
import assert from 'node:assert/strict';
import {fxTimeline, fxSpritesAt, FX_TICK_MS} from './fx.js';

const fire = {kind: 'zap', zap: 'fire', dir: 'horizontal'};
const beam = {type: 'fx', open: 0, truncated: false, steps: [
  {op: 'start', mode: 'beam', glyph: 1, effect: fire},
  {op: 'draw', x: 5, z: 3}, {op: 'tick'},
  {op: 'draw', x: 6, z: 3}, {op: 'tick'},
  {op: 'change', glyph: 2, effect: {...fire, dir: 'vertical'}},
  {op: 'draw', x: 6, z: 4}, {op: 'tick'},
  {op: 'end'},
]};

test('beams light each cell in turn and keep the trail until the end', () => {
  const tl = fxTimeline(beam);
  assert.equal(tl.duration, 3 * FX_TICK_MS);
  assert.deepEqual(tl.sprites.map(s => [s.x, s.z, s.from, s.until]), [[5, 3, 0, 150], [6, 3, 50, 150], [6, 4, 100, 150]]);
  assert.equal(tl.sprites[2].effect.dir, 'vertical');
  assert.equal(fxSpritesAt(tl, 60).length, 2);
  assert.equal(fxSpritesAt(tl, tl.duration).length, 0);
});

test('flashes (thrown objects) show one cell at a time', () => {
  const tl = fxTimeline({steps: [
    {op: 'start', mode: 'flash', glyph: 9, effect: {kind: 'object', otyp: 3}},
    {op: 'draw', x: 1, z: 1}, {op: 'tick'}, {op: 'draw', x: 2, z: 1}, {op: 'tick'}, {op: 'end'},
  ]});
  for (let t = 0; t < tl.duration; t += 10) assert.ok(fxSpritesAt(tl, t).length <= 1);
  assert.deepEqual(fxSpritesAt(tl, 70).map(s => s.x), [2]);
});

test('nested, open, truncated and empty events stay finite', () => {
  const nested = fxTimeline({open: 1, truncated: true, steps: [
    {op: 'start', mode: 'tether', glyph: 4, effect: {kind: 'object'}},
    {op: 'draw', x: 1, z: 1}, {op: 'draw', x: 2, z: 1},
    {op: 'start', mode: 'always', glyph: 5, effect: {kind: 'sparkle', part: 0}},
    {op: 'draw', x: 2, z: 1}, {op: 'tick'}, {op: 'end'},
    {op: 'retract', x: 1, z: 1}, {op: 'tick'},
  ]});
  assert.ok(Number.isFinite(nested.duration) && nested.duration > 0);
  for (const s of nested.sprites) assert.ok(Number.isFinite(s.from) && Number.isFinite(s.until) && s.until > s.from);
  assert.deepEqual(fxTimeline({}), {duration: 0, sprites: []});
  assert.deepEqual(fxTimeline({steps: [{op: 'draw', x: 1, z: 1}, {op: 'end'}]}).sprites, []);
});

test('fxHoldMs holds frames only for drawn zaps and explosions, capped', async () => {
  const {fxHoldMs, FX_HOLD_MAX_MS, FX_BLAST_HOLD_MS} = await import('./fx.js');
  const zap = {kind: 'zap', zap: 'fire', dir: 'horizontal'};
  const seq = (effect, n, mode = 'beam') => ({steps: [{op: 'start', mode, glyph: 1, effect},
    ...Array.from({length: n}, (_, i) => [{op: 'draw', x: i, z: 0}, {op: 'tick'}]).flat(), {op: 'end'}]});
  const ray = fxTimeline(seq(zap, 6));
  assert.equal(fxHoldMs(ray), ray.duration);
  assert.equal(fxHoldMs(fxTimeline(seq({kind: 'object', otyp: 17}, 6, 'flash'))), 0);
  const blast = fxTimeline({steps: [{op: 'start', mode: 'all', glyph: 2, effect: {kind: 'explosion', explosion: 'fiery', part: 4}},
    {op: 'draw', x: 3, z: 3}, {op: 'end'}]});
  assert.ok(fxHoldMs(blast) >= FX_BLAST_HOLD_MS);
  assert.equal(fxHoldMs(fxTimeline(seq(zap, 60))), FX_HOLD_MAX_MS);
  assert.equal(fxHoldMs(null), 0);
  assert.equal(fxHoldMs({sprites: []}), 0);
});
