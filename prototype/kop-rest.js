// The resting Kop (family K, stage 4, step 1): a policeman standing at ease, written by body role and solved on the
// joints `kop()` rigs (rigBody and three-bone limbs, as the humanoids'). CREATURE-MEASURES.md (Kops) gives the drill:
// the left foot moves out, the right stays put, and the hands go behind to the small of the back, centred on the
// belt; the trunk stays upright and the head level. The foot's move is the soldier's 10 to 12 inches (KOP.atEaseFeet)
// on a man; a Kop is a 1.2-unit caricature with no measured leg, so the move is taken as the same share of its
// height as on a man of 1.75 m (set by eye: no source gave a stature for the drill). The right fist still holds the
// truncheon, so at ease it pokes out behind the hip, a club tucked away rather than put down. A pose is
// {joint: {x, y, z}} (radians, added to the joint's built rotation) and hipsY, the body's drop, as humanoid-rest.js.
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';
import {KOP} from './creature-measures.js';
import {KOP_BELT_Y} from './creatures.js';

const MAN = 1.75;
// out: the left foot's move as a share of the Kop's height; back: how far behind the trunk's back the hands are held
// (share of the hip height); clasp: how far apart the two hands may be (share of the hip height); upright: how far the withers may stray from
// over the pelvis (share of the hip height).
export const REST = {out: KOP.atEaseFeet / MAN, back: .1, clasp: .14, upright: .05};

// only kop() builds a head pivoting at the collar under the whole face (body-roles.js reads it too)
export const isKop = a => !!a?.headAtCollar;
export const rests = a => !!(isKop(a) && a.joints?.rfore_2 && a.joints.lleg1_2 && a.joints.spine1 && a.joints.neck3 && a.body);

// The trunk's back at a height: the hide's furthest-back vertex within a band around `y` (world), as the Kop stands.
function backAt(a, y, band) {
  let z = Infinity;
  const v = new THREE.Vector3();
  a.g.updateMatrixWorld(true);
  a.g.traverse(m => {
    if (!m.isSkinnedMesh) return;
    m.skeleton.update();
    const n = m.geometry.attributes.position.count;
    for (let i = 0; i < n; i++) { m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld); if (Math.abs(v.y - y) < band && Math.abs(v.x - a.g.position.x) < band) z = Math.min(z, v.z); }
  });
  return z;
}

// Solves the stance (the built pose is left as it was found).
export function restPose(a) {
  const P = rolesOf(a), s = a.g.scale.x, floor = a.g.position.y, {apply} = birdPoser(a);
  apply({});
  const stand = P.rump().y - floor, height = new THREE.Box3().setFromObject(a.g, true).max.y - floor;
  const belt = a.body.localToWorld(new THREE.Vector3(0, KOP_BELT_Y, 0)).y, back = backAt(a, belt, .08 * stand) - REST.back * stand, mid = a.g.position.x;
  const out = REST.out * height, lFoot = P['paw:lh']().clone(), rFoot = P['paw:rh']().clone();
  const joints = {hipsY: [-.05 * stand / s, 0]};
  for (const n of ['spine0', 'spine1', 'neck1', 'neck2']) joints[`${n}.x`] = [-.3, .3];
  for (const side of ['l', 'r']) {
    for (const i of [0, 1, 2]) joints[`${side}leg1_${i}.x`] = [-.8, .8];
    joints[`${side}leg1_0.z`] = [-.6, .6]; joints[`${side}leg1_2.z`] = [-.8, .8];
    for (const ax of ['x', 'y', 'z']) joints[`${side}fore_0.${ax}`] = [-3, 3];
    joints[`${side}fore_1.x`] = [-2.6, 2.6];
    joints[`${side}fore_2.x`] = [-1.2, 1.2];
  }
  const hand = side => () => new THREE.Vector3(mid + (side === 'l' ? -.5 : .5) * REST.clasp * stand, belt, back);
  const goals = [
    // the left foot steps out by the drill's move and the weight settles between the feet: the body stands on its tile
    // centre, so each foot ends half the move out from where it stood, flat on the floor
    goal.reach('paw:rh', () => rFoot.clone().add(new THREE.Vector3(out / 2, 0, 0)), {within: .005 * s, weight: 4}),
    goal.reach('paw:lh', () => lFoot.clone().add(new THREE.Vector3(-out / 2, 0, 0)), {within: .005 * s, weight: 4}),
    // upright: the withers over the pelvis, the head kept at its standing height
    goal.ahead('rump', 'withers', 0, {within: REST.upright * stand, weight: 2}),
    goal.reach('paw:lf', hand('l'), {within: .02 * s, weight: 2}),
    goal.reach('paw:rf', hand('r'), {within: .02 * s, weight: 2}),
  ];
  // each boot's sole stays flat: three points of the foot bone (heel, toe, outer edge) at the height they stood at
  for (const side of ['l', 'r']) {
    const foot = a.joints[`${side}leg1_2`], sole = P[`paw:${side}h`]();
    const marks = [[0, 0, -.03], [0, 0, .05], [.03, 0, 0]].map(([x, y, z]) => { const w = sole.clone().add(new THREE.Vector3(x * s, y, z * s)); return {y: w.y, at: foot.worldToLocal(w)}; });
    goals.push(() => marks.map(m => 2 * (foot.localToWorld(m.at.clone()).y - m.y)));
  }
  const mouth = P.mouth().y;
  goals.push(goal.above('mouth', mouth - .03 * stand), goal.below('mouth', mouth + .03 * stand));
  const r = solvePose({joints, base: {lfore_0: {x: .6}, rfore_0: {x: 2.4}, lfore_1: {x: -.8}, rfore_1: {x: -.8}}, goals, apply, points: P, iterations: 1500, rest: .01});
  apply({});
  return {pose: r.pose, residuals: r.residuals, goals, stand, height, out, belt, back};
}
