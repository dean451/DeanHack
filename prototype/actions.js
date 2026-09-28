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

import {swingPose, swingPhase, swingLength, swingTrailOn, blowOf, applySwing, clearSwing, CONTACT_U, SWING_TIME} from './swing.js';

export const ACTION_TIME = {attack: .42, hit: .3, die: .9};
// Wait no longer than this for a death to play before the map (and its corpse) goes on.
export const MAX_HOLD_MS = 1000;

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
// flinch away from the blow; a miss or wild swing only moves the attacker.
export function actionsForCombat(c) {
  if (!c) return {attacker: null, defender: null};
  const dir = unitDir(c.dir);
  const attacker = c.attacker?.you || c.attacker?.seen
    ? {kind: 'attack', attack: c.attack || 'other', blow: c.blow ?? null, result: c.result, dir} : null;
  const defender = c.result === 'hit' && (c.defender?.you || c.defender?.seen)
    ? {kind: 'hit', dir} : null;
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
// Seconds an action lasts (a swing is only known to be one once it starts).
const actionLength = a => a.swing ? swingLength(a.result) : ACTION_TIME[a.kind];

const pace = q => Math.min(3, 1 + .5 * Math.max(0, q.queue.length - 1));

// Current state name: the playing action's kind, or 'idle'.
export function actionState(q) {
  return q?.current?.kind ?? (q?.queue[0]?.kind || 'idle');
}

// Seconds of queued and playing actions left, at the current pace.
export function remainingTime(q) {
  if (!q) return 0;
  let s = q.current ? Math.max(0, actionLength(q.current) - q.age) : 0;
  for (const a of q.queue) s += ACTION_TIME[a.kind];
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
    socket: 0, leg: 0, tail: 0, scale: 1};
  const d = action.dir;
  if (action.kind === 'attack') {
    const type = action.attack;
    // Windup, strike, recover: lean back, then lunge through the target's side of the tile.
    const back = bump(clamp01(u / .4), .7), strike = bump(clamp01((u - .18) / .66), .4);
    const reach = type === 'butt' ? .3 : type === 'bite' ? .24 : type === 'touch' || type === 'engulf' ? .12 : .18;
    const whiff = action.result === 'hit' ? 1 : 1.2;
    const lunge = strike * reach * whiff - back * .06;
    if (d) { p.dx = d[0] * lunge; p.dz = d[1] * lunge; }
    p.yaw = face ? face * smooth(u / .2) : 0;
    p.pitch = (strike * (type === 'butt' || type === 'bite' ? .28 : .14) - back * .1);
    p.body = strike * .03;
    p.head = type === 'bite' ? strike * .45 - back * .2 : type === 'butt' ? strike * .35 : 0;
    p.arm = type === 'weapon' || type === 'claw' ? -1.9 * bump(u, .45) : type === 'touch' ? -1.1 * strike : 0;
    p.wrist = type === 'weapon' ? .34 * bump(u, .45) : 0;
    p.socket = type === 'weapon' ? -1.18 * bump(u, .45) : 0;
    p.roll = type === 'claw' ? .16 * (strike - back) : 0;
    p.leg = type === 'kick' ? -1.1 * strike : 0;
    p.tail = type === 'sting' ? 1.3 * strike - .5 * back : 0;
  } else if (action.kind === 'hit') {
    // Knocked back along the blow, snapping in fast and settling out.
    const k = u < .15 ? smooth(u / .15) : 1 - smooth((u - .15) / .85);
    if (d) { p.dx = d[0] * .1 * k; p.dz = d[1] * .1 * k; }
    p.pitch = -.22 * k;
    p.roll = (d ? d[0] : 1) * .08 * k;
    p.head = -.3 * k;
    p.dy = .02 * k;
  } else if (action.kind === 'die') {
    // Stagger, then topple sideways and sink a little; held at the end.
    const s = smooth(u / .25), f = smooth((u - .15) / .75);
    if (d) { p.dx = d[0] * (.06 * s + .12 * f); p.dz = d[1] * (.06 * s + .12 * f); }
    p.pitch = -.2 * s * (1 - f);
    p.roll = 1.45 * f;
    p.dy = -.12 * f;
    p.head = -.4 * f;
    p.scale = 1 - .12 * f;
  }
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
  if (actor.body) actor.body.position.y -= o.body;
  if (actor.head) actor.head.rotation.x -= o.head;
  if (actor.arm) actor.arm.rotation.x -= o.arm;
  if (actor.wrist) actor.wrist.rotation.x -= o.wrist;
  if (actor.weaponSocket) actor.weaponSocket.rotation.z -= o.socket;
  if (actor.legs?.[0]) actor.legs[0].rotation.x -= o.leg;
  if (actor.tail) actor.tail.rotation.x -= o.tail;
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
  if (actor.body) actor.body.position.y += p.body;
  if (actor.head) actor.head.rotation.x += p.head;
  if (actor.arm) actor.arm.rotation.x += p.arm;
  if (actor.wrist) actor.wrist.rotation.x += p.wrist;
  if (actor.weaponSocket) actor.weaponSocket.rotation.z += p.socket;
  if (actor.legs?.[0]) actor.legs[0].rotation.x += p.leg;
  if (actor.tail) actor.tail.rotation.x += p.tail;
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
  }
  const a = q.current;
  q.swing = null;
  if (!a) return 'idle';
  const before = q.age;
  q.age += Math.max(0, dt) * pace(q);
  const len = actionLength(a);
  // A swing runs on its own clock (with the hitstop); the body lunge follows the blade.
  const u = a.swing ? swingPhase(Math.min(q.age, len), a.blow, a.result) : clamp01(q.age / len);
  // Heading toward the target is measured once, from the rest pose, when the action starts.
  if (q.face === null) q.face = a.kind === 'attack' && a.dir ? turn(actor.g.rotation.y, Math.atan2(a.dir[0], a.dir[1])) : 0;
  const pose = actionPose(a, u, q.face);
  if (a.swing) {
    pose.arm = pose.wrist = pose.socket = 0;
    pose.swing = swingPose(a.blow, u, a.result);
    // What the renderer needs for the trail and the impact burst. `contact` is true on the one
    // frame the blade reaches a target it hits.
    const tc = CONTACT_U[blowOf(a.blow)] * SWING_TIME;
    q.swing = {blow: blowOf(a.blow), u, trail: swingTrailOn(a.blow, u), dir: a.dir,
      contact: a.result === 'hit' && before < tc && q.age >= tc};
  }
  applyPose(actor, q, pose);
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
  if (attacker && enqueueAction(queueOf(who(c.attacker)), attacker)) n++;
  const q = defender && queueOf(who(c.defender));
  if (q && enqueueAction(q, defender)) { q.lastBlow = defender.dir; n++; }
  return n;
}

// Queues a death (deathAction() from combat-events.js). The actor topples away from the last
// blow it took, if one was seen.
export function queueDeath(d, find) {
  const q = d && queueOf(find(d));
  return !!q && enqueueAction(q, {kind: 'die', dir: q.lastBlow ?? null});
}
