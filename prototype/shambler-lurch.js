// The shambling horror (creatures.js shamblingHorror): a lopsided mound on a club foot and a thin,
// back-bent shank, with one huge digging claw and one withered, too-long arm.
//  - It never holds still: the mound heaves unevenly, and it lists slowly toward the club foot.
//  - It shambles: each step it drops hard onto the club foot and only half rises off the thin one,
//    pitched forward, while the digging claw drags behind, catching on the floor, and the withered
//    arm hangs out in front, swinging loose. The head lolls with every lurch.
//  - Every SPASM_MIN..+SPASM_SPAN s a spasm runs through it: the mound jerks over, the head snaps up
//    and across then droops back, the withered arm jerks up with its fingers trembling.
//  - With the hero within RANGE tiles the lolling head creeps round to them, and now and then the
//    withered arm slowly reaches out for them, trembling, and draws back.
//  - It attacks with the claw: heaved up high and out over the head as the mound rears and twists
//    away, slammed down into the floor in front as it lurches through, then raked back past its side.
//  - A blow: the lumps quiver, the head snaps back and a hard spasm takes it.
//  - Death: everything eases back to rest. Turned to stone (`a.stone`): it holds.
// Handles used: body, tail (the head; tail-sway.js keeps its loll), digArm, limpArm. No extra draws.

const TAU = Math.PI * 2;
export const RANGE = 5;
// The heave (body scale) and its rate (rad/s), the slow list toward the club foot (rad).
export const HEAVE = .025, HEAVE_RATE = 1.3, LIST = .035;
// The shamble: the drop onto the club foot and the lesser rise off the thin one (roll), the forward
// pitch, the claw drag (x, plus a catch on each step) and the withered arm's hang and swing.
export const WALK = {club: .11, thin: .04, pitch: .13, yaw: .05, drag: .32, catch: .08, hang: -.3, swing: .12, loll: .1, dip: .1};
// Spasms: gap and length (s), the jerk, the head snap and the arm jerk (rad), and the tremble (Hz).
export const SPASM_MIN = 4, SPASM_SPAN = 5, SPASM_LEN = .9, SPASM_ROLL = .1, SPASM_HEAD = .35, SPASM_ARM = -.7, TREMBLE_HZ = 9;
// The reach for the hero: gap and length (s), the arm raise (rad) and the lean; the head's creep.
export const REACH_MIN = 3, REACH_SPAN = 4, REACH_LEN = 2.4, REACH_X = -1.1, REACH_LEAN = .06, LOOK_TURN = .8, LOOK_RATE = 1.6;
// The claw slam: raised (x, out), slammed (x, out), raked back (x); the mound's coil, whip, rear,
// lurch and drop; the head's lift and drop; the withered arm's flail.
export const SLAM = {raiseX: -2.6, raiseOut: -.35, slamX: -.7, slamOut: .1, dragX: .35, coil: -.3, whip: .35,
  rear: -.1, lurch: .25, rake: .12, drop: .06, headUp: -.2, headDown: .3, flailX: -.5, flailOut: .4};
// The blow's quiver (scale) and its rate (Hz), and the head snapped back (rad).
export const QUIVER = .05, QUIVER_HZ = 11, SNAP_BACK = -.35;
export const REST_RATE = 3;
const SNAP = 1e-3;

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const clamp01 = v => clamp(v, 0, 1);
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export const isShambler = a => !!(a && !a.asset && a.kind === 'shambling horror' && a.g && a.body && a.tail && a.digArm && a.limpArm);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// The slam over action progress u: heave the claw up, slam it down, rake it back. 0..1 weights.
export function slamCurve(u) {
  if (!(u > 0) || !(u < 1)) return {raise: 0, slam: 0, drag: 0};
  // the claw lands about u .44, where the generic monster strike lands (monster-attacks.js)
  const up = smooth(u / .32), strike = smooth((u - .3) / .16), toDrag = smooth((u - .54) / .18), back = 1 - smooth((u - .72) / .28);
  return {raise: up * (1 - strike), slam: strike * (1 - toDrag), drag: toDrag * back};
}

