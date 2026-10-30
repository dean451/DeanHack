// Lighter monster models below the high tier. A monster is a few baked meshes of 5,000 to 26,000 triangles
// (creatures.js bakeDraws), drawn into a figure a few dozen pixels tall at the game camera, and drawn three times
// a frame (colour, shadow, occlusion). These meshes are flat-shaded with every face keeping its own corners, so a
// topology-preserving simplifier finds nothing to collapse. Instead the corners are welded by position, the welded
// mesh is simplified (meshoptimizer), and each surviving triangle is rebuilt as a flat face again, taking its
// colour, skin weights and other attributes from its first corner's original vertex: the faceted look stays.
import * as THREE from 'three';
import {MeshoptSimplifier} from 'meshoptimizer';

// enabled: set at start-up from the quality tier (quality.js monsterLodFor); high keeps the full models.
export const LOD = {enabled: true, minTriangles: 900, keep: .4, error: .02};
let ready = false;
export const lodReady = MeshoptSimplifier.ready.then(() => { ready = true; });

// A lighter copy of a geometry, or the geometry itself when it is small, unready or would barely shrink.
export function lighten(geometry, {keep = LOD.keep, error = LOD.error, minTriangles = LOD.minTriangles} = {}) {
  const pos = geometry.attributes.position;
  if (!ready || !pos || pos.itemSize !== 3) return geometry;
  const n = geometry.index ? geometry.index.count : pos.count, tris = n / 3;
  if (tris < minTriangles) return geometry;
  const corner = i => geometry.index ? geometry.index.getX(i) : i;
  // weld corners that share a position (to 1e-5), keeping the first original vertex of each
  const weld = new Map(), firstOf = [], welded = new Uint32Array(n), wpos = [];
  for (let i = 0; i < n; i++) {
    const v = corner(i), x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v);
    const key = `${Math.round(x * 1e5)},${Math.round(y * 1e5)},${Math.round(z * 1e5)}`;
    let w = weld.get(key);
    if (w === undefined) { w = firstOf.length; weld.set(key, w); firstOf.push(v); wpos.push(x, y, z); }
    welded[i] = w;
  }
  const target = Math.max(3, Math.floor(n * keep / 3) * 3);
  let [out] = MeshoptSimplifier.simplify(welded, new Float32Array(wpos), 3, target, error, ['LockBorder']);
  if (out.length > n * .8) return geometry;
  // rebuild as flat faces: every corner its own vertex, attributes from the welded vertex's first original
  const g = new THREE.BufferGeometry(), m = out.length;
  for (const [name, a] of Object.entries(geometry.attributes)) {
    if (name === 'normal') continue;
    const arr = new a.array.constructor(m * a.itemSize);
    for (let i = 0; i < m; i++) { const src = name === 'position' ? null : firstOf[out[i]]; for (let k = 0; k < a.itemSize; k++) arr[i * a.itemSize + k] = name === 'position' ? wpos[out[i] * 3 + k] : a.array[src * a.itemSize + k]; }
    g.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize, a.normalized));
  }
  if (m >= pos.count) return geometry; // a smooth, shared-corner mesh would come back with more vertices, not fewer
  const index = new (m > 65535 ? Uint32Array : Uint16Array)(m); for (let i = 0; i < m; i++) index[i] = i;
  g.setIndex(new THREE.BufferAttribute(index, 1)); // indexed, so the actor batch takes it (batched-actors.js)
  g.computeVertexNormals();
  g.userData = {...geometry.userData, lodOf: geometry.uuid};
  return g;
}

// Swaps every large mesh's geometry under `root` for its lighter copy. Skinned meshes keep their skeleton (the
// skin attributes come along); meshes an animation rewrites (geometry.userData.live) are left whole.
// `species` keys a cache: every monster of a kind is built alike, so the lighter copies are made once a kind and
// shared (they are never written to). Returns the triangles saved.
const cache = new Map();
export function lightenModel(root, {species = null, ...options} = {}) {
  let saved = 0, slot = 0;
  if (!LOD.enabled) return 0;
  root.traverse(o => {
    // static parts only: baked parts (creatures.js bakeDraws) and skinned bodies (their bones move them, not their
    // vertices). A part an animation rewrites keeps a reference to its own geometry, so it is never swapped.
    if (!o.isMesh || !(o.material?.isBakedMaterial || o.isSkinnedMesh) || o.isInstancedMesh || o.userData.outline || o.geometry?.morphAttributes?.position) return;
    const src = o.geometry, key = species ? `${species}|${slot++}|${src.attributes.position.count}` : null;
    let g = key && cache.get(key);
    if (!g) { g = lighten(src, options); if (key) cache.set(key, g); }
    if (g === src || g.attributes.position.count >= src.attributes.position.count) return;
    saved += ((src.index ? src.index.count : src.attributes.position.count) - g.index.count) / 3;
    o.geometry = g;
    // the ink outline hull draws the same geometry (readability.js addOutlines)
    for (const c of o.children) if (c.userData.outline && c.geometry === src) c.geometry = g;
  });
  return saved;
}
