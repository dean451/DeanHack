// The stalking crouch of a wild cat (jaguar, lynx, panther, tiger, displacer beast): written by body role and
// solved on the joints `createFeline` exposes, as the sphinx rest (wildcat-rest.js). A big cat closing on prey
// drops onto bent legs with the shoulder blades standing over the back, the head low and thrust ahead of them
// and level with the spine, the hips a little higher than the shoulders and the tail trailing low behind with
// its tip just off the ground. No source gave the crouch as an angle (CREATURE-MEASURES.md, Wild cats), so its
// proportions are set by eye against photographs. A pose is {joint: {x, y, z}} (radians, added to the joint's
// built rotation) and hipsY, the body's drop in body units, as the rest's.
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';
import {rests} from './wildcat-rest.js';

// Shares of the cat's standing shoulder height (hip height for the hips): the shoulder's top and bottom, the
// hip's top and bottom, how high the mouth is held at most, how far ahead of the shoulder it lies at least,
// how high the tail's tip is allowed above the floor, and how far it hangs below the rump as a share of its length
// (a short tail cannot reach the floor, so the higher of the two limits holds).
export const STALK = {shoulder: [.6, .78], hip: [.65, .88], mouth: .7, face: .3, tail: .15, drop: .6};

export const stalks = rests;

// Solves the stalking crouch (the built pose is left as it was found).
export function stalkPose(a) {
  const P = rolesOf(a), s = a.g.scale.x, floor = a.g.position.y, j = a.joints, {apply} = birdPoser(a);
  apply({});
  const high = P['shoulder:l']().y - floor, hipHigh = P['hip:l']().y - floor;
  const joints = {hipsY: [-.6, 0], 'spine0.x': [-.4, .6]};
  for (const n of ['neck0', 'neck1', 'neck2', 'neck3']) joints[`${n}.x`] = [-.7, .9];
  for (const n of ['tail0', 'tail1', 'tail2']) { joints[`${n}.x`] = [-1.2, .8]; joints[`${n}.y`] = [-.6, .6]; }
  for (const side of ['l', 'r']) for (const i of [0, 1]) for (const b of ['', '_1', '_2']) joints[`${side}leg${i}${b}.x`] = [-2.6, 2.6];
  // world points of each skin (every `step`th vertex, posed as it now stands), kept off the floor
  const v = new THREE.Vector3();
  const skinOf = (parent, part) => parent.children.find(o => o.isSkinnedMesh && o.userData.part === part);
  const samples = (mesh, step) => () => { const out = []; mesh.updateMatrixWorld(true); mesh.skeleton.update(); for (let i = 0; i < mesh.geometry.attributes.position.count; i += step) out.push(mesh.getVertexPosition(i, v).clone().applyMatrix4(mesh.matrixWorld)); return out; };
  const skins = [samples(skinOf(a.body, 'body'), 24), samples(skinOf(a.tail, 'tail'), 4),
    ...['lleg0', 'rleg0', 'lleg1', 'rleg1'].map(n => samples(skinOf(j[n], n.endsWith('0') ? 'foreleg' : 'hindleg'), 6))];
  const tailLen = P.tailtip().distanceTo(P.rump());
  const goals = skins.map(l => goal.clear(l, {y: floor, weight: 2}));
  goals.push(goal.above('shoulder:l', floor + STALK.shoulder[0] * high, {weight: 2}), goal.below('shoulder:l', floor + STALK.shoulder[1] * high, {weight: 3}),
    goal.above('hip:l', floor + STALK.hip[0] * hipHigh, {weight: 2}), goal.below('hip:l', floor + STALK.hip[1] * hipHigh, {weight: 3}),
    goal.below('mouth', floor + STALK.mouth * high, {weight: 2}), goal.ahead('shoulder:l', 'mouth', STALK.face * high, {within: .1 * s}),
    P2 => [1.5 * Math.max(0, P2.tailtip().y - Math.max(floor + STALK.tail * high, P2.rump().y - STALK.drop * tailLen))]);
  for (const side of ['l', 'r']) goals.push(goal.floor(`paw:${side}f`, {y: floor, weight: 2}), goal.floor(`paw:${side}h`, {y: floor, weight: 2}));
  // (tried from several drops and bends, the first to meet every goal kept, else the best)
  const worst = r => Math.max(...r.residuals.flat().map(Math.abs));
  let out = null;
  for (const hipsY of [-.25, -.4, -.1]) for (const tilt of [0, .25]) {
    const t = solvePose({joints, base: {hipsY, tail0: {x: -.5}, 'spine0': {x: tilt}}, goals, apply, points: P, iterations: 300, rest: .01});
    if (!out || worst(t) < worst(out)) out = t;
    if (worst(out) < .015) break;
  }
  apply({});
  return {pose: out.pose, residuals: out.residuals, goals, high};
}
