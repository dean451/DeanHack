// The nagas' rest (red, black, golden, guardian and white nagas and their hatchlings): a brooding python's, written
// by body role and solved on the joints `createNaga` gives them (naga.js). Awake, a naga holds its front reared up
// out of the coil like a cobra; at rest it lies in its coil as a python broods (CREATURE-MEASURES.md, Nagas): the
// neck laid down over the heap, the chin resting on the top of the coil and the face lying out over it, nothing
// left reared. The coil itself stays as it is (its twitch is stage 5's). No source gave the neck's angles, so the
// shares below are set by eye. A pose is {joint: {x, y, z}} (radians added to the joint's built rotation), applied
// with `birdPoser` (cockatrice-rest.js) as the other families' are.
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';

// Shares of the naga's scale (1 for a red naga): how far above the coil's top the chin may lie (the jaw resting on
// the scales), how high the neck may still ride over the coil's top (laid down on it, not reared), how far out in plan the mouth
// lies from where the neck leaves the coil, the face's slope (degrees, a little nose down) and its slack, and how far
// into the coil's tube a sample of the head or neck may sink (the scales' facets are not round).
export const REST = {chin: .015, ride: .05, out: .14, slope: -8, slack: 16, sink: .006};

export const NECK = ['neck0', 'neck1', 'neck2', 'neck3', 'neck4'];
export const rests = a => !!(a && !a.asset && a.kind === 'naga' && a.face && a.joints?.neck4 && a.joints.head && a.joints.tail11);

const partOf = (a, name) => { let m = null; a.g.traverse(o => { if (!m && o.isMesh && o.userData.part === name) m = o; }); return m; };

// The coil's tube at rest, ring by ring (seven vertices a ring, the last repeating the first): its centre and radius
// in the world. The rest pose does not move the coil, so this is read once.
export function coilRings(a) {
  const coil = partOf(a, 'coil'), v = new THREE.Vector3(), R = 7, rings = [];
  a.g.updateMatrixWorld(true); coil.skeleton.update();
  for (let i = 0; i + R <= coil.geometry.attributes.position.count; i += R) {
    const ps = []; for (let k = 0; k < R - 1; k++) ps.push(coil.getVertexPosition(i + k, v).applyMatrix4(coil.matrixWorld).clone());
    const c = ps.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(ps.length);
    rings.push({c, max: Math.max(...ps.map(p => p.distanceTo(c))), mean: ps.reduce((s, p) => s + p.distanceTo(c), 0) / ps.length});
  }
  return rings;
}

// The top of the coil under a point, seen from above: the highest of the rings it lies over (null over none).
export function coilTop(rings, p) {
  let top = null;
  for (const {c, mean} of rings) { const d2 = (p.x - c.x) ** 2 + (p.z - c.z) ** 2; if (d2 < mean * mean) { const y = c.y + Math.sqrt(mean * mean - d2); if (top === null || y > top) top = y; } }
  return top;
}

// How deep a point lies inside the coil's tube (0 outside it).
export const coilDepth = (rings, p) => { let d = 0; for (const {c, max} of rings) d = Math.max(d, max - p.distanceTo(c)); return d; };

// Sample points of the head (its own meshes, every few vertices) and of the neck's skin (all but its root, which
// grows out of the coil's last turn by construction), as posed, in the world; and of the mane (the red's flames, the
// black's spines), which is kept off the floor but may lie in among the coil's turns.
export function samplesOf(a, {step = 10} = {}) {
  const j = a.joints, s = a.g.scale.x, neck = partOf(a, 'neck'), mane = partOf(a, 'mane'), v = new THREE.Vector3(), root = j.neck0.getWorldPosition(new THREE.Vector3());
  const plain = []; j.head.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && o.visible && !o.material.transparent && o.userData.part !== 'glow') plain.push(o); });
  a.g.updateMatrixWorld(true); neck.skeleton.update();
  const keep = []; for (let i = 0; i < neck.geometry.attributes.position.count; i += 3) if (neck.getVertexPosition(i, v).applyMatrix4(neck.matrixWorld).distanceTo(root) > .14 * s) keep.push(i);
  const head = () => { const out = []; for (const m of plain) { const pos = m.geometry.attributes.position; for (let i = 0; i < pos.count; i += step) out.push(v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld).clone()); } return out; };
  const skin = () => { neck.skeleton.update(); return keep.map(i => neck.getVertexPosition(i, v).applyMatrix4(neck.matrixWorld).clone()); };
  const crest = () => { if (!mane) return []; mane.skeleton.update(); const out = []; for (let i = 0; i < mane.geometry.attributes.position.count; i++) out.push(mane.getVertexPosition(i, v).applyMatrix4(mane.matrixWorld).clone()); return out; };
  return {head, neck: skin, mane: crest, all: () => { a.g.updateMatrixWorld(true); return [...head(), ...skin()]; }};
}

