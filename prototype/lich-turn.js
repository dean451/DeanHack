// The lich's turn (family L, stage 4 step 2): the signature, set off by the hero. CREATURE-MEASURES.md (Liches): the
// rigid walker of Parkinson's disease turns "en bloc", in one piece: the skull does not lead and the trunk does not
// twist, the whole stooped figure comes round together, slowly (a half turn takes LICH.turnSlow times a healthy
// one's 1.79 s) and in more shuffling steps (LICH.turnSteps for a half turn against 2 to 3), after a longer pause
// before it starts. From the game camera it is one silhouette change, the facing: where every other creature's head
// glances first, the lich ratchets round like something on a turntable, the hood rocking from foot to foot.
//
// Two parts. `shufflePose(a, side)` solves the weight shift of one shuffle by role on the joints `lich()` rigs, on top
// of the stoop (lich-rest.js): the neck's root leans over the foot on `side` (-1 the left, +1 the right, as x), the
// stoop's forward lean kept, the free hand plumb under its shoulder, the staff hand on its grip; the neck is not
// posed, so the skull rides the chest unturned. `turnPlan` / `turnAt` time the turn: the yaw moves in steps, each a
// quick shuffle and a hold, the weight rocking onto alternate feet, and ends exactly on the angle with no sway left.
// A pose is {joint: {x, y, z}} (radians, added to the joint's built rotation), as lich-rest.js.
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';
import {LICH, MEASURES} from './creature-measures.js';
import {REST, rests} from './lich-rest.js';

// roll: how far the trunk's line leans sideways over the planted foot (rad; set by eye, no source gave a sway);
// half: a healthy person's half turn (s, the control group LICH.turnSlow is measured against); delay: the pause before
// the turn begins (s; Salarian et al. found it longer, but the search result gave no number, so set by eye); move: the
// share of each step the yaw moves in, the rest a hold (by eye: the ratchet).
export const TURN = {roll: .14, half: MEASURES.lich.turnSeconds.control, delay: .6, move: .45};

export const turns = rests;

// Solves one shuffle's weight shift over the foot on `side` (the built pose is left as it was found).
export function shufflePose(a, side) {
  const P = rolesOf(a), s = a.g.scale.x, {apply} = birdPoser(a);
  apply({});
  const rump = P.rump().clone(), withers = P.withers().clone(), trunk = withers.distanceTo(rump);
  // the stoop's line, leaned sideways over the foot: forward by the stoop, out by the roll
  const dir = new THREE.Vector3(side * Math.sin(TURN.roll), Math.cos(REST.stoop) * Math.cos(TURN.roll), Math.sin(REST.stoop) * Math.cos(TURN.roll));
  const bent = rump.clone().add(dir.multiplyScalar(trunk));
  const arm = P['shoulder:l']().distanceTo(P['paw:lf']()), grip = P['paw:rf']().clone();
  const joints = {'spine0.x': [0, 1.2], 'spine0.z': [-.6, .6], 'spine1.x': [-.1, REST.chest], 'spine1.z': [-.12, .12]};
  for (const k of ['l', 'r']) {
    for (const ax of ['x', 'y', 'z']) joints[`${k}fore_0.${ax}`] = [-2.5, 2.5];
    joints[`${k}fore_1.x`] = [-2, 2];
  }
  const goals = [
    goal.reach('withers', () => bent, {within: .005 * s, weight: 3}),
    goal.reach('paw:lf', () => P['shoulder:l']().clone().add(new THREE.Vector3(0, -arm, 0)), {within: .01 * s, weight: 2}),
    goal.reach('paw:rf', () => grip, {within: .005 * s, weight: 3}),
  ];
  const r = solvePose({joints, base: {spine0: {x: REST.stoop}}, goals, apply, points: P, iterations: 800, rest: .01});
  apply({});
  return {pose: r.pose, residuals: r.residuals, goals, trunk, arm, grip, bent, rump, side};
}

// The turn's timing for a yaw of `angle` (rad, either way): how many shuffles, how long, and the pause before.
export function turnPlan(angle) {
  const share = Math.min(1, Math.abs(angle) / Math.PI);
  return {angle, steps: Math.max(1, Math.ceil(LICH.turnSteps * share - 1e-9)), seconds: TURN.half * LICH.turnSlow * share, delay: TURN.delay};
}

const smooth = v => (v = v < 0 ? 0 : v > 1 ? 1 : v, v * v * (3 - 2 * v));

// Where the turn is `t` seconds after it was set off: yaw, the share of the angle turned (0 to 1, moving only in the
// first TURN.move of each step); side, the foot the weight is on this step (alternating, the first on the outside of
// the turn, so the inside foot steps); sway, how far into that shuffle's weight shift (0 to 1 and back each step).
export function turnAt(plan, t) {
  const u = t - plan.delay;
  if (u <= 0 || plan.seconds <= 0) return {yaw: u > 0 ? 1 : 0, side: 0, sway: 0, done: u > 0};
  if (u >= plan.seconds - 1e-9) return {yaw: 1, side: 0, sway: 0, done: true};
  const step = plan.seconds / plan.steps, i = Math.min(plan.steps - 1, Math.floor(u / step)), f = u / step - i;
  const out = plan.angle >= 0 ? -1 : 1;
  return {yaw: (i + smooth(f / TURN.move)) / plan.steps, side: i % 2 ? -out : out, sway: Math.sin(Math.PI * f), done: false};
}
