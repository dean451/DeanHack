// The nagas' rear (family N, stage 4 step 2): the signature, a threatened cobra's display, solved by role on the
// joints `createNaga` gives them (naga.js). Awake, a naga holds its front up in a loose lean out of the coil; at the
// hero it draws the whole neck up into a straight column over where it leaves the coil, the head hooked forward at
// the top and held level, staring down at him: from the game camera the low, leaning front becomes a tall upright
// post, the one silhouette change. CREATURE-MEASURES.md (Nagas) says a threatened cobra lifts about a third of its
// body (NAGA.rearShare); a naga's neck is only about a sixth of its length and the coil's bones are chained from the
// rise to the tip (turning one swings everything to the tip), so it lifts all of its neck and nothing of the coil:
// the share it reaches is reported by `rearPose` and pinned by the test. The column's lean and the head's hook are
// set by eye (no source gave them). A pose is {joint: {x, y, z}} (radians added to the joint's built rotation),
// applied with `birdPoser` (cockatrice-rest.js) as the rest is.
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';
import {rests, NECK, coilRings, coilDepth, samplesOf} from './naga-rest.js';

// rise: the mouth's height over the withers as a share of the neck's length (a straight upright neck reaches about 1);
// lean: how far in plan the neck's top may stand off the withers, a share of the neck's length; hook: how far ahead
// of the neck's top the mouth sits, a share of the neck's length (the head bent forward over the hero); slope and
// slack: the face's slope (degrees, nose a little down) and its give; sink: as the rest's, how far a sample of the
// head or neck may sink into the coil's tube (a share of scale).
export const REAR = {rise: .9, lean: .08, hook: .12, slope: -10, slack: 10, sink: .006};

export const rearsUp = rests;

const worldOf = o => o.getWorldPosition(new THREE.Vector3());

// The neck's length along its bones, from where it leaves the coil to the head, at the built pose.
export function neckLength(a) {
  a.g.updateMatrixWorld(true);
  const p = [...NECK, 'head'].map(n => worldOf(a.joints[n]));
  let L = 0; for (let i = 1; i < p.length; i++) L += p[i].distanceTo(p[i - 1]);
  return L;
}
// The coil's length along its bones, from the rise to the tip.
export function coilLength(a) {
  a.g.updateMatrixWorld(true);
  const p = []; for (let i = 0; a.joints[`tail${i}`]; i++) p.push(worldOf(a.joints[`tail${i}`]));
  let L = 0; for (let i = 1; i < p.length; i++) L += p[i].distanceTo(p[i - 1]);
  return L;
}

// Solves the rear (the built pose is left as it was found).
export function rearPose(a) {
  const {apply} = birdPoser(a);
  apply({});
  const P = rolesOf(a), floor = a.g.position.y, j = a.joints, L = neckLength(a);
  const rings = coilRings(a), S = samplesOf(a), withers = P.withers().clone(), s = a.g.scale.x;
  const awake = {mouth: P.mouth().y - floor, top: worldOf(j.neck4).y - floor};
  const joints = {'head.x': [-.9, .9], 'head.y': [-.4, .4]};
  for (const n of NECK) { joints[`${n}.x`] = [-1.3, 1.3]; joints[`${n}.y`] = [-.4, .4]; joints[`${n}.z`] = [-.4, .4]; }
  const top = () => worldOf(j.neck4);
  const goals = [
    // the mouth drawn up high over where the neck leaves the coil
    goal.above('mouth', withers.y + REAR.rise * L, {weight: 3}),
    // the neck a straight post: its top stands over the withers, not out ahead or to a side
    () => { const t = top(); return [3 * Math.max(0, Math.hypot(t.x - withers.x, t.z - withers.z) - REAR.lean * L)]; },
    // the head hooked forward at the top, the mouth out ahead of the neck's top and square to the front
    () => { const t = top(), m = P.mouth(); return [2 * Math.max(0, REAR.hook * L - (m.z - t.z)), 2 * Math.abs(m.x - t.x)]; },
    goal.slope('head', 'mouth', REAR.slope, {slack: REAR.slack}),
    // nothing of the head or neck through the floor or into the coil
    () => [...S.all(), ...S.mane()].map(p => 2 * Math.max(0, floor - p.y)),
    () => S.all().map(p => 2 * Math.max(0, coilDepth(rings, p) - REAR.sink * s)),
  ];
  // from the built lean: the neck drawn back upright, the head bowed forward at the top
  const start = (x, h) => { const b = {head: {x: h}}; for (const n of NECK) b[n] = {x}; return b; };
  let out = null;
  for (const base of [start(-.12, .25), start(-.2, .4), start(-.05, .15)]) {
    const t = solvePose({joints, base, goals, apply, points: P, iterations: 300, rest: .01});
    const worst = Math.max(...t.residuals.flat().map(Math.abs));
    if (!out || worst < out.worst) out = {...t, worst};
    if (worst < .005) break;
  }
  apply(out.pose);
  const reared = {mouth: P.mouth().y - floor, top: worldOf(j.neck4).y - floor};
  apply({});
  // the share of the body lifted off the floor: the neck, against the whole length
  const share = L / (L + coilLength(a));
  return {pose: out.pose, residuals: out.residuals, worst: out.worst, goals, awake, reared, neck: L, share};
}
