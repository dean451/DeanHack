import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The Kop's stopping hand (review finding 2026-11-15): the halt throws the left arm out at the hero, and the hand on
// the end of it is the gesture's focal point, so it is an open, flat, grubby white cotton glove, not a ball. Built in
// its own frame with the wrist at the origin: the palm faces +z, the fingers point up +y and the thumb sticks out to
// +x (toward the body's middle when the left palm is shown to the front). The Kop's builder turns the whole glove so
// this frame lines up with the model's own frame in the baked halt (`haltGloveTurn`), so the palm faces the hero.
// Faceted on purpose (six-sided digits, a hard-edged palm): a stiff starched glove, the knuckles a little cocked back.
// One mesh, so it costs what the ball did (one draw, and the Kops' mesh caps hold): its geometry keeps each piece as a
// group, named in order in `geometry.userData.parts` ('palm', four 'finger', one 'thumb'); one material, so the groups
// do not split the draw.

const seg = (a, b, r0, r1, sides = 6) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length();
  const geo = new THREE.CylinderGeometry(r1, r0, len, sides);
  geo.applyMatrix4(new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, 1, 1)));
  return geo;
};
const knob = (p, r) => { const g = new THREE.IcosahedronGeometry(r, 0); g.translate(...p); return g; };
const one = list => { const g = mergeGeometries(list.map(x => x.index ? x.toNonIndexed() : x)); g.computeVertexNormals(); return g; };

// [x across the palm, length] of the four fingers, index (thumb side, +x) to little; middle longest, little shortest
export const FINGERS = [[.021, .046], [.007, .052], [-.007, .048], [-.021, .038]];
export const PALM = {w: .062, h: .058, d: .02};

export function kopGlove(material) {
  const g = new THREE.Group(); g.name = 'KopGlove';
  const parts = [], names = [], add = (geo, partName) => { parts.push(geo); names.push(partName); };
  // a flared cotton cuff over the wrist, then the flat palm, a touch thicker at the heel than at the knuckles
  const cuff = new THREE.CylinderGeometry(.03, .026, .03, 6); cuff.translate(0, .002, 0);
  const palm = new THREE.BoxGeometry(PALM.w, PALM.h, PALM.d); palm.translate(0, .016 + PALM.h / 2, 0);
  const heel = new THREE.BoxGeometry(PALM.w * .8, .018, PALM.d * 1.25); heel.translate(-.004, .026, -.002);
  add(one([cuff, palm, heel]), 'palm');
  // four stiff fingers, splayed a little, each in two joints: a straight base and a tip bent back (away from the hero)
  const top = .016 + PALM.h;
  FINGERS.forEach(([x, len], i) => {
    const splay = x * 1.6, r = i === 3 ? .0068 : .0078, K = [x, top - .004, 0];
    const M = [x + splay * len * .6, top + len * .6, -.002], T = [x + splay * len, top + len, -.009];
    add(one([seg(K, M, r, r * .94), seg(M, T, r * .94, r * .78), knob(M, r * 1.02), knob(T, r * .8)]), 'finger');
  });
  // the thumb out from the side of the palm, up and a little forward, as a hand held up to stop a cart
  const T0 = [PALM.w / 2 - .006, .03, .002], T1 = [PALM.w / 2 + .014, .052, .007], T2 = [PALM.w / 2 + .024, .072, .004];
  add(one([seg(T0, T1, .0095, .0088), seg(T1, T2, .0088, .0074), knob(T1, .0092), knob(T2, .0076)]), 'thumb');
  const geo = mergeGeometries(parts, true); geo.userData.parts = names;
  const m = new THREE.Mesh(geo, material); m.name = 'KopGloveHand'; m.userData.part = 'glove'; m.castShadow = m.receiveShadow = true; g.add(m);
  return g;
}

// The turn that lines the glove's frame up with the model's (g's) frame when `pose` (radians added to each joint's
// built rotation, as birdPoser applies them) is held: the inverse of the wrist bone's turn in g. Leaves the joints as
// they were found.
export function haltGloveTurn(a, bone, pose) {
  const saved = Object.entries(a.joints).map(([n, o]) => [o, o.rotation.clone()]);
  for (const [n, o] of Object.entries(a.joints)) { const p = pose[n]; if (p) o.rotation.set(o.rotation.x + (p.x || 0), o.rotation.y + (p.y || 0), o.rotation.z + (p.z || 0)); }
  a.g.updateMatrixWorld(true);
  const gq = a.g.getWorldQuaternion(new THREE.Quaternion()), bq = bone.getWorldQuaternion(new THREE.Quaternion());
  const turn = gq.invert().multiply(bq).invert();
  for (const [o, r] of saved) o.rotation.copy(r);
  a.g.updateMatrixWorld(true);
  return turn;
}
