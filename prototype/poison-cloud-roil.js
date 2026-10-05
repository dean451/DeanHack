// Poison gas roils and drifts (poison-cloud.js tags the group userData.poisonCloud and its two
// meshes userData.part core or wisps). The dense core turns slowly and heaves, swelling and
// sinking as if something below were breathing it; the thin wisps turn the other way, faster,
// and curl up and out, so the edges seem to peel off the bank and thread back in. Each cloud
// has its own phase, so a bank of gas never moves in unison. Everything is a function of t, so
// it is frame-rate independent and restore() puts back the rest pose exactly.
// The scene is re-scanned twice a second, so tiles that come and go are picked up.
import * as THREE from 'three';

export const GAS_SCAN_EVERY = .5; // seconds between scene scans
export const GAS_CORE_TURN = .22; // core spin, radians per second
export const GAS_WISP_TURN = -.55; // wisp spin, radians per second (the other way, faster)
export const GAS_HEAVE = .12; // peak core height change (fraction)
export const GAS_CURL = .35; // peak wisp height change (fraction)
export const GAS_DRIFT = .035; // peak sideways wander of the core, tile units

function phaseOf(mesh) {
  const x = Math.sin(mesh.id * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * Math.PI * 2;
}

// The pose of a part at time t: spin about the vertical, height scale, widening, and wander.
export function gasState(part, t, phase = 0) {
  if (part === 'wisps') {
    const curl = Math.sin(t * 1.1 + phase) * .6 + Math.sin(t * 2.3 + phase * 1.7) * .4;
    return {
      spin: GAS_WISP_TURN * t + Math.sin(t * .7 + phase) * .3,
      sy: 1 + curl * GAS_CURL,
      sxz: 1 - curl * GAS_CURL * .35,
      dx: Math.sin(t * .9 + phase) * GAS_DRIFT * 1.5,
      dz: Math.cos(t * .8 + phase * 1.3) * GAS_DRIFT * 1.5,
    };
  }
  const heave = Math.sin(t * .8 + phase) * .6 + Math.sin(t * 1.9 + phase * 2.1) * .4;
  return {
    spin: GAS_CORE_TURN * t,
    sy: 1 + heave * GAS_HEAVE,
    sxz: 1 - heave * GAS_HEAVE * .5,
    dx: Math.sin(t * .37 + phase) * GAS_DRIFT,
    dz: Math.cos(t * .31 + phase * 1.4) * GAS_DRIFT,
  };
}

function rest(mesh) {
  return mesh.userData.gasRest ||= {
    position: mesh.position.clone(), rotation: mesh.rotation.y, scale: mesh.scale.clone(), phase: phaseOf(mesh),
  };
}

export function poseGas(mesh, t) {
  const r = rest(mesh), s = gasState(mesh.userData.part, t, r.phase);
  mesh.rotation.y = r.rotation + s.spin;
  mesh.scale.set(r.scale.x * s.sxz, r.scale.y * s.sy, r.scale.z * s.sxz);
  mesh.position.set(r.position.x + s.dx, r.position.y, r.position.z + s.dz);
}

export function restoreGas(mesh) {
  const r = mesh.userData.gasRest;
  if (!r) return;
  mesh.position.copy(r.position);mesh.rotation.y = r.rotation;mesh.scale.copy(r.scale);
  delete mesh.userData.gasRest;
}

export function findGas(scene) {
  const out = [];
  scene.traverse(o => { if (o.isMesh && o.parent?.userData.poisonCloud && (o.userData.part === 'core' || o.userData.part === 'wisps')) out.push(o); });
  return out;
}

export function createGasRoil(scene) {
  let meshes = [], nextScan = -Infinity;
  return {
    get meshes() { return meshes; },
    update(t) {
      if (t >= nextScan || t < nextScan - GAS_SCAN_EVERY * 2) {
        const found = findGas(scene), keep = new Set(found);
        for (const m of meshes) if (!keep.has(m)) restoreGas(m);
        meshes = found;nextScan = t + GAS_SCAN_EVERY;
      }
      for (const m of meshes) if (m.visible) poseGas(m, t);
    },
    restore() { for (const m of meshes) restoreGas(m);meshes = []; nextScan = -Infinity; },
  };
}
