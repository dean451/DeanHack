// A scar cut into a faceted trunk (review 2026-11-13, the hill giant): a straight bar laid at a fixed depth stands
// proud of a slab-sided chest with its ends in the air. carveScar instead samples the scar's line straight onto the
// skin (a ray from the front at each sample), and builds a thin ribbon through the hits, lifted a hair along each
// hit's normal, so the gash lies in the skin across every facet and pectoral edge it crosses.
import * as THREE from 'three';

// parent: the group the skin pieces and the scar share (no rotation between them and the ray's frame);
// skins: the meshes the scar lies on; x, y: its middle; len, wide: its size; rz: its slant (as rotation.z).
export function carveScar(parent, skins, mat, {x, y, len = .15, wide = .016, rz = 0, lift = .002, samples = 12} = {}) {
  parent.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(), inv = parent.matrixWorld.clone().invert(), nm = new THREE.Matrix3();
  const dir = new THREE.Vector3(0, 0, -1).transformDirection(parent.matrixWorld);
  const along = new THREE.Vector3(-Math.sin(rz), Math.cos(rz), 0), across = new THREE.Vector3(Math.cos(rz), Math.sin(rz), 0);
  // each rail of the ribbon is cast onto the skin on its own, so every vertex, edge or middle, lands on the surface
  const cast = (u, v) => {
    ray.set(new THREE.Vector3(x + along.x * u + across.x * v, y + along.y * u + across.y * v, 1).applyMatrix4(parent.matrixWorld), dir);
    const hit = ray.intersectObjects(skins, false)[0];
    if (!hit) return null;
    nm.getNormalMatrix(hit.object.matrixWorld);
    const n = hit.face.normal.clone().applyMatrix3(nm).normalize();
    if (n.dot(dir) > 0) n.negate();
    return hit.point.addScaledVector(n, lift * parent.matrixWorld.getMaxScaleOnAxis()).applyMatrix4(inv);
  };
  const pos = [], idx = [];
  let rows = 0;
  for (let i = 0; i < samples; i++) {
    const u = (i / (samples - 1) - .5) * len, w = (i === 0 || i === samples - 1 ? .15 : 1) * wide / 2; // the ends pinch, as a healed slash does
    const l = cast(u, -w), r = cast(u, w);
    if (!l || !r) continue;
    pos.push(...l.toArray(), ...r.toArray());
    if (rows) { const a = 2 * rows - 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    rows++;
  }
  if (rows < 2) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  // (the winding faces the normal side: flip a ribbon whose first face points into the skin)
  const n0 = new THREE.Vector3().fromBufferAttribute(geo.attributes.normal, 0);
  if (n0.dot(dir.clone().transformDirection(inv)) > 0) { idx.reverse(); geo.setIndex(idx); geo.computeVertexNormals(); }
  const m = new THREE.Mesh(geo, mat); m.castShadow = false; m.receiveShadow = true; m.userData.scar = true;
  parent.add(m);
  return m;
}
