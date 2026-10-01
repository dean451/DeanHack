// The hezrou's wet, gurgling idle (creature animation queue item 2, part 1). Its model (hezrou.js)
// is a hunched toad demon with a pale throat sac under its hinged jaw and two strings of drool at
// each corner of the mouth, all as their own handles.
//  - Drool, always while alive: each corner's strings sag slowly longer and thinner (holding their
//    volume), then snap: they spring back up short and wobble out to rest, and start sagging again,
//    each side on its own clock. Walking swings them back and forth.
//  - Throat sac, always while alive: a slow, uneven swell and sag, like a toad breathing.
//  - Gurgle, now and then after standing still a few seconds: the sac swells up big while the head
//    tips back, holds there and quivers as something bubbles inside it, then empties in a belch:
//    the jaw drops, the head lurches forward and the sac collapses, a little past rest, and fills
//    back out. Walking, an action or death fades the gurgle out within ~0.1 s.
//  - On death the drool and the sac ease back to rest, so a corpse stops moving.
// Everything glides except the snap and the belch, which are quick but smooth (the sinister
// direction).
//
// The sac and the drool belong to this module: their scale (and the drool's swing) are written
// outright every frame. The head and jaw are shared with actions.js, so the gurgle adds offsets
// there and takes back its own last offset first each frame, like healer-peer.js.

// Drool: how long the strings stretch at the snap (× rest), how short they spring back, the seconds
// for one sag (DRIP_MIN..+DRIP_SPAN, picked afresh each time) and for the spring back to settle,
// how far walking swings them (rad), and how fast.
export const STRETCH = 2.6, RECOIL = .35, DRIP_MIN = 2.2, DRIP_SPAN = 2.2, SETTLE = .55, SWING = .35, SWING_HZ = 1.8;
// Sac: the breathing swell (share of rest) and its rate; the gurgle's swell (x/z, and y) and quiver.
export const BREATH = .07, BREATH_HZ = .3, SWELL = .5, SWELL_Y = .35, QUIVER = .07, QUIVER_HZ = 9;
// Gurgle: head tip back (negative x lifts the face), the belch's jaw drop and head lurch, how far the
// sac empties past rest, and the seconds for one gurgle.
export const TIP = -.14, GAPE = .3, LURCH = .12, EMPTY = .3, LEN = 3.6;
// First gurgle after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 3, FIRST_SPAN = 3, GAP_MIN = 6, GAP_SPAN = 7;
// How fast the drool and sac ease back to rest after death (1/s).
export const REST_RATE = 3;
const FADE_OUT = 14, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const hump = (u, a, b, w) => smooth((u - a) / w) - smooth((u - b + w) / w);

export const gurgles = a => !!(a && !a.asset && a.kind === 'hezrou' && a.head && a.jaw && a.sac && a.drools?.length);

// The drool's length (× rest) at phase v of a sag (0..1) and `since` seconds after the last snap.
// The sag eases in (slow at first, quicker as the weight builds); the spring back after a snap is a
// damped wobble from RECOIL out to the sag's start.
export function droolLength(v, since = Infinity) {
  const sag = 1 + (STRETCH - 1) * clamp01(v) ** 2;
  if (!(since < SETTLE)) return sag;
  const k = since / SETTLE, wobble = (RECOIL - 1) * Math.cos(k * Math.PI * 2.5) * (1 - k) ** 2;
  return sag + wobble;
}

// The gurgle's offsets at progress u (0..1), time t, scaled by f: sac swell (x/z and y share of rest),
// head pitch and jaw drop.
// Phases in u: the swell and tip back .02–.32, held and quivering .32–.62, the belch at .62–.7
// (jaw drops, head lurches, sac empties past rest), then all glides home .7–.98.
export function gurglePose(u, t = 0, f = 1) {
  const p = {sx: 0, sy: 0, head: 0, jaw: 0};
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  const swell = smooth((u - .02) / .3), belch = smooth((u - .62) / .08), home = smooth((u - .7) / .28);
  const full = swell * (1 - belch), quiver = QUIVER * hump(u, .3, .64, .05) * Math.sin(t * QUIVER_HZ * Math.PI * 2);
  const empty = -EMPTY * belch * (1 - home);
  p.sx = (SWELL * full + quiver + empty) * f;
  p.sy = (SWELL_Y * full + quiver * .6 + empty * .7) * f;
  p.head = (TIP * full + LURCH * belch * (1 - home)) * f;
  p.jaw = (GAPE * belch * (1 - home) + .06 * full) * f;
  return p;
}

