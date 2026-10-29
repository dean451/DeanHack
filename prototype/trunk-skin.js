import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {skinChain, rigChain} from './chain-skin.js';

// A standing creature's trunk and neck as one SkinnedMesh: the body's merged geometry weighted onto a spine of
// vertebrae stacked up the trunk (the first the pelvis root, so the belt and the hips stay put when the back
// bends) and a neck chain from the last vertebra to the head's pivot, so the head can hang on the neck's last
// bone. For the kobolds, imps and the two-legged humanoids, as canine-hide.js is for the dogs.
//
// `spine`: [[name, [x, y, z]], ...] bottom to top, each vertebra's pivot in the body's space; a vertex rides the
// vertebra whose band it lies in by height, blended `blend` either side of each pivot. `neck`: the neck's bones
// as [[name, [x, y, z]], ...] from its root at the top of the trunk to the head's pivot; `r`: how far from the
// neck's line its skin reaches (it fades out over as far again, so the shoulders stay on the spine).
// Bone order (the skin indices): the spine bottom to top, then the neck.

const smooth = v => { v = Math.min(1, Math.max(0, v)); return v * v * (3 - 2 * v); };

export function skinTrunk(geo, {spine, neck = [], blend = .03, r = .05}) {
  const pos = geo.attributes.position, n = pos.count, idx = new Uint16Array(n * 4), wt = new Float32Array(n * 4);
  const ys = spine.map(([, p]) => p[1]), v = new THREE.Vector3(), c = new THREE.Vector3();
  const W = neck.length ? new THREE.Vector3(...neck[0][1]) : null, N = neck.length ? new THREE.Vector3(...neck.at(-1)[1]) : null;
  const axis = W && N.clone().sub(W), len2 = axis?.lengthSq() || 1;
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(pos, i);
    // along the spine by height: bone k from its pivot up to the next one's
    const back = ys.map((y, k) => [k, (k ? smooth((v.y - y + blend) / (2 * blend)) : 1) - (k < ys.length - 1 ? smooth((v.y - ys[k + 1] + blend) / (2 * blend)) : 0)]).filter(([, w]) => w > 1e-4);
    let out = back;
    if (W) {
      // the neck by where the vertex projects on the line from its root to the head's pivot, fading out away from it
      const s = v.clone().sub(W).dot(axis) / len2, d = v.distanceTo(c.copy(axis).multiplyScalar(Math.min(1, Math.max(0, s))).add(W));
      const k = smooth(s / .2) * (1 - smooth((d - r) / r));
      if (k > 1e-3) {
        const m = neck.length - 1, x = Math.min(m, Math.max(0, s * m)), j = Math.min(m - 1, Math.floor(x)), f = x - j;
        out = [...back.map(([b, w]) => [b, w * (1 - k)]), [ys.length + j, k * (1 - f)], [ys.length + j + 1, k * f]].filter(([, w]) => w > 1e-4);
      }
    }
    // (at most four influences: keep the heaviest, renormalised)
    out.sort((a, b) => b[1] - a[1]); out = out.slice(0, 4); const sum = out.reduce((t, [, w]) => t + w, 0);
    out.forEach(([b, w], k) => { idx[i * 4 + k] = b; wt[i * 4 + k] = w / sum; });
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wt, 4));
  geo.userData.trunk = {spine: spine.map(([name, p]) => [name, [...p]]), neck: neck.map(([name, p]) => [name, [...p]])};
  return geo;
}

// The mesh on `parent` (the body group) and its bones: each vertebra a child of the one below, the neck's root a
// child of the top vertebra and each neck bone of the one before, all placed at their pivots at rest. Returns
// {mesh, bones (by name)}.
export function rigTrunk(parent, geo, material, {part = 'body'} = {}) {
  const {spine, neck} = geo.userData.trunk, m = new THREE.SkinnedMesh(geo, material);
  m.castShadow = m.receiveShadow = true; m.userData.part = part;
  const bones = [], byName = {};
  let prev = null, prevAt = [0, 0, 0];
  for (const [name, at] of [...spine, ...neck]) {
    const b = new THREE.Bone(); b.name = name; b.position.set(at[0] - prevAt[0], at[1] - prevAt[1], at[2] - prevAt[2]); b.userData.at = at;
    (prev || m).add(b); bones.push(b); byName[name] = b; prev = b; prevAt = at;
  }
  parent.add(m); m.updateMatrixWorld(true); m.bind(new THREE.Skeleton(bones));
  return {mesh: m, bones: byName};
}

// Moves `child` under `bone`, keeping where it stands (its position given in the body's space, as built).
export function hangOn(bone, child) {
  const at = bone.userData.at; child.position.set(child.position.x - at[0], child.position.y - at[1], child.position.z - at[2]);
  bone.add(child); return child;
}

