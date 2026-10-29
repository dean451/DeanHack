import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// A canine's whole hide as one SkinnedMesh on one skeleton: the torso on three vertebrae (spine0 the chest,
// spine1 mid-back, spine2 the loins, which carries the hind legs and the tail, so the back can bend round into a
// curl), the neck on neck0 (at the withers) to neck3 (at the head's pivot), each leg on its swing pivot and three bones (`<leg>_0` at the
// shoulder or hip, `_1` the elbow or stifle, `_2` the wrist or hock, the paw riding it), and the tail on its
// wag pivot and the chain tail0 (rump) to tail4 (tip). The head stays a rigid part hung on neck3, so it keeps
// its place in the actor batch: the hide and the eyes are the only parts out of the batch, as the skinned
// tail and the eyes were before, so the jackal still draws as cheaply (batched-actors.test.js).
//
// Bone order (the skin indices): spine0, spine1, spine2, neck0..neck3, tail, tail0..tail4, then each leg's
// pivot, _0, _1, _2 in LEGS order. Every bone is placed in body space at rest; the hierarchy is spine0 > neck0
// > .. > neck3, spine0 > spine1 > spine2, spine2 > tail > tail0 > .. > tail4, spine0 > fore leg pivot > _0 > _1
// > _2 and spine2 > hind leg pivot > ...
export const SPINE_BONES = 3, NECK_BONES = 4, TAIL_BONES = 5;
// The back's vertebrae: where spine1 and spine2 pivot along the back (z, body units, at the back's height), and
// how far either side of each the torso's skin hands over from the one before (a smooth blend).
export const BACK = {mid: .02, loin: -.12, blend: .06};
// the legs in the order createCanine has always made them: left hind, left fore, right hind, right fore
export const LEGS = [['lleg1', -1, false], ['lleg0', -1, true], ['rleg1', 1, false], ['rleg0', 1, true]];
// How far either side of a leg joint the skin blends between the bones (metres, body units)
const LEG_BLEND = .018;

const smooth = v => { v = Math.min(1, Math.max(0, v)); return v * v * (3 - 2 * v); };
const v3 = a => new THREE.Vector3(...a);

// The leg's joints in its own space (the pivot at the origin): shoulder or hip, elbow or stifle, wrist or hock.
export function legJoints(L, fore) {
  const fy = -(fore ? L.shoulder : L.hip)[1];
  return fore ? [[0, 0, 0], [0, -.12, -.03], [0, fy + .055, -.012]] : [[0, 0, 0], [0, -.13, .05], [0, fy + .11, -.055]];
}
// The neck's bones in body space: neck0 at the withers, neck3 at the head's pivot, evenly between.
export function neckJoints(L) {
  const W = v3([0, L.Y + .02, .2]), N = v3(L.neck);
  return Array.from({length: NECK_BONES}, (_, i) => W.clone().lerp(N, i / (NECK_BONES - 1)).toArray());
}

// Writes skin attributes on a geometry from a per-vertex function (x, y, z) -> [[bone, weight], ...].
function weigh(geo, by) {
  const pos = geo.attributes.position, n = pos.count, idx = new Uint16Array(n * 4), wt = new Float32Array(n * 4), v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(pos, i);
    by(v).slice(0, 4).forEach(([b, w], k) => { idx[i * 4 + k] = b; wt[i * 4 + k] = w; });
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wt, 4));
  return geo;
}
// Mirrors a right-hand geometry to the left (x negated, the winding turned back so it still faces out).
function mirror(geo) {
  const g = geo.clone(); g.scale(-1, 1, 1);
  if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; } g.index.needsUpdate = true; return g; }
  // (no index: swap the second and third vertex of every triangle in each attribute)
  for (const attr of Object.values(g.attributes)) {
    const a = attr.array, k = attr.itemSize;
    for (let v = 0; v < attr.count; v += 3) for (let c = 0; c < k; c++) { const i1 = (v + 1) * k + c, i2 = (v + 2) * k + c, t = a[i1]; a[i1] = a[i2]; a[i2] = t; }
    attr.needsUpdate = true;
  }
  return g;
}
const keep = geo => { for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'color', 'skinIndex', 'skinWeight'].includes(k)) geo.deleteAttribute(k); return geo; };

