// Fewer draws for a model made of many small pieces: meshes that share a parent and a material, and that nothing
// else in the game holds on to, are merged into one mesh under that parent. They already move together (they
// ride the same parent), so animation is unchanged; each merged mesh is one draw instead of many, and its ink
// outline one more instead of many more. The hero alone was some 140 visible meshes and as many outlines.
//
// Left alone: named meshes, meshes with children or userData of their own, skinned and instanced meshes, and
// anything in `keep` (objects other code toggles or removes by reference, e.g. live.js's hero.parts and a kit's
// added pieces, and everything under them). Merging is idempotent: a merged mesh is tagged and never merged again.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const own = o => Object.keys(o.userData).filter(k => k !== 'hasOutline');
export function mergeable(o, keep) {
  return !!(o.isMesh && !o.name && !o.isSkinnedMesh && !o.isInstancedMesh && !o.isBatchedMesh && o.material && !Array.isArray(o.material)
    && !o.userData.outline && !own(o).length && !o.children.some(c => !c.userData.outline) && !keep?.has(o) && o.geometry?.attributes?.position && !o.geometry.morphAttributes?.position);
}

// Every Object3D reachable from `refs` (objects, arrays and plain objects of them). Only the objects themselves:
// code that holds a group toggles or removes the group, and merging the pieces inside it changes nothing for it.
export function heldObjects(...refs) {
  const held = new Set(), seen = new Set();
  const walk = v => {
    if (!v || typeof v !== 'object' || seen.has(v)) return; seen.add(v);
    if (v.isObject3D) { held.add(v); return; }
    if (v.isMaterial || v.isBufferGeometry || v.isTexture || v.isColor || v.isVector3) return;
    for (const x of Array.isArray(v) ? v : Object.values(v)) walk(x);
  };
  for (const r of refs) walk(r);
  return held;
}

export function mergeStatic(root, {keep = null} = {}) {
  const groups = new Map();
  root.traverse(o => {
    if (!mergeable(o, keep)) return;
    const g = o.geometry, key = `${o.parent.uuid}|${o.material.uuid}|${o.visible}|${o.castShadow}|${o.receiveShadow}|${o.renderOrder}|${Object.keys(g.attributes).sort().join(',')}|${g.index ? 'i' : 'n'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  });
  let removed = 0;
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const parent = list[0].parent, geos = list.map(o => { o.updateMatrix(); return o.geometry.clone().applyMatrix4(o.matrix); });
    let merged = null;
    try { merged = mergeGeometries(geos, false); } catch { merged = null; }
    for (const g of geos) g.dispose();
    if (!merged) continue;
    const first = list[0], m = new THREE.Mesh(merged, first.material);
    m.castShadow = first.castShadow; m.receiveShadow = first.receiveShadow; m.visible = first.visible; m.renderOrder = first.renderOrder; m.frustumCulled = first.frustumCulled;
    m.userData.merged = list.length;
    for (const o of list) { parent.remove(o); for (const c of [...o.children]) o.remove(c); }
    parent.add(m);
    removed += list.length - 1;
  }
  return removed;
}
