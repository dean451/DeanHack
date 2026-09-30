// Per-actor action layer (motion queue item 3). Combat and death events become short timed
// actions (attack, hit, die) that play in order on an actor, on top of whatever the frame
// loop already does (walk cycle, idle bob, tail swish). Poses are applied as offsets that
// are taken back off before the next frame, so a map frame that moves or turns the actor
// mid-animation never snaps it, and an actor with no actions is left exactly as it was.
//
// Parts are the standard handles: g (root group), body, head, legs[], tail, arm, wrist,
// weaponSocket. Anything missing is skipped. Durations are in seconds.
//
// A weapon attack by an actor with the hero's arm rig (an `elbow`) plays swing.js's arc for
// its blow type instead of the generic arm wave, with its hitstop and longer length.

import {monsterAttackPose, foreLegs, wingSide} from './monster-attacks.js';
import {deathStyle, deathPose, DEATH_TIME, DEATH_BURST_U} from './deaths.js';
import {swingPose, swingPhase, swingLength, swingTrailOn, blowOf, applySwing, clearSwing, CONTACT_U, SWING_TIME} from './swing.js';
import {hitStyle, hitReactionPose, HIT_TIME} from './hit-fx.js';
import {catMove, catSize, catLength, catAttackPose} from './cats.js';
import {jawPose, jawReach} from './jaw.js';
import {risePose, RISE_TIME, RISE_BURST_U} from './rise.js';
import {groundSamples, groundLift, grounds} from './ground.js';
import {centaurAttackPose} from './centaur-attack.js';

export const ACTION_TIME = {attack: .42, hit: .3, die: .9, rise: RISE_TIME};
// Wait no longer than this for a death to play before the map (and its corpse) goes on.
export const MAX_HOLD_MS = 1000;
// When a generic monster attack lands (monster-attacks.js strikes at u≈.44), and the most a
// defender's flinch waits for the blow that causes it.
export const STRIKE_U = .44;
export const MAX_WAIT = .8;
// Where in a cat's move the paws reach the target: the pounce lands, the swipe rakes across.
const CAT_CONTACT_U = {pounce: .58, swipe: .47};

const TAU = Math.PI * 2;
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
// 0 → 1 → 0 over [0,1], peaking at `peak`.
const bump = (u, peak) => u < peak ? smooth(u / peak) : 1 - smooth((u - peak) / (1 - peak));
// Shortest signed angle from a to b.
const turn = (a, b) => { const d = (b - a) % TAU; return d > Math.PI ? d - TAU : d < -Math.PI ? d + TAU : d; };

function unitDir(dir) {
  if (!Array.isArray(dir)) return null;
  const [x, z] = dir, len = Math.hypot(x, z);
  return Number.isFinite(len) && len > 0 ? [x / len, z / len] : null;
}

// Actions for one normalised combat event (combatAction() from combat-events.js), split by
// side: {attacker, defender}, each null when that side gets nothing. A hit makes the defender
// flinch away from the blow in a way that fits it (hit-fx.js); a miss or wild swing only moves
// the attacker. The hero's own weapon hits already spray from swing-fx.js, so they're `sprayed`.
export function actionsForCombat(c) {
  if (!c) return {attacker: null, defender: null};
  const dir = unitDir(c.dir);
  const attacker = c.attacker?.you || c.attacker?.seen
    ? {kind: 'attack', attack: c.attack || 'other', blow: c.blow ?? null, result: c.result, dir,
      target: c.defender?.seen ? c.defender.name ?? null : null} : null;
  const defender = c.result === 'hit' && (c.defender?.you || c.defender?.seen)
    ? {kind: 'hit', dir, attack: c.attack || 'other', blow: c.blow ?? null,
      style: hitStyle(c.attack, c.blow ?? null), sprayed: !!c.attacker?.you && c.attack === 'weapon'} : null;
  return {attacker, defender};
}

export function createActionQueue() {
  return {queue: [], current: null, age: 0, applied: null, dead: false};
}

