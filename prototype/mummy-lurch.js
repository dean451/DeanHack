// The mummies' lurch (family M, stage 4 step 2): the signature, the shamble's stiff-knee stride caught at its swing,
// thrown at the hero. CREATURE-MEASURES.md (Mummies) gives the leg: a mummy's knee bends no more than about 15
// degrees at the top of the swing (the middle of the badly stiff sample, 7 to 26, MUMMY.swingKnee; well under the 40
// that marks a stiff knee), so the swinging leg goes forward nearly straight and clears the floor by a hike of the
// hip, not by swinging out to the side (MUMMY.hipHike). So the mummy hangs on its planted right leg, the pelvis
// hiked up on the left, the stiff left leg swung out ahead with its foot dragged just off the floor, the trunk pitched
// on over it and both bound arms flung up and out at the hero, the hands as high as the face: from the game camera
// the narrow upright bundle of the rest (mummy-rest.js) splits into a long reaching lunge, the one silhouette change.
// The hike's angle, the stride and the reach are set by eye (no source gave them, see "Not found"). A pose is
// {joint: {x, y, z}} (radians, added to the joint's built rotation), hipsY (the body's drop in body units) and
// body: {z}, the whole body's roll: the legs hang off the body, not the hips bone, so the pelvis hikes by rolling the
// body and the spine rolls back upright.
import * as THREE from 'three';
import {skinSampler, lowestY} from './skin-points.js';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';
import {rests} from './mummy-rest.js';
import {lineTip} from './gnome-waddle.js';
import {MUMMY} from './creature-measures.js';

// hike: how far the hip line tips, left hip up (degrees, by eye), give or take slack; level: how far the shoulder
// line may stay tipped. Shares of the standing hip height (rump): step, how far the swinging left heel lies ahead of
// the pelvis; lift and drag, the least and the most it hangs off the floor (dragged just clear); reach, how far the hands are flung ahead
// of the withers; pitch, how far the withers lean out ahead of the pelvis. hands: the lowest a hand may be, as a share
// of the mouth's standing height.
export const LURCH = {hike: 6, slack: 1.5, level: 4, step: .32, lift: .03, drag: .14, reach: .7, pitch: .2, hands: .9};

export const lurches = a => !!(rests(a) && MUMMY.hipHike && a.joints.lleg1_2 && a.joints.rleg1_2 && a.joints.spine0);

// Applies a lurch pose: the joints and the body's drop as birdPoser does, then the whole body's roll.
export function lurchPoser(a) {
  const bird = birdPoser(a);
  if (!a.jointRest.roll) a.jointRest.roll = {z: a.body.rotation.z};
  const {roll} = a.jointRest;
  const apply = pose => {
    bird.apply(pose);
    a.body.rotation.z = roll.z + (pose.body?.z || 0);
    a.g.updateMatrixWorld(true);
  };
  return {apply, rest: bird.rest};
}

// The knee's bend (radians) in a pose: the built knee is straight, so it is the pose's own turn.
export const kneeBend = (pose, side) => Math.abs(pose[`${side}leg1_1`]?.x || 0);

const worst = r => Math.max(...r.residuals.flat().map(Math.abs));

// Solves the lurch (the built pose is left as it was found).
export function lurchPose(a, {hide = true} = {}) {
  const {apply} = lurchPoser(a);
  apply({});
  const P = rolesOf(a), s = a.g.scale.x, floor = a.g.position.y, j = a.joints;
  const stand = P.rump().y - floor, mouth = P.mouth().y - floor;
  const joints = {'body.z': [-.3, .3], hipsY: [-.15, .1]};
  for (const n of ['spine0', 'spine1']) { joints[`${n}.x`] = [-.2, .5]; joints[`${n}.z`] = [-.3, .3]; }
  for (const k of ['l', 'r']) {
    // the knee bends only the one way, and no further than the mummy's stiff swing; the arm swings up at the shoulder
    joints[`${k}leg1_0.x`] = [-1.2, 1.2]; joints[`${k}leg1_0.z`] = [-.3, .3];
    joints[`${k}leg1_1.x`] = [0, MUMMY.swingKnee]; joints[`${k}leg1_2.x`] = [-.6, .6];
    joints[`${k}fore_0.x`] = [-1.6, 1.6]; joints[`${k}fore_0.z`] = [-.4, .4];
    joints[`${k}fore_1.x`] = [-.6, 0];
  }
  const hipTip = P => { const l = P['hip:l'](), r = P['hip:r'](); return (l.y > r.y ? 1 : -1) * lineTip(l, r); };
  const stance = P['paw:rh']().clone();
  const goals = [
    // the pelvis hiked up on the swinging side; the shoulders carried back level
    P => [2 * Math.max(0, Math.abs(hipTip(P) - LURCH.hike) - LURCH.slack) / 10],
    P => [Math.max(0, lineTip(P['shoulder:l'](), P['shoulder:r']()) - LURCH.level) / 10],
    // the right foot planted where it stood; the stiff left swung ahead, dragged just clear of the floor
    goal.reach('paw:rh', () => stance, {weight: 3}),
    goal.ahead('rump', 'paw:lh', LURCH.step * stand, {within: .04 * stand, weight: 2}),
    goal.above('paw:lh', floor + LURCH.lift * stand, {weight: 3}), goal.below('paw:lh', floor + LURCH.drag * stand, {weight: 3}),
    P => [3 * Math.max(0, P['paw:lh']().x - P.rump().x + .05 * s)],
    // the trunk pitched on over the stride, the hands flung out ahead and up at the face
    goal.ahead('rump', 'withers', LURCH.pitch * stand, {within: .04 * stand, weight: 2}),
    goal.ahead('withers', 'paw:lf', LURCH.reach * stand, {within: .05 * stand, weight: 2}),
    goal.ahead('withers', 'paw:rf', LURCH.reach * stand, {within: .05 * stand, weight: 2}),
    goal.above('paw:lf', floor + LURCH.hands * mouth), goal.above('paw:rf', floor + LURCH.hands * mouth),
  ];
  // nothing of the hide, a limb or the head through the floor (the hide at every seventh vertex; the test checks all of them)
  const lowest = group => () => [new THREE.Vector3(0, lowestY(group), 0)]; // setFromObject(group, true).min.y, faster (skin-points.js)
  for (const name of Object.keys(j).filter(n => /^[lr](leg1|fore)$|^head/.test(n))) goals.push(goal.clear(lowest(j[name]), {y: floor - .008 * s}));
  const skins = [];
  a.g.traverse(o => { if (o.isSkinnedMesh) skins.push(o); });
  if (hide) goals.push(goal.clear(skinSampler(skins, 7), {y: floor - .008 * s, weight: 2}));
  const start = {body: {z: -.08}, spine0: {x: .15, z: .06}, spine1: {x: .1, z: .04}, lleg1_0: {x: -.5}, lleg1_1: {x: .15}, rleg1_0: {x: .15},
    lfore_0: {x: -.3}, rfore_0: {x: -.3}};
  let out = null;
  // a wider-shouldered or longer-armed build can stick in the first; the second starts the arms higher and the stride short
  for (const base of [start, {...start, lleg1_0: {x: -.3}, lfore_0: {x: -.6}, rfore_0: {x: -.6}, spine0: {x: .05}}, {...start, body: {z: .08}}]) {
    const t = solvePose({joints, base, goals, apply, points: P, iterations: 600, rest: .01});
    if (!out || worst(t) < worst(out)) out = t;
    if (worst(out) < .005) break;
  }
  apply({});
  return {pose: out.pose, residuals: out.residuals, goals, stand, mouth};
}
