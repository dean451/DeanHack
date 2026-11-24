// Skinned vertex positions for the pose solvers, bit for bit what three gives, at a fraction of the cost.
// A solver's floor and clearance goals read hundreds of skin samples per evaluation and evaluate thousands of
// times, and three's SkinnedMesh.applyBoneTransform rebuilds a bone's skinning matrix (bone world x bone inverse)
// for every influence of every vertex. Here each bone's matrix is built once per read, with the same
// multiplyMatrices, and each vertex goes through the same Vector3 steps in the same order, so the positions are
// identical, not close (skin-points.test.js). A mesh with morph targets, or one that is not skinned, is read
// through three's own getVertexPosition.
import * as THREE from 'three';

const base = new THREE.Vector3(), tmp = new THREE.Vector3(), idx = new THREE.Vector4(), wts = new THREE.Vector4();

// mesh.getVertexPosition(i, target).applyMatrix4(mesh.matrixWorld) for each i of `indices`, with `skin` the
// bone matrices of this read (or null to use three's own path); calls each(target) per vertex.
function read(mesh, indices, skin, each) {
  const target = new THREE.Vector3();
  if (!skin) { for (const i of indices) each(mesh.getVertexPosition(i, target).applyMatrix4(mesh.matrixWorld)); return; }
  const g = mesh.geometry, pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
  for (const i of indices) {
    target.fromBufferAttribute(pos, i);
    idx.fromBufferAttribute(si, i);wts.fromBufferAttribute(sw, i);
    base.copy(target).applyMatrix4(mesh.bindMatrix);
    target.set(0, 0, 0);
    for (let k = 0; k < 4; k++) {
      const w = wts.getComponent(k);
      if (w !== 0) target.addScaledVector(tmp.copy(base).applyMatrix4(skin(idx.getComponent(k))), w);
    }
    target.applyMatrix4(mesh.bindMatrixInverse).applyMatrix4(mesh.matrixWorld);
    each(target);
  }
}
const plain = m => !m.isSkinnedMesh || !!(m.geometry.morphAttributes.position && m.morphTargetInfluences);
// this read's skinning matrices, one per bone, built when first asked for
function skinOf(mesh) {
  if (plain(mesh)) return null;
  const bones = mesh.skeleton.bones, inv = mesh.skeleton.boneInverses, made = new Map();
  return b => { let m = made.get(b); if (!m) { m = new THREE.Matrix4().multiplyMatrices(bones[b].matrixWorld, inv[b]); made.set(b, m); } return m; };
}
const every = (count, step) => { const out = []; for (let i = 0; i < count; i += step) out.push(i); return out; };
const allOf = new WeakMap(), all = pos => { let a = allOf.get(pos); if (!a || a.length !== pos.count) allOf.set(pos, a = every(pos.count, 1)); return a; };

// A goal's sampler: every `step`th vertex of each mesh in `skins`, in world space, as fresh Vector3s. Each read
// first updates the mesh's world matrix and skeleton, as the solvers did before.
export function skinSampler(skins, step) {
  const indices = skins.map(m => every(m.geometry.attributes.position.count, step));
  return () => {
    const out = [];
    skins.forEach((m, n) => { m.updateMatrixWorld(true);m.skeleton.update();read(m, indices[n], skinOf(m), p => out.push(p.clone())); });
    return out;
  };
}

// new THREE.Box3().setFromObject(group, true).min.y: the lowest vertex under `group`, read as three's precise
// box reads it (each object's world matrix updated, every vertex of every mesh, children in order).
export function lowestY(group) {
  // anything this does not read the way three does (an instanced mesh, geometry with no positions) goes to three
  let odd = false;group.traverse(o => { if (o.geometry !== undefined && (o.isInstancedMesh === true || o.geometry.getAttribute?.('position') === undefined)) odd = true; });
  if (odd) return new THREE.Box3().setFromObject(group, true).min.y;
  let y = Infinity;
  const visit = o => {
    o.updateWorldMatrix(false, false);
    if (o.geometry !== undefined) {
      const pos = o.geometry.getAttribute('position');
      if (o.isMesh === true) read(o, all(pos), skinOf(o), p => { if (p.y < y) y = p.y; });
      else { const p = new THREE.Vector3(); for (let i = 0; i < pos.count; i++) { p.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); if (p.y < y) y = p.y; } }
    }
    for (const c of o.children) visit(c);
  };
  visit(group);
  return y;
}
