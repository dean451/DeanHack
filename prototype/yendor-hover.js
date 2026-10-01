// The Wizard of Yendor (wizard-of-yendor.js): he flies, so he never touches the floor.
//  - He hovers HOVER above it, rising and sinking slowly, the robe swaying a little against the
//    float. Gliding from tile to tile he leans into it and rides a little higher.
//  - The orb on his staff breathes: a slow, uneven violet throb. With the hero within RANGE tiles
//    it burns brighter and throbs faster, his head turns after them and the staff tips the orb
//    toward them. Every GATHER_MIN..+GATHER_SPAN s near the hero the orb gathers: it swells and
//    brightens over a second, then gutters back.
//  - His attacks (melee or spell) are cast through the staff: he raises it high, the orb kindling,
//    then thrusts it down at the foe as the orb flares and swells, head jutting. actions.js leaves
//    his arm alone (`ownsAttackArms`).
//  - A blow: the orb gutters nearly out and recovers, and he jolts up in the air and sways.
//  - Death: he sinks to the floor and everything eases to rest; the orb dies back to its resting
//    glow. Turned to stone (`a.stone`): he holds, and the orb is left alone.
// Handles used: body, head, arm (the staff arm), orb. The orb's material is shared with the eyes
// and every other Wizard of Yendor, so he gets his own copy on the first frame (freed with the
// model). No extra draws.

const TAU = Math.PI * 2;
// The hover: height, bob (units) and rate (Hz); the robe's sway (rad); the glide's lean and lift.
export const HOVER = .12, BOB = .025, BOB_HZ = .32, SWAY = .03, GLIDE_LEAN = .1, GLIDE_LIFT = .04;
// Hero sensing (tiles), most head turn (rad), the staff's tip toward the hero (rad), follow rate (1/s).
export const RANGE = 6, HEAD_TURN = .8, STAFF_TIP = .22, FOLLOW = 3;
// The orb: the throb's depth (fraction of its resting glow) alone and near; near brightening;
// the gather's flare and swell; the attack's flare and swell; the blow's gutter.
export const THROB = .25, THROB_NEAR = .4, NEAR_BRIGHT = .6, GATHER = 2.2, GATHER_SWELL = .3, CAST = 3.5, CAST_SWELL = .55, GUTTER = .8;
// Gathers near the hero: gap and length (s).
export const GATHER_MIN = 4, GATHER_SPAN = 4, GATHER_LEN = 1.6;
// The cast: staff raised (x, negative is up and forward), thrust, head jut, body lean.
export const RAISE = -1.15, THRUST = -.55, JUT = .18, CAST_LEAN = .1;
// The blow: jolt up (units) and sway (rad).
export const JOLT = .07, JOLT_SWAY = .08;
export const REST_RATE = 2.5;
const SNAP = 1e-3;

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const clamp01 = v => clamp(v, 0, 1);
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export const isYendor = a => !!(a && !a.asset && a.kind === 'wizard of yendor' && a.g && a.body && a.head && a.arm && a.orb?.material);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// The cast over action progress u: {raise, thrust, flare} weights, all 0 at u = 0 and 1. The staff
// goes up to .4, thrusts down fast to .55 with the orb flaring, then recovers.
export function castCurve(u) {
  if (!(u > 0) || !(u < 1)) return {raise: 0, thrust: 0, flare: 0};
  const up = smooth(u / .4), down = smooth((u - .4) / .15), back = 1 - smooth((u - .6) / .4);
  return {raise: up * (1 - down), thrust: down * back, flare: Math.max(.35 * up * (1 - down), down * back)};
}

// The gather over its progress v: a slow swell to .65, then a quick gutter back.
export const gatherCurve = v => !(v > 0) || !(v < 1) ? 0 : smooth(v / .65) * (1 - smooth((v - .65) / .35));

function setup(a) {
  const st = {seed: ((a.g.id ?? 1) * 69621) % 2147483647 || 1, life: 1, T: 0, off: new Map(), turn: 0, tip: 0, near: 0,
    glide: 0, gather: null, gatherWait: 0, gutter: 0, jolt: 0, lastHit: null, orb: null};
  st.gatherWait = GATHER_MIN + GATHER_SPAN * rand(st);
  st.phase = rand(st) * TAU;
  return st;
}

// An offset on obj[prop][axis] taken back next frame, unless someone has rewritten it since (live.js
// sets the body's height outright each frame). The match has a tolerance: actions.js adds its pose
// after us and takes it back before us, and that round trip isn't always exact in floating point.
function offset(st, obj, prop, axis, v) {
  const key = obj.uuid + prop + axis, o = st.off.get(key);
  if (o && Math.abs(obj[prop][axis] - o.out) < 1e-9) obj[prop][axis] -= o.v;
  obj[prop][axis] += v;
  st.off.set(key, {v, out: obj[prop][axis]});
}

