// The doppelganger (doppelganger.js): a mimic caught halfway out of someone else's shape.
//  - Its flesh never quite settles: a slow uneven swell through the torso, and the left talons
//    flex now and then on their own, a quick jerk and a hold.
//  - Every SLIP_MIN..+SLIP_SPAN s its shape slips: a shudder runs through the torso (it bulges and
//    pinches out of step), the head wrenches over to a hard cock and back, and the talons spasm.
//  - With the hero within RANGE tiles it studies them: the head turns to follow in jerky snaps, not
//    a smooth track. And it mimics them: each time the hero steps, after a beat (ECHO_DELAY) it
//    leans the way the hero went, as if trying the movement on.
//  - It attacks with the left talons, not the human hand: the talon arm rises high and out with
//    the torso coiled back, then rakes down and across the body as the torso whips through.
//    actions.js leaves its right arm alone (`ownsAttackArms`). If it is ever handed a weapon (the
//    socket holds something) the right arm swings it as usual and the talons only flex in time.
//  - A blow: the shape slips (a strong shudder) and the talons flail.
//  - Death: everything eases back to rest. Turned to stone (`a.stone`): it holds.
// Handles used: body, head, arms (left = talons), weaponSocket. No extra draws.

const TAU = Math.PI * 2;
// Hero sensing (tiles), how far the hero must move to count as a step (units), and the echo.
export const RANGE = 5, STEP = .5, ECHO_DELAY = .35, ECHO_LEN = .7, ECHO_LEAN = .09;
// Studying the hero: most head turn (rad), retarget gap (s) and snap rate (1/s).
export const STUDY_TURN = .9, STUDY_MIN = .3, STUDY_SPAN = .7, STUDY_RATE = 16;
// The shape slip: gap and length (s), the swell and pinch (scale), the head wrench and talon spasm (rad).
export const SLIP_MIN = 5, SLIP_SPAN = 6, SLIP_LEN = 1.1, SLIP_SWELL = .06, SLIP_HEAD = .38, SLIP_TALON = .16, SLIP_HZ = 9;
// Idle: the flesh swell (scale) and the talon flex (rad) with its gap (s).
export const SWELL = .015, FLEX = .1, FLEX_MIN = 1.4, FLEX_SPAN = 2.8;
// The rake: talon arm raised (x, out) and swept (x, across), torso coil and whip (yaw), lean.
export const RAKE = {raiseX: -2.0, raiseOut: -.35, sweepX: -.35, sweepIn: .5, coil: -.28, whip: .32, lean: .12, head: -.12};
export const REST_RATE = 3;
const SNAP = 1e-3;

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const clamp01 = v => clamp(v, 0, 1);
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export const isDoppelganger = a => !!(a && !a.asset && a.kind === 'doppelganger' && a.g && a.body && a.head && a.arms?.length === 2);
const armed = a => !!a.weaponSocket?.children?.length;

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// The rake over action progress u: wind up (raise and coil), the fast rake across, then recover.
// Returns 0..1 weights for the raised pose and the swept pose.
export function rakeCurve(u) {
  if (!(u > 0) || !(u < 1)) return {raise: 0, sweep: 0};
  const up = smooth(u / .35), strike = smooth((u - .35) / .14), back = 1 - smooth((u - .6) / .4);
  return {raise: up * (1 - strike), sweep: strike * back};
}

// The slip's shudder envelope over its progress v: a sharp onset, then decaying.
export const slipCurve = v => !(v > 0) || !(v < 1) ? 0 : smooth(v / .12) * (1 - smooth((v - .3) / .7));

function setup(a) {
  const seed = ((a.g.id ?? 1) * 48271) % 2147483647 || 1;
  const st = {seed, life: 1, T: 0, off: new Map(), anchor: null, look: 0, lookAt: 0, lookWait: 0,
    echo: null, slip: null, slipWait: 0, flex: 0, flexTo: 0, flexWait: 0, flail: 0, lastHit: null};
  st.slipWait = SLIP_MIN + SLIP_SPAN * rand(st);
  st.flexWait = FLEX_MIN + FLEX_SPAN * rand(st);
  st.phase = rand(st) * TAU;
  return st;
}

// An offset on obj[prop][axis] taken back next frame, unless someone has rewritten it since. The
// match has a tolerance: actions.js adds its pose after us and takes it back before us, and that
// round trip isn't always exact in floating point.
function offset(st, obj, prop, axis, v) {
  const key = obj.uuid + prop + axis, o = st.off.get(key);
  if (o && Math.abs(obj[prop][axis] - o.out) < 1e-9) obj[prop][axis] -= o.v;
  obj[prop][axis] += v;
  st.off.set(key, {v, out: obj[prop][axis]});
}

