// The play bow of a dog, jackal, wolf and the rest of the canines (not Cerberus): written by body role and solved
// on the joints `createCanine` exposes, as the curled sleep (canine-rest.js). It is the pause-breaker (Byosiere,
// Espinosa and Smuts 2016: CREATURE-MEASURES.md, Canines): the forelegs stretched out ahead with the chest down
// near the floor, the hind legs standing with the rump up, the head low between the forepaws facing forward and the
// tail up. No source gave the bow as an angle, so its proportions are set by eye. A pose is {joint: {x, y, z}}
// (radians, added to the joint's built rotation) and hipsY, the body's drop in body units.
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';
import {rests} from './canine-rest.js';

// Shares of the dog's standing shoulder height: how far each forepaw lies ahead of its shoulder, how high the
// shoulder stays over the floor, how low the muzzle hangs, how far ahead of the shoulder it lies, how high the
// hip stays at least and at most, and how high the tail's tip rises.
export const BOW = {reach: .6, chest: .5, low: .3, chin: .3, face: .5, rump: .92, top: 1.15, tail: 1.15};

const worst = r => Math.max(...r.residuals.flat().map(Math.abs));

export const bows = rests;

// Solves the play bow (the built pose is left as it was found).
export function bowPose(a) {
  const P = rolesOf(a), s = a.g.scale.x, floor = a.g.position.y, j = a.joints, {apply} = birdPoser(a);
  apply({});
  const high = P['shoulder:l']().y - floor, hipHigh = P['hip:l']().y - floor;
  const joints = {'spine0.x': [-.2, 1.2]};
  for (const n of ['neck0', 'neck1', 'neck2', 'neck3']) joints[`${n}.x`] = [-1.2, 1.2];
  for (const n of ['tail0', 'tail1', 'tail2']) joints[`${n}.x`] = [-1.4, 1.4];
  for (const side of ['l', 'r']) for (const i of [0, 1]) for (const b of ['', '_1', '_2']) joints[`${side}leg${i}${b}.x`] = [-2.6, 2.6];
  // world points of the hide (every 32nd vertex, posed as it now stands), kept off the floor
  let hide = null;
  a.g.traverse(o => { if (o.isSkinnedMesh && o.userData.part === 'body') hide = o; });
  const v = new THREE.Vector3(), every = [];
  for (let i = 0; i < hide.geometry.attributes.position.count; i += 32) every.push(i);
  const all = () => { hide.updateMatrixWorld(true); hide.skeleton.update(); return every.map(i => hide.getVertexPosition(i, v).clone().applyMatrix4(hide.matrixWorld)); };
  const goals = [goal.clear(all, {y: floor, weight: 2}), goal.above('hip:l', floor + BOW.rump * hipHigh, {weight: 2}), goal.below('hip:l', floor + BOW.top * hipHigh, {weight: 2}), goal.below('shoulder:l', floor + BOW.chest * high, {weight: 3}), goal.above('shoulder:l', floor + BOW.low * high, {weight: 2}),
    goal.floor('mouth', {y: floor + BOW.chin * high, weight: 2}), goal.ahead('shoulder:l', 'mouth', BOW.face * high, {within: .1 * s}),
    goal.above('tailtip', floor + BOW.tail * hipHigh, {weight: 1.5})];
  for (const side of ['l', 'r']) goals.push(goal.floor(`paw:${side}f`, {y: floor, weight: 2}), goal.floor(`paw:${side}h`, {y: floor, weight: 2}),
    goal.ahead(`shoulder:${side}`, `paw:${side}f`, BOW.reach * high, {within: .06 * s}));
  // (tried from the legs as built and from the spine already bent, the first to meet every goal kept)
  let out = null;
  for (const base of [{}, {spine0: {x: .5}}, {spine0: {x: .8}, lleg0: {x: -.6}, rleg0: {x: -.6}}, {spine0: {x: .3}, lleg1: {x: -.4}, rleg1: {x: -.4}}]) {
    const t = solvePose({joints, base, goals, apply, points: P, iterations: 250, rest: .01});
    if (!out || worst(t) < worst(out)) out = t;
    if (worst(out) < .015) break;
  }
  apply(out.pose);
  const res = {pose: out.pose, residuals: goals.map(g => g(P)), goals, high};
  apply({});
  return res;
}
