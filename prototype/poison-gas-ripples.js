import * as THREE from 'three';

// Gas over water sits on the surface and disturbs it: two thin sickly rings spread out from
// under the bank, one after the other, thin out and vanish, as if something below were
// breathing on the water. Each ring is a function of t (frame-rate independent). Two meshes
// share one geometry and one material per cloud over water, none elsewhere. poison-cloud-roil.js
// attaches the group when a cloud sits on water and detaches it when the ground changes.
export const GAS_RIPPLES = 2; // rings per cloud over water
export const GAS_RIPPLE_PERIOD = 3.4; // seconds for one ring to spread and fade
export const GAS_RIPPLE_REACH = .46; // outer radius of a ring at the end of its life, tile units
const RING_COLOR = 0x8fa23a; // sickly yellow-green

let sharedGeo = null;
const geo = () => sharedGeo ??= new THREE.RingGeometry(.94, 1, 24).rotateX(-Math.PI / 2);

// Ring i at time t: `radius` spreads from a third of the reach to all of it, `opacity` swells
// early and thins to nothing (0 at birth and at death, so a ring never pops).
export function rippleState(t, i, phase = 0) {
  const age = ((t / GAS_RIPPLE_PERIOD + phase + i / GAS_RIPPLES) % 1 + 1) % 1;
  return {radius: GAS_RIPPLE_REACH * (.33 + .67 * Math.sqrt(age)), opacity: .5 * Math.sin(Math.PI * age) * (1 - age)};
}

export function attachGasRipples(cloud) {
  const group = new THREE.Group();
  group.name = 'GasRipples';group.position.y = .03;
  for (let i = 0; i < GAS_RIPPLES; i++) {
    const mat = new THREE.MeshBasicMaterial({color: RING_COLOR, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide});
    const ring = new THREE.Mesh(geo(), mat);
    ring.scale.setScalar(1e-5);ring.castShadow = ring.receiveShadow = false;ring.frustumCulled = false;group.add(ring);
  }
  cloud.add(group);
  return group;
}

export function poseGasRipples(group, t, phase = 0) {
  group.children.forEach((ring, i) => {
    const s = rippleState(t, i, phase);
    ring.scale.setScalar(s.radius);ring.material.opacity = s.opacity;
  });
}

export function detachGasRipples(group) {
  for (const ring of group.children) ring.material.dispose();
  group.removeFromParent();
}
