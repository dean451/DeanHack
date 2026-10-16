// Hit feel: a tiny hit-stop and a camera nudge, both scaled to the damage, with a bigger beat
// when the hero is hit hard. One flag (`enabled`, or HIT_FEEL.enabled) turns both off.
// Pure maths plus a small stateful tracker; live.js feeds it hits and applies the result.
export const HIT_FEEL = {enabled: true};

export const STOP_MAX_MS = 90;     // the hit-stop never freezes the world longer than this
export const NUDGE_MAX = .18;      // the camera never moves further than this (world units)
const NUDGE_MS = 140;              // how long a nudge takes to settle back
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

// Damage → 0..1 weight; a point of damage barely registers, about 20 is a full beat.
export function weight(damage) {
  return Number.isFinite(damage) && damage > 0 ? clamp01(Math.log1p(damage) / Math.log1p(20)) : 0;
}

// Hit-stop length in ms. The hero being hit hard lands a longer freeze than a blow she deals.
export function hitStopMs(damage, heroHurt = false) {
  const w = weight(damage);
  return Math.min(STOP_MAX_MS, Math.round(w * (heroHurt ? STOP_MAX_MS : STOP_MAX_MS * .55)));
}

// Peak camera nudge distance, capped.
export function nudgeSize(damage, heroHurt = false) {
  return Math.min(NUDGE_MAX, weight(damage) * NUDGE_MAX * (heroHurt ? 1 : .5));
}

export function createHitFeel(opts = {}) {
  let stopLeft = 0, nudgeAge = NUDGE_MS, peak = 0, dir = [0, 0];
  let applied = [0, 0, 0];
  const on = () => (opts.enabled ?? HIT_FEEL.enabled) !== false;
  return {
    // A blow landed with `damage`; `d` is the one-step [x, z] direction it travelled, if known.
    hit(damage, {heroHurt = false, dir: d = null} = {}) {
      if (!on()) return;
      const ms = hitStopMs(damage, heroHurt), size = nudgeSize(damage, heroHurt);
      if (ms > stopLeft) stopLeft = ms;
      if (size > 0) {
        peak = size; nudgeAge = 0;
        const len = d ? Math.hypot(d[0], d[1]) : 0;
        dir = len ? [d[0] / len, d[1] / len] : [0, 1];
      }
    },
    // Advance by dt seconds. Returns the time scale for this frame (0 while stopped, 1 after)
    // and the camera offset for it ([x, y, z], zero at rest).
    update(dt) {
      if (!on()) { stopLeft = 0; nudgeAge = NUDGE_MS; }
      let scale = 1;
      if (stopLeft > 0) { stopLeft = Math.max(0, stopLeft - dt * 1000); scale = 0; }
      let offset = [0, 0, 0];
      if (nudgeAge < NUDGE_MS && scale === 1) {
        nudgeAge += dt * 1000;
        const u = clamp01(nudgeAge / NUDGE_MS);
        // Snaps to the peak at once, then eases back out; exactly zero when the age runs out.
        const k = u >= 1 ? 0 : peak * (1 - u) * (1 - u);
        offset = [dir[0] * k, 0, dir[1] * k];
      }
      return {scale, offset};
    },
    // Move `camera` (anything with a position that has x, y, z) by this frame's offset, undoing
    // the last one, so the camera returns exactly to where it was.
    apply(camera, offset) {
      const p = camera.position;
      p.x += offset[0] - applied[0]; p.y += offset[1] - applied[1]; p.z += offset[2] - applied[2];
      applied = offset;
    },
    get active() { return stopLeft > 0 || nudgeAge < NUDGE_MS; },
  };
}