// Adds an action; a dead actor takes nothing more. Returns whether it was queued.
export function enqueueAction(q, action) {
  if (!q || !action || !ACTION_TIME[action.kind] || q.dead) return false;
  if (action.kind === 'die') q.dead = true;
  q.queue.push({...action, dir: unitDir(action.dir)});
  return true;
}

// Backlogged queues play faster so the actor catches up with the game instead of lagging.
// Whether this actor plays the full swing for this action.
const swings = (actor, a) => a.kind === 'attack' && a.attack === 'weapon' && !!actor?.elbow;
// Seconds an action lasts (a swing is only known to be one once it starts; a death by its style).
// A hit that waits for its blow to land (`wait`) holds still first.
const actionLength = a => a.swing ? swingLength(a.result)
  : a.cat ? catLength(a.cat, a.size)
  : a.kind === 'die' ? DEATH_TIME[a.style] ?? ACTION_TIME.die
  : a.kind === 'hit' ? (a.wait ?? 0) + (HIT_TIME[a.style ?? hitStyle(a.attack, a.blow)] ?? ACTION_TIME.hit) : ACTION_TIME[a.kind];

// Seconds from the start of an attack action until it reaches its target: the blade's contact
// for a swing, the landing for a pounce, the strike for anything else.
export function contactTime(actor, a) {
  if (!a || a.kind !== 'attack') return 0;
  if (swings(actor, a)) return CONTACT_U[blowOf(a.blow)] * SWING_TIME;
  if (a.cat) return catLength(a.cat, a.size) * (CAT_CONTACT_U[a.cat] ?? STRIKE_U);
  return ACTION_TIME.attack * STRIKE_U;
}

const pace = q => Math.min(3, 1 + .5 * Math.max(0, q.queue.length - 1));

// Current state name: the playing action's kind, or 'idle'.
export function actionState(q) {
  return q?.current?.kind ?? (q?.queue[0]?.kind || 'idle');
}

// Seconds of queued and playing actions left, at the current pace.
export function remainingTime(q) {
  if (!q) return 0;
  let s = q.current ? Math.max(0, actionLength(q.current) - q.age) : 0;
  for (const a of q.queue) s += actionLength(a);
  return s / pace(q);
}

// How long (ms) to hold back the next map frame so pending deaths finish first; 0 if none.
export function holdBackMs(queues) {
  let ms = 0;
  for (const q of queues) {
    if (!q?.dead || q.finished) continue;
    ms = Math.max(ms, remainingTime(q) * 1000);
  }
  return Math.min(MAX_HOLD_MS, Math.ceil(ms));
}

// Offsets for one action at normalised time u (0..1). Rotations are radians and positions
// are world units (one tile = 1). `yaw` is the heading to face the target, if there is one.
export function actionPose(action, u, face) {
  const p = {dx: 0, dy: 0, dz: 0, yaw: 0, pitch: 0, roll: 0, body: 0, head: 0, arm: 0, wrist: 0,
    socket: 0, leg: 0, fore: 0, paw: 0, pawSide: 0, tail: 0, wing: 0, jaw: 0, scale: 1, stretch: 1, sx: 1, sy: 1, fade: 1};
  const d = action.dir;
  if (action.kind === 'attack') {
    // Per attack type (monster-attacks.js); the hero's own swing replaces its arm parts later.
    // A cat pounces on prey or swipes a paw (cats.js).
    const m = action.cat ? catAttackPose(action.cat, u, action.result, action.size)
      : monsterAttackPose(action.attack, u, action.result);
    if (d) { p.dx = d[0] * m.lunge; p.dz = d[1] * m.lunge; }
    p.yaw = (face ? face * smooth(u / .2) : 0) + m.twist;
    for (const k of ['dy', 'pitch', 'roll', 'body', 'head', 'arm', 'wrist', 'socket', 'leg', 'fore', 'tail', 'wing', 'scale', 'stretch']) p[k] = m[k];
    if (action.cat) { p.paw = m.paw; p.pawSide = m.pawSide; }
  } else if (action.kind === 'hit') {
    // Flinch by blow (hit-fx.js): raked, doubled over, knocked back, worried, squeezed or shaken.
    const m = hitReactionPose(action.style ?? hitStyle(action.attack, action.blow), u, d);
    for (const k of ['dx', 'dy', 'dz', 'yaw', 'pitch', 'roll', 'body', 'head', 'arm', 'wrist', 'socket', 'leg', 'fore', 'tail', 'wing', 'scale', 'stretch']) p[k] = m[k];
  } else if (action.kind === 'die') {
    // Per class (deaths.js): topple, crumble, splat, dissipate or burst; held at the end.
    const m = deathPose(action.style, u, d);
    for (const k of ['dx', 'dy', 'dz', 'pitch', 'roll', 'head', 'scale', 'sx', 'sy', 'fade']) p[k] = m[k];
    p.yaw = m.spin;
  } else if (action.kind === 'rise') {
    // A corpse getting back up (rise.js): the topple's end pose, played back to standing.
    const m = risePose(u, action.from, action.buried);
    for (const k of ['dx', 'dy', 'dz', 'pitch', 'roll', 'head', 'scale']) p[k] = m[k];
  }
  // The lower jaw, for creatures that have one (jaw.js).
  p.jaw = jawPose(action.kind, action.attack, u, action.result);
  return p;
}

