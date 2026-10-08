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
const ball = (p, r) => { const g = new THREE.IcosahedronGeometry(r, 0); g.translate(...p); return g; };
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
  // four fingers curled round the front of the grip, each a knuckle, three segments, a lame plate per segment
  for (let i = 0; i < 4; i++) {
    const y = .034 - i * .0225, k = i === 1 || i === 2 ? 1.06 : i === 3 ? .86 : 1; // middle fingers longest, little finger shortest
    const K = [.052, y, -.012], P1 = [.062 * k, y, .026], P2 = [.026, y, .049 * k], P3 = [-.014, y, .038];
    glove.push(seg(K, P1, .0112, .0102), seg(P1, P2, .0102, .0094), seg(P2, P3, .0094, .0082));
    glove.push(ball(P1, .0112), ball(P2, .0102));
    const mid = (a, b) => a.map((v, j) => (v + b[j]) / 2);
    plate.push(plateBox([mid(K, P1)[0] + .006, y + .0105, mid(K, P1)[2]], [.014, .005, .036], 0, 0));
    plate.push(plateBox([P1[0] - .002, y + .0105, P1[2] + .002], [.03, .005, .02], 0, -.5));
    plate.push(plateBox(mid(P2, P3).map((v, j) => v + [0, .0098, 0][j]), [.026, .005, .015], 0, .32));
  }
  // thumb: folded across the front of the first finger
  const T0 = [-.04, .03, -.016], T1 = [-.054, .03, .018], T2 = [-.036, .036, .047], T3 = [-.012, .036, .05];
  glove.push(seg(T0, T1, .0135, .0118), seg(T1, T2, .0118, .0105), seg(T2, T3, .0105, .0088), ball(T1, .0125), ball(T2, .0108));
  plate.push(plateBox([-.056, .0415, .018], [.012, .005, .03], 0, .2));
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