// Solves the brooding rest (the built pose is left as it was found).
export function restPose(a) {
  const P = rolesOf(a), s = a.g.scale.x, floor = a.g.position.y, j = a.joints, {apply} = birdPoser(a);
  apply({});
  // the head sampled every fifth vertex: every tenth let a corner of it sink 2 cm into the coil unseen
  const rings = coilRings(a), S = samplesOf(a, {step: 5}), withers = P.withers();
  const top = Math.max(...rings.map(r => r.c.y + r.max)), reared = P.mouth().y - floor;
  const joints = {'head.x': [-.9, .9], 'head.y': [-.6, .6]};
  for (const n of NECK) { joints[`${n}.x`] = [-1.3, 1.3]; joints[`${n}.y`] = [-1.3, 1.3]; joints[`${n}.z`] = [-.8, .8]; }
  // the chin resting on the top of the coil (over the coil, within REST.chin above its scales)
  // (off the coil, 2 cm more than the distance in plan to the nearest ring's edge, so a point on the rim never passes, and the height over the coil's top instead)
  const off = p => [3 * (.02 * s + rings.reduce((b, r) => Math.min(b, Math.hypot(p.x - r.c.x, p.z - r.c.z) - r.mean), Infinity)), 3 * Math.max(0, p.y - top)];
  const onCoil = () => { const c = P.chin(), t = coilTop(rings, c); return t === null ? off(c) : [3 * Math.max(0, c.y - t - REST.chin * s), 3 * Math.max(0, t - c.y)]; };
  // the mouth over the coil too, not hanging past its rim
  const overCoil = () => { const m = P.mouth(); return coilTop(rings, m) === null ? off(m) : [0, 0]; };
  const goals = [
    onCoil, overCoil,
    // the face lying out over the coil, away from where the neck leaves it, nose a little down
    P => { const m = P.mouth(); return [2 * Math.max(0, REST.out * s - Math.hypot(m.x - withers.x, m.z - withers.z))]; },
    goal.slope('head', 'mouth', REST.slope, {slack: REST.slack}),
    // the neck laid down on the coil, not reared: nothing of it rides higher than REST.ride over the coil's top
    () => S.neck().map(p => 2 * Math.max(0, p.y - (top + REST.ride * s))),
    // nothing of the head or neck through the floor or into the coil
    () => [...S.all(), ...S.mane()].map(p => 2 * Math.max(0, floor - p.y)),
    () => S.all().map(p => 2 * Math.max(0, coilDepth(rings, p) - REST.sink * s)),
  ];
  // starting curls: the neck bowed forward and swung round to either side, or bowed straight ahead
  const curl = (x, y) => { const b = {head: {x: -.3}}; for (const n of NECK) b[n] = {x, y}; return b; };
  let out = null;
  for (const base of [curl(.35, .45), curl(.35, -.45), curl(.45, 0), curl(.25, .7), curl(.25, -.7)]) {
    const t = solvePose({joints, base, goals, apply, points: P, iterations: 200, rest: .01});
    const worst = Math.max(...t.residuals.flat().map(Math.abs));
    if (!out || worst < out.worst) out = {...t, worst};
    if (worst < .005) break;
  }
  apply({});
  return {pose: out.pose, residuals: out.residuals, worst: out.worst, goals, reared, top};
}
