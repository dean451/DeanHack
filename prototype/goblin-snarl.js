// The goblins' and orcs' snarl: caught with the hero close by, a goblin or orc drops into a wide, low, forward-pitched
// crouch, the head thrust out ahead and both arms flung wide with the hands up at the shoulders, a bar-room bully
// making itself big, then holds it, shifting its weight, until the hero backs off (it straightens slowly) or it
// walks or acts. Written by body role and solved on the joints `rigHumanoid` exposes, like the dwarf's brace
// (humanoid-brace.js) and driven the way humanoid-guard.js drives it. No source gave a threat crouch as an angle
// (CREATURE-MEASURES.md, Goblins and orcs), so its proportions are set by eye.
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';
import {takeBackRest} from './insect-settle.js';
import {easePose} from './humanoid-guard.js';

// Shares of the creature's standing hip height: how low the pelvis sinks (highest allowed), how far the chest leans
// ahead of the pelvis (at least), how far apart the hands end up (at least) and how high they are held (at least).
export const SNARL = {drop: .87, lean: .15, spread: 1.1, hands: .55};
// NEAR: how close the hero may come (metres); DROP and RISE: seconds to go down (quick) and to straighten (slow);
// SHIFT and RATE: the weight shift's size (radians) and rate (rad/s).
export const NEAR = 3, DROP = .35, RISE = 1.2, SHIFT = .035, RATE = 2.1;

export const snarls = a => !!(a && a.quirk === 'orc' && a.g?.name !== 'bugbear' && a.joints?.rfore_2 && a.joints.lleg1_2 && a.joints.spine1 && a.joints.neck3 && a.body);

// Solves the snarl (the built pose is left as it was found).
export function snarlPose(a) {
  const P = rolesOf(a), s = a.g.scale.x, floor = a.g.position.y, {apply} = birdPoser(a);
  const stand = P.rump().y - floor, joints = {hipsY: [-1, 0]};
  for (const n of ['spine0', 'spine1', 'neck0', 'neck1', 'neck2', 'neck3']) joints[`${n}.x`] = [-.9, .9];
  for (const side of ['l', 'r']) {
    for (const i of [0, 1, 2]) joints[`${side}leg1_${i}.x`] = [-2.4, 2.4];
    joints[`${side}leg1_0.z`] = [-1, 1];
    for (const i of [0, 1]) { joints[`${side}fore_${i}.x`] = [-2.6, 2.6]; joints[`${side}fore_${i}.z`] = [-1.6, 1.6]; }
  }
  const goals = [goal.below('rump', floor + SNARL.drop * stand, {weight: 3}), goal.ahead('rump', 'withers', SNARL.lean * stand, {within: .04 * s}),
    goal.apart('paw:lf', 'paw:rf', SNARL.spread * stand, {weight: 3})];
  for (const side of ['l', 'r']) {
    goals.push(goal.floor(`paw:${side}h`, {y: floor, weight: 3}), goal.above(`paw:${side}f`, floor + SNARL.hands * stand, {weight: 2}));
  }
  const skins = [], v = new THREE.Vector3();
  a.g.traverse(o => { if (o.isSkinnedMesh) skins.push(o); });
  goals.push(goal.clear(() => { const out = []; for (const m of skins) { m.updateMatrixWorld(true); m.skeleton.update(); for (let i = 0; i < m.geometry.attributes.position.count; i += 4) out.push(m.getVertexPosition(i, v).clone().applyMatrix4(m.matrixWorld)); } return out; }, {y: floor, weight: 2}));
  const out = solvePose({joints, base: {hipsY: -.14 * stand / s, lleg1_0: {x: -.5}, rleg1_0: {x: -.5}, lleg1_1: {x: .8}, rleg1_1: {x: .8}, lfore_0: {z: -.9}, rfore_0: {z: .9}}, goals, apply, points: P, iterations: 1500, rest: .01});
  apply({});
  return {pose: out.pose, residuals: out.residuals, goals, stand};
}

const POSES = new Map();
// The solved snarl for this kind of goblin or orc (cached by name and scale), or null when it missed a goal.
export function snarlFor(a) {
  const key = `${a.species || a.name || a.g.name || ''}:${a.g.scale.x}`;
  if (!POSES.has(key)) {
    const r = snarlPose(a), worst = Math.max(...r.residuals.map(v => Math.hypot(...(Array.isArray(v) ? v : [v]))));
    POSES.set(key, worst < .02 ? r.pose : null);
  }
  return POSES.get(key);
}

const smooth = v => { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); };

// Called every frame for every actor; does nothing for a creature that is not a goblin or orc. Returns the progress (0..1).
export function updateOrcSnarl(a, dt, t, busy, look = null) {
  if (!snarls(a) || a.asset) return 0;
  const st = a.orcSnarl || (a.orcSnarl = {p: 0, written: []});
  takeBackRest(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const near = !!look && Number.isFinite(look.x) && Number.isFinite(look.z) && Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) < NEAR;
  const want = near && !busy && !a.actions?.dead;
  const pose = want || st.p ? snarlFor(a) : null;
  if (!pose) { st.p = 0; return 0; }
  st.p = want ? Math.min(1, st.p + dt / DROP) : Math.max(0, st.p - dt / RISE);
  if (!st.p) return 0;
  const ease = easePose(a, st, pose, smooth(st.p));
  const sway = st.p === 1 && a.joints.spine0 ? Math.sin(t * RATE) * SHIFT : 0;
  if (sway) { const o = a.joints.spine0.rotation, now = o.z; o.z = now + sway; st.written.push({get: () => o.z, set: v => { o.z = v; }, left: o.z, was: now}); }
  ease(a.body.position, 'y', a.jointRest.body.y + (pose.hipsY || 0));
  return st.p;
}
