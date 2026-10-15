// Render quality tiers and the frame pacer. The scene is drawn through SSAO and bloom at full
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

export const TIERS = {
  high: {ratio: 2, ssao: true, shadow: 2048, soft: true, idleFps: 60, label: 'High: full resolution, 60 fps'},
  balanced: {ratio: 1.5, ssao: true, shadow: 2048, soft: true, idleFps: 30, label: 'Balanced: 1.5x pixels, 30 fps when idle'},
  low: {ratio: 1, ssao: false, shadow: 1024, soft: false, idleFps: 30, label: 'Low: 1x pixels, no ambient occlusion, 30 fps when idle'},
};
export const ORDER = ['high', 'balanced', 'low'];
export const STORAGE_KEY = 'deanhack.quality';
// How long after the last input, engine event or camera move the loop keeps drawing every frame.
export const ACTIVE_MS = 2500;

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
export function createFramePacer({activeMs = ACTIVE_MS} = {}) {
  let lastTouch = -1e9, lastDraw = -1e9;
  return {
    touch(ms) { lastTouch = Number.isFinite(ms) ? ms : lastTouch; },
    // ms is the animation-loop time. Returns true when this frame should draw.
    shouldDraw(ms, tier) {
      const fps = TIERS[tier]?.idleFps ?? 60;
      const active = ms - lastTouch < activeMs;
      if (!active && fps < 60 && ms - lastDraw < 1000 / fps - 1) return false;
      lastDraw = ms; return true;
    },
    get activeUntil() { return lastTouch + activeMs; },
  };
}

// Applies a tier to the renderer and passes. `targets` holds what the tier reaches: the renderer and
// composer (pixel ratio), the SSAO pass (on or off), the shadow light (map size), and the shadow type
// constants. Returns what was set, for the toast and tests.
export function applyTier(tier, {renderer, composer, ambientOcclusion, light, scene, soft, plain, devicePixelRatio = 1, width = 0, height = 0}) {
  const t = TIERS[tier] ?? TIERS.balanced, ratio = pixelRatioFor(tier, devicePixelRatio);
  if (renderer) {
    renderer.setPixelRatio(ratio);
    if (renderer.shadowMap && soft !== undefined && plain !== undefined) {
      const type = t.soft ? soft : plain;
      if (renderer.shadowMap.type !== type) {
        renderer.shadowMap.type = type;
        // the shadow type is baked into every material's shader
        scene?.traverse?.(o => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; });
      }
    }
  }
  if (composer) { composer.setPixelRatio?.(ratio); if (width && height) composer.setSize(width, height); }
  if (ambientOcclusion) ambientOcclusion.enabled = t.ssao;
  if (light?.shadow) {
    if (light.shadow.mapSize.x !== t.shadow) {
      light.shadow.mapSize.set(t.shadow, t.shadow);
      // the old map keeps its size until it is thrown away
      if (light.shadow.map) { light.shadow.map.dispose(); light.shadow.map = null; }
    }
  }
  return {tier, ratio, ssao: t.ssao, shadow: t.shadow, soft: t.soft, idleFps: t.idleFps, label: t.label};
}
