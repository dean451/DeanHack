import * as THREE from 'three';
import {updateGlance} from './glance.js';
import {updateHezrouGurgle} from './hezrou-gurgle.js';
import {updateHezrouSlime} from './hezrou-slime.js';
import {updateJellyFrost} from './jelly-frost.js';
import {updateAcidFizz} from './acid-fizz.js';
import {updateMoldFrost} from './mold-frost.js';
import {updateSporePuff} from './spore-puff.js';
import {updatePuddingHeave} from './pudding-heave.js';
import {updateLichChill} from './lich-chill.js';
import {updateGhostDrift} from './ghost-drift.js';
import {updateWraithPull} from './wraith-pull.js';
import {updateVampireSweep} from './vampire-sweep.js';
import {updateTrollKnit} from './troll-knit.js';
import {updateLeprechaunCoin} from './leprechaun-coin.js';
import {updateNymphBeckon} from './nymph-beckon.js';
import {updateElementalRoil} from './elemental-roil.js';
import {updateSpherePulse} from './sphere-pulse.js';
import {updateLightFlare} from './light-flare.js';
import {updateRustFeel} from './rust-feel.js';
import {updateBatJitter} from './bat-jitter.js';
import {updateAntJaws} from './ant-jaws.js';

// Idle fidgets for the small folk (motion queue item 8, part 2). A gnome, hobbit or dwarf that
// has stood still for a few seconds now and then does something in character: gnomes look
// around (a twist left, a twist right, back), hobbits reach up and scratch their heads, and
// dwarves plant the pick head-down in front of them and lean on it for a while. Dwarf kings
// (no pick) and some hobbit turns look around instead.
//
// Runs right after gait.js, which writes the body, arms and pick absolutely from their rest
// pose every frame, so the fidget only adds on top and can never drift. The one thing it owns
// outright is the legs' position, which it writes every frame (and it counter-turns their
// rotation) so the feet stay planted while the body turns and tilts above them. Walking, an action, or death fades a
// fidget out within ~0.1 s.

export const FIDGETS = {
  // len: seconds; the pose is described by fidgetPose()
  look: {len: 2.6},
  scratch: {len: 2.3},
  lean: {len: 4.2},
};

// First fidget after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 2, FIRST_SPAN = 4, GAP_MIN = 4, GAP_SPAN = 5;
const FADE_OUT = 14, SNAP = 1e-3;

// The dwarf's pick, planted head-down on the floor in front-left, with its butt under the left
// hand (arm raised forward by LEAN_ARM). Euler angles are lerped from the rest pose, so the head
// swings forward and down, away from the body.
export const PICK_PLANT = {pos: new THREE.Vector3(-.3, .66, .37), rot: new THREE.Euler(Math.PI - .12, 0, .05)};
export const LEAN_ARM = -1.35;
// The hobbit's scratching arm (the right, +x) swings out and up over the shoulder to the crown.
export const SCRATCH_ARM = {x: .1, z: 3.5};
// Models with a `head` (gnomes, hobbits): while looking around, the head turns HEAD_LEAD further
// than the body and runs LEAD_AHEAD of it in the fidget's progress, so the eyes go first and the
// body follows, and the head is already home as the body settles. While scratching, the head
// tilts SCRATCH_TILT into the hand.
export const HEAD_LEAD = .55, LEAD_AHEAD = .07, SCRATCH_TILT = .16;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const kindOf = a => { const k = a?.quirk; return k === 'gnome' || k === 'hobbit' || k === 'dwarf' ? k : null; };

// Which fidgets a small-folk actor can do.
export function fidgetsFor(actor) {
  const k = kindOf(actor);
  if (k === 'gnome') return ['look'];
  if (k === 'hobbit') return ['scratch', 'scratch', 'look'];
  if (k === 'dwarf') return actor.pick ? ['lean', 'lean', 'look'] : ['look'];
  return [];
}

