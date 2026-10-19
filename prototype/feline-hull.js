// One skin over the cat's parts. feline.js paints the cat as overlapping primitives (spheres,
// cylinders, cones, one shaped torso), each its own little surface; drawn as they are, every
// place two of them meet is a seam, and a cat has no seams. This grows a single surface over
// them instead: each primitive becomes a signed distance, the distances are joined with a
// smooth minimum (so a leg flows into the body with a fillet rather than a crease), the field
// is sampled on a grid and marching cubes (three's addon) pulls out one watertight mesh. Each
// vertex takes its colour from the nearest primitive's paint and its bone weights from that
// primitive's part, so the stripes and the rig carry across. Pieces too thin for the grid to
// keep (whiskers, pupils, claws) stay as their own geometry, merged separately.
import * as THREE from 'three';
import {MarchingCubes} from 'three/addons/objects/MarchingCubes.js';
import {mergeVertices, mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// res: cells along the grid's side; blend: the fillet's reach (body units); pad: margin round the
// parts; thin: a primitive whose smallest extent is under this stays a detail; iso: the field
// level marching cubes cuts at; maxPoly: the addon's triangle buffer.
export const HULL = {res: 96, blend: .02, pad: .05, thin: .004, iso: 80, maxPoly: 400000};
// The shaped torso is measured as a radius per direction, in a table this fine.
const TABLE = {lon: 128, lat: 48};
// A cone this squat is a tuft of fur (the scruffy pets' spine and hip tufts): it would stand out of
// a smooth skin as a thorn, so it is left to the paint.
const TUFT = {height: .025};

const _p = new THREE.Vector3(), _q = new THREE.Vector3(), _pos = new THREE.Vector3(), _quat = new THREE.Quaternion(), _scl = new THREE.Vector3(), _m = new THREE.Matrix4();

// Turns a recorded piece (homunculus.js pieces({record:true})) placed by `M` into a distance function.
export function pieceField(rec, M) {
  const world = M ? _m.copy(M).multiply(rec.matrix || new THREE.Matrix4()) : (rec.matrix || new THREE.Matrix4());
  const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scale = new THREE.Vector3();
  world.decompose(pos, quat, scale);
  const inv = quat.clone().invert(), ax = Math.abs(scale.x), ay = Math.abs(scale.y), az = Math.abs(scale.z), smin = Math.min(ax, ay, az), smax = Math.max(ax, ay, az);
  const p = rec.parameters || {};
  let local, reach, thin;
  if (rec.type === 'sdf') {
    // a distance function of its own (feline-sculpt.js), already in the part's frame
    const back = M ? M.clone().invert() : null, at = w => { _p.copy(w); if (back) _p.applyMatrix4(back); return _p; };
    const sdf = w => { const q = at(w); return rec.field(q.x, q.y, q.z) * smin; };
    const colourAt = w => { if (typeof rec.colour !== 'function') return rec.colour; const q = at(w); return rec.colour(q.x, q.y, q.z); };
    return {sdf, centre: new THREE.Vector3(...rec.centre).applyMatrix4(world), reach: rec.reach * smax, thin: rec.thin * smin, colourAt, rec, M, blend: rec.blend != null ? rec.blend * smin : null, cut: !!rec.cut};
  }
  if (rec.type === 'SphereGeometry') {
    const r = p.radius;
    local = q => (q.length() - r) * smin; reach = r * smax; thin = r * smin;
  } else if (rec.type === 'CylinderGeometry' || rec.type === 'ConeGeometry') {
    const rt = rec.type === 'ConeGeometry' ? 0 : p.radiusTop, rb = rec.type === 'ConeGeometry' ? p.radius : p.radiusBottom, h = p.height;
    local = q => { const t = Math.max(0, Math.min(1, (q.y + h / 2) / h)), r = rb + (rt - rb) * t; return Math.max(Math.hypot(q.x, q.z) - r, Math.abs(q.y) - h / 2) * smin; };
    reach = Math.hypot(h / 2, Math.max(rt, rb)) * smax; thin = Math.min(Math.max(rt, rb) * Math.min(ax, az), h / 2 * ay);
  } else if (rec.type === 'shaped' && rec.positions) {
    // a radius per direction from the centre of the points, the longest point in each bin
    const v = rec.positions, n = v.length / 3, c = new THREE.Vector3(); for (let i = 0; i < n; i++) c.add(_p.set(v[i * 3], v[i * 3 + 1], v[i * 3 + 2])); c.divideScalar(n);
    const table = new Float32Array(TABLE.lon * TABLE.lat); let rmax = 0, rsum = 0;
    const bin = d => { const lon = Math.floor((Math.atan2(d.z, d.x) / (2 * Math.PI) + .5) * TABLE.lon) % TABLE.lon, lat = Math.min(TABLE.lat - 1, Math.floor((Math.asin(Math.max(-1, Math.min(1, d.y))) / Math.PI + .5) * TABLE.lat)); return lat * TABLE.lon + lon; };
    // sampled over each triangle, not just its corners, so every bin the surface crosses is filled
    const put = (x, y, z) => { _p.set(x, y, z).sub(c); const r = _p.length(); if (r > 0) { const b = bin(_p.divideScalar(r)); if (r > table[b]) table[b] = r; } };
    for (let i = 0; i < n; i++) { _p.set(v[i * 3], v[i * 3 + 1], v[i * 3 + 2]).sub(c); const r = _p.length(); rsum += r; rmax = Math.max(rmax, r); }
    for (let t = 0; t + 2 < n; t += 3) for (let a = 0; a <= 4; a++) for (let b = 0; a + b <= 4; b++) { const u = a / 4, w = b / 4, k = 1 - u - w; put(v[t * 3] * u + v[t * 3 + 3] * w + v[t * 3 + 6] * k, v[t * 3 + 1] * u + v[t * 3 + 4] * w + v[t * 3 + 7] * k, v[t * 3 + 2] * u + v[t * 3 + 5] * w + v[t * 3 + 8] * k); }
    // a bin the surface still missed takes the largest of its neighbours, so no dent opens there
    const mean = rsum / n; for (let pass = 0; pass < 4; pass++) for (let i = 0; i < table.length; i++) if (!table[i]) { const lat = Math.floor(i / TABLE.lon), lon = i % TABLE.lon; let best = 0; for (const [dl, dn] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const l2 = lat + dl, n2 = (lon + dn + TABLE.lon) % TABLE.lon; if (l2 < 0 || l2 >= TABLE.lat) continue; best = Math.max(best, table[l2 * TABLE.lon + n2]); } if (best) table[i] = best; }
    for (let i = 0; i < table.length; i++) if (!table[i]) table[i] = mean;
    // the radius in a direction, blended between the four bins round it, so the skin is smooth and not stepped
    const radiusAt = d => { const u = ((Math.atan2(d.z, d.x) / (2 * Math.PI) + .5) * TABLE.lon + TABLE.lon) % TABLE.lon, v = Math.max(0, Math.min(TABLE.lat - 1.001, (Math.asin(Math.max(-1, Math.min(1, d.y))) / Math.PI + .5) * TABLE.lat - .5));
      const u0 = Math.floor(u), v0 = Math.floor(v), fu = u - u0, fv = v - v0, u1 = (u0 + 1) % TABLE.lon, v1 = Math.min(TABLE.lat - 1, v0 + 1);
      return (table[v0 * TABLE.lon + u0] * (1 - fu) + table[v0 * TABLE.lon + u1] * fu) * (1 - fv) + (table[v1 * TABLE.lon + u0] * (1 - fu) + table[v1 * TABLE.lon + u1] * fu) * fv; };
    local = q => { _q.copy(q).sub(c); const r = _q.length(); if (r < 1e-9) return -mean * smin; return (r - radiusAt(_q.divideScalar(r))) * smin; };
    reach = rmax * smax; thin = mean * smin;
  } else {
    // anything else (a torus, an icosahedron) counts as a ball of its bounding size
    const r = p.radius || .01; local = q => (q.length() - r) * smin; reach = r * smax; thin = r * smin;
  }
  // world point -> local frame (translation, rotation, then the scale)
  const sdf = w => { _p.copy(w).sub(pos).applyQuaternion(inv); _p.x /= scale.x; _p.y /= scale.y; _p.z /= scale.z; return local(_p); };
  const colourAt = w => { if (typeof rec.colour !== 'function') return rec.colour; _p.copy(w); if (M) _p.applyMatrix4(_m.copy(M).invert()); return rec.colour(_p.x, _p.y, _p.z); };
  return {sdf, centre: pos, reach, thin, colourAt, rec, M};
}

const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; };
const smax = (a, b, k) => -smin(-a, -b, k);

