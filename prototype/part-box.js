import * as THREE from 'three';

// The box a part of a creature fills, as posed now: its own plain meshes, and the vertices of any skinned hide
// whose heaviest bone lies under it (a limb or tail whose skin has joined a merged hide, trunk-skin.js
// mergeSkins, canine-hide.js, kobold.js, carries no mesh of its own). For tests and tools.
export function partBox(actor, part) {
  const box = new THREE.Box3(), v = new THREE.Vector3(), under = b => { for (let p = b; p; p = p.parent) if (p === part) return true; return false; };
  actor.g.updateMatrixWorld(true);
  part.traverse(o => { if (o.isMesh && !o.isSkinnedMesh) box.expandByObject(o); });
  actor.g.traverse(m => {
    if (!m.isSkinnedMesh) return;
    const bones = m.skeleton.bones, si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
    if (!bones.some(under)) return;
    for (let i = 0; i < si.count; i++) {
      let k = 0; for (let c = 1; c < 4; c++) if (sw.getComponent(i, c) > sw.getComponent(i, k)) k = c;
      if (under(bones[si.getComponent(i, k)])) box.expandByPoint(m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld));
    }
  });
  return box;
}
