// One draw for every baked body part of every monster on the level. bakeDraws (creatures.js)
// leaves each staged creature as a few meshes that all share one BakedMaterial, so they can go
// into a single THREE.BatchedMesh: each part is a geometry in the batch and an instance whose
// matrix follows the part every frame. The part's own mesh stays in the creature's rig as a
// proxy (its matrixWorld is what we copy, from the batch's own render hooks, once the renderer
// has brought the world matrices up to date), moved to a layer no camera renders. A part whose
// material an effect swaps (fade, ghosting, stone) leaves the batch and draws itself until the
// material comes back; a part whose creature is hidden or released drops out. Nothing else in
// the game needs to know: effects keep working on the proxies. A part whose geometry an
// animation rewrites (a swaying hem, a writhing tentacle) is noticed by its attribute version
// and left to draw itself for good.
import * as THREE from 'three';

export const HIDDEN_LAYER = 31;
export const START = {instances: 256, vertices: 160000, indices: 480000};

const isUnder = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
const shown = (o, root) => { for (let p = o; p && p !== root; p = p.parent) if (!p.visible) return false; return true; };

export function createActorBatch(root, {start = START} = {}) {
  const batches = new Map(); // material + attribute layout -> {mesh}: BatchedMesh needs one layout per batch
  const entries = new Map(); // proxy mesh -> {b, material, geometryId, instanceId, drawn}
  const m = new THREE.Matrix4(), inv = new THREE.Matrix4();
  let warned = false;

  // Geometries in one BatchedMesh must share their attribute set (the early-game models carry no
  // uv), so the layout is part of the key and such models get a batch of their own.
  const layoutOf = geometry => Object.keys(geometry.attributes).sort().join(',');
  function batchFor(material, geometry) {
    const key = material.uuid + '|' + layoutOf(geometry);
    let b = batches.get(key);
    if (!b) {
      const mesh = new THREE.BatchedMesh(start.instances, start.vertices, start.indices, material);
      mesh.castShadow = mesh.receiveShadow = true; mesh.sortObjects = false; mesh.name = 'actor batch';
      // the shadow pass comes first in a frame, the colour pass after: whichever is first syncs.
      // BatchedMesh has its own hooks (culling, the multi-draw lists), so they run after ours.
      const render = mesh.onBeforeRender, shadow = mesh.onBeforeShadow;
      mesh.onBeforeRender = function (renderer, ...rest) { sync(renderer?.info?.render?.frame); return render.call(this, renderer, ...rest); };
      mesh.onBeforeShadow = function (renderer, ...rest) { sync(renderer?.info?.render?.frame); return shadow.call(this, renderer, ...rest); };
      root.add(mesh);
      batches.set(key, b = {mesh});
    }
    return b;
  }
  // Grows the batch when a geometry would not fit, compacting freed space first.
  function fit(b, geometry) {
    const need = geometry.attributes.position.count, needI = geometry.index ? geometry.index.count : 0, mesh = b.mesh;
    if (mesh.unusedVertexCount < need || mesh.unusedIndexCount < needI) mesh.optimize();
    if (mesh.unusedVertexCount < need || mesh.unusedIndexCount < needI) {
      const g = mesh.geometry, v = g.attributes.position.count, i = g.index ? g.index.count : 0;
      mesh.setGeometrySize(Math.max(v * 2, v + need * 2), Math.max(i * 2, i + needI * 2));
    }
    if (mesh.instanceCount >= mesh.maxInstanceCount) mesh.setInstanceCount(mesh.maxInstanceCount * 2);
  }

  // Puts a staged creature's baked parts into the batch. Returns how many it took.
  function add(actor) {
    const g = actor?.g;
    if (!g) return 0;
    let n = 0;
    g.traverse(o => {
      if (!o.isMesh || !o.material?.isBakedMaterial || entries.has(o) || o.userData.outline || o.userData.unbatched || !o.castShadow || !o.geometry?.index || !o.geometry.attributes?.position) return;
      const b = batchFor(o.material, o.geometry);
      let geometryId, instanceId;
      try { fit(b, o.geometry); geometryId = b.mesh.addGeometry(o.geometry); instanceId = b.mesh.addInstance(geometryId); }
      catch (err) { o.userData.unbatched = true; if (!warned) { warned = true; console.warn('batched-actors: a part draws itself', err.message); } return; }
      o.layers.set(HIDDEN_LAYER);
      entries.set(o, {b, material: o.material, geometry: o.geometry, version: o.geometry.attributes.position.version, geometryId, instanceId, drawn: true});
      n++;
    });
    return n;
  }

  function drop(o, e) {
    e.b.mesh.deleteInstance(e.instanceId); e.b.mesh.deleteGeometry(e.geometryId);
    o.layers.set(0);
    entries.delete(o);
  }

  // Once a frame, after the rig is posed: who is still here, who draws itself, who is hidden.
  function update() {
    for (const [o, e] of entries) {
      if (!isUnder(o, root)) { drop(o, e); continue; }
      // an animation rewrites this part's vertices: it draws itself from now on
      if (o.geometry !== e.geometry || o.geometry.attributes.position.version !== e.version) { drop(o, e); o.userData.unbatched = true; continue; }
      const mesh = e.b.mesh;
      // an effect swapped the material: the proxy draws itself until it is put back
      const swapped = o.material !== e.material;
      if (swapped) { if (e.drawn) { mesh.setVisibleAt(e.instanceId, false); o.layers.set(0); e.drawn = false; } continue; }
      if (!e.drawn) { o.layers.set(HIDDEN_LAYER); e.drawn = true; }
      e.visible = shown(o, root);
      mesh.setVisibleAt(e.instanceId, e.visible);
    }
    synced = null;
  }
  // Copies every drawn part's world matrix into its instance. The render hooks call this with
  // the renderer's frame number so it runs once a frame however many passes draw the batch.
  let synced = null;
  function sync(frame = null) {
    if (frame !== null && frame === synced) return;
    synced = frame;
    for (const [o, e] of entries) {
      if (!e.drawn || !e.visible) continue;
      const mesh = e.b.mesh;
      inv.copy(mesh.matrixWorld).invert(); m.multiplyMatrices(inv, o.matrixWorld); mesh.setMatrixAt(e.instanceId, m);
    }
  }

  function clear() { for (const [o, e] of [...entries]) drop(o, e); }
  return {add, update, sync, clear, get size() { return entries.size; }, get batches() { return batches.size; }, drawn: () => [...entries.values()].filter(e => e.drawn).length, meshes: () => [...batches.values()].map(b => b.mesh)};
}