// The hide's geometry: the body (torso and neck), the four legs and the tail, from the pieces build() makes,
// moved into body space and weighted. `tailAt`: the tail pivot in body space; `sideNecks`: Cerberus's side
// necks as [from, to] segments, whose skin stays on spine0 (the side heads are rigid on the body).
export function hideGeometry(L, {body, fore, hind, tail}, {tailAt, sideNecks = []}) {
  const parts = [];
  // the body: spine0, or the neck bones along the neck (by where a vertex projects on the line from the
  // withers to the head's pivot, fading out away from the line, so the chest and the shoulders stay on spine0)
  const NJ = neckJoints(L).map(v3), W = NJ[0], N = NJ.at(-1), axis = N.clone().sub(W), len2 = axis.lengthSq();
  const r = .075 * (L.heavy || 1) * (L.neckK || 1), c = new THREE.Vector3(), seg = new THREE.Line3(), side = sideNecks.map(([a, b]) => new THREE.Line3(v3(a), v3(b)));
  parts.push(weigh(body.clone(), p => {
    const s = p.clone().sub(W).dot(axis) / len2, d = p.distanceTo(c.copy(axis).multiplyScalar(Math.min(1, Math.max(0, s))).add(W));
    let n = smooth(s / .25) * (1 - smooth((d - r) / r));
    if (side.some(l => { l.closestPointToPoint(p, true, c); return c.distanceTo(p) < d; })) n = 0;
    // the torso's share by where it lies along the back: the chest on spine0, mid-back on spine1, the loins on spine2
    const w2 = smooth((BACK.loin + BACK.blend - p.z) / (2 * BACK.blend)), w1 = smooth((BACK.mid + BACK.blend - p.z) / (2 * BACK.blend)) - w2, w0 = 1 - w1 - w2;
    const back = [[0, w0], [1, w1], [2, w2]].filter(([, w]) => w > 1e-4).map(([b, w]) => [b, w * (1 - n)]);
    if (n < 1e-3) return back;
    const x = Math.min(NECK_BONES - 1, Math.max(0, s * (NECK_BONES - 1))), k = Math.min(NECK_BONES - 2, Math.floor(x)), f = x - k;
    return [...back, [SPINE_BONES + k, n * (1 - f)], [SPINE_BONES + 1 + k, n * f]].filter(([, w]) => w > 1e-4);
  }));
  // the tail: its chain's own weights (chain-skin.js), the bones moved past spine0, the neck and the pivot
  const T0 = SPINE_BONES + NECK_BONES + 1, tg = tail.clone(), ti = tg.attributes.skinIndex;
  for (let i = 0; i < ti.count; i++) for (let k = 0; k < 4; k++) ti.setComponent(i, k, ti.getComponent(i, k) + T0);
  tg.translate(...tailAt); parts.push(tg);
  // the legs: each vertex on the bone of the segment it lies along (the paw, past the last joint, on _2),
  // blended across a joint over LEG_BLEND either side
  LEGS.forEach(([, s, isFore], li) => {
    const base = T0 + TAIL_BONES + li * 4 + 1, J = legJoints(L, isFore).map(v3), at = isFore ? L.shoulder : L.hip;
    const geo = weigh(s < 0 ? mirror(isFore ? fore : hind) : (isFore ? fore : hind).clone(), p => {
      const q = p.clone(); q.x = Math.abs(q.x);
      let best = Infinity, bk = 0, bt = 0;
      for (let k = 0; k < J.length - 1; k++) { seg.set(J[k], J[k + 1]); const t = seg.closestPointToPointParameter(q, false), tc = Math.min(1, Math.max(0, t)); seg.at(tc, c); const dd = c.distanceToSquared(q); if (dd < best - 1e-12) { best = dd; bk = k; bt = t; } }
      const L0 = J[bk].distanceTo(J[bk + 1]);
      if (bk === J.length - 2 && bt > 1) return [[base + 2, 1]];
      const fromEnd = (1 - bt) * L0, fromStart = bt * L0;
      if (fromEnd < LEG_BLEND) { const w = .5 * (1 - fromEnd / LEG_BLEND); return [[base + bk, 1 - w], [base + bk + 1, w]]; }
      if (bk > 0 && fromStart < LEG_BLEND) { const w = .5 * (1 - fromStart / LEG_BLEND); return [[base + bk, 1 - w], [base + bk - 1, w]]; }
      return [[base + bk, 1]];
    });
    geo.translate(s * at[0], at[1], at[2]); parts.push(geo);
  });
  const geo = mergeGeometries(parts.map(g => keep(g.index ? g : g)));
  geo.computeBoundingSphere();
  return geo;
}

// The skeleton and the mesh on `body`. `tailChain`: the tail's bone points in its pivot's space (from
// chain-skin.js). Returns {mesh, bones (by name), legs (the four pivots, in LEGS order), tail (its pivot)}.
export function rigHide(body, geo, material, L, {tailAt, tailChain}) {
  const mesh = new THREE.SkinnedMesh(geo, material); mesh.castShadow = mesh.receiveShadow = true; mesh.userData.part = 'body';
  const bones = [], byName = {}, bone = (name, parent, at, parentAt = [0, 0, 0]) => { const b = new THREE.Bone(); b.name = name; b.position.set(at[0] - parentAt[0], at[1] - parentAt[1], at[2] - parentAt[2]); (parent || mesh).add(b); bones.push(b); byName[name] = b; b.userData.at = at; return b; };
  const spine = bone('spine0', null, [0, 0, 0]), backY = L.Y + .02;
  const mid = bone('spine1', spine, [0, backY, BACK.mid]), loin = bone('spine2', mid, [0, backY, BACK.loin], mid.userData.at);
  let prev = spine; neckJoints(L).forEach((p, i) => { prev = bone('neck' + i, prev, p, prev.userData.at); });
  const tail = bone('tail', loin, tailAt, loin.userData.at);
  prev = tail; tailChain.forEach((p, i) => { const at = [tailAt[0] + p[0], tailAt[1] + p[1], tailAt[2] + p[2]]; prev = bone('tail' + i, prev, at, prev.userData.at); });
  const legs = LEGS.map(([name, s, fore]) => {
    const at = fore ? L.shoulder : L.hip, pivotAt = [s * at[0], at[1], at[2]], up = fore ? spine : loin, pivot = bone(name, up, pivotAt, up.userData.at);
    let p = pivot; legJoints(L, fore).forEach((j, i) => { const jAt = [pivotAt[0] + s * j[0], pivotAt[1] + j[1], pivotAt[2] + j[2]]; p = bone(name + '_' + i, p, jAt, p.userData.at); });
    return pivot;
  });
  body.add(mesh); mesh.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton(bones));
  return {mesh, bones: byName, legs, tail};
}
