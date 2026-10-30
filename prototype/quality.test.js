import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {torchLightsFor, TIERS, ORDER, pickTier, createAdaptiveQuality, frameCost, nextTier, pixelRatioFor, createFramePacer, applyTier, ACTIVE_MS, DEEP_MS, readSaved, saveTier, STORAGE_KEY} from './quality.js';

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

test('after a long quiet the pacer drops to the deep idle rate, and the shadow map to its own rate', () => {
  const p = createFramePacer();
  p.touch(0);
  let drawn = 0; for (let ms = DEEP_MS + 1000; ms < DEEP_MS + 2000; ms += 16.7) if (p.shouldDraw(ms, 'balanced')) drawn++;
  assert.ok(drawn >= 14 && drawn <= 16, `deep idle at 15: ${drawn}`);
  drawn = 0; for (let ms = DEEP_MS + 3000; ms < DEEP_MS + 4000; ms += 16.7) if (p.shouldDraw(ms, 'high')) drawn++;
  assert.equal(drawn, 60, 'high never idles');
  assert.equal(p.rate(100, 'low'), 60); assert.equal(p.rate(ACTIVE_MS + 10, 'low'), 30); assert.equal(p.rate(DEEP_MS + 10, 'low'), 15);
  let shadows = 0; for (let ms = 0; ms < 1000; ms += 16.7) if (p.shadowDue(ms, 'balanced')) shadows++;
  assert.ok(shadows >= 29 && shadows <= 31, `shadows at 30: ${shadows}`);
  shadows = 0; for (let ms = 2000; ms < 3000; ms += 16.7) if (p.shadowDue(ms, 'high')) shadows++;
  assert.equal(shadows, 60, 'high redraws shadows every frame');
});

const rig = () => {
  const mats = [{needsUpdate: false}, {needsUpdate: false}];
  return {
    renderer: {ratio: null, setPixelRatio(r) { this.ratio = r; }, shadowMap: {type: 'soft'}},
    composer: {ratio: null, size: null, setPixelRatio(r) { this.ratio = r; }, setSize(w, h) { this.size = [w, h]; }},
    ambientOcclusion: {enabled: true, size: null, setSize(w, h) { this.size = [w, h]; }},
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
  assert.equal(r.ambientOcclusion.size?.join(), '720,450', 'low: the AO pass is sized to half the 1x buffer even while off');
  const r3 = rig(); applyTier('balanced', {...r3, soft: 'soft', plain: 'plain', devicePixelRatio: 2, width: 1440, height: 900});
  assert.deepEqual(r3.ambientOcclusion.size, [1080, 675], 'balanced: half of the 1.5x buffer');
  const r4 = rig(); applyTier('high', {...r4, soft: 'soft', plain: 'plain', devicePixelRatio: 2, width: 1440, height: 900});
  assert.equal(r4.ambientOcclusion.size, null, 'high leaves the composer\'s full size');
  assert.equal(r2.light.shadow.map.disposed, false, 'the same size keeps the map'); assert.ok(r2.mats.every(m => !m.needsUpdate), 'same type: no recompile');
  assert.equal(applyTier('nonsense', {}).tier, 'nonsense');
});

test('an automatic step never changes the shadow filter, so no material recompiles mid-game', () => {
  const r = rig();
  applyTier('low', {...r, soft: 'soft', plain: 'plain', devicePixelRatio: 2, width: 1440, height: 900, keepShadowType: true});
  assert.equal(r.renderer.shadowMap.type, 'soft'); assert.ok(r.mats.every(m => !m.needsUpdate), 'no recompile');
  assert.equal(r.renderer.ratio, 1); assert.equal(r.ambientOcclusion.enabled, false); assert.equal(r.light.shadow.mapSize.x, 1024);
  const main = readFileSync(new URL('./main.js', import.meta.url), 'utf8');
  assert.match(main, /keepShadowType:auto/, 'main.js keeps the filter on automatic steps');
  assert.match(main, /renderer\.debug\.checkShaderErrors=new URLSearchParams\(location\.search\)\.has\('debug'\)/, 'shader logs are only read with ?debug');
});

test('the saved tier survives a broken storage', () => {
  const store = new Map(), storage = {getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v)};
  saveTier('low', storage); assert.equal(readSaved(storage), 'low'); assert.equal(store.get(STORAGE_KEY), 'low');
  const broken = {getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); }};
  assert.equal(readSaved(broken), null); saveTier('high', broken);
});

test('adaptive tier: three seconds over 24 ms steps one tier down, once, and never below low', () => {
  
  const a = createAdaptiveQuality(); let tier = 'high', step = null, at = 0;
  for (at = 0; at < 2900; at += 16) assert.equal(a.frame(at, 30, tier), null, 'under three seconds: nothing yet');
  for (; at < 3300 && !step; at += 16) step = a.frame(at, 30, tier);
  assert.equal(step, 'balanced'); assert.equal(a.automatic, true); tier = step;
  step = null; for (let t = at; t < at + 2900; t += 16) assert.equal(a.frame(t, 30, tier), null, 'the clock starts over after a step');
  const b = createAdaptiveQuality(); let low = null;
  for (let t = 0; t < 20000 && !low; t += 16) low = b.frame(t, 40, 'low');
  assert.equal(low, null, 'low has nowhere to go');
});

