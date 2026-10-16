// The bones a kill leaves on the floor (marks.js), as small lit solids instead of flat cut-outs:
// a long bone with a shaft that swells into two condyles at each end, a rib's tapering arc, a
// splinter broken off jagged, a vertebra with its drum and spinous process, and a skull for a
// dry kill (dome, brow, cheekbones, sunken sockets, a jaw). Each is one geometry, built once in
// unit scale along x and lying on y = 0, with its shading baked into vertex colours (ivory on the
// shafts, a browner stain in the hollows and at the broken ends) so every bone shares one
// material. They rest on the floor at a slight random tilt, never standing up.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const SHAPES = ['long', 'rib', 'splinter', 'vertebra', 'skull'];
const IVORY = [.86, .81, .68], STAIN = [.56, .48, .34], SOCKET = [.22, .18, .13];

const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const smooth = v => { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); };

// Flattens a geometry to non-indexed, strips uv, applies a matrix, paints by position.
function piece(geo, matrix, paint) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  for (const key of Object.keys(g.attributes)) if (key !== 'position' && key !== 'normal') g.deleteAttribute(key);
  if (matrix) g.applyMatrix4(matrix);
  const p = g.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const c = paint(p.getX(i), p.getY(i), p.getZ(i)); col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
const M = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

// The shading: ivory, staining toward the ends of a long piece and in anything low (a hollow).
const shaft = (x, y, z) => mix(IVORY, STAIN, .35 * smooth((Math.abs(x) - .6) / .4) + .25 * smooth((-y - .02) / .1));

