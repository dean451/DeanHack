// The nymph's beckon (creature animation queue item 7). A fae thief who lures you in close
// enough to rob you.
//  - At rest her head turns to hold a coy, tilted, sidelong look on the hero (within RANGE
//    tiles) and her shoulders turn a little after it; out of range her gaze drifts. The stolen
//    amulet swings from her fingertips and its gem glints, and the ring of motes around her
//    turns slowly, rocking and bobbing.
//  - Now and then she beckons: the belt hand lifts out toward you, palm up, and she crooks her
//    fingers CURLS times (a quick curl, a slow uncurl), leaning back with her head cocked,
//    while the motes swirl out in front of her.
//  - One turn in TEASE_ODDS she teases instead: she twirls the amulet on its chain so it spins
//    and flares, glancing down at it and back up at you.
//  - When she attacks (to steal) the hand darts out and snatches shut; when she's hit she
//    flinches back with her head snapped away and the hand drops.
//  - On death everything eases back to rest.
//
// Matched on the model's `nymph` flag (creatures.js gives it `head`, `beckonArm`, `beckonHand`,
// `bauble`, `baubleGem` and the `motes` ring). It owns the body's x and y rotation (live.js sways
// its z), the head's, arm's, hand's and amulet's rotation and the motes ring's transform, all written
// absolutely from the rest pose every frame; actions.js adds its attack nod afterwards. No new
// draws.
import * as THREE from 'three';

const TAU = Math.PI * 2;
// Hero tracking: range (tiles), head turn limit and rate (1/s), and the coy tilt (roll, rad).
export const RANGE = 6, HEAD_YAW = .8, HEAD_RATE = 4, COY = .16;
// Turns: first after FIRST_MIN..+FIRST_SPAN s, then GAP_MIN..+GAP_SPAN apart; TURN_LEN s long.
export const FIRST_MIN = 2, FIRST_SPAN = 3, GAP_MIN = 4, GAP_SPAN = 5, TURN_LEN = 3, TEASE_ODDS = 3;
// The beckon: the arm's lift (x, forward is negative) and spread (z), the finger curl and count.
export const LIFT = -1.05, SPREAD = .3, CURL = -1.1, CURLS = 3;
// The amulet: idle swing (rad), twirl spin (rad/s) and the gem's glow (base, peak).
export const SWING = .12, TWIRL = 14, GLOW = 1.4, FLARE = 3.6;
// Motes: orbit rate (rad/s), bob and the swirl out in front during the beckon.
export const ORBIT = .45, BOB = .04, SWIRL = .14;
// The attack's dart and snatch, and the hit's flinch.
export const DART = -1.35, LUNGE = .14, FLINCH = -.14, HIT_LEN = .6;
export const REST_RATE = 2.5;
const SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const clamp = (v, m) => v < -m ? -m : v > m ? m : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export const beckons = a => !!(a && !a.asset && a.nymph && a.body && a.head && a.beckonArm && a.beckonHand && a.bauble);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// A turn at progress u (0..1): {reach, curl, twirl}. The reach eases in over the first fifth and
// out over the last; between, the fingers crook CURLS times, each a quick curl and slow uncurl.
// A tease uses the same envelope for its twirl instead.
export function turnPose(u, tease = false) {
  const z = {reach: 0, curl: 0, twirl: 0};
  if (!(u > 0) || !(u < 1)) return z;
  const e = smooth(u / .2) * (1 - smooth((u - .8) / .2));
  if (tease) { z.twirl = e; return z; }
  z.reach = e;
  const c = (u - .25) / .5;
  if (c > 0 && c < 1) {
    const k = (c * CURLS) % 1;
    z.curl = k < .3 ? smooth(k / .3) : 1 - smooth((k - .3) / .7);
  }
  return z;
}

const rot = o => ({x: o.rotation.x, y: o.rotation.y, z: o.rotation.z});
function setup(a) {
  const st = {seed: ((a.g?.id ?? 1) * 48271) % 2147483647 || 1, t: 0, life: 1, turn: null, wait: 0, aim: 0, hit: -1, lastHit: null,
    spin: 0, orb: 0, body: rot(a.body), head: rot(a.head), arm: rot(a.beckonArm), hand: a.beckonHand.quaternion.clone(), bauble: rot(a.bauble),
    glow: a.baubleGem?.material?.emissiveIntensity ?? GLOW, ring: rot(a.motes || a.body), ringAt: (a.motes || a.body).position.clone()};
  st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  st.ph = rand(st) * TAU;
  // her own gem material, so its flare doesn't touch another nymph's
  if (a.baubleGem?.material) a.baubleGem.material = a.baubleGem.material.clone();
  return st;
}

function current(a, kind) {
  const q = a.actions, cur = q?.current;
  return cur?.kind === kind && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
}

