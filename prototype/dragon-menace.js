// Dragons (creature animation queue item 5, part 1). Before this a dragon only bobbed, rolled a
// little, fluttered its wings on a quick 5 rad/s sine and wagged its tail like a dog. A dragon in
// NetHack is the apex of the dungeon, so this gives it a predator's patience instead:
//  - Its wings breathe slowly, half-open, and fold tight along its back while it walks.
//  - Now and then, standing still, it mantles: the wings snap up and out to their full span, the
//    membranes shudder, it rears its head a little, holds, and slowly folds them back.
//  - Or it lashes its tail: a whip-crack to one side and a ripple that dies away. Between lashes
//    the tail drifts slowly, low, like a cat's that is about to pounce.
//  - Its heads track the hero. Within TRACK_RANGE tiles (and while the hero is visible) every head
//    swings round to face them, gliding after them as they move. Otherwise each head scans slowly
//    on its own, so tiamat's five heads look about independently until they find you.
//  - Death folds the wings down along its flanks and eases the tail and heads back to rest.
//
// Writes: each wing pivot's rotation.y and the tail's rotation.z are written absolutely (live.js
// writes both every frame before this, so this replaces its flutter and wag for dragons). The
// wing's inner group (x, z), the tail's rotation.y and each head's rotation (y, x) get offsets
// that are taken back first thing each frame, so they never drift. Only dragons built by
// creatures.js dragon() have the `heads` handle; the jabberwock (also quirk 'dragon') is left alone.

// Wings. REST: live.js's resting pivot angle; BREATH: the slow open/close; FURL: how far the wings
// fold back while walking, and FURL_DROOP how far they sink; FURL_RATE: how fast they fold (1/s).
export const REST = -.18, BREATH = .07, BREATH_RATE = 1.3, FURL = .5, FURL_DROOP = .12, FURL_RATE = 4;
// Mantle: open to SPREAD past rest, raise RAISE, cup CUP forward, shudder SHUDDER at SHUDDER_HZ.
// It opens in OPEN_S, holds HOLD_S, folds back over FOLD_S. The heads rear REAR (negative lifts).
export const SPREAD = .42, RAISE = .42, CUP = .16, SHUDDER = .035, SHUDDER_HZ = 29, REAR = -.12;
export const OPEN_S = .35, HOLD_S = 1.3, FOLD_S = 1.1;
// Tail: the idle drift (two slow waves), the walking sway, and the lash: a snap to LASH (rad, z)
// and LASH_Y (yaw) in SNAP_S, then a ripple of RIPPLE rad/s dying away at DAMP/s, over LASH_S.
export const DRIFT = .1, DRIFT_RATE = 1.1, DRIFT2 = .035, DRIFT2_RATE = 2.7, WALK_SWAY = .12, WALK_RATE = 6;
export const LASH = .6, LASH_Y = .35, SNAP_S = .14, RIPPLE = 13, DAMP = 3.4, LASH_S = 1.5;
// Heads. TRACK_RANGE: tiles it watches the hero from; YAW/PITCH: how far a head turns from its
// rest; FOLLOW: how fast a head glides onto the hero (1/s); SCAN: how far an idle head looks
// about, SCAN_RATE how fast, a new look every SCAN_MIN..+SCAN_SPAN s. HEAD_H/LOOK_H: heights of
// the dragon's head and the hero's face.
export const TRACK_RANGE = 7, YAW = .75, PITCH = .3, FOLLOW = 3, SCAN = .45, SCAN_RATE = 1.4, SCAN_MIN = 1.8, SCAN_SPAN = 2.5;
const HEAD_H = .9, LOOK_H = 1.1;
// First mantle or lash after FIRST_MIN..+FIRST_SPAN s still, then GAP_MIN..+GAP_SPAN apart;
// MANTLE: chance the pick is a mantle rather than a lash. BREAK_RATE: how fast walking, an action
// or death cuts one short (1/s); DEATH_RATE: how fast the rest settles on death.
export const FIRST_MIN = 1.5, FIRST_SPAN = 2.5, GAP_MIN = 3.5, GAP_SPAN = 4.5, MANTLE = .5, BREAK_RATE = 10, DEATH_RATE = 3;
const SNAP = 1e-3;

