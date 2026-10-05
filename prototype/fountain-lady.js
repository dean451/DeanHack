// "From the murky depths, a hand reaches up to bless the sword." Dipping a long sword in a
// fountain can bring the Lady of the Lake. She is no pretty maiden: a drowned, pale-green
// arm comes up out of black water, slowly, with ripples running ahead of it, and holds a
// sword that burns cold. It stops, turns the blade once, deliberately, as if inspecting
// the hero, gives one sharp twitch, and then drags the blade up for the hero to see before
// the arm sinks back and the water closes over it. The sword glow lingers a moment after.
//
// live.js calls add(x, z) at the hero's square when the message arrives, update(dt) every
// frame and clear() on a level change. The Lady only comes to the hero's own fountain (the
// dip is the hero's), so the message always means the square under them. Poses are functions
// of t and return exactly to rest (nothing showing) at the end.

import {softDot, softRing, clamp01, smooth} from './fx-textures.js';

export const LADY = {rise: .45, riseTime: 1.1, turnAt: 1.9, twitchAt: 2.75, sinkAt: 3.2, sinkTime: .9, total: 4.4};
export const ARM_MAX = .85; // how far the wrist clears the water
export const isLadyMessage = text => /a hand reaches up to bless the sword/i.test(text || '');

// The arm at time t: height out of the water, the blade's turn about its own axis, a sideways
// twitch, the sword's glow (0 to 1) and the ripple progress.
export function ladyPose(t) {
  const up = smooth((t - LADY.rise) / LADY.riseTime);
  const down = smooth((t - LADY.sinkAt) / LADY.sinkTime);
  const rise = ARM_MAX * up * (1 - down);
  const turn = Math.PI * 2 * smooth((t - LADY.turnAt) / .7);
  const tw = t - LADY.twitchAt;
  const twitch = tw > 0 && tw < .25 ? Math.sin(tw / .25 * Math.PI * 3) * .22 * (1 - tw / .25) : 0;
  const glowIn = smooth((t - LADY.rise - .5) / .8), glowOut = smooth((t - LADY.sinkAt - .5) / (LADY.total - LADY.sinkAt - .5));
  const glow = glowIn * (1 - glowOut) * (.85 + .15 * Math.sin(t * 9));
  const ripple = clamp01(t / (LADY.sinkAt + LADY.sinkTime));
  return {rise, turn: t >= LADY.turnAt + .7 ? 0 : turn, twitch, glow: t >= LADY.total ? 0 : glow, ripple};
}

export function createFountainLady(THREE, parent) {
  const live = [];
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'FountainLady'; g.position.set(x, .3, z); parent.add(g);
    const flesh = new THREE.MeshStandardMaterial({color: 0x8fa396, roughness: .9});
    const steel = new THREE.MeshStandardMaterial({color: 0xbfd6e6, metalness: .8, roughness: .25, emissive: 0x5fb8ff, emissiveIntensity: 0});
    const geos = [];
    const mesh = (geo, mat, parentObj = g) => { geos.push(geo); const m = new THREE.Mesh(geo, mat); parentObj.add(m); return m; };
    const arm = new THREE.Group(); g.add(arm);
    const fore = mesh(new THREE.CylinderGeometry(.035, .05, ARM_MAX, 7), flesh, arm); fore.position.y = -ARM_MAX / 2;
    const hand = new THREE.Group(); arm.add(hand);
    mesh(new THREE.BoxGeometry(.09, .08, .05), flesh, hand);
    const blade = new THREE.Group(); blade.position.y = .02; hand.add(blade);
    const b = mesh(new THREE.BoxGeometry(.04, .62, .012), steel, blade); b.position.y = .3;
    const guard = mesh(new THREE.BoxGeometry(.2, .025, .03), steel, blade); guard.position.y = .02;
    const glowMat = new THREE.SpriteMaterial({map: softDot(THREE), color: 0x8fd8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false});
    const glow = new THREE.Sprite(glowMat); glow.position.y = .3; glow.scale.setScalar(1.1); blade.add(glow);
    const ringGeo = new THREE.PlaneGeometry(1, 1); ringGeo.rotateX(-Math.PI / 2);
    const rings = [0, .18].map(delay => {
      const mat = new THREE.MeshBasicMaterial({map: softRing(THREE), color: 0xa8d8d0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false});
      const r = new THREE.Mesh(ringGeo, mat); r.position.y = .02; g.add(r); return {r, mat, delay};
    });
    live.push({g, arm, hand, blade, steel, glowMat, rings, geos, mats: [flesh, steel, glowMat, ...rings.map(r => r.mat)], ringGeo, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    const p = ladyPose(e.t);
    e.arm.visible = p.rise > .01;
    e.arm.position.set(p.twitch, p.rise, 0);
    e.hand.rotation.z = p.twitch * 1.5;
    e.blade.rotation.y = p.turn;
    e.steel.emissiveIntensity = 1.5 * p.glow; e.glowMat.opacity = .8 * p.glow;
    for (const {r, mat, delay} of e.rings) {
      const k = clamp01((p.ripple - delay * .2) * 1.15);
      r.scale.set(.2 + 1.3 * k, 1, .2 + 1.3 * k); mat.opacity = k <= 0 ? 0 : .7 * Math.sin(k * Math.PI) * (e.t < LADY.sinkAt ? 1 : 1 - smooth((e.t - LADY.sinkAt) / LADY.sinkTime));
    }
    return e.t < LADY.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(m => m.dispose()); e.ringGeo.dispose(); parent.remove(e.g); }
  return {
    add,
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}
