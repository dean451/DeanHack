// The resting wild cat (jaguar, lynx, panther, tiger, displacer beast): the sphinx, written by body role and
// solved on the joints `createFeline` exposes (the pet cat keeps its own poses in feline-rest.js). The cat
// lies on its belly with the forelegs reached out ahead on the floor, the hind feet folded in beside the
// haunch, the head held up on the neck and the tail laid along the floor behind. No source gave the sphinx
// rest as an angle (CREATURE-MEASURES.md, Wild cats), so its proportions are set by eye against photographs.
// A pose is {joint: {x, y, z}} (radians, added to the joint's built rotation) and hipsY, the body's drop in
// body units, as the cockerel's (cockatrice-rest.js).
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';

// Shares of the cat's standing shoulder height: how far each forepaw reaches ahead of its shoulder, how far the
// hind foot lies ahead of its hip, how high the mouth is held (lowest allowed), and how near the tail's tip
// lies to the left haunch, as a share of the tail's length (the tail laid round along the flank).
export const REST = {reach: .33, hind: .1, head: .78, tail: .6, curl: .65};

const KEYS = ['x', 'y', 'z'];

export const rests = a => !!(a && !a.asset && a.quirk === 'feline' && a.joints?.spine0 && !a.rig);

// Solves the resting pose (the built pose is left as it was found).
export function restPose(a) {
  const P = rolesOf(a), s = a.g.scale.x, floor = a.g.position.y, j = a.joints, {apply} = birdPoser(a);
  const high = P['shoulder:l']().y - floor, v = new THREE.Vector3();
  const skinOf = (parent, part) => parent.children.find(o => o.isSkinnedMesh && o.userData.part === part);
  // world points of a skin (every `step`th vertex, posed as it now stands)
  const samples = (mesh, step) => () => { const out = []; mesh.updateMatrixWorld(true); mesh.skeleton.update(); for (let i = 0; i < mesh.geometry.attributes.position.count; i += step) out.push(mesh.getVertexPosition(i, v).clone().applyMatrix4(mesh.matrixWorld)); return out; };
  const body = samples(skinOf(a.body, 'body'), 24), tail = samples(skinOf(a.tail, 'tail'), 4);
  const legs = ['lleg0', 'rleg0', 'lleg1', 'rleg1'].map(n => samples(skinOf(j[n], n.endsWith('0') ? 'foreleg' : 'hindleg'), 6));
  const joints = {hipsY: [-.5, 0]};
  for (const n of ['neck0', 'neck1', 'neck2', 'neck3']) joints[`${n}.x`] = [-.5, .7];
  for (const n of ['tail0', 'tail1', 'tail2']) { joints[`${n}.x`] = [-1.2, .8]; joints[`${n}.y`] = [-.8, .8]; }
  for (const side of ['l', 'r']) for (const i of [0, 1]) for (const b of ['', '_1', '_2']) joints[`${side}leg${i}${b}.x`] = [-2.6, 2.6];
  const tailLen = P.tailtip().distanceTo(P.rump());
  // the belly on the floor; the tail laid down from its root, as low as its own length lets it
  const goals = [goal.rests(body, {y: floor, weight: 3}), P2 => [Math.max(0, P2.tailtip().y - Math.max(floor + .02 * s, P2.rump().y - REST.tail * tailLen))]];
  for (const l of [body, tail, ...legs]) goals.push(goal.clear(l, {y: floor, weight: 2}));
  for (const side of ['l', 'r']) {
    goals.push(goal.floor(`paw:${side}f`, {y: floor, weight: 2}), goal.floor(`paw:${side}h`, {y: floor, weight: 2}),
      goal.ahead(`shoulder:${side}`, `paw:${side}f`, REST.reach * high, {within: .02 * s}),
      goal.ahead(`hip:${side}`, `paw:${side}h`, REST.hind * high, {within: .03 * s}));
  }
  goals.push(goal.reach('tailtip', 'hip:l', {within: REST.curl * tailLen, weight: 1.5}));
  goals.push(goal.above('mouth', floor + REST.head * high, {weight: 2}));
  const base = {hipsY: -.3, tail0: {x: -.9}, tail1: {x: -.3}};
  const out = solvePose({joints, base, goals, apply, points: P, iterations: 150, rest: .01});
  apply({});
  return {pose: out.pose, residuals: out.residuals, goals, high};
}
