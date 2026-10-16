// The level's repeated pieces (floor slabs, wall blocks, pebbles) drawn as instances: one draw
// per (geometry, material) pair instead of one per tile. A tile keeps its own meshes as proxies
// (hidden from every camera by their layer), so everything that dresses, hides or releases a
// tile goes on working on them; each proxy's world matrix is copied into its instance, from the
// instanced mesh's own render hooks so the matrices are current, whenever a tile was added or
// the level changed. A hidden proxy (a slab under water, an unseen tile) gets a zero matrix. A
// pair of one is left alone: nothing to gain. Only three's own mesh materials are taken, since a
// custom shader has to opt into instancing itself.
import * as THREE from 'three';

export const HIDDEN_LAYER = 31;
export const PROMOTE_AT = 2, START = 256;
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

const isUnder = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
const shown = (o, root) => { for (let p = o; p && p !== root; p = p.parent) if (!p.visible) return false; return true; };
// A plain, opaque mesh with nothing of its own: a slab, a wall block, a pebble.
const builtIn = m => !!(m.isMeshStandardMaterial || m.isMeshBasicMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial);
export const instanceable = o => !!(o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && !o.children.length && !o.name
  && !Object.keys(o.userData).length && o.material && !Array.isArray(o.material) && builtIn(o.material) && !o.material.transparent && o.material.opacity === 1 && o.geometry && o.renderOrder === 0);

export function createTileInstancer(root, {promoteAt = PROMOTE_AT, start = START} = {}) {
  const bins = new Map(); // geometry.uuid|material.uuid -> {geometry, material, proxies: Set, mesh: InstancedMesh|null}
  const of = new Map(); // proxy -> bin
  const m = new THREE.Matrix4(), inv = new THREE.Matrix4();
  let dirty = false, synced = null;

  function build(bin, capacity) {
    const mesh = new THREE.InstancedMesh(bin.geometry, bin.material, capacity);
    mesh.castShadow = bin.cast; mesh.receiveShadow = bin.receive; mesh.frustumCulled = false; mesh.name = 'tile instances'; mesh.count = 0;
    mesh.onBeforeShadow = mesh.onBeforeRender = renderer => sync(renderer?.info?.render?.frame);
    return mesh;
  }
  // Puts a tile's plain repeated meshes under the instancer. Returns how many it took.
  function add(tile) {
    let n = 0;
    tile?.traverse?.(o => {
      if (!instanceable(o) || of.has(o)) return;
      const key = o.geometry.uuid + '|' + o.material.uuid + '|' + (o.castShadow ? 'c' : '') + (o.receiveShadow ? 'r' : '');
      let bin = bins.get(key);
      if (!bin) bins.set(key, bin = {geometry: o.geometry, material: o.material, cast: o.castShadow, receive: o.receiveShadow, proxies: new Set(), mesh: null});
      bin.proxies.add(o); of.set(o, bin); n++;
      // A proxy never moves on its own (its tile does), so its local matrix is composed once here
      // rather than on every render pass over the whole level.
      o.updateMatrix(); o.matrixAutoUpdate = false;
      if (bin.mesh) o.layers.set(HIDDEN_LAYER);
      else if (bin.proxies.size >= promoteAt) { bin.mesh = build(bin, Math.max(start, bin.proxies.size * 2)); root.add(bin.mesh); for (const p of bin.proxies) p.layers.set(HIDDEN_LAYER); }
    });
    if (n) dirty = true;
    return n;
  }
  // Something changed (a level applied, a tile hidden or released): re-sync before the next draw.
  function refresh() { dirty = true; }
  function sync(frame = null) {
    if (!dirty || (frame !== null && frame === synced)) return;
    synced = frame; dirty = false;
    for (const bin of bins.values()) {
      for (const p of bin.proxies) if (!isUnder(p, root)) { bin.proxies.delete(p); of.delete(p); p.layers.set(0); p.matrixAutoUpdate = true; }
      const mesh = bin.mesh;
      if (!mesh) continue;
      if (bin.proxies.size > mesh.instanceMatrix.count) { root.remove(mesh); mesh.dispose(); bin.mesh = build(bin, bin.proxies.size * 2); root.add(bin.mesh); bin.mesh.updateMatrixWorld(true); dirty = true; return sync(null); }
      inv.copy(mesh.matrixWorld).invert();
      let i = 0;
      for (const p of bin.proxies) {
        if (shown(p, root)) mesh.setMatrixAt(i, m.multiplyMatrices(inv, p.matrixWorld)); else mesh.setMatrixAt(i, ZERO);
        i++;
      }
      mesh.count = i; mesh.instanceMatrix.needsUpdate = true;
      if (i) mesh.computeBoundingSphere();
    }
  }
  function clear() {
    for (const bin of bins.values()) { for (const p of bin.proxies) { p.layers.set(0); p.matrixAutoUpdate = true; } if (bin.mesh) { root.remove(bin.mesh); bin.mesh.dispose(); } }
    bins.clear(); of.clear(); dirty = false;
  }
  return {add, refresh, sync, clear, get size() { return of.size; }, get draws() { let n = 0; for (const b of bins.values()) if (b.mesh) n++; return n; }, meshes: () => [...bins.values()].filter(b => b.mesh).map(b => b.mesh)};
}
