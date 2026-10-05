// Poison gas roils and drifts (poison-cloud.js tags the group userData.poisonCloud and its two
// meshes userData.part core or wisps). The dense core turns slowly and heaves, swelling and
// sinking as if something below were breathing it; the thin wisps turn the other way, faster,
// and curl up and out, so the edges seem to peel off the bank and thread back in. Each cloud
// has its own phase, so a bank of gas never moves in unison. Everything is a function of t, so
// it is frame-rate independent and restore() puts back the rest pose exactly.
// What the cloud hangs over shows in it (the tile's ground, set by live.js): over lava the core
// is lit orange from beneath and gutters like a coal; over water the bank clings low and spreads
// into a film whose thin edge ripples. Both are functions of t as well.
// The scene is re-scanned twice a second, so tiles that come and go are picked up.
import * as THREE from 'three';

export const GAS_SCAN_EVERY = .5; // seconds between scene scans
export const GAS_CORE_TURN = .22; // core spin, radians per second
export const GAS_WISP_TURN = -.55; // wisp spin, radians per second (the other way, faster)
export const GAS_HEAVE = .12; // peak core height change (fraction)
export const GAS_CURL = .35; // peak wisp height change (fraction)
export const GAS_DRIFT = .035; // peak sideways wander of the core, tile units

export const GAS_LAVA_GLOW = .75; // peak extra emissive intensity over lava
export const GAS_FILM_SQUASH = .4; // how much lower the core sits over water (fraction)
export const GAS_FILM_SPREAD = .12; // how much wider it spreads over water (fraction)
export const GAS_RIPPLE = .12; // peak opacity ripple of the wisps over water (fraction)
const LAVA_LIGHT = new THREE.Color(0xff5a10);

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

// Extra look from the ground under the cloud: `glow` (0..1 orange mix and flicker, lava only),
// `squash` and `spread` scales for the core, `ripple` an opacity factor for the wisps.
export function gasGround(ground, part, t, phase = 0) {
  const out = {glow: 0, squash: 1, spread: 1, ripple: 1};
  if (ground === 'lava' && part === 'core') {
    out.glow = .55 + Math.sin(t * 3.1 + phase) * .25 + Math.sin(t * 7.3 + phase * 2.3) * .2;
  } else if (ground === 'water') {
    if (part === 'core') { out.squash = 1 - GAS_FILM_SQUASH;out.spread = 1 + GAS_FILM_SPREAD; }
    else out.ripple = 1 + Math.sin(t * 2.6 + phase) * GAS_RIPPLE;
  }
  return out;
}

function rest(mesh) {
  return mesh.userData.gasRest ||= {
    position: mesh.position.clone(), rotation: mesh.rotation.y, scale: mesh.scale.clone(), phase: phaseOf(mesh),
    emissive: mesh.material.emissive?.clone(), intensity: mesh.material.emissiveIntensity, opacity: mesh.material.opacity,
  };
}

export function poseGas(mesh, t) {
  const r = rest(mesh), s = gasState(mesh.userData.part, t, r.phase);
  mesh.rotation.y = r.rotation + s.spin;
  mesh.scale.set(r.scale.x * s.sxz, r.scale.y * s.sy, r.scale.z * s.sxz);
  mesh.position.set(r.position.x + s.dx, r.position.y, r.position.z + s.dz);
  const g = gasGround(mesh.parent?.parent?.parent?.userData.ground, mesh.userData.part, t, r.phase), mat = mesh.material;
  mesh.scale.x *= g.spread;mesh.scale.z *= g.spread;mesh.scale.y *= g.squash;
  if (mat.emissive) {
    mat.emissive.copy(r.emissive).lerp(LAVA_LIGHT, g.glow);
    mat.emissiveIntensity = r.intensity + g.glow * GAS_LAVA_GLOW;
  }
  mat.opacity = Math.min(1, r.opacity * g.ripple);
}

export function restoreGas(mesh) {
  const r = mesh.userData.gasRest;
  if (!r) return;
  mesh.position.copy(r.position);mesh.rotation.y = r.rotation;mesh.scale.copy(r.scale);
  if (mesh.material.emissive) { mesh.material.emissive.copy(r.emissive);mesh.material.emissiveIntensity = r.intensity; }
  mesh.material.opacity = r.opacity;
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
