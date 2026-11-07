// The lying rest of the heavy quadrupeds (rothe, mumak, mastodon, titanothere, baluchitherium, leocrotta, wumpus):
// a cow lying sternal, written by body role and solved on the joints `nameQuadrupedJoints` gives them. A bovine
// lies about half its day and a rhinoceros sleeps with its feet curled to one side (CREATURE-MEASURES.md, Heavy
// quadrupeds); no source gave the angles, so the proportions are set by eye. The belly goes down on the floor, the
// forelegs fold under the chest and the hind legs under the haunch (feet flat, tucked in), the head held up on its
// neck and the tail laid down. A pose is {joint: {x, y, z}} (radians, added to the joint's built rotation) and
// hipsY, the body's drop in body units, as the cockerel's (cockatrice-rest.js).
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';

// Shares of the beast's standing shoulder height: how near each forepaw tucks to its shoulder and each hind paw to
// its hip (along the body), how high the mouth is held (lowest allowed), how high the belly may still hang (highest
// allowed).
export const REST = {tuck: .35, head: .55, belly: .12};
// (a short-legged beast, the wumpus, whose belly hangs a leg's length up and whose legs have no room to fold, is held to these instead)
export const SHORT = {tuck: .6, belly: .5};

export const rests = a => !!(a && a.joints?.tail0 && a.joints.lleg0_2 && a.joints.rleg1_2 && !a.joints.tail1 && !a.joints.spine0 && !a.joints.neck1 && !a.rig);

// The lowest point of a group's own meshes (the body's torso: not the legs, head and tail it carries)
const torsoLow = a => () => {
  const out = [], b = new THREE.Box3();
  a.body.updateMatrixWorld(true);
  for (const m of a.body.children) if (m.isMesh) { b.setFromObject(m, true); out.push(new THREE.Vector3(0, b.min.y, 0)); }
  return out;
};

// The lowest point of a group as it now stands: a plain mesh's bounds, a skinned mesh's posed vertices (every
// third: its box is the bind pose's)
export const lowestOf = group => () => {
  const v = new THREE.Vector3(), c = new THREE.Box3(); let y = Infinity;
  group.updateMatrixWorld(true);
  group.traverse(o => {
    if (o.isSkinnedMesh) { o.skeleton.update(); const n = o.geometry.attributes.position.count; for (let i = 0; i < n; i += 3) y = Math.min(y, o.getVertexPosition(i, v).applyMatrix4(o.matrixWorld).y); }
    else if (o.isMesh) y = Math.min(y, c.setFromObject(o, true).min.y);
  });
  return [new THREE.Vector3(0, y, 0)];
};

// Solves the lying pose (the built pose is left as it was found).
export function restPose(a) {
  const P = rolesOf(a), s = a.g.scale.x, floor = a.g.position.y, j = a.joints, {apply} = birdPoser(a);
  const high = P['shoulder:l']().y - floor, low = torsoLow(a), short = high < .3 * s, tuck = (short ? SHORT.tuck : REST.tuck) * high, belly = (short ? SHORT.belly : REST.belly) * high;
  const joints = {hipsY: [-1.5, 0], 'neck0.x': [-.8, .8], 'tail0.x': [-1, 1], 'tail0.y': [-.8, .8]};
  for (const side of ['l', 'r']) for (const i of [0, 1]) for (const b of ['', '_1', '_2']) joints[`${side}leg${i}${b}.x`] = [-2.6, 2.6];
  // the belly down: the torso's lowest point no higher than REST.belly of the shoulder height above the floor
  const goals = [() => [3 * Math.max(0, Math.min(...low().map(p => p.y)) - (floor + belly))]];
  for (const side of ['l', 'r']) {
    goals.push(goal.floor(`paw:${side}f`, {y: floor, weight: 2}), goal.floor(`paw:${side}h`, {y: floor, weight: 2}),
      goal.reach(`paw:${side}f`, `shoulder:${side}`, {within: tuck, weight: 1.5}),
      goal.reach(`paw:${side}h`, `hip:${side}`, {within: tuck, weight: 1.5}));
  }
  goals.push(goal.above('mouth', floor + REST.head * high, {weight: 2}));
  goals.push(goal.clear(low, {y: floor - .008 * s, weight: 2}));
  for (const name of Object.keys(j).filter(n => /^[lr]leg\d$|^tail0|^head/.test(n))) goals.push(goal.clear(lowestOf(j[name]), {y: floor - .008 * s}));
  const fold = k => { const b = {hipsY: -.6}; for (const side of ['l', 'r']) { b[`${side}leg0`] = {x: 1.0 * k}; b[`${side}leg0_1`] = {x: -1.6 * k}; b[`${side}leg1`] = {x: -1.0 * k}; b[`${side}leg1_1`] = {x: 1.6 * k}; } return b; };
  let out = null;
  for (const base of [fold(1), fold(-1), {hipsY: -.4}]) {
    const t = solvePose({joints, base, goals, apply, points: P, iterations: 300, rest: .01});
    if (!out || Math.max(...t.residuals.flat().map(Math.abs)) < Math.max(...out.residuals.flat().map(Math.abs))) out = t;
  }
  apply({});
  return {pose: out.pose, residuals: out.residuals, goals, high};
}