// The hero's bearing relative to her facing, or null when out of range.
function bearing(a, look) {
  const g = a.g;
  if (!g || !look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return null;
  const dx = look.x - g.position.x, dz = look.z - g.position.z, d = Math.hypot(dx, dz);
  if (!(d > 1e-3) || d > RANGE) return null;
  return wrap(Math.atan2(dx, dz) - g.rotation.y);
}

const tmpQ = new THREE.Quaternion(), zAxis = new THREE.Vector3(0, 0, 1);
// Call once a frame (fidget.js does). `busy` holds off a turn while she moves or acts; `look` is
// the hero's position (same parent as actor.g), or null.
export function updateNymphBeckon(a, dt, t, busy, look = null) {
  if (!beckons(a)) return null;
  const st = a.nymphBeckon || (a.nymphBeckon = setup(a));
  const dead = !!a.actions?.dead;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.t += dt;
  const T = st.t, ph = st.ph;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  const w = st.life;

  // a blow: she flinches back, head snapped away, and the hand drops
  const hit = dead ? null : a.actions?.current?.kind === 'hit' ? a.actions.current : null;
  if (hit && hit !== st.lastHit) { st.lastHit = hit; st.hit = 0; st.turn = null; }
  if (st.hit >= 0) { st.hit += dt / HIT_LEN; if (st.hit >= 1) st.hit = -1; }
  const flinch = st.hit < 0 ? 0 : Math.sin(Math.min(1, st.hit * 3) * Math.PI / 2) * (1 - smooth((st.hit - .3) / .7));

  // the attack: the hand darts out and snatches shut; it drops any turn
  const atk = dead ? null : current(a, 'attack');
  if (atk) st.turn = null;
  const au = atk ? a.actions.u ?? 0 : 0, dart = atk ? smooth(au / .25) * (1 - smooth((au - .55) / .45)) : 0;
  const snatch = atk ? smooth((au - .3) / .1) * (1 - smooth((au - .7) / .3)) : 0;

  // beckons and teases on their own clock, only while she stands still
  if (st.turn) {
    st.turn.u += dt / TURN_LEN;
    if (st.turn.u >= 1) st.turn = null;
  } else if (!dead) {
    st.wait -= dt;
    if (st.wait <= 0 && !busy) { st.turn = {u: 0, tease: rand(st) * TEASE_ODDS < 1}; st.wait = GAP_MIN + GAP_SPAN * rand(st); }
  }
  if (dead) st.turn = null;
  const p = turnPose(st.turn ? st.turn.u : 0, !!st.turn?.tease);

  // the head: a coy sidelong look at the hero, cocked further while she beckons; a glance down
  // at the twirling amulet halfway through a tease
  const b = dead ? null : bearing(a, look);
  st.aim = approach(st.aim, b == null ? .3 * Math.sin(T * .19 + ph) : clamp(b, HEAD_YAW), HEAD_RATE, dt);
  const glance = p.twirl * Math.sin(clamp01((st.turn?.u ?? 0) * 1.6 - .3) * Math.PI);
  const coy = COY * (b == null ? .4 : 1) * Math.sign(st.aim || 1);
  a.head.rotation.x = st.head.x + (.28 * glance - .05 * p.reach - .18 * flinch + .06 * dart) * w;
  a.head.rotation.y = st.head.y + (st.aim * (1 - .6 * glance) - .2 * glance - .45 * flinch * Math.sign(st.aim || 1)) * w;
  a.head.rotation.z = st.head.z + (coy * (1 + .8 * p.reach) + .06 * Math.sin(T * .7 + ph) + .2 * flinch) * w;

  // the body: shoulders turn after the look, a slow lean back as she beckons, a lunge to steal
  const breath = Math.sin(T * 1.6 + ph);
  a.body.rotation.x = st.body.x + (.012 * breath - .05 * p.reach + LUNGE * dart + FLINCH * flinch) * w;
  a.body.rotation.y = st.body.y + (.14 * st.aim + .08 * p.reach + .1 * dart) * w;

  // the belt arm: lifted out toward the hero to beckon, darted out to steal, dropped when hit
  const reach = p.reach * (1 - flinch);
  a.beckonArm.rotation.x = st.arm.x + (LIFT * reach + DART * dart + .25 * flinch) * w;
  a.beckonArm.rotation.y = st.arm.y + (-.25 * reach) * w;
  a.beckonArm.rotation.z = st.arm.z + (SPREAD * reach + .1 * dart) * w;
  // the fingers crook toward the palm (about the hand's z), and clench to snatch
  a.beckonHand.quaternion.copy(st.hand).multiply(tmpQ.setFromAxisAngle(zAxis, (CURL * p.curl * reach + 1.3 * CURL * snatch) * w));

  // the amulet: a pendulum swing at rest, a fast twirl on its chain in a tease, the gem glinting
  st.spin += TWIRL * p.twirl * dt;
  a.bauble.rotation.x = st.bauble.x + (SWING * .6 * Math.sin(T * 2.3 + ph) - .25 * flinch) * w;
  a.bauble.rotation.y = st.bauble.y + wrap(st.spin) * w;
  a.bauble.rotation.z = st.bauble.z + (SWING * Math.sin(T * 1.7 + ph * .5) * (1 - p.twirl) + .5 * p.twirl) * w;
  if (a.baubleGem?.material) a.baubleGem.material.emissiveIntensity = st.glow + ((FLARE - st.glow) * p.twirl + .5 * Math.max(0, Math.sin(T * 1.3 + ph)) ** 6) * w;
  // (unwound the short way, so it never whirls a full turn back to rest)
  if (!p.twirl) st.spin = approach(wrap(st.spin), 0, 3, dt);

  // the motes: their ring turns slowly about her and rocks, and swirls out in front of her while
  // she beckons
  st.orb = dead ? approach(wrap(st.orb), 0, REST_RATE, dt) : st.orb + ORBIT * dt;
  if (a.motes) {
    const m = a.motes;
    m.rotation.set(st.ring.x + .08 * Math.sin(T * .9 + ph) * w, st.ring.y + wrap(st.orb) * w, st.ring.z + .06 * Math.sin(T * 1.1 + ph) * w);
    m.position.set(st.ringAt.x, st.ringAt.y + (BOB * Math.sin(T * 1.1 + ph) + .05 * p.reach * Math.sin(T * 3)) * w, st.ringAt.z + SWIRL * p.reach * w);
  }
  return st;
}
