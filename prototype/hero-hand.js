import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// A gauntleted fist, built to wrap a grip that runs along the hand's y axis through the origin.
// The forearm arrives from -z (behind the palm): a flared cuff, a leather palm, a plate over the
// back of the hand with knuckle studs, four fingers that curl round the front (+z) of the grip
// in three jointed segments each, with a lame plate on every segment, and a thumb folded across.
// Two merged meshes per hand (glove leather, steel plate) so it costs two draws.

const seg = (a, b, r0, r1, sides = 6) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length();
  const geo = new THREE.CylinderGeometry(r1, r0, len, sides);
  geo.applyMatrix4(new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, 1, 1)));
  return geo;
};
const ball = (p, r) => { const g = new THREE.IcosahedronGeometry(r, 1); g.translate(...p); return g; };
const plateBox = (p, size, rotZ = 0, rotY = 0) => {
  const g = new THREE.BoxGeometry(...size); g.rotateZ(rotZ); g.rotateY(rotY); g.translate(...p); return g;
};

export function gauntletGeometries() {
  const glove = [], plate = [];
  // cuff: a flared steel bell over the wrist, with a darker leather sleeve inside it
  const cuff = new THREE.CylinderGeometry(.046, .062, .05, 8, 1, true); cuff.rotateX(Math.PI / 2); cuff.translate(0, 0, -.095); plate.push(cuff);
  const rim = new THREE.TorusGeometry(.062, .006, 4, 8); rim.translate(0, 0, -.12); plate.push(rim);
  const sleeve = new THREE.CylinderGeometry(.04, .042, .06, 8); sleeve.rotateX(Math.PI / 2); sleeve.translate(0, 0, -.075); glove.push(sleeve);
  // palm: a tapering leather block
  const palm = new THREE.BoxGeometry(.1, .092, .06); palm.translate(0, 0, -.03); glove.push(palm);
  // plate over the back of the hand: a shallow ridge with two knuckle studs
  plate.push(plateBox([0, 0, -.067], [.102, .094, .014]));
  plate.push(plateBox([0, 0, -.077], [.026, .08, .012]));
  for (const y of [-.026, .026]) plate.push(ball([.045, y, -.052], .0125));
  // four fingers curled round the front of the grip: a knuckle, three segments bending ever more
  // tightly so the tips tuck back toward the palm, a rounded knuckle and tip, and one lame plate
  // flush over the first segment (the stacked plates read as a claw).
  for (let i = 0; i < 4; i++) {
    const y = .034 - i * .0225, k = i === 1 || i === 2 ? 1.06 : i === 3 ? .86 : 1; // middle fingers longest, little finger shortest
    const K = [.05, y, -.01], P1 = [.058 * k, y, .024], P2 = [.03, y, .046 * k], P3 = [-.006, y, .034], T = [-.022, y, .018];
    glove.push(seg(K, P1, .0118, .0108), seg(P1, P2, .0108, .0098), seg(P2, P3, .0098, .0088), seg(P3, T, .0088, .008));
    glove.push(ball(P1, .0115), ball(P2, .0104), ball(P3, .0092), ball(T, .0082));
    const mid = (a, b) => a.map((v, j) => (v + b[j]) / 2);
    plate.push(plateBox([mid(K, P1)[0] + .004, y + .0092, mid(K, P1)[2]], [.013, .004, .03], 0, .1));
  }
  // thumb: folded across the front of the first finger, its tip tucked in over the fingers
  const T0 = [-.038, .03, -.014], T1 = [-.052, .03, .016], T2 = [-.036, .034, .042], T3 = [-.014, .034, .044];
  glove.push(seg(T0, T1, .0138, .012), seg(T1, T2, .012, .0106), seg(T2, T3, .0106, .009), ball(T1, .0128), ball(T2, .011), ball(T3, .0092));
  plate.push(plateBox([-.054, .0405, .016], [.011, .004, .026], 0, .2));
  const strip = list => { const g = mergeGeometries(list.map(x => x.index ? x.toNonIndexed() : x)); g.computeVertexNormals(); return g; };
  return {glove: strip(glove), plate: strip(plate)};
}

let cache = null;
// A new gauntlet hand: `mats` = {glove, plate}. Geometry is built once and shared.
export function createGauntletHand(mats) {
  cache ||= gauntletGeometries();
  const g = new THREE.Group(); g.name = 'GauntletHand';
  const gl = new THREE.Mesh(cache.glove, mats.glove), pl = new THREE.Mesh(cache.plate, mats.plate);
  gl.name = 'GauntletGlove'; pl.name = 'GauntletPlate';
  g.add(gl, pl);
  return g;
}