// Takes the previous frame's offsets back off, so the frame loop sees the rest pose.
export function clearActionPose(actor, q) {
  const o = q?.applied;
  if (!o || !actor?.g) return;
  const g = actor.g;
  g.position.x -= o.dx; g.position.y -= o.dy; g.position.z -= o.dz;
  g.rotation.y -= o.yaw; g.rotation.x -= o.pitch; g.rotation.z -= o.roll;
  if (o.scale !== 1) g.scale.multiplyScalar(1 / o.scale);
  if (o.stretch !== 1) { const w = Math.sqrt(o.stretch); g.scale.y /= o.stretch; g.scale.x *= w; g.scale.z *= w; }
  if (o.sx !== 1 || o.sy !== 1) { g.scale.x /= o.sx; g.scale.z /= o.sx; g.scale.y /= o.sy; }
  if (actor.body) actor.body.position.y -= o.body;
  if (actor.head) actor.head.rotation.x -= o.head;
  if (actor.arm) actor.arm.rotation.x -= o.arm;
  if (actor.wrist) actor.wrist.rotation.x -= o.wrist;
  if (actor.weaponSocket) actor.weaponSocket.rotation.z -= o.socket;
  if (actor.legs?.[0]) actor.legs[0].rotation.x -= o.leg;
  if (actor.tail) actor.tail.rotation.x -= o.tail;
  if (o.jaw && actor.jaw) actor.jaw.rotation.x -= o.jaw;
  if (o.grip && actor.weaponSocket) actor.weaponSocket.rotation.x -= o.grip;
  if (o.off && actor.arms?.[0]) actor.arms[0].rotation.x -= o.off;
  if (o.offGrip && actor.offHand) actor.offHand.rotation.x -= o.offGrip;
  if (o.fore) for (const l of foreLegs(actor)) l.rotation.x -= o.fore;
  if (o.paw || o.pawSide) { const l = foreLegs(actor)[0]; if (l) { l.rotation.x -= o.paw; l.rotation.z -= o.pawSide; } }
  if (o.wing) actor.wings?.forEach((w, i) => { w.rotation.z -= wingSide(w, i) * o.wing; });
  if (o.swing) clearSwing(actor, o.swing);
  q.applied = null;
}