function sense(a, look) {
  if (!look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return null;
  const dx = look.x - a.g.position.x, dz = look.z - a.g.position.z, d = Math.hypot(dx, dz);
  return {b: d > 1e-3 ? wrap(Math.atan2(dx, dz) - a.g.rotation.y) : 0, d};
}

// Call once a frame (fidget.js does). `busy` is true while he moves or acts; `look` is the hero's
// position (same parent as actor.g). Returns the state, or null for anything else.
export function updateYendorHover(a, dt, t, busy, look = null) {
  if (!isYendor(a)) return null;
  const st = a.yendorHover || (a.yendorHover = setup(a));
  a.ownsAttackArms = true;
  const orb = a.orb;
  if (!st.orb) {
    st.orb = {base: orb.material.emissiveIntensity, scale: orb.scale.x};
    const own = orb.material = orb.material.clone(), prev = orb.userData.dispose;
    orb.userData.dispose = () => { prev?.(); own.dispose(); };
  }
  dt = a.stone ? 0 : Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.T += dt;
  const q = a.actions, cur = q?.current, dead = !!q?.dead;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  const live = !dead && !a.stone;
  const walking = busy && !cur && !q?.queue?.length;

  // The hero: the head follows, the staff tips the orb at them, the orb burns brighter.
  const h = sense(a, look), near = live && !!(h && h.d <= RANGE);
  st.turn = approach(st.turn, near ? clamp(h.b, -HEAD_TURN, HEAD_TURN) : 0, FOLLOW, dt);
  st.tip = approach(st.tip, near ? 1 : 0, FOLLOW, dt);
  st.near = approach(st.near, near ? 1 : 0, 1.5, dt);
  st.glide = approach(st.glide, walking && live ? 1 : 0, 4, dt);

  // A gather now and then while the hero is near.
  if (near && !st.gather) {
    st.gatherWait -= dt;
    if (st.gatherWait <= 0) { st.gather = {v: 0}; st.gatherWait = GATHER_MIN + GATHER_SPAN * rand(st); }
  }
  let gather = 0;
  if (st.gather) {
    st.gather.v += dt / GATHER_LEN;
    gather = gatherCurve(st.gather.v) * (live ? 1 : 0);
    if (st.gather.v >= 1 || !live) st.gather = null;
  }

  // A blow: the orb gutters and he jolts up.
  if (!dead && cur?.kind === 'hit' && cur !== st.lastHit) { st.lastHit = cur; st.gutter = 1; st.jolt = 1; }
  st.gutter = st.gutter > SNAP ? st.gutter * Math.exp(-3 * dt) : 0;
  st.jolt = st.jolt > SNAP ? st.jolt * Math.exp(-4 * dt) : 0;

  // The cast, for any attack.
  const atk = !dead && cur?.kind === 'attack' && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
  const c = atk ? castCurve(q.u ?? 0) : {raise: 0, thrust: 0, flare: 0};

  const w = st.life, T = st.T + st.phase;
  // the float: hover, bob, glide lift and the jolt
  const bob = BOB * (Math.sin(T * BOB_HZ * TAU) * .7 + Math.sin(T * BOB_HZ * 2.3 * TAU) * .3);
  offset(st, a.body, 'position', 'y', (HOVER + bob + GLIDE_LIFT * st.glide + JOLT * st.jolt * Math.sin(Math.min(st.jolt, 1) * Math.PI)) * w);
  offset(st, a.body, 'rotation', 'z', (SWAY * Math.sin(T * BOB_HZ * .7 * TAU) + JOLT_SWAY * st.jolt * Math.sin(st.T * 5 * TAU)) * w);
  offset(st, a.body, 'rotation', 'x', (GLIDE_LEAN * st.glide + SWAY * .6 * Math.sin(T * BOB_HZ * .5 * TAU + 1) + CAST_LEAN * c.thrust) * w);
  // the head follows the hero and juts into the cast
  offset(st, a.head, 'rotation', 'y', st.turn * w);
  offset(st, a.head, 'rotation', 'x', JUT * c.thrust * w);
  // the staff arm: tips the orb at the hero, raised and thrust in the cast
  offset(st, a.arm, 'rotation', 'x', (-STAFF_TIP * st.tip * (1 - c.raise - c.thrust) + RAISE * c.raise + THRUST * c.thrust) * w);

  // The orb, set outright from its resting glow (nothing else writes it). Stone leaves it be.
  if (!a.stone) {
    const throb = (THROB + (THROB_NEAR - THROB) * st.near) * (Math.sin(T * (.6 + .9 * st.near) * TAU) * .65 + Math.sin(T * 1.7 * TAU) * .35);
    const glow = (1 + throb + NEAR_BRIGHT * st.near + GATHER * gather + CAST * c.flare) * (1 - GUTTER * st.gutter);
    orb.material.emissiveIntensity = st.orb.base * (1 + (glow - 1) * w);
    orb.scale.setScalar(st.orb.scale * (1 + (GATHER_SWELL * gather + CAST_SWELL * c.flare - .25 * st.gutter) * w));
  }
  return st;
}
