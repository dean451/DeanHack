import test from 'node:test';
import assert from 'node:assert/strict';
import {TIERS, ORDER, pickTier, nextTier, pixelRatioFor, createFramePacer, applyTier, ACTIVE_MS, readSaved, saveTier, STORAGE_KEY} from './quality.js';

test('the URL wins, then the saved choice, then the machine', () => {
  assert.equal(pickTier({search: '?quality=high', saved: 'low', cores: 2}), 'high');
  assert.equal(pickTier({search: '?quality=bogus', saved: 'low', cores: 8}), 'low');
  assert.equal(pickTier({saved: 'nope', cores: 8}), 'balanced');
  assert.equal(pickTier({cores: 4}), 'low');
  assert.equal(pickTier({}), 'balanced');
  assert.equal(pickTier({cores: 0}), 'balanced', 'an unknown core count is treated as a decent machine');
});

test('F8 cycles the tiers in order', () => {
  assert.equal(nextTier('high'), 'balanced'); assert.equal(nextTier('balanced'), 'low'); assert.equal(nextTier('low'), 'high');
  assert.equal(nextTier('nonsense'), 'balanced');
  assert.deepEqual(ORDER, Object.keys(TIERS));
});

test('the pixel ratio is capped per tier and never below one', () => {
  assert.equal(pixelRatioFor('high', 2), 2); assert.equal(pixelRatioFor('high', 3), 2);
  assert.equal(pixelRatioFor('balanced', 2), 1.5); assert.equal(pixelRatioFor('balanced', 1.25), 1.25);
  assert.equal(pixelRatioFor('low', 2), 1); assert.equal(pixelRatioFor('low', .5), 1);
  assert.equal(pixelRatioFor('what', 2), 1.5);
});

test('the pacer draws every frame while active and spaces frames to the idle rate after', () => {
  const p = createFramePacer();
  p.touch(0);
  let drawn = 0; for (let ms = 0; ms < 1000; ms += 16.7) if (p.shouldDraw(ms, 'balanced')) drawn++;
  assert.equal(drawn, 60, 'active: all 60');
  drawn = 0; for (let ms = ACTIVE_MS + 1000; ms < ACTIVE_MS + 2000; ms += 16.7) if (p.shouldDraw(ms, 'balanced')) drawn++;
  assert.ok(drawn >= 29 && drawn <= 31, `idle at 30: ${drawn}`);
  drawn = 0; for (let ms = ACTIVE_MS + 3000; ms < ACTIVE_MS + 4000; ms += 16.7) if (p.shouldDraw(ms, 'high')) drawn++;
  assert.equal(drawn, 60, 'high never idles');
  p.touch(ACTIVE_MS + 5000);
  drawn = 0; for (let ms = ACTIVE_MS + 5000; ms < ACTIVE_MS + 6000; ms += 16.7) if (p.shouldDraw(ms, 'low')) drawn++;
  assert.equal(drawn, 60, 'a touch brings every frame back');
  p.touch(NaN); assert.equal(p.activeUntil, ACTIVE_MS + 5000 + ACTIVE_MS, 'a bad time is ignored');
});

const rig = () => {
  const mats = [{needsUpdate: false}, {needsUpdate: false}];
  return {
    renderer: {ratio: null, setPixelRatio(r) { this.ratio = r; }, shadowMap: {type: 'soft'}},
    composer: {ratio: null, size: null, setPixelRatio(r) { this.ratio = r; }, setSize(w, h) { this.size = [w, h]; }},
    ambientOcclusion: {enabled: true},
    light: {shadow: {mapSize: {x: 2048, y: 2048, set(a, b) { this.x = a; this.y = b; }}, map: {disposed: false, dispose() { this.disposed = true; }}}},
    scene: {traverse(fn) { for (const m of mats) fn({material: m}); }}, mats,
  };
};

test('applying a tier sets the pixel ratio, SSAO, shadow map and type, and recompiles materials when the type changes', () => {
  const r = rig();
  const got = applyTier('low', {...r, soft: 'soft', plain: 'plain', devicePixelRatio: 2, width: 1440, height: 900});
  assert.equal(r.renderer.ratio, 1); assert.deepEqual(r.composer.size, [1440, 900]); assert.equal(r.composer.ratio, 1);
  assert.equal(r.ambientOcclusion.enabled, false);
  assert.equal(r.light.shadow.mapSize.x, 1024); assert.equal(r.light.shadow.map, null);
  assert.equal(r.renderer.shadowMap.type, 'plain'); assert.ok(r.mats.every(m => m.needsUpdate));
  assert.deepEqual({tier: got.tier, ratio: got.ratio, ssao: got.ssao, shadow: got.shadow, idleFps: got.idleFps}, {tier: 'low', ratio: 1, ssao: false, shadow: 1024, idleFps: 30});
  const r2 = rig();
  applyTier('balanced', {...r2, soft: 'soft', plain: 'plain', devicePixelRatio: 2});
  assert.equal(r2.renderer.ratio, 1.5); assert.equal(r2.ambientOcclusion.enabled, true);
  assert.equal(r2.light.shadow.map.disposed, false, 'the same size keeps the map'); assert.ok(r2.mats.every(m => !m.needsUpdate), 'same type: no recompile');
  assert.equal(applyTier('nonsense', {}).tier, 'nonsense');
});

test('the saved tier survives a broken storage', () => {
  const store = new Map(), storage = {getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v)};
  saveTier('low', storage); assert.equal(readSaved(storage), 'low'); assert.equal(store.get(STORAGE_KEY), 'low');
  const broken = {getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); }};
  assert.equal(readSaved(broken), null); saveTier('high', broken);
});
