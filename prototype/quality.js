// Render quality tiers and the frame pacer. The scene is drawn through ambient occlusion (GTAO) and bloom at full
// resolution, with soft 2048 shadows, sixty times a second whether or not anything moves, and on
// a retina MacBook that is enough to spin the fans. Most of a turn-based game is spent looking at
// a still board, so two things pay off far more than any model trimming:
//  - fewer pixels: the device pixel ratio is capped per tier (2 -> 1.5 is 44% fewer pixels, the
//    post-processing chain included);
//  - fewer frames: after a couple of seconds with no input, no engine event and no camera move,
//    the loop draws at a lower idle rate (the idle bobs and flames still move, just at 30).
// Tiers: high (as before), balanced (the default), low (no SSAO, plain 1024 shadows, 1x pixels; the
// default on a 4-core machine). `?quality=low|balanced|high` on the URL wins, then the saved
// choice (F8 cycles it and saves it), then the machine.

// Round two (2026-10-16), the same look for less work:
//  - the shadow map is drawn once a frame, not once per scene render (the occlusion pass's normal render is a second
//    render, and three redraws shadows on every render call unless told not to), and on balanced only
//    30 times a second (`shadowHz`): an idle bob does not need its shadow at 60;
//  - the ambient occlusion runs at half resolution on balanced (`aoScale`): AO is low-frequency and
//    blurred anyway, and the normal pass, the 32-sample AO pass and the blur all shrink four times;
//  - after DEEP_MS with nothing happening the loop drops further, to `deepFps` (the board is being
//    read, not watched); any touch brings every frame back at once;
//  - the renderer no longer asks for MSAA: the composer's targets never had it, so the flag only cost
//    a resolve of the final quad.
export const TIERS = {
  high: {ratio: 2, ssao: true, aoScale: 1, shadow: 2048, soft: true, shadowHz: 60, idleFps: 60, deepFps: 60, label: 'High: full resolution, 60 fps'},
  balanced: {ratio: 1.5, ssao: true, aoScale: .5, shadow: 2048, soft: true, shadowHz: 30, idleFps: 30, deepFps: 15, label: 'Balanced: 1.5x pixels, half-size occlusion, 30 fps when idle'},
  low: {ratio: 1, ssao: false, aoScale: .5, shadow: 1024, soft: false, shadowHz: 30, idleFps: 30, deepFps: 15, label: 'Low: 1x pixels, no ambient occlusion, 30 fps when idle'},
};
export const ORDER = ['high', 'balanced', 'low'];
export const STORAGE_KEY = 'deanhack.quality';
// How long after the last input, engine event or camera move the loop keeps drawing every frame, and
// how long after that it drops to the deep idle rate.
export const ACTIVE_MS = 2500, DEEP_MS = 45000;

export function isTier(name) { return typeof name === 'string' && Object.hasOwn(TIERS, name); }

// The tier to start with: the URL, then the saved choice, then the machine.
export function pickTier({search = '', saved = null, cores = 8} = {}) {
  const asked = new URLSearchParams(search).get('quality');
  if (isTier(asked)) return asked;
  if (isTier(saved)) return saved;
  return (Number(cores) || 8) <= 4 ? 'low' : 'balanced';
}

export function nextTier(tier) { const i = ORDER.indexOf(tier); return ORDER[(i < 0 ? 1 : i + 1) % ORDER.length]; }

export function pixelRatioFor(tier, devicePixelRatio = 1) {
  const cap = TIERS[tier]?.ratio ?? TIERS.balanced.ratio;
  return Math.max(1, Math.min(Number(devicePixelRatio) || 1, cap));
}

export function readSaved(storage) { try { return (storage ?? localStorage).getItem(STORAGE_KEY); } catch { return null; } }
export function saveTier(tier, storage) { try { (storage ?? localStorage).setItem(STORAGE_KEY, tier); } catch {} }

// Decides, per animation frame, whether to draw. touch() marks activity; while active every frame
// draws, after ACTIVE_MS quiet the frames are spaced to the tier's idle rate.
export function createFramePacer({activeMs = ACTIVE_MS, deepMs = DEEP_MS} = {}) {
  let lastTouch = -1e9, lastDraw = -1e9, lastShadow = -1e9;
  const rate = (ms, tier) => { const t = TIERS[tier] ?? TIERS.balanced, quiet = ms - lastTouch; return quiet < activeMs ? 60 : quiet < deepMs ? t.idleFps : t.deepFps; };
  return {
    touch(ms) { lastTouch = Number.isFinite(ms) ? ms : lastTouch; },
    // ms is the animation-loop time. Returns true when this frame should draw.
    shouldDraw(ms, tier) {
      const fps = rate(ms, tier);
      if (fps < 60 && ms - lastDraw < 1000 / fps - 1) return false;
      lastDraw = ms; return true;
    },
    // Whether this (drawn) frame should redraw the shadow map: at most the tier's shadowHz.
    shadowDue(ms, tier) {
      const hz = TIERS[tier]?.shadowHz ?? 60;
      if (hz < 60 && ms - lastShadow < 1000 / hz - 1) return false;
      lastShadow = ms; return true;
    },
    rate,
    get activeUntil() { return lastTouch + activeMs; },
  };
}

