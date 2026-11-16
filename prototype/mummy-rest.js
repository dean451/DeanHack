// The resting mummy (family M, stage 4, step 1): standing as it was laid in the tomb, written by body role and
// solved on the joints `createMummy` rigs (three-bone arms on the chest bone `spine1`). CREATURE-MEASURES.md
// (Mummies) gives the shape: real mummies were laid with the forearms crossed over the chest (Amenhotep I, and
// non-royal mummies from about 600 BCE), so at rest the reaching arms come in and fold across the chest, each bound
// hand across the breastbone, the right forearm over the left. From the game camera the mummy's
// signature, its two arms reaching out ahead, folds away into a narrow upright bundle. The legs, trunk and head keep
// their built stoop (the signature behaviour is the next step). A pose is {joint: {x, y, z}} (radians, added to the joint's
// built rotation), as humanoid-rest.js.
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';
import {MUMMY} from './creature-measures.js';

// In the body's own space (unscaled, mummy.js's numbers): hand, where the left hand lies, just across the midline
// on the chest (x), up the chest (y) and out from its front (z; the wrapped chest's front is about .135 out there):
// the arms are too short for a hand to reach the far collarbone, so the forearms cross on the chest and the bound
// hands lie across the breastbone; the right hand lies `rise` lower and half of `over` further out. over: how far
// apart the two forearms stay at their nearest (each is about .04 thick with its bands), so the right crosses over
// the left without passing through it; clear: how far out of the chest's wrappings each forearm's middle stays.
export const REST = {hand: {x: .05, y: .77, z: .18}, over: .08, rise: .1, clear: .02};

export const rests = a => !!(a?.quirk === 'mummy' && MUMMY.armsCrossed && a.body && a.joints?.spine1 && a.joints.lfore_2 && a.joints.rfore_2);

// how close two segments (a to b, c to d) come
export function segments(a, b, c, d) {
  let m = Infinity;
  for (let i = 0; i <= 20; i++) { const p = a.clone().lerp(b, i / 20);
    const cd = d.clone().sub(c), t = Math.max(0, Math.min(1, p.clone().sub(c).dot(cd) / (cd.lengthSq() || 1)));
    m = Math.min(m, p.distanceTo(c.clone().addScaledVector(cd, t))); }
  return m;
}

// the trunk's front at a height, in the body's space: the dark body is a .14 to .17 cylinder from .47 to .89,
// squashed to .72 deep, with bands a little proud of it
export const chestFront = y => (.14 + .03 * Math.min(1, Math.max(0, (y - .47) / .42))) * .72 + .017;

// the human mummy's fold, a second start for the solver
const START = {lfore_0: {x: .2, y: .8, z: .6}, lfore_1: {x: -1.2}, lfore_2: {x: -.7, z: .6}, rfore_0: {x: .4, y: -.75, z: -.55}, rfore_1: {x: -.85}, rfore_2: {x: -.4, z: -.6}};
const worst = r => Math.max(...r.residuals.flat().map(Math.abs));

// Solves the laid-out rest (the built pose is left as it was found).
export function restPose(a) {
  // the role map measures the hands where they stand, so it is built with the arms at rest
  const j = a.joints, {apply} = birdPoser(a);
  apply({});
  const P = rolesOf(a);
  const inBody = p => a.body.worldToLocal(p.clone()), toWorld = (x, y, z) => () => a.body.localToWorld(new THREE.Vector3(x, y, z));
  const elbow = side => () => j[`${side}fore_1`].getWorldPosition(new THREE.Vector3());
  // the middle of each forearm, between the elbow and the hand
  const mid = side => () => elbow(side)().lerp(P[`paw:${side}f`](), .5);
  const joints = {};
  for (const side of ['l', 'r']) {
    for (const ax of ['x', 'y', 'z']) joints[`${side}fore_0.${ax}`] = [-2.6, 2.6];
    joints[`${side}fore_1.x`] = [-2.6, 2.6];
    joints[`${side}fore_2.x`] = [-.8, .8]; joints[`${side}fore_2.z`] = [-.8, .8];
  }
  const {hand: H, over} = REST;
  // the left hand across onto the right of the chest, the right hand, lying over the left forearm, onto the left
  const target = {l: toWorld(H.x, H.y, H.z), r: toWorld(-H.x, H.y - REST.rise, H.z + over / 2)};
  const out = (p, d) => () => { const q = inBody(p()); return [Math.max(0, chestFront(q.y) + d - q.z) * 3]; };
  // a forearm, elbow to hand, in the body's space
  const fore = side => [inBody(elbow(side)()), inBody(P[`paw:${side}f`]())];
  const goals = [
    goal.reach('paw:lf', target.l, {within: .005, weight: 3}),
    goal.reach('paw:rf', target.r, {within: .005, weight: 3}),
    // each elbow hangs at its own flank, below the shoulder and out to the side
    ...['l', 'r'].map(side => () => { const e = inBody(elbow(side)()), sh = inBody(P[`shoulder:${side}`]()), sx = side === 'l' ? -1 : 1;
      return [Math.max(0, e.y - (sh.y - .1)) * 2, Math.max(0, .1 - sx * e.x) * 2, Math.max(0, chestFront(e.y) - .03 - e.z) * 2]; }),
    // the forearms lie on the chest, not through it, and the right crosses over the left without passing through it
    out(mid('l'), REST.clear), out(mid('r'), REST.clear),
    () => [3 * Math.max(0, REST.over - segments(...fore('l'), ...fore('r')))],
  ];
  // from the built reach, and if that sticks, from a fold that suits the human mummy (a wider build can stick in
  // the first, the forearms jammed together)
  let r = null;
  for (const base of [{}, START]) {
    const s = solvePose({joints, base, goals, apply, points: P, iterations: 600, rest: .01});
    if (!r || worst(s) < worst(r)) r = s;
    if (worst(r) < .005) break;
  }
  apply({});
  return {pose: r.pose, residuals: r.residuals, goals, target: {l: target.l(), r: target.r()}};
}
