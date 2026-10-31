// Fewer draws for the hero: the pieces other code toggles one by one (the face, hair and helm every turn, a class
// kit's armour, the death fade's and invisibility's per-piece materials) could not be merged for good, so here
// they are drawn through a merged stand-in instead. Siblings that share a parent and a material get one proxy
// mesh under that parent; the pieces themselves stay in place, keep their visibility, materials and transforms,
// and are only moved to a render layer no camera draws. Each frame `sync` reads what the pieces are now (shown or
// hidden, which material, where) and rebuilds the proxies when that changed, so the code that toggles a piece
// never has to know: a piece that goes see-through (fade, ghosting) or keeps moving drops out and draws itself.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const HIDDEN_LAYER = 31; // enabled on no camera: the main view, the occlusion pass, the shadow map, the portrait

const proxyTag = 'heroBatch';
const allowed = new Set(['hasOutline', 'valkyrie', 'merged']); // build-time labels (hero-valkyrie.js role, static-merge.js count), read only when the suit is built
function candidate(o, skip) {
  return o.isMesh && !o.isSkinnedMesh && !o.isInstancedMesh && !o.isBatchedMesh && !o.userData.outline && !o.userData[proxyTag]
    && !skip.has(o) && o.material && !Array.isArray(o.material) && !o.material.transparent && o.material.depthWrite !== false
    && o.geometry?.attributes?.position && !o.geometry.morphAttributes?.position
    && Object.keys(o.userData).every(k => allowed.has(k)) && o.children.every(c => c.userData.outline);
}
const layoutOf = g => `${Object.keys(g.attributes).sort().join(',')}|${g.index ? 'i' : 'n'}`;
const showLayer = (o, layer) => { o.layers.set(layer);for (const c of o.children) if (c.userData.outline) c.layers.set(layer); };

// root: the hero's group. exclude(o): subtrees left alone (held weapons, auras, a polymorph stand-in: things that
// are added, removed or deformed often). outline(mesh): gives a proxy its ink hull (readability.js addOutlines).
export function createHeroBatch(root, {exclude = () => false, outline = null} = {}) {
  let signature = '', proxies = [], batched = [], rebuilds = 0;
  const moving = new WeakSet(), rest = new WeakMap(), m = new THREE.Matrix4();
  function collect() {
    const found = [];
    const walk = o => {
      if (o !== root && exclude(o)) return;
      if (candidate(o, moving)) found.push(o);
      for (const c of o.children) if (!c.userData[proxyTag] && !c.userData.outline) walk(c);
    };
    walk(root);
    return found;
  }
  function unbatch() {
    for (const p of proxies) { p.parent?.remove(p);p.geometry.dispose(); } // its ink hull shares the geometry
    for (const o of batched) showLayer(o, 0);
    proxies = [];batched = [];
  }
  function build(found) {
    const groups = new Map();
    for (const o of found) {
      if (!o.visible) continue;
      const key = `${o.parent.uuid}|${o.material.uuid}|${o.castShadow}|${o.receiveShadow}|${o.renderOrder}|${o.frustumCulled}|${layoutOf(o.geometry)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(o);
    }
    for (const list of groups.values()) {
      if (list.length < 2) continue;
      const geos = list.map(o => { o.updateMatrix();rest.set(o, o.matrix.clone());return o.geometry.clone().applyMatrix4(o.matrix); });
      let merged = null;
      try { merged = mergeGeometries(geos, false); } catch { merged = null; }
      for (const g of geos) g.dispose();
      if (!merged) continue;
      const first = list[0], proxy = new THREE.Mesh(merged, first.material);
      proxy.name = 'hero batch';proxy.userData[proxyTag] = list.length;
      proxy.castShadow = first.castShadow;proxy.receiveShadow = first.receiveShadow;proxy.renderOrder = first.renderOrder;proxy.frustumCulled = first.frustumCulled;
      first.parent.add(proxy);
      if (list.some(o => o.userData.hasOutline && o.children.length)) outline?.(proxy);
      for (const o of list) showLayer(o, HIDDEN_LAYER);
      proxies.push(proxy);batched.push(...list);
    }
  }
  return {
    get proxies() { return proxies; },
    get batched() { return batched; },
    get rebuilds() { return rebuilds; },
    sync() {
      // a batched piece that moved on its own since (an animated hem, a swaying prop) leaves the batch for good
      let dirty = false;
      for (const o of batched) { o.updateMatrix();if (!o.matrix.equals(rest.get(o) ?? m)) { moving.add(o);dirty = true; } }
      const found = collect();
      let sig = '';for (const o of found) sig += `${o.id}${o.visible ? '+' : '-'}${o.material.id}${o.parent.id};`;
      if (!dirty && sig === signature) return false;
      signature = sig;unbatch();build(found);rebuilds++;
      return true;
    },
    dispose() { unbatch();signature = ''; },
  };
}
