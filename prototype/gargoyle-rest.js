// The resting gargoyle (gargoyle, winged gargoyle) and gremlin: a monkey's crouch, written by body role and solved
// on the joints `gargoyle()` and `gremlin()` expose, from the macaque numbers in creature-measures.js. The haunches
// drop to the floor with the hind feet flat, the forepaws (the gargoyles' knuckles) planted ahead of them, the head
// held up and level on its neck chain, the tail laid down on the floor and the wings drawn in to the back. No source gave a monkey's crouch as an
// angle (CREATURE-MEASURES.md, Gargoyles and gremlins), so its proportions are set by eye. A pose is
// {joint: {x, y, z}} (radians, added to the joint's built rotation) and hipsY, the body's drop in body units, as the
// cockerel's (cockatrice-rest.js).
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';

// Shares of the creature's standing shoulder height: how low the withers may stay (highest allowed), how high the
// mouth is held (lowest allowed), how far a forepaw plants ahead of its shoulder, and how close a folded wing tip
// lies to its haunch.
export const REST = {withers: .95, gremlinWithers: 1.05, head: .6, reach: .5, wingIn: .45};

export const rests = a => !!(a && (a.kind === 'gargoyle' || a.kind === 'gremlin') && a.joints?.neck3 && !a.rig);

// Solves the resting pose (the built pose is left as it was found).
export function restPose(a) {
  const P = rolesOf(a), s = a.g.scale.x, floor = a.g.position.y, j = a.joints, {apply} = birdPoser(a);
  const gremlin = a.kind === 'gremlin', high = P['shoulder:l']().y - floor;
  const lowest = group => () => { const b = new THREE.Box3().setFromObject(group, true); return [new THREE.Vector3(0, b.min.y, 0)]; };
  const joints = {hipsY: [-.5, 0]};
  for (const n of ['neck0', 'neck1', 'neck2', 'neck3']) joints[`${n}.x`] = [-.7, .7];
  for (const n of ['tail0', 'tail1', 'tail2']) { joints[`${n}.x`] = [-1.2, .8]; joints[`${n}.y`] = [-.8, .8]; }
  for (const side of ['l', 'r']) {
    joints[`${side}leg1.x`] = [-2.2, 2.2]; joints[`${side}fore.x`] = [-2.2, 2.2];
    if (j[`${side}wing`]) { joints[`${side}wing.y`] = [-2, 2]; joints[`${side}wing.z`] = [-2, 2]; joints[`${side}wing.x`] = [-2, 2]; }
  }
  const goals = [P2 => [Math.max(0, P2.withers().y - (floor + (gremlin ? REST.gremlinWithers : REST.withers) * high))]];
  for (const side of ['l', 'r']) {
    goals.push(goal.floor(`paw:${side}h`, {y: floor, weight: 3}));
    // the gargoyles plant their knuckles; the gremlin keeps its hands raised and hooked
    if (!gremlin) goals.push(goal.floor(`paw:${side}f`, {y: floor, weight: 2}), goal.ahead(`shoulder:${side}`, `paw:${side}f`, REST.reach * high, {within: .03 * s}));
    if (j[`${side}wing`]) goals.push(goal.reach(`wingtip:${side}`, `hip:${side}`, {within: REST.wingIn * s * (a.winged ? 1 : .42)}));
  }
  // the tail is one skin: every fourth vertex of it, as it now stands, stays above the floor
  const skin = a.tail.children.find(o => o.isSkinnedMesh), v = new THREE.Vector3();
  goals.push(goal.clear(() => { const out = []; skin.updateMatrixWorld(true); skin.skeleton.update(); for (let i = 0; i < skin.geometry.attributes.position.count; i += 4) out.push(skin.getVertexPosition(i, v).clone().applyMatrix4(skin.matrixWorld)); return out; }, {y: floor, weight: 2}));
  goals.push(goal.above('mouth', floor + REST.head * high, {weight: 2}), goal.floor('tailtip', {y: floor + .02 * s}));
  for (const name of Object.keys(j).filter(n => /^[lr](leg|fore)|^tail0|^head/.test(n))) goals.push(goal.clear(lowest(j[name]), {y: floor - .008 * s}));
  const base = {hipsY: -.15, lleg1: {x: .9}, rleg1: {x: .9}};
  const out = solvePose({joints, base, goals, apply, points: P, iterations: 800, rest: .01});
  apply({});
  return {pose: out.pose, residuals: out.residuals, goals, high};
}
