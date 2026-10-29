import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

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
