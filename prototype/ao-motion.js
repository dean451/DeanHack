// Ambient occlusion sits out while the player turns or zooms the camera. The occlusion pass draws the scene a
// second time (depth and normals) and samples it at every pixel, a large share of a frame; while the whole view
// is sweeping, its contact shadows are a blur nobody can read anyway. It switches off when a drag or a zoom starts
// (OrbitControls 'start') and fades back in over AO_FADE_MS once the camera has settled for AO_SETTLE_MS after the
// last 'end'. Only the player's own camera moves count: the camera's glide after each step is left alone, so the
// occlusion never flickers as the hero walks.
export const AO_SETTLE_MS = 120, AO_FADE_MS = 300;

export function createAoMotion({settle = AO_SETTLE_MS, fade = AO_FADE_MS} = {}) {
  let moving = false, stillSince = -Infinity;
  return {
    start() { moving = true; },
    end(ms) { moving = false; stillSince = ms; },
    // `allowed`: the quality tier keeps occlusion on. Returns {enabled, blend} for the pass this frame.
    frame(ms, allowed) {
      if (!allowed) return {enabled: false, blend: 1};
      if (moving) return {enabled: false, blend: 0};
      const k = (ms - stillSince - settle) / fade;
      if (k < 0) return {enabled: false, blend: 0};
      return {enabled: true, blend: Math.min(1, k)};
    },
    get moving() { return moving; },
  };
}