// Merges a creature's skinned parts (the trunk first, then each limb and the tail, every one on its own bones under
// its own group) into one SkinnedMesh on one skeleton, so they cost one draw instead of one each (a skinned mesh
// cannot join the actor batch). Each part's geometry is moved from its mesh's space into the body's and its bone
// indices moved past the ones before it; the bones stay where they are, under their groups, so every pivot still
// works. Call at rest. `first`: the part to keep first (the trunk, whose bone order other skins share, as a
// uranium imp's glow); `cache`: where to keep the merged geometry for every member built alike.
export function mergeSkins(body, first, cache) {
  body.updateWorldMatrix(true, true);
  const parts = [first]; body.traverse(o => { if (o.isSkinnedMesh && o !== first && o.material === first.material) parts.push(o); });
  const toBody = new THREE.Matrix4().copy(body.matrixWorld).invert(), bones = [];
  if (!cache.geo) {
    let base = 0;
    const geos = parts.map(m => {
      const g = m.geometry.clone().applyMatrix4(toBody.clone().multiply(m.matrixWorld)), si = g.attributes.skinIndex;
      for (let i = 0; i < si.count; i++) for (let k = 0; k < 4; k++) si.setComponent(i, k, si.getComponent(i, k) + base);
      base += m.skeleton.bones.length;
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color', 'skinIndex', 'skinWeight'].includes(k)) g.deleteAttribute(k);
      return g.index ? g.toNonIndexed() : g;
    });
    cache.geo = mergeGeometries(geos); cache.geo.computeBoundingSphere();
  }
  // (each old mesh carries its chain's first bone, and with it everything hung on the chain: move those up onto its
  // parent first; the meshes stand at their parent's origin, so nothing moves)
  for (const m of parts) { bones.push(...m.skeleton.bones); const up = m.parent; for (const c of [...m.children]) up.add(c); up.remove(m); }
  const hide = new THREE.SkinnedMesh(cache.geo, first.material);
  hide.castShadow = hide.receiveShadow = true; hide.userData.part = 'body';
  body.add(hide); hide.updateMatrixWorld(true); hide.bind(new THREE.Skeleton(bones));
  return hide;
}

// A limb that is one plain mesh hanging down -y, skinned onto three bones `<prefix>0`..`2` (at the root, about
// half its length and nine tenths of it) under its group, as the skinned limbs are (chain-skin.js). Cached per
// geometry, so every member built alike shares the skinned copy.
const LIMBS = new WeakMap();
export function skinPlainLimb(group, prefix) {
  const m = group.children.find(o => o.isMesh && !o.isSkinnedMesh);
  if (!m) return;
  if (!LIMBS.has(m.geometry)) { m.geometry.computeBoundingBox(); const y = m.geometry.boundingBox.min.y; LIMBS.set(m.geometry, skinChain(m.geometry.clone(), [[0, 0, 0], [0, .5 * y, 0], [0, .9 * y, 0]])); }
  group.remove(m);
  rigChain(group, LIMBS.get(m.geometry), m.material, prefix, {part: m.userData.part});
}

// The trunk and neck of a standing creature on bones, and its whole skin in one hide (after its limbs are on
// bones and its joints named): a pelvis root `hips`, `spine0` at the waist, `spine1` at the chest, `neck0`..`neck3`
// from the top of the trunk to the head's pivot, placed from where the creature's own hips (`legs`), shoulders
// (`arms`) and head sit. The head hangs on `neck3` and the arms and wings on the chest; the legs and the tail stay
// on the pelvis. Then the trunk, limbs and tail (all on the limbs' material) become one skinned hide (`mergeSkins`);
// any other body skin (a second material, a glow) is skinned onto the same bones and bound to the hide's skeleton.
// `S`: the shared geometry, where the skinned copies are cached. Adds the bones to `actor.joints`.
export function rigBody(actor, S) {
  const {body, head, legs, arms, wings = []} = actor, legY = legs[0].position.y, armY = arms[0].position.y, h = head.position.toArray();
  const spine = [['hips', [0, 0, 0]], ['spine0', [0, legY + .35 * (armY - legY), 0]], ['spine1', [0, legY + .75 * (armY - legY), 0]]];
  const root = [0, armY + .35 * (h[1] - armY), .5 * h[2]], neck = [0, 1, 2, 3].map(i => ['neck' + i, root.map((v, k) => v + (h[k] - v) * i / 3)]);
  const def = {spine, neck, blend: .03, r: .045};
  const skins = body.children.filter(o => o.isMesh && !o.isSkinnedMesh && (o.userData.part === 'body' || o.userData.part === 'glow'));
  let limbMaterial = null; for (const o of [...arms, ...legs]) o.traverse(m => { if (m.isSkinnedMesh) limbMaterial ??= m.material; });
  const first = skins.find(m => m.userData.part === 'body' && m.material === limbMaterial) || skins.find(m => m.userData.part === 'body');
  const skinned = S.trunkSkins ??= new Map(), skinOf = m => { if (!skinned.has(m.geometry)) skinned.set(m.geometry, skinTrunk(m.geometry.clone(), def)); return skinned.get(m.geometry); };
  for (const m of skins) body.remove(m);
  const {mesh, bones} = rigTrunk(body, skinOf(first), first.material);
  hangOn(bones.neck3, head);
  for (const o of [...arms, ...wings]) hangOn(bones.spine1, o);
  const hide = mergeSkins(body, mesh, S.hideCache ??= {});
  for (const m of skins) if (m !== first) {
    const s = new THREE.SkinnedMesh(skinOf(m), m.material); s.castShadow = m.castShadow; s.receiveShadow = m.receiveShadow; s.userData.part = m.userData.part;
    body.add(s); s.updateMatrixWorld(true); s.bind(hide.skeleton, s.matrixWorld);
  }
  Object.assign(actor.joints, bones);
  return actor;
}
