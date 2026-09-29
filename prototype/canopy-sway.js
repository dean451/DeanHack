// Stirs the leaves of every tree in the scene (tree.js tags its leaves mesh userData.part='leaves').
// The trunk and branches stay still; only the canopy moves. It leans a little about the bottom
// centre of its geometry, so the lowest clumps stay on their branches and the crown moves most,
// and it breathes slightly wider and narrower. A slow draught comes and goes every several
// seconds, leaning the whole canopy one way, and a faint rustle rides on top. The draught's
// direction is shared by the whole scene (it's the same air), so a grove leans together, but
// each tree has its own phase for the rustle.
// The scene is re-scanned twice a second, so trees on tiles that come and go are picked up.
// Everything is a function of t, so it's frame-rate independent and restore() puts back the rest pose.
import * as THREE from 'three';

export const CANOPY_SCAN_EVERY = .5; // seconds between scene scans
export const CANOPY_LEAN = .03; // peak lean in a draught, radians
export const CANOPY_RUSTLE = .006; // peak quick rustle, radians
export const CANOPY_BREATHE = .012; // peak width change (fraction)

const q = new THREE.Quaternion(), e = new THREE.Euler(), a = new THREE.Vector3(), b = new THREE.Vector3();

function phaseOf(mesh) {
  const x = Math.sin(mesh.id * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * Math.PI * 2;
}

// The canopy's pose at time t: lean on x and z (radians, in the tree's parent frame) and width scale.
export function canopyState(t, phase = 0) {
  // The draught: 0 most of the time, swelling to 1 for a few seconds, then dying away.
  const d = Math.max(0, Math.sin(t * .31) * .6 + Math.sin(t * .17 + 1.1) * .4);
  const gust = d * d * (3 - 2 * d);
  const dir = t * .023 + 1.3; // drifts slowly round the compass
  const sway = Math.sin(t * 1.3 + phase) * .6 + .4; // the lean sways a little within the gust
  const lean = gust * sway * CANOPY_LEAN;
  const rx = Math.sin(t * 3.7 + phase * 1.3) * .6 + Math.sin(t * 6.3 + phase * .7) * .4;
  const rz = Math.sin(t * 3.1 + phase * 1.9) * .6 + Math.sin(t * 5.7 + phase * .4) * .4;
  const rustle = (.35 + gust * .65) * CANOPY_RUSTLE;
  const leanX = Math.cos(dir) * lean + rx * rustle;
  const leanZ = Math.sin(dir) * lean + rz * rustle;
  const breathe = 1 + Math.sin(t * .9 + phase) * CANOPY_BREATHE * (.5 + gust * .5);
  return {leanX, leanZ, breathe, gust};
}

function rest(mesh) {
  if (mesh.userData.canopyRest) return mesh.userData.canopyRest;
  const geo = mesh.geometry;
  if (!geo.boundingBox) geo.computeBoundingBox();
  const box = geo.boundingBox;
  return mesh.userData.canopyRest = {
    position: mesh.position.clone(), quaternion: mesh.quaternion.clone(), scale: mesh.scale.clone(),
    pivot: new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2),
    phase: phaseOf(mesh),
  };
}

export function poseCanopy(mesh, t) {
  const r = rest(mesh), c = canopyState(t, r.phase);
  mesh.scale.set(r.scale.x * c.breathe, r.scale.y, r.scale.z * c.breathe);
  // Lean in the parent's frame, so the draught has one direction however the tree was turned.
  mesh.quaternion.copy(q.setFromEuler(e.set(c.leanX, 0, c.leanZ))).multiply(r.quaternion);
  a.copy(r.pivot).multiply(r.scale).applyQuaternion(r.quaternion);
  b.copy(r.pivot).multiply(mesh.scale).applyQuaternion(mesh.quaternion);
  mesh.position.copy(r.position).add(a).sub(b);
}

export function restoreCanopy(mesh) {
  const r = mesh.userData.canopyRest;
  if (!r) return;
  mesh.position.copy(r.position);mesh.quaternion.copy(r.quaternion);mesh.scale.copy(r.scale);
  delete mesh.userData.canopyRest;
}

export function findCanopies(scene) {
  const out = [];
  scene.traverse(o => { if (o.isMesh && o.userData.part === 'leaves' && o.parent?.userData.canopy === o) out.push(o); });
  return out;
}

export function createCanopySway(scene) {
  let canopies = [], nextScan = -Infinity;
  return {
    get canopies() { return canopies; },
    update(t) {
      if (t >= nextScan || t < nextScan - CANOPY_SCAN_EVERY * 2) {
        const found = findCanopies(scene), keep = new Set(found);
        for (const c of canopies) if (!keep.has(c)) restoreCanopy(c);
        canopies = found;nextScan = t + CANOPY_SCAN_EVERY;
      }
      for (const c of canopies) if (c.visible) poseCanopy(c, t);
    },
    restore() { for (const c of canopies) restoreCanopy(c);canopies = [];nextScan = -Infinity; },
  };
}
