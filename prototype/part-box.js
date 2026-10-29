import * as THREE from 'three';

// The points of a part of a creature, as posed now (world space): its own plain meshes' vertices, and the vertices
// of any skinned hide whose heaviest bone lies under it (a limb or tail whose skin has joined a merged hide,
// trunk-skin.js mergeSkins, canine-hide.js, kobold.js, carries no mesh of its own). `every`: take every nth
// vertex. For tests and tools.
export function partPoints(actor, part, every = 1) {
  const out = [], v = new THREE.Vector3(), under = b => { for (let p = b; p; p = p.parent) if (p === part) return true; return false; };
  actor.g.updateMatrixWorld(true);
  part.traverse(o => {
    const p = o.isMesh && !o.isSkinnedMesh && o.geometry?.attributes?.position; if (!p) return;
    for (let i = 0; i < p.count; i += every) out.push(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).clone());
  });
  actor.g.traverse(m => {
    if (!m.isSkinnedMesh) return;
    const bones = m.skeleton.bones, si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
    if (!bones.some(under)) return;
    for (let i = 0; i < si.count; i += every) {
      let k = 0; for (let c = 1; c < 4; c++) if (sw.getComponent(i, c) > sw.getComponent(i, k)) k = c;
      if (under(bones[si.getComponent(i, k)])) out.push(m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld).clone());
    }
  });
  return out;
}
// The box a part fills, as posed now (world space).
export const partBox = (actor, part) => new THREE.Box3().setFromPoints(partPoints(actor, part));
