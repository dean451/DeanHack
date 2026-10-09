// Falling and travelling: down the stairs the hard way. "You fall down the stairs." arms it; when
// the new level arrives the hero does not walk in but pitches in off the top step, lands hard,
// and bounces twice more, each hop lower and deader than the last, before lying still on their
// feet. If no new level ever comes the arming lapses quietly.
//
// Returns a vertical offset (world units) for live.js to add to the hero's height each frame.
// It is zero at rest and exactly zero again once it finishes. The message text is from NetHack
// source and unconfirmed against a live engine.

export const TUMBLE_HEIGHT = .55, TUMBLE_GRAVITY = 9, TUMBLE_BOUNCES = [.5, .28], ARM_TIME = 3;
// After the last bounce the hero lies still a beat, then one small involuntary jerk of the body.
export const TWITCH_GAP = .3, TWITCH_LEN = .14, TWITCH_HEIGHT = .009, TWITCH_GAP2 = .22;

export const tumbleMessage = text => typeof text === 'string' && /^You fall down the (?:stairs|ladder)\b/.test(text);

// Height above the floor t seconds after arriving: a short fall, then diminishing hops, then rest.
export function tumbleOffset(t) {
  if (!(t >= 0)) return 0;
  const fall = Math.sqrt(2 * TUMBLE_HEIGHT / TUMBLE_GRAVITY);
  if (t < fall) return TUMBLE_HEIGHT - .5 * TUMBLE_GRAVITY * t * t;
  let v = Math.sqrt(2 * TUMBLE_GRAVITY * TUMBLE_HEIGHT), hop = t - fall;
  for (const k of TUMBLE_BOUNCES) {
    v *= k;
    const air = 2 * v / TUMBLE_GRAVITY;
    if (hop < air) return v * hop - .5 * TUMBLE_GRAVITY * hop * hop;
    hop -= air;
  }
  const j = (hop - TWITCH_GAP) / TWITCH_LEN, k = (hop - TWITCH_GAP - TWITCH_LEN - TWITCH_GAP2) / TWITCH_LEN;
  if (j > 0 && j < 1) return TWITCH_HEIGHT * Math.sin(j * Math.PI);
  // A second, fainter jerk, as if the body had not quite finished being dropped.
  return k > 0 && k < 1 ? TWITCH_HEIGHT * .5 * Math.sin(k * Math.PI) : 0;
}
export const TUMBLE_TIME = TWITCH_GAP + TWITCH_LEN + TWITCH_GAP2 + TWITCH_LEN + Math.sqrt(2 * TUMBLE_HEIGHT / TUMBLE_GRAVITY) +
  TUMBLE_BOUNCES.reduce((s, _, i) => s + 2 * Math.sqrt(2 * TUMBLE_GRAVITY * TUMBLE_HEIGHT) * TUMBLE_BOUNCES.slice(0, i + 1).reduce((a, b) => a * b, 1) / TUMBLE_GRAVITY, 0);

export function createStairTumble() {
  let mode = null, age = 0;
  return {
    message(text) { if (!tumbleMessage(text)) return false; mode = 'armed'; age = 0; return true; },
    // Call when a new level arrives. True (and the tumble begins) only if the hero was armed.
    arrive() {
      if (mode !== 'armed') { mode = null; return false; }
      mode = 'fall'; age = 0; return true;
    },
    update(dt) {
      if (!mode) return 0;
      age += Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
      if (mode === 'armed') { if (age >= ARM_TIME) mode = null; return 0; }
      if (age >= TUMBLE_TIME) { mode = null; return 0; }
      return tumbleOffset(age);
    },
    clear() { mode = null; age = 0; },
    get active() { return mode !== null; },
  };
}
