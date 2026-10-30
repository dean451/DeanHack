// The dimming over remembered squares (remembered.js) as one instanced draw. Each remembered square used to carry
// its own transparent plane with its own material: one draw call per square (72 in a small explored level, the
// biggest single group of draws in a frame), each sorted as a transparent object, and setDim marked every one of
// those materials for recompilation on every engine frame. Now a square keeps only an empty stand-in object
// (`tile.userData.fog`, whose `visible` the rest of live.js reads and sets as before) and this layer draws every
// visible stand-in as an instance of one plane with one shared material.
import * as THREE from 'three';

export function createDimLayer(THREE_, parent, {color, opacity, start = 256} = {}) {
  const T = THREE_ || THREE;
  const geometry = new T.PlaneGeometry(.98, .98).rotateX(-Math.PI / 2);
  const material = new T.MeshBasicMaterial({color, transparent: true, opacity, depthWrite: false});
  let mesh = null, dirty = true;
  const m = new T.Matrix4();
  const build = capacity => {
    if (mesh) { parent.remove(mesh); mesh.dispose(); }
    mesh = new T.InstancedMesh(geometry, material, capacity);
    mesh.name = 'dim layer'; mesh.frustumCulled = false; mesh.count = 0; mesh.renderOrder = 1;
    parent.add(mesh);
  };
  build(start);
  return {
    // A square's stand-in: an empty object at the plane's place, hidden until setDim shows it.
    stand(tile) { const o = new T.Object3D(); o.position.set(0, .012, 0); o.visible = false; o.name = 'dim'; tile.add(o); dirty = true; return o; },
    touch() { dirty = true; },
    // Rebuilds the instances from the tiles' stand-ins when something changed. `tiles` is live.js's Map.
    sync(tiles) {
      if (!dirty) return mesh.count;
      dirty = false;
      let n = 0;
      for (const tile of tiles.values()) { const f = tile.userData.fog; if (f?.visible && tile.visible && tile.parent) n++; }
      if (n > mesh.instanceMatrix.count) build(Math.max(n * 2, start));
      let i = 0;
      for (const tile of tiles.values()) {
        const f = tile.userData.fog;
        if (!f?.visible || !tile.visible || !tile.parent) continue;
        m.makeTranslation(tile.position.x + f.position.x, tile.position.y + f.position.y, tile.position.z + f.position.z);
        mesh.setMatrixAt(i++, m);
      }
      mesh.count = i; mesh.instanceMatrix.needsUpdate = true;
      return i;
    },
    get mesh() { return mesh; },
    get count() { return mesh.count; },
  };
}