// Deterministic per-actor PRNG, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame. `busy` is true while the actor walks or has an action playing or queued.
// Returns {gurgle, sac, drool: [lengths]} for tests, or null for anything that isn't a hezrou.
export function updateHezrouGurgle(actor, dt, t, busy, walking = busy) {
  if (!gurgles(actor)) return null;
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  t = Number.isFinite(t) ? t : 0;
  const st = actor.hezrouGurgle || (actor.hezrouGurgle = {
    seed: ((actor.g?.id ?? 1) * 48271) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: {head: 0, jaw: 0},
    life: 1, swing: 0, breath: 0, drools: [],
  });
  if (!st.drools.length) for (let i = 0; i < actor.drools.length; i++) st.drools.push({v: rand(st) * .8, len: DRIP_MIN + DRIP_SPAN * rand(st), since: Infinity});
  actor.head.rotation.x -= st.applied.head; actor.jaw.rotation.x -= st.applied.jaw;
  st.applied = {head: 0, jaw: 0};

  const dead = !!actor.actions?.dead, still = !busy && !dead;
  // life eases to 0 on death, taking every living motion with it
  st.life = dead ? st.life * Math.exp(-REST_RATE * dt) : 1;
  if (st.life < SNAP) st.life = 0;
  st.swing += ((walking && !dead ? 1 : 0) - st.swing) * (1 - Math.exp(-6 * dt));
  st.breath += dt * BREATH_HZ * Math.PI * 2;

  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  if (st.cur) {
    if (still && !st.cur.broken) st.cur.u += dt / LEN;
    else { st.cur.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP) st.f = 0; }
    if (st.cur.u >= 1 || !(st.f > 0)) {
      st.cur = null; st.f = 0;
      st.wait = still ? GAP_MIN + GAP_SPAN * rand(st) : FIRST_MIN + FIRST_SPAN * rand(st);
    }
  } else if (still) {
    st.wait -= dt;
    if (st.wait <= 0) { st.cur = {u: 0}; st.f = 1; st.wait = 0; }
  } else st.wait = Math.max(st.wait, FIRST_MIN);
  const g = st.cur ? gurglePose(st.cur.u, t, st.f) : gurglePose(0);

  // the sac: breathing (two sines, so it never quite repeats) plus the gurgle
  const b = BREATH * (Math.sin(st.breath) * .7 + Math.sin(st.breath * 1.73 + 1) * .3) * st.life;
  const sx = 1 + (b + g.sx) * st.life, sy = 1 + (b * .6 + g.sy) * st.life;
  actor.sac.scale.set(sx, sy, sx);

  // the drool: sag, snap, settle; thinner as it stretches; swinging as the hezrou walks
  const lens = actor.drools.map((d, i) => {
    const s = st.drools[i];
    if (!dead) {
      s.v += dt / s.len; s.since += dt;
      if (s.v >= 1) { s.v = 0; s.since = 0; s.len = DRIP_MIN + DRIP_SPAN * rand(st); }
    }
    const len = 1 + (droolLength(s.v, s.since) - 1) * st.life, thin = 1 / Math.sqrt(Math.max(.2, len));
    d.scale.set(thin, len, thin);
    d.rotation.x = SWING * st.swing * Math.sin(t * SWING_HZ * Math.PI * 2 + i * 1.3) * st.life;
    return len;
  });

  actor.head.rotation.x += g.head; actor.jaw.rotation.x += g.jaw;
  st.applied = {head: g.head, jaw: g.jaw};
  return {gurgle: st.cur ? {u: st.cur.u, f: st.f, pose: g} : null, sac: [sx, sy], drool: lens};
}
