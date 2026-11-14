// The Kops' halt (family K, stage 4 step 2): the signature, set off by the hero. A policeman stops a wrongdoer the
// way a traffic constable stops a cart: the left arm thrust straight out at the hero at shoulder height, the right
// fist cocking the truncheon back high over the helmet, the trunk rocked back on its heels and the chin up, the feet
// left planted where they stood. From the game camera it is one silhouette change: at rest the left fist sits on the
// hip and the club rides by the shoulder; halting, an arm points straight out ahead and the club stands up behind the
// helmet. CREATURE-MEASURES.md (Kops) found no number for any of this (only the run's cadence and the stand at
// ease), so every share below is set by eye. A pose is {joint: {x, y, z}} (radians, added to the joint's built
// rotation) and hipsY, as kop-rest.js; the legs are not posed at all, so the boots cannot leave the floor.
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';
import {isKop} from './kop-rest.js';

// Shares of the standing hip height (rump): reach, how far ahead of the withers the stopping wrist is thrust; level,
// how far it may stray from the shoulder's height; inward, how far in from the shoulder toward the middle it points
// (share of the shoulder's half-width); raise, how far over the mouth the club fist is held; cock, how far behind the
// withers it is drawn back; wide, how far out past the shoulder it may stray (share of the shoulder's half-width);
// lean, how far the withers rock back behind the pelvis; chin, the most the mouth may sink below its standing
// height; straight, the stopping arm's reach from shoulder to wrist as a share of its two bones' length (a locked arm, not a wave).
export const HALT = {reach: .5, level: .06, inward: .35, raise: .5, cock: .15, wide: .3, lean: .1, chin: .02, straight: .92};

export const halts = a => !!(isKop(a) && a.joints?.lfore_2 && a.joints.rfore_2 && a.joints.spine1 && a.joints.neck3 && a.body);

const worst = r => Math.max(...r.residuals.flat().map(Math.abs));

// Solves the halt (the built pose is left as it was found).
export function haltPose(a) {
  const P = rolesOf(a), s = a.g.scale.x, floor = a.g.position.y, {apply} = birdPoser(a);
  apply({});
  const stand = P.rump().y - floor, mouth = P.mouth().y, shoulder = P['shoulder:l']().clone();
  const w = n => a.joints[n].getWorldPosition(new THREE.Vector3()), arm = w('lfore_0').distanceTo(w('lfore_1')) + w('lfore_1').distanceTo(w('lfore_2'));
  const joints = {};
  for (const n of ['spine0', 'spine1', 'neck1', 'neck2']) joints[`${n}.x`] = [-.35, .35];
  for (const side of ['l', 'r']) {
    for (const ax of ['x', 'y', 'z']) joints[`${side}fore_0.${ax}`] = [-3, 3];
    // the built elbow folds in the arm's own plane, which on the left arm (fist on the hip) lies mostly about z, so
    // straightening it takes both axes
    joints[`${side}fore_1.x`] = [-2.6, 2.6]; joints[`${side}fore_1.z`] = [-2.6, 2.6];
    joints[`${side}fore_2.x`] = [-1.2, 1.2];
  }
  const goals = [
    // the stopping arm straight out ahead, its wrist at the shoulder's height and a little in toward the middle (the
    // wrist, not the fist: the fist's lowest point drops as the hand turns up to show its palm)
    P => { const h = w('lfore_2'), sh = P['shoulder:l'](), wi = P.withers(); return [
      2 * Math.max(0, Math.abs(h.z - wi.z - HALT.reach * stand) - .03 * stand),
      2 * Math.max(0, Math.abs(h.y - sh.y) - HALT.level * stand),
      2 * (h.x - (1 - HALT.inward) * shoulder.x - (sh.x - shoulder.x))]; },
    () => [2 * Math.max(0, HALT.straight * arm - w('lfore_0').distanceTo(w('lfore_2')))],
    // the club fist high over the helmet's face, drawn back behind the withers and kept over its own shoulder
    goal.above('paw:rf', mouth + HALT.raise * stand, {weight: 2}),
    P => [2 * Math.max(0, P['paw:rf']().x - P['shoulder:r']().x * (1 + HALT.wide))],
    goal.ahead('withers', 'paw:rf', -HALT.cock * stand, {within: .03 * stand, weight: 2}),
    // rocked back: the withers behind the pelvis; the chin up, not ducked
    goal.ahead('rump', 'withers', -HALT.lean * stand, {within: .02 * stand, weight: 2}),
    goal.above('mouth', mouth - HALT.chin * stand, {weight: 2}),
  ];
  // the two fists stay out of the trunk: each hand at least its own half-width clear of the spine's line
  goals.push(P => ['l', 'r'].map(k => { const h = P[`paw:${k}f`](), w = P.withers(); return 3 * Math.max(0, .06 * s - Math.hypot(h.x - w.x, h.z - w.z)); }));
  // starting points: the stopping elbow already near straight (about x .8, z -1.6 on the built arm), the shoulder
  // swung forward one way or another
  const start = {lfore_1: {x: .8, z: -1.6}, rfore_0: {x: .4}, rfore_1: {x: -.3}, spine1: {x: .1}};
  let out = null;
  for (const base of [{...start, lfore_0: {x: -1.2}}, {...start, lfore_0: {x: -.6, y: .6}}, {...start, lfore_0: {x: .6, z: -.8}}]) {
    const t = solvePose({joints, base, goals, apply, points: P, iterations: 800, rest: .01});
    if (!out || worst(t) < worst(out)) out = t;
    if (worst(out) < .005) break;
  }
  apply({});
  return {pose: out.pose, residuals: out.residuals, goals, stand, mouth, floor};
}
