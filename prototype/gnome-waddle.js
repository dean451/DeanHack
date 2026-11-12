// The gnomes' waddle (gnome, gnome lord, gnome king, gnomish wizard; family G, stage 4 step 2): the signature, the
// waddle caught at its widest, a short-legged person's stride with the pelvis swung round hard. CREATURE-MEASURES.md
// (Gnomes) gives the swing: the pelvis turns about the vertical through 28.7 degrees a stride in adults with
// achondroplasia against a person's 12.2 to 19.6, about 14 degrees each way from straight, while its side-to-side tip
// is no more than a person's (about 4 degrees each way). So the gnome plants its left boot well ahead, its left hip
// swung forward into the step, the shoulders twisted back square to the front and the weapon arm thrown forward
// against the leading leg: a squat little thing stopped in a lurching stride, the one silhouette change from the game
// camera (the boots split fore and aft, the hip skewed, the weapon out ahead). The stride's length and the arm's
// swing are set by eye (no source gave them as a share of a short leg). A pose is {joint: {x, y, z}} (radians, added
// to the joint's built rotation), hipsY (the body's drop in body units) and body: {y}, the whole body's turn: the
// legs hang off the body, not the hips bone, so the pelvis turns by turning the body and the spine twists back.
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';
import {isGnomeBody} from './gnome-rest.js';
import {GNOME} from './creature-measures.js';

// turn: the pelvis's swing from straight (degrees, the adult's 28.7 a stride halved: GNOME.waddleYaw), give or take
// slack; square: how far the shoulder line may stay turned; tip: the most the hip line may tip side to side (a
// person's, GNOME.waddleRoll). Shares of the standing hip
// height (rump): step, how far each heel lies ahead of (left) or behind (right) the pelvis; swing, how far the right
// hand is thrown ahead of the withers and the left swung behind the pelvis; lift, the lowest a hand may hang; head,
// the lowest the mouth may sink, as a share of its standing height.
const DEG = 180 / Math.PI;
export const WADDLE = {turn: GNOME.waddleYaw[1] * DEG, slack: 2, square: 5, tip: GNOME.waddleRoll * DEG, step: .42, swing: .3, lift: .35, head: .9};

export const waddles = a => !!(isGnomeBody(a) && a.joints?.rfore_2 && a.joints.lleg1_2 && a.joints.spine1 && a.body);

// Applies a waddle pose: the joints and the body's drop as birdPoser does, then the whole body's turn.
export function waddlePoser(a) {
  const bird = birdPoser(a);
  if (!a.jointRest.turn) a.jointRest.turn = {y: a.body.rotation.y};
  const {turn} = a.jointRest;
  const apply = pose => {
    bird.apply(pose);
    a.body.rotation.y = turn.y + (pose.body?.y || 0);
    a.g.updateMatrixWorld(true);
  };
  return {apply, rest: bird.rest};
}

const deg = r => r * 180 / Math.PI;
// The line from the right point to the left one, its turn about the vertical (degrees; positive when the left end is
// ahead) and its tip (degrees from level).
export const lineTurn = (l, r) => deg(Math.atan2(l.z - r.z, r.x - l.x));
export const lineTip = (l, r) => deg(Math.atan2(Math.abs(l.y - r.y), Math.hypot(l.x - r.x, l.z - r.z)));

const worst = r => Math.max(...r.residuals.flat().map(Math.abs));

