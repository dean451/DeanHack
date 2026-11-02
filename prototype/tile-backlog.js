// The frame budget for building the map. A reveal (autoexplore, travel, a lit room, a new level) can bring hundreds
// of squares never built before, and building them all in the frame that shows them (slab, dimming stand-in, walls,
// torches, doors, feature models) froze the screen for a moment. Now a square is built at once only when it is near
// the hero or while the frame's building budget lasts; the rest are placed as empty tiles and filled from this
// backlog over the following frames, nearest the hero first, up to 6 ms a frame (a 1,200-square reveal fills in under 2 s at 60 fps).
export const BACKLOG = {near: 6, applyMs: 10, frameMs: 6};

export function createTileBacklog({near = BACKLOG.near, applyMs = BACKLOG.applyMs, frameMs = BACKLOG.frameMs, now = () => performance.now()} = {}) {
  const pending = new Set();
  let started = 0, cx = 0, cz = 0;
  const far = t => Math.hypot(t.position.x - cx, t.position.z - cz);
  return {
    get size() { return pending.size; },
    // the frame being applied starts, with where the hero stands in it (scene coordinates)
    beginApply(x, z) { started = now();cx = x;cz = z; },
    // build this new square now? near the hero always; otherwise while the frame's budget lasts
    buildNow(tile) { return far(tile) <= near || now() - started < applyMs; },
    defer(tile) { tile.userData.pending = true;pending.add(tile); },
    // fill(tile) builds one; nearest `at` first, at least one a frame, until the budget is spent. Tiles taken off
    // the map meanwhile (a new level, a square that changed kind) are dropped.
    drain(fill, at) {
      if (!pending.size) return 0;
      const t0 = now(), list = [...pending].sort((a, b) => Math.hypot(a.position.x - at.x, a.position.z - at.z) - Math.hypot(b.position.x - at.x, b.position.z - at.z));
      let built = 0;
      for (const tile of list) {
        pending.delete(tile);
        if (!tile.parent) continue;
        tile.userData.pending = false;fill(tile);built++;
        if (now() - t0 >= frameMs) break;
      }
      return built;
    },
    clear() { for (const t of pending) t.userData.pending = false;pending.clear(); },
  };
}

// The squares of a frame by "x,z", built once per frame object.
const indexes = new WeakMap();
export function cellIndex(frame) {
  if (!frame) return null;
  let m = indexes.get(frame);
  if (!m) { m = new Map();for (const c of frame.cells ?? []) m.set(`${c.x},${c.z}`, c);indexes.set(frame, m); }
  return m;
}
