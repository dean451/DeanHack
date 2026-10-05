// Digging flavor, step three: the hero's own drop through the hole. Once "You dig a hole through
// the floor." lands (dig-chips.js opens the void under the hero) the hero hangs a beat on the
// crumbling edge, then the floor gives way and they drop away through it, accelerating. When
// the level below arrives they do not step in: they fall in from above, hit the stone hard and
// bounce once, low and dead, before lying still on their feet. If no new level ever comes (the
// engine caught them somehow) the hero is hauled back up to the floor rather than left sunk.
//
// Returns a vertical offset (world units) for live.js to add to the hero's height each frame.
// It is zero at rest and exactly zero again once it finishes.

export const HANG = .7, SINK = .45, SINK_DEPTH = 1.1, GIVE_UP = 3, RISE = .45;
export const ARRIVE_HEIGHT = 1.8, ARRIVE_GRAVITY = 9, BOUNCE = .22;
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

export const holeMessage = text => typeof text === 'string' && /^You dig a hole through the /.test(text);

// How far under the floor the hero is t seconds after the hole breaks.
export function sinkOffset(t) {
  if (!(t > HANG)) return 0;
  const k = clamp01((t - HANG) / SINK);
  const down = -SINK_DEPTH * k * k;
  if (t < GIVE_UP) return down;
  const r = clamp01((t - GIVE_UP) / RISE);
  return down * (1 - r * r * (3 - 2 * r)) + 0;
}

// How far above the floor the hero is t seconds after arriving: a fall, one dead bounce, rest.
export function arriveOffset(t) {
  if (!(t >= 0)) return 0;
  const fall = Math.sqrt(2 * ARRIVE_HEIGHT / ARRIVE_GRAVITY);
  if (t < fall) return ARRIVE_HEIGHT - .5 * ARRIVE_GRAVITY * t * t;
  const v = Math.sqrt(2 * ARRIVE_GRAVITY * ARRIVE_HEIGHT) * BOUNCE, hop = t - fall, air = 2 * v / ARRIVE_GRAVITY;
  return hop < air ? v * hop - .5 * ARRIVE_GRAVITY * hop * hop : 0;
}
export const ARRIVE_TIME = Math.sqrt(2 * ARRIVE_HEIGHT / ARRIVE_GRAVITY) +
  2 * Math.sqrt(2 * ARRIVE_GRAVITY * ARRIVE_HEIGHT) * BOUNCE / ARRIVE_GRAVITY;

export function createDigDrop() {
  let mode = null, age = 0;
  return {
    message(text) { if (holeMessage(text)) { mode = 'sink'; age = 0; return true; } return false; },
    // Call when a new level arrives. True (and the fall-in begins) only if the hero was dropping.
    arrive() {
      if (mode !== 'sink') { mode = null; return false; }
      mode = 'land'; age = 0; return true;
    },
    update(dt) {
      if (!mode) return 0;
      age += Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
      if (mode === 'sink') {
        if (age >= GIVE_UP + RISE) { mode = null; return 0; }
        return sinkOffset(age);
      }
      if (age >= ARRIVE_TIME) { mode = null; return 0; }
      return arriveOffset(age);
    },
    clear() { mode = null; age = 0; },
    get active() { return mode !== null; },
  };
}