function longBone() {
  const parts = [];
  // the shaft, a little waisted, lying along x
  const profile = []; for (let i = 0; i <= 10; i++) { const t = i / 10, r = .13 + .04 * (1 - Math.sin(t * Math.PI)); profile.push(new THREE.Vector2(r, t * 1.5 - .75)); }
  parts.push(piece(new THREE.LatheGeometry(profile, 10), M(0, .13, 0, 0, 0, Math.PI / 2), shaft));
  // two condyles at each end, a hair apart, the knob of a joint
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(piece(new THREE.SphereGeometry(.16, 10, 8), M(sx * .8, .15, sz * .1, 0, 0, 0, 1.1, 1, .85), shaft));
  return mergeGeometries(parts);
}
function rib() {
  const pts = []; for (let i = 0; i <= 8; i++) { const a = -1 + i / 8 * 2; pts.push(new THREE.Vector3(Math.sin(a) * .95, 0, Math.cos(a) * .95 - .55)); }
  const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, .09, 7, false);
  const parts = [piece(tube, M(0, .09, 0), (x, y, z) => mix(IVORY, STAIN, .25 * smooth((x - .3) / .6)))];
  // the head of the rib, where it met the spine, at the curve's start
  parts.push(piece(new THREE.SphereGeometry(.13, 8, 6), M(pts[0].x, .1, pts[0].z, 0, 0, 0, 1, .8, 1), shaft));
  return mergeGeometries(parts);
}
function splinter() {
  const parts = [piece(new THREE.CylinderGeometry(.11, .13, 1.1, 8), M(-.1, .13, 0, 0, 0, Math.PI / 2), shaft)];
  parts.push(piece(new THREE.SphereGeometry(.16, 9, 7), M(-.68, .15, 0, 0, 0, 0, 1, .95, .8), shaft));
  // the break: three jagged points
  for (const [dz, len, rx] of [[0, .32, 0], [.06, .22, .5], [-.06, .18, -.6]]) parts.push(piece(new THREE.ConeGeometry(.07, len, 5), M(.45 + len / 2, .13, dz, rx, 0, -Math.PI / 2), (x, y, z) => mix(IVORY, STAIN, .5 + .3 * smooth((x - .5) / .3))));
  return mergeGeometries(parts);
}
function vertebra() {
  const parts = [piece(new THREE.CylinderGeometry(.3, .3, .34, 12), M(0, .17, 0, 0, 0, Math.PI / 2), (x, y, z) => mix(IVORY, STAIN, .2 + .3 * smooth((Math.abs(x) - .12) / .06)))];
  // the arch over the canal and the spinous process standing off it
  parts.push(piece(new THREE.TorusGeometry(.22, .07, 6, 10, Math.PI), M(0, .34, 0, 0, Math.PI / 2, 0), (x, y, z) => mix(IVORY, STAIN, .3)));
  parts.push(piece(new THREE.ConeGeometry(.08, .34, 6), M(0, .62, -.1, -.5, 0, 0), (x, y, z) => mix(IVORY, STAIN, .15)));
  // it lies on its side: roll it over and rest it on the floor
  const g = mergeGeometries(parts); g.applyMatrix4(M(0, 0, 0, .35, 0, 0)); g.computeBoundingBox(); g.translate(0, -g.boundingBox.min.y, 0);
  return g;
}
function skull() {
  const parts = [];
  const bone = (x, y, z) => mix(IVORY, STAIN, .15 + .3 * smooth((-y + .25) / .3));
  parts.push(piece(new THREE.SphereGeometry(.42, 14, 10), M(0, .42, -.05, 0, 0, 0, 1, .95, 1.1), bone)); // the dome
  parts.push(piece(new THREE.SphereGeometry(.3, 12, 8), M(0, .26, .3, 0, 0, 0, 1, .7, .9), bone)); // the face
  for (const s of [-1, 1]) {
    parts.push(piece(new THREE.SphereGeometry(.12, 8, 6), M(s * .17, .34, .5, 0, 0, 0, 1, .9, .6), () => SOCKET)); // the sockets, sunk and dark
    parts.push(piece(new THREE.SphereGeometry(.1, 8, 6), M(s * .33, .22, .36, 0, 0, 0, 1, .6, .8), bone)); // cheekbones
  }
  parts.push(piece(new THREE.SphereGeometry(.07, 7, 5), M(0, .2, .56, 0, 0, 0, 1, .8, .6), () => mix(SOCKET, STAIN, .4))); // the nasal hollow
  parts.push(piece(new THREE.BoxGeometry(.5, .14, .3), M(0, .07, .3), (x, y, z) => mix(IVORY, STAIN, .35))); // the jaw
  for (let i = -2; i <= 2; i++) parts.push(piece(new THREE.BoxGeometry(.055, .09, .05), M(i * .09, .13, .47), () => IVORY)); // teeth
  const g = mergeGeometries(parts);
  // a skull lies on its side, face toward the sky, so the sockets show from the game camera
  g.applyMatrix4(M(0, 0, 0, 0, 0, 1.15)); g.computeBoundingBox(); g.translate(0, -g.boundingBox.min.y, 0);
  return g;
}

const BUILDERS = {long: longBone, rib, splinter, vertebra, skull};
let cache = null;
// All five geometries, built once and shared.
export function boneGeometries() {
  if (!cache) { cache = {}; for (const key of SHAPES) { const g = BUILDERS[key](); g.computeBoundingBox(); g.translate(0, -g.boundingBox.min.y, 0); g.computeBoundingBox(); g.computeBoundingSphere(); cache[key] = g; } }
  return cache;
}
// The one material every bone shares; the fade clones it per mark as the stains do.
export function boneMaterial() { return new THREE.MeshStandardMaterial({vertexColors: true, roughness: .72, metalness: 0}); }
// How a bone lies: flat with a little tilt, resting on the floor. `s` is marks.js's size.
export function placeBone(mesh, shape, {x, z, rot, s, seed = 0}, r) {
  mesh.position.set(x, .003, z);
  mesh.rotation.set(Math.sin(seed * 12.9) * .12, rot, Math.cos(seed * 7.1) * .1);
  mesh.scale.setScalar(r * s * (shape === 'skull' ? 1.25 : 1));
  mesh.castShadow = false; mesh.receiveShadow = true; mesh.renderOrder = 1;
}
