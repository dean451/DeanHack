// The resting imp, homunculus, quasit and tengu: a monkey's squat, written by body role and solved on the joints
// `rigImp` exposes. The pelvis drops to a little over half its standing height, the knees fold so the feet stay
// flat on the floor under the hips, the back rounds forward, and the arms hang slack with the hands over the knees,
// the head held low between the shoulders. The proportions are set by eye
// (CREATURE-MEASURES.md, Imps, gives a walk and a head bob but no resting angle). A pose is {joint: {x, y, z}}
// (radians, added to the joint's built rotation) and hipsY, the body's drop in body units, as the humanoid sit's
// (humanoid-rest.js). The lemure has its own slump (lemure-slump.js) and keeps it.
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';

// Shares of the creature's standing hip height: how low the pelvis sits (highest allowed), how high a hand hangs over its knee, and how far ahead of it the feet stay (at most).
export const REST = {seat: .85, lap: .12, feet: .35};

export const rests = a => !!(a && !a.asset && a.joints?.rfore_2 && a.joints.lleg1_2 && a.joints.spine1 && a.joints.neck3 && a.quirk !== 'lemure'
  && a.joints.hips && a.name !== 'lemure');

// Solves the squat (the built pose is left as it was found).
export function restPose(a) {
  const P = rolesOf(a), s = a.g.scale.x, floor = a.g.position.y, j = a.joints, {apply} = birdPoser(a);
  const stand = P.rump().y - floor;
  const joints = {hipsY: [-1, 0]};
  for (const n of ['spine0', 'spine1', 'neck0', 'neck1', 'neck2', 'neck3']) joints[`${n}.x`] = [-1.3, 1.3];
  for (const side of ['l', 'r']) {
    for (const i of [0, 1, 2]) joints[`${side}leg1_${i}.x`] = [-2.6, 2.6];
    for (const i of [0, 1]) { joints[`${side}fore_${i}.x`] = [-2.6, 2.6]; joints[`${side}fore_${i}.z`] = [-.8, .8]; }
  }
  const goals = [goal.below('rump', floor + REST.seat * stand, {weight: 3})];
  for (const side of ['l', 'r']) {
    goals.push(goal.floor(`paw:${side}h`, {y: floor, weight: 3}), goal.ahead('rump', `paw:${side}h`, 0, {within: REST.feet * stand}));
    // the hand hangs over the knee at its own side, a little above it, the arm slack
    goals.push(goal.reach(`paw:${side}f`, () => P[`hip:${side}`]().lerp(P[`paw:${side}h`](), .5).add(new THREE.Vector3(P[`shoulder:${side}`]().x - P[`hip:${side}`]().x, REST.lap * stand, 0)), {within: .06 * s}));
  }
  const lowest = group => () => { const b = new THREE.Box3().setFromObject(group, true); return [new THREE.Vector3(0, b.min.y, 0)]; };
  for (const name of Object.keys(j).filter(n => /^[lr](leg1|fore)$|^head/.test(n))) goals.push(goal.clear(lowest(j[name]), {y: floor - .008 * s}));
  const skins = [], v = new THREE.Vector3();
  a.g.traverse(o => { if (o.isSkinnedMesh) skins.push(o); });
  goals.push(goal.clear(() => { const out = []; for (const m of skins) { m.updateMatrixWorld(true); m.skeleton.update(); for (let i = 0; i < m.geometry.attributes.position.count; i += 5) out.push(m.getVertexPosition(i, v).clone().applyMatrix4(m.matrixWorld)); } return out; }, {y: floor - .008 * s, weight: 2}));
  const base = {hipsY: -.35 * stand / s, lleg1_0: {x: -1.2}, rleg1_0: {x: -1.2}, lleg1_1: {x: 1.4}, rleg1_1: {x: 1.4}};
  const out = solvePose({joints, base, goals, apply, points: P, iterations: 1500, rest: .01});
  apply({});
  return {pose: out.pose, residuals: out.residuals, goals, stand};
}