// parts: [{group, M, pieces}] with M placing the part in the body frame. Returns {geometry (the
// skin, welded, smooth normals, vertex colours, `groups` per vertex), details (the thin pieces as
// one geometry with the same attributes), ms}. `weigh(group, x, y, z)` -> [[bone, w]...] adds the
// skin attributes when given; `soft` blends the parts' weights where they meet (see dress).
export function growHull(parts, {res = HULL.res, blend = HULL.blend, pad = HULL.pad, thin = HULL.thin, weigh = null, soft = 0} = {}) {
  const t0 = performance.now();
  const fields = [], details = [];
  for (const part of parts) for (const rec of part.pieces || []) {
    if (rec.type === 'ConeGeometry' && rec.parameters.height < TUFT.height) continue;
    const f = pieceField(rec, part.M); f.group = part.group;
    if (f.thin < thin && rec.type !== 'shaped' && rec.type !== 'sdf') details.push(f); else fields.push(f);
  }
  // the grid: a cube round every piece's reach, plus the margin
  const lo = new THREE.Vector3(Infinity, Infinity, Infinity), hi = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  for (const f of fields) if (!f.cut) { lo.min(_p.copy(f.centre).subScalar(f.reach)); hi.max(_p.copy(f.centre).addScalar(f.reach)); }
  const size = hi.clone().sub(lo), side = Math.max(size.x, size.y, size.z) + 2 * pad, origin = lo.clone().add(size.clone().multiplyScalar(.5)).subScalar(side / 2), cell = side / res;
  const mc = new MarchingCubes(res, new THREE.MeshBasicMaterial(), false, false, HULL.maxPoly);
  mc.isolation = HULL.iso;
  const K = HULL.iso / (2 * cell), near = fields.map(f => ({f, r2: (f.reach + 4 * (f.blend ?? blend)) ** 2}));
  const field = mc.field, w = new THREE.Vector3();
  for (let z = 0; z < res; z++) for (let y = 0; y < res; y++) for (let x = 0; x < res; x++) {
    w.set(origin.x + x * cell, origin.y + y * cell, origin.z + z * cell);
    let d = 1;
    // in order: each piece joins with its own fillet, and a cut carves what came before it
    for (const {f, r2} of near) { if (w.distanceToSquared(f.centre) > r2) continue; const k = f.blend ?? blend; d = f.cut ? smax(d, -f.sdf(w), k) : smin(d, f.sdf(w), k); }
    field[z * res * res + y * res + x] = HULL.iso - d * K;
  }
  mc.update();
  // the addon's vertices run -1..1 across the cube
  const n = mc.count, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = origin.x + (mc.positionArray[i * 3] + 1) * side / 2; pos[i * 3 + 1] = origin.y + (mc.positionArray[i * 3 + 1] + 1) * side / 2; pos[i * 3 + 2] = origin.z + (mc.positionArray[i * 3 + 2] + 1) * side / 2; }
  let geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry = mergeVertices(geometry, 1e-5); geometry.computeVertexNormals();
  dress(geometry, fields, weigh, soft);
  const detailGeo = details.length ? buildDetails(details, weigh) : null;
  mc.material.dispose(); mc.geometry?.dispose?.();
  return {geometry, details: detailGeo, ms: performance.now() - t0, cells: res ** 3, pieces: fields.length, thin: details.length};
}