test('adaptive tier: a short slow spell, or a spike in a quick run, does not step down', () => {
  const a = createAdaptiveQuality(); let hit = null;
  for (let t = 0; t < 20000; t += 16) hit ||= a.frame(t, (t % 4000) < 1200 ? 40 : 8, 'balanced');
  assert.equal(hit, null);
  const b = createAdaptiveQuality();
  for (let t = 0; t < 20000; t += 16) hit ||= b.frame(t, t === 5000 ? 900 : 8, 'high');
  assert.equal(hit, null, 'one long frame is averaged away');
  assert.equal(b.frame(1e6, 500, 'high'), null); assert.equal(b.frame(1e6 + 5000, 500, 'high'), null, 'a stall of seconds is dropped, not measured');
});

test('adaptive tier: thirty seconds under 10 ms steps back up, only after an automatic step down', () => {
  const a = createAdaptiveQuality(); let tier = 'balanced', t = 0;
  for (; t < 40000; t += 16) assert.equal(a.frame(t, 5, tier), null, 'a tier the machine chose is not raised');
  const b = createAdaptiveQuality(); tier = 'high';
  for (t = 0; ; t += 16) { const s = b.frame(t, 40, tier); if (s) { tier = s; break; } }
  assert.equal(tier, 'balanced');
  const start = t; let up = null;
  for (t += 16; t < start + 29000; t += 16) assert.equal(b.frame(t, 5, tier), null, 'not before thirty seconds');
  for (; t < start + 31000 && !up; t += 16) up = b.frame(t, 5, tier);
  assert.equal(up, 'high'); assert.equal(b.automatic, false, 'back at the starting tier, the machine is done');
  for (t += 16; t < start + 90000; t += 16) assert.equal(b.frame(t, 5, 'high'), null);
});

test('adaptive tier: F8 pins the tier for good, and a saved choice starts pinned', () => {
  const a = createAdaptiveQuality(); a.manual();
  for (let t = 0; t < 30000; t += 16) assert.equal(a.frame(t, 60, 'high'), null);
  const b = createAdaptiveQuality({manual: true});
  for (let t = 0; t < 30000; t += 16) assert.equal(b.frame(t, 60, 'high'), null);
  const c = createAdaptiveQuality(); let tier = 'high';
  for (let t = 0; t < 4000; t += 16) tier = c.frame(t, 60, tier) ?? tier;
  assert.equal(tier, 'balanced'); c.manual();
  for (let t = 4000; t < 60000; t += 16) assert.equal(c.frame(t, 5, 'balanced'), null, 'no step back up once the user has chosen');
});

test('frame cost: late frames cost the whole gap, frames on the display beat cost the loop work, and a throttled frame is no measurement', () => {
  assert.equal(frameCost(17, 6), 6); assert.equal(frameCost(8, 3), 3);
  assert.ok(Math.abs(frameCost(600, 20) - 600) < 1e-9); assert.equal(frameCost(40, 55), 55);
  assert.equal(frameCost(50, 4, 30), 4, 'idle at 30 fps: a frame on the vsync grid is on time'); assert.ok(frameCost(600, 4, 30) > 500);
  const a = createAdaptiveQuality(); a.frame(0, 40, 'high'); a.frame(1000, 40, 'high');
  assert.equal(a.frame(2000, null, 'high'), null, 'a null frame starts the window over');
  for (let t = 2016; t < 4900; t += 16) assert.equal(a.frame(t, 40, 'high'), null, 'three seconds are counted from after the gap');
  assert.equal(a.frame(5100, 40, 'high'), 'balanced');
});

test('only the high tier keeps eight torch lights; the live torch list is not rebuilt every frame', () => {
  assert.equal(torchLightsFor('high'), 8); assert.equal(torchLightsFor('balanced'), 4); assert.equal(torchLightsFor('low'), 4); assert.equal(torchLightsFor('nonsense'), 4);
  const main = readFileSync(new URL('./main.js', import.meta.url), 'utf8'), live = readFileSync(new URL('./live.js', import.meta.url), 'utf8');
  assert.match(main, /installLive\(\{scene,camera,controls,renderer,torchLightCount:torchLightsFor\(quality\.tier\)/);
  assert.match(live, /get\('torches'\)\?\?String\(torchLightCount\)/);
  const update = live.slice(live.indexOf('function updateTorchLights('), live.indexOf('const ease=1-Math.exp(-dt*5);'));
  assert.ok(!update.includes('[...tiles.values()].filter(tile=>tile.userData.torch).sort'), 'no filter and sort over every tile each frame');
  assert.match(update, /if\(torchTiles\.key!==`\$\{lastLevel\}:\$\{tiles\.size\}`\)/);
});

test('balanced and low run the glow from a smaller buffer; high keeps the full size', () => {
  const sized = tier => { const bloom = {size: null, setSize(w, h) { this.size = [w, h]; }}; applyTier(tier, {bloom, devicePixelRatio: 2, width: 1440, height: 900}); return bloom.size; };
  assert.deepEqual(sized('balanced'), [1080, 675]);
  assert.deepEqual(sized('low'), [720, 450]);
  assert.equal(sized('high'), null);
  assert.match(readFileSync(new URL('./main.js', import.meta.url), 'utf8'), /applyTier\(tier,\{renderer,composer,ambientOcclusion,bloom,/);
});