// A spasm's envelope over its progress v: a sharp jerk, then easing off.
export const spasmCurve = v => !(v > 0) || !(v < 1) ? 0 : smooth(v / .08) * (1 - smooth((v - .2) / .8));
// A reach over its progress v: slowly out, held trembling, drawn back.
export const reachCurve = v => !(v > 0) || !(v < 1) ? 0 : smooth(v / .45) * (1 - smooth((v - .7) / .3));

function setup(a) {
  const seed = ((a.g.id ?? 1) * 69621) % 2147483647 || 1;
  const st = {seed, life: 1, T: 0, ph: 0, heave: 0, walk: 0, off: new Map(), look: 0,
    spasm: null, spasmWait: 0, reach: null, reachWait: 0, quiver: 0, lastHit: null};
  st.spasmWait = SPASM_MIN + SPASM_SPAN * rand(st);
  st.reachWait = REACH_MIN + REACH_SPAN * rand(st);
  st.phase = rand(st) * TAU;
  return st;
}

// An offset on obj[prop][axis] taken back next frame, unless someone has rewritten it since (live.js
// rewrites the body's height and the head's roll every frame; then the offset is simply added fresh).
// The match has a tolerance: actions.js adds its pose after us and takes it back before us.
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

// Call once a frame (fidget.js does). `busy` is true while it moves or acts, `walking` while it
// moves; `look` is the hero's position (same parent as actor.g). Returns the state, or null.
export function updateShamblerLurch(a, dt, t, busy, look = null, walking = false) {
  if (!isShambler(a)) return null;
  const st = a.shamblerLurch || (a.shamblerLurch = setup(a));
  dt = a.stone ? 0 : Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.T += dt;
  // the stride, in step with live.js's leg swing (t·22); held while stone
  if (dt > 0 && Number.isFinite(t)) st.ph = t * 22;
  const q = a.actions, cur = q?.current, dead = !!q?.dead;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  const live = !dead && !a.stone;
  st.walk = approach(st.walk, walking && live ? 1 : 0, 6, dt);
  if (st.walk < SNAP && !walking) st.walk = 0;

  const h = sense(a, look), near = !!(h && h.d <= RANGE) && live;
  st.look = approach(st.look, near ? clamp(h.b, -LOOK_TURN, LOOK_TURN) : 0, near ? LOOK_RATE : REST_RATE, dt);
  st.heave += dt * HEAVE_RATE * (near ? 1.5 : 1);

  // A blow: the lumps quiver, the head snaps back, a hard spasm.
  if (!dead && cur?.kind === 'hit' && cur !== st.lastHit) {
    st.lastHit = cur;
    st.quiver = 1;
    st.spasm = {v: 0, dir: rand(st) < .5 ? -1 : 1, k: 1.4};
  }
  st.quiver = st.quiver > SNAP ? st.quiver * Math.exp(-4 * dt) : 0;
  if (live && !st.spasm) {
    st.spasmWait -= dt;
    if (st.spasmWait <= 0) { st.spasm = {v: 0, dir: rand(st) < .5 ? -1 : 1, k: 1}; st.spasmWait = SPASM_MIN + SPASM_SPAN * rand(st); }
  }
  let spasm = 0;
  if (st.spasm) {
    st.spasm.v += dt / SPASM_LEN;
    spasm = spasmCurve(st.spasm.v) * st.spasm.k;
    if (st.spasm.v >= 1) st.spasm = null;
  }
  // The reach for the hero, only while it stands near them.
  if (near && !busy && !st.reach) {
    st.reachWait -= dt;
    if (st.reachWait <= 0) { st.reach = {v: 0}; st.reachWait = REACH_MIN + REACH_SPAN * rand(st); }
  }
  let reach = 0;
  if (st.reach) {
    // walking, acting or losing sight of the hero draws the arm back quickly
    st.reach.v += dt / REACH_LEN * (near && !busy ? 1 : 4);
    if (!(near && !busy) && st.reach.v < .7) st.reach.v = .7;
    reach = reachCurve(st.reach.v);
    if (st.reach.v >= 1) st.reach = null;
  }

  const atk = !dead && cur?.kind === 'attack' && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
  const s = atk ? slamCurve(q.u ?? 0) : {raise: 0, slam: 0, drag: 0};

  const w = st.life, k = st.walk, sd = st.spasm?.dir ?? 1, T = st.T;
  const step = Math.sin(st.ph), half = Math.sin(st.ph / 2);
  const tremble = Math.sin(T * TREMBLE_HZ * TAU), quiv = st.quiver * QUIVER * Math.sin(T * QUIVER_HZ * TAU);
  const heave = HEAVE * (Math.sin(st.heave + st.phase) * .7 + Math.sin(st.heave * 2.3 + st.phase * 1.7) * .3);
  // The mound: heave and quiver; the list, the shamble's lurch and the spasm's jerk; the slam's twist and lurch.
  offset(st, a.body, 'scale', 'y', (heave + quiv) * w);
  offset(st, a.body, 'scale', 'x', (-heave * .5 - quiv * .8) * w);
  offset(st, a.body, 'scale', 'z', (-heave * .5 + quiv * .6) * w);
  const lurch = WALK.club * Math.sqrt(Math.max(0, step)) - WALK.thin * Math.max(0, -step);
  offset(st, a.body, 'rotation', 'z', (LIST * (.6 + .4 * Math.sin(T * .5 + st.phase)) + lurch * k + SPASM_ROLL * spasm * sd) * w);
  offset(st, a.body, 'rotation', 'x', (WALK.pitch * k - .06 * spasm + REACH_LEAN * reach
    + SLAM.rear * s.raise + SLAM.lurch * s.slam + SLAM.rake * s.drag) * w);
  offset(st, a.body, 'rotation', 'y', (WALK.yaw * half * k + .25 * st.look * (1 - k) + SLAM.coil * s.raise + SLAM.whip * (s.slam + s.drag * .5)) * w);
  offset(st, a.body, 'position', 'y', (-SLAM.drop * s.slam) * w);
  // The head: creeps round to the hero, lolls with each lurch, snaps in a spasm or a blow, lifts and drops with the slam.
  offset(st, a.tail, 'rotation', 'y', (st.look * (1 - .5 * (s.raise + s.slam))) * w);
  offset(st, a.tail, 'rotation', 'z', (WALK.loll * step * k + SPASM_HEAD * spasm * sd * -1 + .04 * spasm * tremble) * w);
  offset(st, a.tail, 'rotation', 'x', (WALK.dip * k - SPASM_HEAD * .7 * spasm + SNAP_BACK * st.quiver
    + SLAM.headUp * s.raise + SLAM.headDown * s.slam) * w);
  // The claw: dragged behind, catching on each step; twitches in a spasm; heaved, slammed and raked.
  offset(st, a.digArm, 'rotation', 'x', ((WALK.drag + WALK.catch * Math.abs(step)) * k * (1 - s.raise - s.slam)
    + .15 * spasm * tremble + SLAM.raiseX * s.raise + SLAM.slamX * s.slam + SLAM.dragX * s.drag) * w);
  offset(st, a.digArm, 'rotation', 'z', (SLAM.raiseOut * s.raise + SLAM.slamOut * s.slam) * w);
  // The withered arm: hangs out in front and swings while it walks, jerks in a spasm, reaches for the
  // hero trembling, flails at a slam or a blow.
  offset(st, a.limpArm, 'rotation', 'x', ((WALK.hang + WALK.swing * half) * k + SPASM_ARM * spasm + REACH_X * reach
    + (.05 * reach + .08 * spasm) * tremble + SLAM.flailX * s.slam - .4 * st.quiver * Math.sin(T * 7 * TAU)) * w);
  offset(st, a.limpArm, 'rotation', 'z', (SLAM.flailOut * s.slam + .2 * spasm + .15 * st.quiver) * w);
  return st;
}