// Colour and bone weights from the nearest primitive, per vertex. With `soft`, each part's weights
// are mixed in by how near the vertex is to that part (falling off over `soft`), so the skin bends
// smoothly where parts meet instead of tearing along the line where one part takes over.
function dress(geometry, all, weigh, soft = 0) {
  const fields = all.filter(f => !f.cut), p = geometry.attributes.position, n = p.count, col = new Float32Array(n * 3), groups = new Array(n), w = new THREE.Vector3();
  const idx = weigh ? new Uint16Array(n * 4) : null, wt = weigh ? new Float32Array(n * 4) : null;
  for (let i = 0; i < n; i++) {
    w.fromBufferAttribute(p, i); let best = null, bd = Infinity; const near = soft ? new Map() : null;
    for (const f of fields) { if (w.distanceTo(f.centre) > f.reach + .08) continue; const d = f.sdf(w); if (d < bd) { bd = d; best = f; } if (near && d < (near.get(f.group) ?? Infinity)) near.set(f.group, d); }
    if (!best) for (const f of fields) { const d = f.sdf(w); if (d < bd) { bd = d; best = f; } }
    const c = best.colourAt(w); for (let k = 0; k < 3; k++) col[i * 3 + k] = Math.max(0, Math.min(1, c[k]));
    groups[i] = best.group;
    if (weigh) {
      let list;
      if (soft && near.size > 1) {
        const sum = new Map(); let total = 0;
        for (const [g, d] of near) { const m = Math.max(0, 1 - (d - bd) / soft) ** 2; if (m <= 0) continue; total += m; for (const [bone, x] of weigh(g, w.x, w.y, w.z)) sum.set(bone, (sum.get(bone) || 0) + x * m); }
        list = [...sum].map(([bone, x]) => [bone, x / total]);
      } else list = weigh(best.group, w.x, w.y, w.z);
      list = list.sort((a, b) => b[1] - a[1]).slice(0, 4); const sum = list.reduce((a, [, x]) => a + x, 0) || 1; list.forEach(([bone, x], k) => { idx[i * 4 + k] = bone; wt[i * 4 + k] = x / sum; });
    }
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (weigh) { geometry.setAttribute('skinIndex', new THREE.BufferAttribute(idx, 4)); geometry.setAttribute('skinWeight', new THREE.BufferAttribute(wt, 4)); }
  geometry.userData.groups = groups;
}

// The thin pieces, rebuilt from their recipes and placed, as one geometry.
function buildDetails(details, weigh) {
  const geos = [];
  for (const f of details) {
    const rec = f.rec, P = rec.parameters, geo = rec.type === 'SphereGeometry' ? new THREE.SphereGeometry(P.radius, P.widthSegments, P.heightSegments)
      : rec.type === 'ConeGeometry' ? new THREE.ConeGeometry(P.radius, P.height, P.radialSegments) : rec.type === 'CylinderGeometry' ? new THREE.CylinderGeometry(P.radiusTop, P.radiusBottom, P.height, P.radialSegments) : null;
    if (!geo) continue;
    const flat = geo.toNonIndexed(); geo.dispose(); flat.deleteAttribute('uv');
    if (rec.matrix) flat.applyMatrix4(rec.matrix);
    // paint in the part's frame, then place the part
    const p = flat.attributes.position, n = p.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const c = typeof rec.colour === 'function' ? rec.colour(p.getX(i), p.getY(i), p.getZ(i)) : rec.colour; for (let k = 0; k < 3; k++) col[i * 3 + k] = Math.max(0, Math.min(1, c[k])); }
    flat.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (f.M) flat.applyMatrix4(f.M);
    if (weigh) { const idx = new Uint16Array(n * 4), wt = new Float32Array(n * 4); for (let i = 0; i < n; i++) { const list = weigh(f.group, p.getX(i), p.getY(i), p.getZ(i)).sort((a, b) => b[1] - a[1]).slice(0, 4), sum = list.reduce((a, [, x]) => a + x, 0) || 1; list.forEach(([bone, x], k) => { idx[i * 4 + k] = bone; wt[i * 4 + k] = x / sum; }); } flat.setAttribute('skinIndex', new THREE.BufferAttribute(idx, 4)); flat.setAttribute('skinWeight', new THREE.BufferAttribute(wt, 4)); }
    geos.push(flat);
  }
  return geos.length ? mergeGeometries(geos) : null;
}