function applyPose(actor, q, p) {
  const g = actor.g;
  // Heading first, so the lean and topple are about the actor's own axes.
  if (g.rotation.order !== 'YXZ') g.rotation.reorder('YXZ');
  g.position.x += p.dx; g.position.y += p.dy; g.position.z += p.dz;
  g.rotation.y += p.yaw; g.rotation.x += p.pitch; g.rotation.z += p.roll;
  if (p.scale !== 1) g.scale.multiplyScalar(p.scale);
  if (p.stretch !== 1) { const w = Math.sqrt(p.stretch); g.scale.y *= p.stretch; g.scale.x /= w; g.scale.z /= w; }
  if (p.sx !== 1 || p.sy !== 1) { g.scale.x *= p.sx; g.scale.z *= p.sx; g.scale.y *= p.sy; }
  if (actor.body) actor.body.position.y += p.body;
  if (actor.head) actor.head.rotation.x += p.head;
  if (actor.arm) actor.arm.rotation.x += p.arm;
  if (actor.wrist) actor.wrist.rotation.x += p.wrist;
  if (actor.weaponSocket) actor.weaponSocket.rotation.z += p.socket;
  if (actor.legs?.[0]) actor.legs[0].rotation.x += p.leg;
  if (actor.tail) actor.tail.rotation.x += p.tail;
  if (p.jaw && actor.jaw) actor.jaw.rotation.x += p.jaw;
  if (p.grip && actor.weaponSocket) actor.weaponSocket.rotation.x += p.grip;
  if (p.off && actor.arms?.[0]) actor.arms[0].rotation.x += p.off;
  if (p.offGrip && actor.offHand) actor.offHand.rotation.x += p.offGrip;
  if (p.fore) for (const l of foreLegs(actor)) l.rotation.x += p.fore;
  if (p.paw || p.pawSide) { const l = foreLegs(actor)[0]; if (l) { l.rotation.x += p.paw; l.rotation.z += p.pawSide; } }
  if (p.wing) actor.wings?.forEach((w, i) => { w.rotation.z += wingSide(w, i) * p.wing; });
  if (p.swing) applySwing(actor, p.swing);
  q.applied = p;
}

// Advances the queue by dt seconds and poses the actor. Call once per frame, after the frame
// loop has set the rest pose (and after clearActionPose at the start of the frame). Returns
// the state name. A finished death stays in its last pose; q.finished is set then.
export function updateActions(actor, q, dt) {
  if (!actor?.g || !q) return 'idle';
  if (!q.current && q.queue.length) {
    q.current = q.queue.shift(); q.age = 0; q.face = null;
    if (swings(actor, q.current)) q.current.swing = true;
    // A body that lies down is kept on the floor (ground.js); its points are taken at rest.
    q.ground = grounds(q.current, q.current.style) ? groundSamples(actor.g) : null;
  }
  const a = q.current;
  q.swing = null;
  if (!a) return 'idle';
  const before = q.age;
  q.age += Math.max(0, dt) * pace(q);
  const len = actionLength(a);
  // A swing runs on its own clock (with the hitstop); the body lunge follows the blade.
  const wait = a.wait ?? 0;
  const u = a.swing ? swingPhase(Math.min(q.age, len), a.blow, a.result) : clamp01((q.age - wait) / (len - wait));
  // Heading toward the target is measured once, from the rest pose, when the action starts.
  if (q.face === null) q.face = a.kind === 'attack' && a.dir ? turn(actor.g.rotation.y, Math.atan2(a.dir[0], a.dir[1])) : 0;
  const pose = actionPose(a, u, q.face);
  // Smaller jaws open less (jaw.js).
  if (pose.jaw) pose.jaw *= jawReach(actor);
  // A centaur thrusts its spear, smashes its club or draws its bow (centaur-attack.js).
  if (a.kind === 'attack' && a.attack === 'weapon' && actor.centaur) Object.assign(pose, centaurAttackPose(actor.centaur, u, a.result));
  if (a.swing) {
    pose.arm = pose.wrist = pose.socket = 0;
    pose.swing = swingPose(a.blow, u, a.result);
    // What the renderer needs for the trail and the impact burst. `contact` is true on the one
    // frame the blade reaches a target it hits.
    const tc = CONTACT_U[blowOf(a.blow)] * SWING_TIME;
    q.swing = {blow: blowOf(a.blow), u, trail: swingTrailOn(a.blow, u), dir: a.dir, target: a.target ?? null,
      contact: a.result === 'hit' && before < tc && q.age >= tc};
  }
  const restY = actor.g.position.y;
  applyPose(actor, q, pose);
  if (q.ground) {
    const lift = groundLift(actor.g, q.ground, restY);
    actor.g.position.y += lift; q.applied.dy += lift;
  }
  if (a.kind === 'die') {
    // For the renderer: how opaque the body is, and (once, as it crosses its moment) the
    // death's particle burst.
    q.fade = pose.fade;
    const bu = (DEATH_BURST_U[a.style] ?? .8) * len;
    if (before < bu && q.age >= bu) q.deathBurst = {style: a.style ?? 'topple', dir: a.dir};
  }
  // The grave dust as a risen corpse starts to push itself up.
  if (a.kind === 'rise' && before < RISE_BURST_U * len && q.age >= RISE_BURST_U * len) q.riseBurst = {buried: !!a.buried};
  if (q.age >= len) {
    if (a.kind === 'die') { q.finished = true; return 'die'; }
    // Leave the attacker facing where it struck.
    if (a.kind === 'attack') q.applied.yaw -= q.face;
    q.current = null; q.age = 0;
  }
  return a.kind;
}