const clamp = (v, m) => v < -m ? -m : v > m ? m : v;
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const fin = (v, d = 0) => Number.isFinite(v) ? v : d;

export const menaces = a => !!(a && !a.asset && a.quirk === 'dragon' && Array.isArray(a.heads) && a.heads.length && a.g);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

export const mantleLength = () => OPEN_S + HOLD_S + FOLD_S;
// How far the wings are mantled (0..1) s seconds in: a quick ease-out snap open, a hold, a slow fold.
export function mantleWeight(s) {
  s = fin(s, -1);
  if (s <= 0 || s >= mantleLength()) return 0;
  if (s < OPEN_S) { const u = s / OPEN_S; return 1 - (1 - u) * (1 - u) * (1 - u); }
  if (s < OPEN_S + HOLD_S) return 1;
  return 1 - smooth((s - OPEN_S - HOLD_S) / FOLD_S);
}
// The lash s seconds in, as a fraction of LASH (signed, -1..1): a snap out, then a damped ripple
// that is faded to exactly 0 by LASH_S.
export function lashCurve(s) {
  s = fin(s, -1);
  if (s <= 0 || s >= LASH_S) return 0;
  if (s < SNAP_S) { const u = s / SNAP_S; return 1 - (1 - u) * (1 - u); }
  const r = s - SNAP_S;
  return Math.exp(-DAMP * r) * Math.cos(RIPPLE * r) * (1 - smooth((s - (LASH_S - .4)) / .4));
}