function sense(a, look) {
  const g = a.g;
  if (!look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return null;
  const dx = look.x - g.position.x, dz = look.z - g.position.z, d = Math.hypot(dx, dz);
  return {b: d > 1e-3 ? wrap(Math.atan2(dx, dz) - g.rotation.y) : 0, d};
}

// Call once a frame (fidget.js does). `busy` is true while it moves or acts; `look` is the hero's
// position (same parent as actor.g). Returns the state, or null for anything else.
export function updateDoppelRake(a, dt, t, busy, look = null) {
  if (!isDoppelganger(a)) return null;
  const st = a.doppelRake || (a.doppelRake = setup(a));
  const hand = armed(a);
  a.ownsAttackArms = !hand;
  dt = a.stone ? 0 : Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.T += dt;
  const q = a.actions, cur = q?.current, dead = !!q?.dead;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  const live = !dead && !a.stone;

  // The hero: studied in snaps, and each step echoed.
  const h = sense(a, look), near = !!(h && h.d <= RANGE);
  if (h) {
    if (!st.anchor) st.anchor = {x: look.x, z: look.z};
    else if (Math.hypot(look.x - st.anchor.x, look.z - st.anchor.z) > STEP) {
      // the step in the doppelganger's own frame: +x its left-to-right, +z its forward
      const dx = look.x - st.anchor.x, dz = look.z - st.anchor.z, r = -a.g.rotation.y;
      const lx = dx * Math.cos(r) + dz * Math.sin(r), lz = -dx * Math.sin(r) + dz * Math.cos(r), n = Math.hypot(lx, lz) || 1;
      st.anchor.x = look.x; st.anchor.z = look.z;
      if (near && live) st.echo = {x: lx / n, z: lz / n, age: -ECHO_DELAY};
    }
  }
  if (near && live) {
    st.lookWait -= dt;
    if (st.lookWait <= 0) { st.lookAt = clamp(h.b, -STUDY_TURN, STUDY_TURN); st.lookWait = STUDY_MIN + STUDY_SPAN * rand(st); }
  } else st.lookAt = 0;
  st.look = approach(st.look, st.lookAt, near ? STUDY_RATE : REST_RATE, dt);
  let echo = 0;
  if (st.echo) {
    st.echo.age += dt;
    const v = st.echo.age / ECHO_LEN;
    echo = v > 0 ? Math.sin(Math.PI * clamp01(v)) : 0;
    if (v >= 1) st.echo = null;
  }

  // A blow: the shape slips hard and the talons flail.
  if (!dead && cur?.kind === 'hit' && cur !== st.lastHit) {
    st.lastHit = cur;
    st.slip = {v: 0, dir: rand(st) < .5 ? -1 : 1, k: 1.5};
    st.flail = 1;
  }
  st.flail = st.flail > SNAP ? st.flail * Math.exp(-5 * dt) : 0;
  // The slip, now and then on its own.
  if (live && !st.slip) {
    st.slipWait -= dt;
    if (st.slipWait <= 0) { st.slip = {v: 0, dir: rand(st) < .5 ? -1 : 1, k: 1}; st.slipWait = SLIP_MIN + SLIP_SPAN * rand(st); }
  }
  let slip = 0, shiver = 0;
  if (st.slip) {
    st.slip.v += dt / SLIP_LEN;
    slip = slipCurve(st.slip.v) * st.slip.k;
    shiver = Math.sin(st.T * SLIP_HZ * TAU);
    if (st.slip.v >= 1) st.slip = null;
  }
  // The talons flex on their own: a quick jerk to a new hold.
  if (live) {
    st.flexWait -= dt;
    if (st.flexWait <= 0) { st.flexTo = (rand(st) * 2 - 1) * FLEX; st.flexWait = FLEX_MIN + FLEX_SPAN * rand(st); }
  } else st.flexTo = 0;
  st.flex = approach(st.flex, st.flexTo, 18, dt);

  // The rake (or, armed, only a flex of the talons in time with the swing).
  const atk = !dead && cur?.kind === 'attack' && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
  const r = atk ? rakeCurve(q.u ?? 0) : {raise: 0, sweep: 0};
  const rk = hand ? .25 : 1;

  const w = st.life, sd = st.slip?.dir ?? 1;
  const swell = SWELL * (Math.sin(st.T * 1.3 + st.phase) * .6 + Math.sin(st.T * 2.9 + st.phase * 2) * .4);
  // the torso: uneven swell, the slip's bulge and pinch, the coil and whip, the echo lean
  offset(st, a.body, 'scale', 'x', (swell + SLIP_SWELL * slip * shiver) * w);
  offset(st, a.body, 'scale', 'z', (-swell * .7 - SLIP_SWELL * slip * shiver * .8) * w);
  offset(st, a.body, 'scale', 'y', (swell * .5 + SLIP_SWELL * .4 * slip * Math.sin(st.T * SLIP_HZ * .5 * TAU)) * w);
  offset(st, a.body, 'rotation', 'y', (RAKE.coil * r.raise + RAKE.whip * r.sweep) * rk * w);
  offset(st, a.body, 'rotation', 'x', (RAKE.lean * r.sweep * rk + ECHO_LEAN * echo * (st.echo?.z ?? 0)) * w);
  offset(st, a.body, 'rotation', 'z', (-ECHO_LEAN * echo * (st.echo?.x ?? 0) + .04 * slip * sd) * w);
  // the head: snaps to study the hero; wrenched over in a slip; ducks into the rake
  offset(st, a.head, 'rotation', 'y', (st.look * (1 - .5 * (r.raise + r.sweep))) * w);
  offset(st, a.head, 'rotation', 'z', (SLIP_HEAD * slip * sd + .05 * slip * shiver) * w);
  offset(st, a.head, 'rotation', 'x', (RAKE.head * r.sweep * rk) * w);
  // the talon arm: flex, spasm, flail, and the rake
  const talons = a.arms[0], fl = Math.sin(st.T * 14 * TAU);
  offset(st, talons, 'rotation', 'x', (st.flex + SLIP_TALON * slip * fl + .35 * st.flail * Math.sin(st.T * 7 * TAU)
    + (RAKE.raiseX * r.raise + RAKE.sweepX * r.sweep) * rk) * w);
  offset(st, talons, 'rotation', 'z', (.06 * slip * fl + (RAKE.raiseOut * r.raise + RAKE.sweepIn * r.sweep) * rk) * w);
  return st;
}