// The live actor standing at map cell (x, z). Actors are keyed "x,z:glyph" by the last map
// frame; a monster that stepped and struck in the same turn is still under its old key, so
// fall back to the nearest one within a step and a half (same species when the event names
// one). `origin` turns map cells into the scene coordinates of `a.target`.
export function findActor(actors, x, z, {name = null, origin = {x: 0, z: 0}} = {}) {
  if (!actors || !Number.isFinite(x) || !Number.isFinite(z)) return null;
  const prefix = `${x},${z}:`;
  for (const [key, a] of actors) if (key.startsWith(prefix) && !a.actions?.dead) return a;
  const species = typeof name === 'string' ? name.toLowerCase() : null;
  let best = null, bestD = 1.5;
  for (const a of actors.values()) {
    const p = a.target ?? a.g?.position;
    if (!p || a.actions?.dead || (species && a.species && a.species !== species)) continue;
    const d = Math.hypot(p.x + origin.x - x, p.z + origin.z - z);
    if (d < bestD) { bestD = d; best = a; }
  }
  return best;
}

const queueOf = actor => actor ? (actor.actions ??= createActionQueue()) : null;

// Queues a normalised combat event on both sides. `find(side)` returns the actor for a seen
// monster side; `hero` is used for the hero's side. Returns how many actions were queued.
export function queueCombat(c, {hero, find}) {
  const {attacker, defender} = actionsForCombat(c);
  const who = s => s?.you ? hero : s?.seen ? find(s) : null;
  let n = 0;
  const striker = attacker && who(c.attacker);
  // Cats pounce on small prey and swipe at anything else.
  const cat = striker && !c.attacker.you && catMove(striker.species, attacker.attack, attacker.target);
  if (cat) { attacker.cat = cat; attacker.size = catSize(striker.species); }
  const sq = attacker && queueOf(striker);
  // When the blow lands, counted from now: after what the attacker is already playing.
  const lands = sq && !sq.dead ? remainingTime(sq) + contactTime(striker, attacker) / pace(sq) : null;
  if (sq && enqueueAction(sq, attacker)) n++;
  const q = defender && queueOf(who(c.defender));
  if (q) {
    const late = q !== sq && lands !== null ? lands - remainingTime(q) : 0;
    if (enqueueAction(q, defender)) {
      q.lastBlow = defender.dir; n++;
      // The flinch waits for the blow (a pounce lands ~.5 s in), less whatever the defender
      // still has to play first. Stored in action seconds, which the defender's pace speeds up.
      if (late > .01) q.queue.at(-1).wait = Math.min(MAX_WAIT, late) * pace(q);
    }
  }
  return n;
}

// Queues a death (deathAction() from combat-events.js). The style comes from the seen species
// (deaths.js); the actor falls or splashes away from the last blow it took, if one was seen.
export function queueDeath(d, find) {
  const actor = d && find(d), q = queueOf(actor);
  return !!q && enqueueAction(q, {kind: 'die', dir: q.lastBlow ?? null, style: deathStyle(actor.species || d.name)});
}