// Where the hero is from this dragon: {yaw, pitch} relative to its heading, or null when out of
// range or unseen. Dragons see all round, so there's no view cone; heads just turn as far as YAW.
export function aimAt(actor, look) {
  const g = actor?.g;
  if (!g || !look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return null;
  const dx = look.x - g.position.x, dz = look.z - g.position.z, d = Math.hypot(dx, dz);
  if (!(d > 1e-3) || d > TRACK_RANGE) return null;
  return {yaw: wrap(Math.atan2(dx, dz) - g.rotation.y), pitch: -Math.atan2(((look.y || 0) + LOOK_H) - (g.position.y + HEAD_H), d)};
}

function setup(a) {
  const st = {
    seed: ((a.g.id ?? 1) * 48271) % 2147483647 || 1, wait: 0, cur: null, f: 0, furl: 0, life: 1, ph: 0,
    heads: a.heads.map(h => ({base: h.rotation.y, y: 0, x: 0, aim: 0, next: 0})),
    applied: {heads: a.heads.map(() => ({y: 0, x: 0})), inner: (a.wings || []).map(() => ({x: 0, z: 0})), tailY: 0},
  };
  st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  st.ph = rand(st) * Math.PI * 2;
  st.heads.forEach(h => { h.next = rand(st) * SCAN_MIN; });
  return st;
}

function takeBack(a, st) {
  const o = st.applied;
  a.heads.forEach((h, i) => { h.rotation.y -= o.heads[i].y; h.rotation.x -= o.heads[i].x; o.heads[i].y = o.heads[i].x = 0; });
  (a.wings || []).forEach((w, i) => { const inner = w.userData.inner; if (inner && o.inner[i]) { inner.rotation.x -= o.inner[i].x; inner.rotation.z -= o.inner[i].z; o.inner[i].x = o.inner[i].z = 0; } });
  if (a.tail) a.tail.rotation.y -= o.tailY;
  o.tailY = 0;
}

// Call once per frame after live.js's wing and tail writes. `busy`: walking or an action playing
// or queued; `walking`: actually moving; `look`: the hero's position (same parent as actor.g) or
// null. Returns {mantle, lash, furl} for tests, or null for anything but a dragon.
export function updateDragonMenace(a, dt, t, busy, walking = busy, look = null) {
  if (!menaces(a)) return null;
  const st = a.menace || (a.menace = setup(a));
  takeBack(a, st);
  dt = Math.max(0, fin(dt)); t = fin(t);
  const dead = !!a.actions?.dead;
  if (dead) st.life = Math.max(0, st.life - dt * DEATH_RATE);

  // Pick a mantle or lash while still; walking, an action or death cuts it short.
  const still = !busy && !dead;
  if (st.cur) {
    st.cur.s += dt;
    if (still) st.f = Math.min(1, st.f + dt * BREAK_RATE);
    else st.f = Math.max(0, st.f - dt * BREAK_RATE);
    const len = st.cur.kind === 'mantle' ? mantleLength() : LASH_S;
    if (st.cur.s >= len || st.f <= 0) { st.cur = null; st.f = 0; st.wait = GAP_MIN + GAP_SPAN * rand(st); }
  } else if (still && (st.wait -= dt) <= 0) {
    st.cur = {kind: rand(st) < MANTLE ? 'mantle' : 'lash', s: 0, side: rand(st) < .5 ? -1 : 1};
    st.f = 1;
  }
  const mantle = st.cur?.kind === 'mantle' ? mantleWeight(st.cur.s) * st.f : 0;
  const lash = st.cur?.kind === 'lash' ? lashCurve(st.cur.s) * st.f * st.cur.side : 0;
  const holding = st.cur?.kind === 'mantle' && st.cur.s > OPEN_S && st.cur.s < OPEN_S + HOLD_S ? st.f : 0;

  // Wings: furl while walking (and on death they fold and droop), otherwise breathe; mantle on top.
  const furlTo = walking || dead ? 1 : 0;
  st.furl += (furlTo - st.furl) * (1 - Math.exp(-FURL_RATE * dt));
  const life = st.life, open = mantle * life;
  (a.wings || []).forEach((w, i) => {
    const side = w.userData.side || (i ? 1 : -1);
    const breathe = BREATH * Math.sin(t * BREATH_RATE + st.ph) * (1 - st.furl) * (1 - open) * life;
    w.rotation.y = side * (REST + breathe + FURL * st.furl - SPREAD * open);
    const inner = w.userData.inner;
    if (inner) {
      const x = -CUP * open + SHUDDER * .5 * holding * life * Math.sin(t * SHUDDER_HZ * .7);
      const z = side * (RAISE * open - FURL_DROOP * st.furl + SHUDDER * holding * life * Math.sin(t * SHUDDER_HZ + i));
      inner.rotation.x += x; inner.rotation.z += z;
      st.applied.inner[i] = {x, z};
    }
  });

  // Tail: a slow low drift standing, a sway walking, the lash on top.
  if (a.tail) {
    const drift = DRIFT * Math.sin(t * DRIFT_RATE + st.ph) + DRIFT2 * Math.sin(t * DRIFT2_RATE + st.ph * 1.7);
    const sway = WALK_SWAY * Math.sin(t * WALK_RATE + st.ph);
    a.tail.rotation.z = (drift * (1 - st.furl) + sway * (walking ? st.furl : 0) + LASH * lash) * life;
    const y = LASH_Y * lash * life;
    a.tail.rotation.y += y;
    st.applied.tailY = y;
  }

  // Heads: track the hero if in range, otherwise scan; rear back during a mantle.
  const aim = dead ? null : aimAt(a, look);
  const k = 1 - Math.exp(-(aim ? FOLLOW : SCAN_RATE) * dt);
  a.heads.forEach((h, i) => {
    const hs = st.heads[i];
    let yawTo, pitchTo;
    if (aim) { yawTo = clamp(wrap(aim.yaw - hs.base), YAW); pitchTo = clamp(aim.pitch, PITCH); }
    else {
      if ((hs.next -= dt) <= 0) { hs.aim = dead ? 0 : (rand(st) * 2 - 1) * SCAN; hs.next = SCAN_MIN + SCAN_SPAN * rand(st); }
      yawTo = dead ? 0 : hs.aim; pitchTo = 0;
    }
    hs.y += (yawTo - hs.y) * k; hs.x += (pitchTo - hs.x) * k;
    const y = hs.y * life, x = (hs.x + REAR * mantle) * life;
    h.rotation.y += y; h.rotation.x += x;
    st.applied.heads[i] = {y, x};
  });
  if (dead && life <= SNAP) { st.cur = null; st.f = 0; }
  return {mantle, lash, furl: st.furl};
}