// Solves the waddle (the built pose is left as it was found).
export function waddlePose(a) {
  const {apply} = waddlePoser(a);
  apply({});
  const P = rolesOf(a), s = a.g.scale.x, floor = a.g.position.y, j = a.joints;
  const stand = P.rump().y - floor, mouth = P.mouth().y - floor;
  const side = {l: Math.abs(P['paw:lh']().x), r: Math.abs(P['paw:rh']().x)};
  const joints = {'body.y': [0, .5], hipsY: [-.4, .05]};
  for (const n of ['spine0', 'spine1']) { joints[`${n}.y`] = [-.5, .5]; joints[`${n}.x`] = [-.4, .4]; }
  for (const n of ['neck0', 'neck1']) joints[`${n}.y`] = [-.4, .4];
  for (const k of ['l', 'r']) {
    // a knee bends only one way (positive swings the boot back) and an elbow only the other (negative brings the hand up)
    joints[`${k}leg1_0.x`] = [-1.6, 1.6]; joints[`${k}leg1_1.x`] = [0, 2]; joints[`${k}leg1_2.x`] = [-1, 1];
    joints[`${k}leg1_0.z`] = [-.3, .3];
    joints[`${k}fore_0.x`] = [-2.2, 2.2]; joints[`${k}fore_1.x`] = [-2.2, 0];
    joints[`${k}fore_0.z`] = [-.3, .3];
  }
  const goals = [
    // the pelvis swung round, left hip forward; the shoulders square to the front; the hip line level
    P => [2 * Math.max(0, Math.abs(lineTurn(P['hip:l'](), P['hip:r']()) - WADDLE.turn) - WADDLE.slack) / 10],
    P => [2 * Math.max(0, Math.abs(lineTurn(P['shoulder:l'](), P['shoulder:r']())) - WADDLE.square) / 10],
    P => [Math.max(0, lineTip(P['hip:l'](), P['hip:r']()) - WADDLE.tip) / 10],
    // the left boot planted ahead, the right behind, both flat on the floor and each on its own side
    goal.floor('paw:lh', {y: floor, weight: 3}), goal.floor('paw:rh', {y: floor, weight: 3}),
    goal.ahead('rump', 'paw:lh', WADDLE.step * stand, {within: .04 * stand, weight: 2}),
    goal.ahead('rump', 'paw:rh', -WADDLE.step * stand, {within: .04 * stand, weight: 2}),
    P => [3 * Math.max(0, P['paw:lh']().x - P.rump().x + .6 * side.l), 3 * Math.max(0, P.rump().x - P['paw:rh']().x + .6 * side.r)],
    // the weapon arm thrown ahead against the leading leg, the other swung back; neither hand dragging low
    goal.ahead('withers', 'paw:rf', WADDLE.swing * stand, {within: .05 * stand, weight: 2}),
    goal.ahead('rump', 'paw:lf', -WADDLE.swing * stand, {within: .05 * stand, weight: 2}),
    goal.above('paw:rf', floor + WADDLE.lift * stand), goal.above('paw:lf', floor + WADDLE.lift * stand),
    // the head carried up, not slumped
    goal.above('mouth', floor + WADDLE.head * mouth, {weight: 2}),
  ];
  // nothing of the hide, a limb or the head through the floor (the hide at every third vertex, as gnome-rest.js)
  const lowest = group => () => { const b = new THREE.Box3().setFromObject(group, true); return [new THREE.Vector3(0, b.min.y, 0)]; };
  for (const name of Object.keys(j).filter(n => /^[lr](leg1|fore)$|^head/.test(n))) goals.push(goal.clear(lowest(j[name]), {y: floor - .008 * s}));
  const skins = [], v = new THREE.Vector3();
  a.g.traverse(o => { if (o.isSkinnedMesh) skins.push(o); });
  goals.push(goal.clear(() => { const out = []; for (const m of skins) { m.updateMatrixWorld(true); m.skeleton.update(); for (let i = 0; i < m.geometry.attributes.position.count; i += 3) out.push(m.getVertexPosition(i, v).clone().applyMatrix4(m.matrixWorld)); } return out; }, {y: floor - .008 * s, weight: 2}));
  // starting points: the legs split one way or the other at the hip (the solver finds the signs), knees a little bent
  const start = k => ({body: {y: .25}, hipsY: -.03, spine0: {y: -.12}, spine1: {y: -.12}, lleg1_0: {x: -.6 * k}, lleg1_1: {x: .3}, rleg1_0: {x: .5 * k}, rleg1_1: {x: .3},
    rfore_0: {x: -.6 * k}, rfore_1: {x: -.4}, lfore_0: {x: .5 * k}, lfore_1: {x: -.2}});
  let out = null;
  for (const base of [start(1), start(-1)]) {
    const t = solvePose({joints, base, goals, apply, points: P, iterations: 600, rest: .01});
    if (!out || worst(t) < worst(out)) out = t;
    if (worst(out) < .005) break;
  }
  apply({});
  return {pose: out.pose, residuals: out.residuals, goals, stand, mouth};
}