// The fidget's offsets at progress u (0..1), time t (s), scaled by f (0..1).
export function fidgetPose(kind, u, t = 0, f = 1) {
  const p = {yaw: 0, roll: 0, lean: 0, bob: 0, arms: [[0, 0], [0, 0]], pick: 0, headYaw: 0, headRoll: 0};
  if (!(f > 0) || !FIDGETS[kind]) return p;
  if (kind === 'look') {
    // turn left, hold, sweep right, hold, back
    const A = .42, look = v => A * (smooth(v / .2) - 2 * smooth((v - .4) / .2) + smooth((v - .8) / .2));
    p.yaw = look(u) * f;
    p.roll = -.04 * p.yaw / A * Math.abs(p.yaw / A) * f;
    // the head's own turn on top of the body's, a step ahead of it; the lead eases in from 0 so
    // the head doesn't jump on the first frame, and look(>=1) is 0 so it's home first
    p.headYaw = HEAD_LEAD * look(u + LEAD_AHEAD * smooth(u / LEAD_AHEAD)) * f;
  } else if (kind === 'scratch') {
    const e = (smooth(u / .25) - smooth((u - .75) / .25)) * f;
    const rub = smooth((u - .22) / .08) * (1 - smooth((u - .7) / .08));
    p.arms[1] = [SCRATCH_ARM.x * e + .1 * rub * Math.sin(t * 19) * f, SCRATCH_ARM.z * e + .12 * rub * Math.sin(t * 19 + 1.2) * f];
    p.roll = -.06 * e;
    p.lean = .04 * e;
    p.yaw = .12 * e;
    // leaning the head over into the right hand (+x): a negative roll tips the crown that way
    p.headRoll = -SCRATCH_TILT * e;
  } else if (kind === 'lean') {
    const e = (smooth(u / .2) - smooth((u - .8) / .2)) * f;
    p.pick = e;
    p.arms[0] = [LEAN_ARM * e, .1 * e];
    p.roll = .05 * e;
    p.lean = .06 * e;
    // a slow, contented breath while leaning
    p.bob = .008 * e * Math.sin(t * 2.1);
  }
  return p;
}

// Small deterministic PRNG per actor, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

const tmpQ = new THREE.Quaternion(), tmpQi = new THREE.Quaternion(), tmpE = new THREE.Euler();

// Call once per frame right after updateGait. `busy` is true while the actor walks or has an
// action playing or queued. Returns the current fidget state ({kind, f}) or null.
export function updateFidget(actor, dt, t, busy, look = null) {
  // The evil eye's darting glances ride on this per-frame call (see glance.js); `look` is the hero.
  updateGlance(actor, dt, t, busy, look);
  // So do the hezrou's drool, throat sac and gurgle (hezrou-gurgle.js); busy without an action is walking.
  const walking = busy && !actor.actions?.current && !actor.actions?.queue?.length;
  updateHezrouGurgle(actor, dt, t, busy, walking);
  // And what drips off it: slime gobs, the puddle under it and its stench haze (hezrou-slime.js).
  updateHezrouSlime(actor, dt, t, busy, walking);
  // And the blue jelly's frost, mist, glints and shiver (jelly-frost.js).
  updateJellyFrost(actor, dt, t, busy, walking);
  // And the ochre and spotted jellies' acid: etch, bubbles, fumes, seethe and spatter (acid-fizz.js).
  updateAcidFizz(actor, dt, t, busy, walking);
  // And the brown mold's cold: breath, sinking mist, sighs of freezing fog, glints and a frost burst (mold-frost.js).
  updateMoldFrost(actor, dt, t, busy);
  // And the yellow mold's spores: breath, a hanging pall, coughing puffs and a blast at a blow (spore-puff.js).
  updateSporePuff(actor, dt, t, busy);
  // And the puddings' heave: rolling lumps, groping lobes, a sink-and-surge lurch and a straining bud at a blow (pudding-heave.js).
  updatePuddingHeave(actor, dt, t, busy, walking);
  // And the liches' cold: flexing claws, a slow grasp that wrings in cold motes, a breathing orb and a cast (lich-chill.js).
  updateLichChill(actor, dt, t, busy);
  // And the ghosts' drift: a swaying, smoking shroud, limp sleeves, a head that follows the hero and a drain (ghost-drift.js).
  updateGhostDrift(actor, dt, t, busy, look);
  // And the wraiths' pull: sinking hem smoke, twitching claws, a snapping head and a hauled thread of life (wraith-pull.js).
  updateWraithPull(actor, dt, t, busy, look);
  // And the vampires' feed: a trailing, breathing cape, a cold breath and the cape sweep (vampire-sweep.js).
  updateVampireSweep(actor, dt, t, busy, look);
  // And the trolls' knitting wounds: heavy breath, sniffs, a gash laced shut after a blow and an overhead slam (troll-knit.js).
  updateTrollKnit(actor, dt, t, busy, look);
  // And the leprechaun's coin flip: a cocked leer, a coin thumbed high and snatched (or palmed) and a hat that hops at a blow (leprechaun-coin.js).
  updateLeprechaunCoin(actor, dt, t, busy, look);
  // And the nymph's beckon: a coy sidelong look, a crooked finger luring you in, an amulet twirled to tease and a snatch (nymph-beckon.js).
  updateNymphBeckon(actor, dt, t, busy, look);
  // And the elementals' roil: a dust devil, a heat shimmer, falling grit or a slosh, with a surge now and then (elemental-roil.js).
  updateElementalRoil(actor, dt, t, busy, look);
  // And the spheres' pulse: gas spores and flaming, freezing and shocking spheres throb faster as the hero nears (sphere-pulse.js).
  updateSpherePulse(actor, dt, t, busy, look);
  // And the lights' flare: a yellow light gutters and glares, a black one drinks its motes in, both leaning toward the hero (light-flare.js).
  updateLightFlare(actor, dt, t, busy, look);
  // And the rust monsters' feelers: questing jerks, pointing at the hero, tasting the floor and the rust-touch lash (rust-feel.js).
  updateRustFeel(actor, dt, t, busy, look, walking);
  // And the bats' jitter: flitting darts, a swoop now and then, feints at the hero and a tumble at a blow (bat-jitter.js).
  updateBatJitter(actor, dt, t, busy, look);
  // And the ants' jaws: trembling, clacking mandibles, a head that ticks round, a threat gape at the hero and a snapping bite (ant-jaws.js).
  updateAntJaws(actor, dt, t, busy, look, walking);
  const list = fidgetsFor(actor);
  if (!list.length || actor.asset || !actor.body) return null;
  const st = actor.fidget || (actor.fidget = {
    seed: ((actor.g?.id ?? 1) * 7919) % 2147483647 || 1, wait: 0, cur: null, f: 0,
    legRest: actor.legs.map(l => ({pos: l.position.clone(), ry: l.rotation.y, rz: l.rotation.z, base: l.quaternion.clone(), out: null})),
  });
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Math.max(0, dt);
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    if (still) { st.cur.u += dt / FIDGETS[st.cur.kind].len; st.f = 1; }
    else { st.f = st.f * Math.exp(-FADE_OUT * dt); if (st.f < SNAP) st.f = 0; }
    if (st.cur.u >= 1 || !(st.f > 0)) { st.cur = null; st.f = 0; st.wait = (still ? GAP_MIN + GAP_SPAN * rand(st) : FIRST_MIN + FIRST_SPAN * rand(st)); }
  } else if (still) {
    st.wait -= dt;
    if (st.wait <= 0) { st.cur = {kind: list[Math.floor(rand(st) * list.length)], u: 0}; st.f = 1; st.wait = 0; }
  } else st.wait = Math.max(st.wait, FIRST_MIN);

  const p = st.cur ? fidgetPose(st.cur.kind, Math.min(1, st.cur.u), t, st.f) : fidgetPose(null);
  apply(actor, st, p);
  return st.cur ? {kind: st.cur.kind, f: st.f, u: st.cur.u, pose: p} : null;
}

