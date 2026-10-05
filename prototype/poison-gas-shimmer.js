import * as THREE from 'three';

// Gas over lava sits in rising heat: a few faint, thin streaks of hazy air climb off the core,
// waver sideways as they go, stretch and thin out. Each streak is a function of t (frame-rate
// independent). The streaks share one geometry and one material per cloud over lava, none
// elsewhere. poison-cloud-roil.js attaches the group over lava and detaches it when the ground changes.
export const GAS_SHIMMERS = 3; // streaks per cloud over lava
export const GAS_SHIMMER_PERIOD = 2.6; // seconds for one streak to climb and fade
export const GAS_SHIMMER_RISE = .5; // height gained over a streak's life, tile units
const SHIMMER_COLOR = 0xffb070; // hot, pale orange haze

let sharedGeo = null;
const geo = () => sharedGeo ??= new THREE.PlaneGeometry(.07, .26);

// Streak i at time t: `y` climbs, `x`/`z` waver and grow with height, `opacity` swells early and
// thins to nothing (0 at birth and at death, so a streak never pops), `stretch` lengthens it.
export function shimmerState(t, i, phase = 0) {
  const age = ((t / GAS_SHIMMER_PERIOD + phase + i / GAS_SHIMMERS) % 1 + 1) % 1;
  const a = i * 2.4 + phase * 6.28, wander = Math.sin(age * 9 + a) * .05 * age;
  return {
    y: .08 + GAS_SHIMMER_RISE * age,
    x: Math.cos(a) * .12 + wander, z: Math.sin(a) * .12 + Math.cos(age * 7 + a) * .03 * age,
    stretch: .7 + .8 * age, opacity: .28 * Math.sin(Math.PI * age) * (1 - age * .5),
  };
}

export function attachGasShimmer(cloud) {
  const group = new THREE.Group();
  group.name = 'GasShimmer';
  const mat = new THREE.MeshBasicMaterial({color: SHIMMER_COLOR, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending});
  for (let i = 0; i < GAS_SHIMMERS; i++) {
    const streak = new THREE.Mesh(geo(), mat);
    streak.scale.setScalar(1e-5);streak.castShadow = streak.receiveShadow = false;streak.frustumCulled = false;group.add(streak);
  }
  cloud.add(group);
  return group;
}

export function poseGasShimmer(group, t, phase = 0) {
  let peak = 0;
  group.children.forEach((streak, i) => {
    const s = shimmerState(t, i, phase);
    streak.position.set(s.x, s.y, s.z);streak.scale.set(1, s.stretch, 1);streak.rotation.y = i * 2.1 + t * .3;
    peak = Math.max(peak, s.opacity);
  });
  group.children[0].material.opacity = peak;
}

export function detachGasShimmer(group) {
  group.children[0]?.material.dispose();
  group.removeFromParent();
}