// Applies a tier to the renderer and passes. `targets` holds what the tier reaches: the renderer and
// composer (pixel ratio), the SSAO pass (on or off), the shadow light (map size), and the shadow type
// constants. Returns what was set, for the toast and tests.
// keepShadowType: leave the shadow filter as it is. The filter is baked into every material's shader, so
// changing it recompiles all of them at once (a freeze of a second or more with a hundred programs); an
// automatic step, taken because frames are already slow, must never do that.
export function applyTier(tier, {renderer, composer, ambientOcclusion, light, scene, soft, plain, devicePixelRatio = 1, width = 0, height = 0, keepShadowType = false}) {
  const t = TIERS[tier] ?? TIERS.balanced, ratio = pixelRatioFor(tier, devicePixelRatio);
  if (renderer) {
    renderer.setPixelRatio(ratio);
    if (renderer.shadowMap && soft !== undefined && plain !== undefined && !keepShadowType) {
      const type = t.soft ? soft : plain;
      if (renderer.shadowMap.type !== type) {
        renderer.shadowMap.type = type;
        // the shadow type is baked into every material's shader
        scene?.traverse?.(o => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; });
      }
    }
  }
  if (composer) { composer.setPixelRatio?.(ratio); if (width && height) composer.setSize(width, height); }
  if (ambientOcclusion) {
    ambientOcclusion.enabled = t.ssao;
    // the composer just sized the pass to the full buffer; shrink it to the tier's share
    if (width && height && t.aoScale < 1) ambientOcclusion.setSize?.(Math.max(1, Math.round(width * ratio * t.aoScale)), Math.max(1, Math.round(height * ratio * t.aoScale)));
  }
  if (light?.shadow) {
    if (light.shadow.mapSize.x !== t.shadow) {
      light.shadow.mapSize.set(t.shadow, t.shadow);
      // the old map keeps its size until it is thrown away
      if (light.shadow.map) { light.shadow.map.dispose(); light.shadow.map = null; }
    }
  }
  return {tier, ratio, ssao: t.ssao, aoScale: t.aoScale, shadow: t.shadow, soft: t.soft, shadowHz: t.shadowHz, idleFps: t.idleFps, deepFps: t.deepFps, label: t.label};
}

// Adaptive tier: watches how long a drawn frame takes and steps the tier down when the machine cannot
// keep up, and back up once it has plenty to spare. Only the tier the machine chose is ever changed:
// `manual()` (F8, or a tier from the URL or the saved choice) turns this off for good. An automatic
// step is never saved, so the next visit starts from the user's own choice again.
export const SLOW_MS = 24, FAST_MS = 10, SLOW_HOLD_MS = 3000, FAST_HOLD_MS = 30000, AVG_MS = 1000;
// What a drawn frame cost. The GPU runs behind the CPU, so the time spent inside render() hides a slow
// card; the gap between two drawn frames does not. A frame that arrives when the pacer expected it
// (within LATE_MS) cost what the loop itself spent; a late one cost one display frame plus how late
// it was, which on a loop drawing every frame is the whole gap.
export const VSYNC_MS = 1000 / 60, LATE_MS = 20;
export function frameCost(gapMs, workMs, fps = 60) {
  const expected = 1000 / Math.min(60, Math.max(1, fps));
  return gapMs > expected + LATE_MS ? Math.max(workMs, gapMs - expected + VSYNC_MS) : workMs;
}
export function createAdaptiveQuality({slowMs = SLOW_MS, fastMs = FAST_MS, slowHold = SLOW_HOLD_MS, fastHold = FAST_HOLD_MS, avgMs = AVG_MS, manual = false} = {}) {
  let avg = null, last = null, slowSince = null, fastSince = null, pinned = manual, floor = null;
  const reset = () => { avg = null; slowSince = null; fastSince = null; };
  return {
    manual() { pinned = true; reset(); },
    // ms: the loop time; drawMs: how long this drawn frame took. Returns the tier to switch to, or null.
    frame(ms, drawMs, tier) {
      if (pinned || !Number.isFinite(ms)) return null;
      // null: this frame was not a measurement (the loop was throttled, or it is the first)
      if (!Number.isFinite(drawMs)) { reset(); last = ms; return null; }
      const dt = last === null ? 0 : ms - last; last = ms;
      // a hidden tab or a stall is not a measurement
      if (dt > 2000) { reset(); return null; }
      const k = dt <= 0 ? 1 : 1 - Math.exp(-dt / avgMs);
      avg = avg === null ? drawMs : avg + (drawMs - avg) * k;
      const i = ORDER.indexOf(tier);
      if (avg > slowMs) { fastSince = null; slowSince ??= ms; } else slowSince = null;
      if (avg < fastMs) { slowSince = null; fastSince ??= ms; } else fastSince = null;
      if (slowSince !== null && ms - slowSince >= slowHold && i >= 0 && i < ORDER.length - 1 && tier !== 'low') {
        floor ??= tier; reset(); return ORDER[i + 1];
      }
      if (fastSince !== null && ms - fastSince >= fastHold && floor !== null && i > ORDER.indexOf(floor)) {
        const up = ORDER[i - 1]; if (up === floor) floor = null; reset(); return up;
      }
      return null;
    },
    get automatic() { return floor !== null; },
  };
}