function apply(actor, st, p) {
  const body = actor.body;
  // The head's turn is an offset taken back each frame (actions.js pitches it after us and takes
  // that back the same way), so it never drifts.
  const head = actor.head, h = st.head || (st.head = {yaw: 0, roll: 0});
  if (head) {
    head.rotation.y += p.headYaw - h.yaw; head.rotation.z += p.headRoll - h.roll;
    h.yaw = p.headYaw; h.roll = p.headRoll;
  }
  tmpQ.setFromEuler(tmpE.set(p.lean, p.yaw, p.roll, 'YXZ'));
  if (p.yaw || p.roll || p.lean) body.quaternion.multiply(tmpQ);
  body.position.y += p.bob;
  // Undo that turn, tilt and breath on the legs, so the feet stay planted under the body.
  tmpQi.copy(tmpQ).invert();
  actor.legs.forEach((l, i) => {
    const r = st.legRest[i];
    if (!r) return;
    l.position.copy(r.pos).applyQuaternion(tmpQi);
    l.position.y -= p.bob;
    // The frame loop writes only rotation.x (the stride); if nobody rewrote it since our last
    // counter-turn, start again from the stride we saw then.
    if (r.out && l.quaternion.equals(r.out)) l.quaternion.copy(r.base);
    else { l.rotation.set(l.rotation.x, r.ry, r.rz); r.base.copy(l.quaternion); }
    if (p.yaw || p.roll || p.lean) l.quaternion.premultiply(tmpQi);
    (r.out || (r.out = new THREE.Quaternion())).copy(l.quaternion);
  });
  (actor.arms || []).forEach((arm, i) => {
    const [x, z] = p.arms[i] || [0, 0];
    if (x || z) arm.quaternion.multiply(tmpQ.setFromEuler(tmpE.set(x, 0, z)));
  });
  const rest = actor.pick && actor.gait?.rest.get(actor.pick);
  if (rest && p.pick > 0) {
    const k = p.pick;
    actor.pick.position.lerp(PICK_PLANT.pos, k);
    tmpE.setFromQuaternion(rest.quat);
    tmpE.set(tmpE.x + (PICK_PLANT.rot.x - tmpE.x) * k, tmpE.y + (PICK_PLANT.rot.y - tmpE.y) * k, tmpE.z + (PICK_PLANT.rot.z - tmpE.z) * k);
    actor.pick.quaternion.setFromEuler(tmpE);
  }
}
