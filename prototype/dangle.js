// Bee legs in flight (bee.js). live.js swings every walker's legs about x (±.4 rad at 22 rad/s),
// which on a bee reads as it running on thin air. A flying bee lets its legs hang instead: the
// front pair held a little forward, the long hind legs trailing back, all splayed slightly out.
// They sway lazily as the bee bobs, with a faint tremble from the wingbeat. Every few seconds a
// hovering bee scrapes its front legs together for a moment, an odd, fussy little tic. When it flies from
// tile to tile the legs sweep further back and draw in, streamlined, and swing forward again as
// it stops. A dead bee's legs go slack to their exact rest pose.
//
// Leg pitch (rotation.x) and splay (rotation.z) are written absolutely from the rest pose each
// frame, replacing live.js's generic swing; call updateDangle after that swing and before
// updateActions so the action layer's deltas still stack on top.

// Per pair, front to back: hover pitch (rad, positive trails the foot back), extra trail at full
// flight speed and outward splay (rad).
export const DANGLE = {
  pitch: [-.06, .08, .22],
  trail: [.12, .22, .38],
  splay: [.05, .08, .12],
  kick: .25, // legs swing past the new pose as flight starts or stops, then settle back
  tuck: .45, // how much of the splay is drawn in at full flight speed
  sway: .05, swayRate: 2.2, // lazy swing lagging the flight bob
  jitter: .1, jitterRate: 1.7, // slow splay drift, as a fraction of the splay
  tremble: .012, trembleRate: 60, // wingbeat buzz
  rub: .3, rubShake: .07, rubRate: 26, rubEvery: 7, rubFor: .8, // now and then, hovering, the front legs scrape together like a fly's
};
// Flight blend in over ~.3 s, out over ~.35 s; the legs go slack over ~.3 s on death.
const EASE_IN = 7, EASE_OUT = 6, LAG = 5, SLACK = 7, SNAP = 1e-3;

export const dangles = a => !!(a?.quirk === 'bee' && a.legs?.length === 6 && !a.asset);

// Side (+1 right, -1 left) and pair rank (0 front .. 2 hind) of each leg, from the hip positions.
export function dangleLayout(legs) {
  const side = legs.map(l => (l.position.x < 0 ? -1 : 1));
  const rank = legs.map((l, i) => legs.filter((m, j) => side[j] === side[i] && m.position.z > l.position.z).length);
  return {side, rank: rank.map(r => Math.min(r, 2))};
}

// The per-leg pitch and splay at clock `t`, flight blend `w` and life `a` (1 alive, 0 slack).
export function danglePose(layout, t, w = 0, a = 1, seed = 0, lag = w) {
  const D = DANGLE, {side, rank} = layout;
  if (!(a > 0)) return {pitch: side.map(() => 0), splay: side.map(() => 0)};
  const swing = D.sway * Math.sin(t * D.swayRate + seed - 1.2) * (1 - .6 * w);
  // the rub: a smooth lift of the front pair that trembles fast, only when the bee is hovering
  const ru = ((t + 1 + seed * .5) % D.rubEvery) / D.rubFor; // the first one comes no sooner than 3 s in
  const rub = ru < 1 ? Math.sin(Math.PI * ru) ** 2 * (1 - w) : 0;
  return {
    pitch: rank.map((r, i) => a * (D.pitch[r] + D.trail[r] * (w + D.kick * (w - lag)) + swing * (1 + .3 * r)
      + D.tremble * Math.sin(t * D.trembleRate + i * 1.9)
      + (r === 0 ? rub * (D.rub + D.rubShake * Math.sin(t * D.rubRate + i * 2.4)) : 0))),
    splay: rank.map((r, i) => a * side[i] * D.splay[r] * (1 - D.tuck * w)
      * (1 + D.jitter * Math.sin(t * D.jitterRate + i * 1.1 + seed))),
  };
}

function approach(v, to, rate, dt) {
  const n = to + (v - to) * Math.exp(-rate * dt);
  return Math.abs(n - to) < SNAP ? to : n;
}

// Call once per frame. Returns the pose applied (or null for other actors).
export function updateDangle(actor, dt, walking) {
  if (!dangles(actor)) return null;
  // bee.js builds its legs unpitched; live.js may already have swung them this frame, so the
  // rest pitch is 0 rather than whatever is there now
  let st = actor.dangle;
  if (!st) {
    st = actor.dangle = {w: 0, lag: 0, a: actor.actions?.dead ? 0 : 1, t: 0, seed: Math.abs(actor.g?.id || 0) % 7,
      layout: dangleLayout(actor.legs), rest: actor.legs.map(l => ({x: 0, z: l.rotation.z}))};
  }
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const dead = !!actor.actions?.dead, moving = !!walking && !dead;
  st.w = approach(st.w, moving ? 1 : 0, moving ? EASE_IN : EASE_OUT, dt);
  st.lag = approach(st.lag, moving ? 1 : 0, LAG, dt);
  st.a = approach(st.a, dead ? 0 : 1, dead ? SLACK : EASE_IN, dt);
  st.t = st.a > 0 ? (st.t + dt) % 1e4 : 0;
  const p = danglePose(st.layout, st.t, st.w, st.a, st.seed, st.lag);
  actor.legs.forEach((l, i) => {
    l.rotation.x = st.rest[i].x + p.pitch[i];
    l.rotation.z = st.rest[i].z + p.splay[i];
  });
  return p;
}
