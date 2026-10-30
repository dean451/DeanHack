// The resting hobbit, dwarf and bugbear: a slumped sit on the floor, written by body role and solved on the
// joints `rigHumanoid` exposes. The pelvis drops to the floor, the legs go out ahead of it with the heels down, the
// back rounds forward over the hips, the head hangs low on its neck and the hands lie on the thighs. No source gave a
// slumped sitting posture as an angle (CREATURE-MEASURES.md, Humanoids), so its proportions are set by eye. A pose is
// {joint: {x, y, z}} (radians, added to the joint's built rotation) and hipsY, the body's drop in body units, as the
// gargoyle's (gargoyle-rest.js).
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';

// Shares of the creature's standing hip height: how far the neck's root
// stoops in front of it, how low the mouth hangs (highest allowed) and how far ahead of the hip a heel lies (at least).
export const REST = {stoop: .22, head: .8, legs: .55, lap: .15};

// The pelvis's own bottom: the lowest vertex the hips bone mostly carries, as the creature stands.
function pelvisBottom(a) {
  let bottom = Infinity;
  const v = new THREE.Vector3();
  a.g.updateMatrixWorld(true);
  a.g.traverse(m => {
    if (!m.isSkinnedMesh) return;
    const k = m.skeleton.bones.indexOf(a.joints.hips), at = m.geometry.attributes, n = at.position.count;
    if (k < 0) return;
    m.skeleton.update();
    for (let i = 0; i < n; i++) for (let c = 0; c < 4; c++) if (at.skinIndex.getComponent(i, c) === k && at.skinWeight.getComponent(i, c) > .5) bottom = Math.min(bottom, m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld).y);
  });
  return bottom;
}

// A robe hangs from the hips to the floor, so the pelvis has no depth to sit on and the hem floats: the mind flayers
// stay up until their robe is posed (what is left of stage 4).
export const rests = a => !!(a && a.joints?.rfore_2 && a.joints.lleg1_2 && a.joints.spine1 && a.joints.neck3 && !a.joints.tail0 && !a.rig
  && pelvisBottom(a) - a.g.position.y > .25 * (rolesOf(a).rump().y - a.g.position.y));

// Solves the sitting pose (the built pose is left as it was found).
export function restPose(a) {
  const P = rolesOf(a), s = a.g.scale.x, floor = a.g.position.y, j = a.joints, {apply} = birdPoser(a);
  const stand = P.rump().y - floor, withers = P.withers().y - floor, mouth = P.mouth().y - floor;
  const joints = {hipsY: [-1, 0]};
  for (const n of ['spine0', 'spine1', 'neck0', 'neck1', 'neck2', 'neck3']) joints[`${n}.x`] = [-.9, .9];
  for (const side of ['l', 'r']) {
    for (const i of [0, 1, 2]) joints[`${side}leg1_${i}.x`] = [-2.4, 2.4];
    for (const i of [0, 1]) { joints[`${side}fore_${i}.x`] = [-2.6, 2.6]; joints[`${side}fore_${i}.z`] = [-.8, .8]; }
  }
  const seat = Math.max(0, P.rump().y - pelvisBottom(a)) + .01 * s;
  const goals = [goal.below('rump', floor + seat, {weight: 3}), goal.below('head', floor + mouth + (withers - mouth) * .4, {weight: 1})];
  const lowest = group => () => { const b = new THREE.Box3().setFromObject(group, true); return [new THREE.Vector3(0, b.min.y, 0)]; }
  for (const side of ['l', 'r']) {
    goals.push(goal.floor(`paw:${side}h`, {y: floor, weight: 3}), goal.ahead('rump', `paw:${side}h`, REST.legs * stand, {within: .08 * s}));
    // the hand lies on the thigh at its own side, between the hip and the heel, a little above it
    goals.push(goal.reach(`paw:${side}f`, () => P[`hip:${side}`]().lerp(P[`paw:${side}h`](), .3).add(new THREE.Vector3(P[`shoulder:${side}`]().x - P[`hip:${side}`]().x, REST.lap * stand, 0)), {within: .06 * s}));
  }
  goals.push(goal.ahead('rump', 'withers', REST.stoop * stand, {within: .06 * s}), goal.below('mouth', floor + REST.head * mouth, {weight: 2}));
  for (const name of Object.keys(j).filter(n => /^[lr](leg1|fore)$|^head/.test(n))) goals.push(goal.clear(lowest(j[name]), {y: floor - .008 * s}));
  // the hide (trunk and limbs, one skin) stays above the floor: every fifth vertex, as it now stands
  const skins = [], v = new THREE.Vector3();
  a.g.traverse(o => { if (o.isSkinnedMesh) skins.push(o); });
  goals.push(goal.clear(() => { const out = []; for (const m of skins) { m.updateMatrixWorld(true); m.skeleton.update(); for (let i = 0; i < m.geometry.attributes.position.count; i += 5) out.push(m.getVertexPosition(i, v).clone().applyMatrix4(m.matrixWorld)); } return out; }, {y: floor - .008 * s, weight: 2}));
  const out = solvePose({joints, base: {hipsY: -.3 * stand / s, lfore_1: {x: -1}, rfore_1: {x: -1}, lleg1_0: {x: -.9}, rleg1_0: {x: -.9}}, goals, apply, points: P, iterations: 1500, rest: .01});
  apply({});
  return {pose: out.pose, residuals: out.residuals, goals, stand, seat};
}
