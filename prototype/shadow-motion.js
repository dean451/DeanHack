// The shadow map is redrawn only when something that casts moved. In a turn-based game the board stands still most
// of the time, yet the shadow map (every caster drawn again from the moon) was redrawn at the tier's full rate.
// live.js reports a signature of where the hero, every monster and pet, and the level's pieces stand; while it
// changes, shadows follow at the tier's rate (quality.js shadowHz); while it holds, they refresh only IDLE_HZ times a
// second, enough for idle bobs and small effects. A null signature (no live level) leaves the tier's rate alone.
export const IDLE_HZ = 8;

export function createShadowMotion({idleHz = IDLE_HZ} = {}) {
  let last = null, lastIdle = -Infinity;
  return {
    // ms: the loop time; signature: live.js motionSignature (or null); due: whether the tier's rate allows a redraw now.
    due(ms, signature, due) {
      if (signature === null || signature === undefined) { last = null; return due; }
      const moved = signature !== last;
      last = signature;
      if (moved) return due;
      if (due && ms - lastIdle >= 1000 / idleHz - 1) { lastIdle = ms; return true; }
      return false;
    },
  };
}

// A cheap fingerprint of positions: rounded to a millimetre so float noise never counts as a move.
export function positionSignature(objects) {
  let s = 0, n = 0;
  for (const o of objects) { if (!o) continue; const p = o.position; n++; s += Math.round(p.x * 1000) * 31 + Math.round(p.y * 1000) * 17 + Math.round(p.z * 1000) * 7 + n * 13; s %= 1e15; }
  return `${n}:${s}`;
}
