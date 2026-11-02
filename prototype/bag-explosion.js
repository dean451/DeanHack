// A bag of holding blown apart. Put a wand of cancellation or another bag of holding inside one and it is destroyed
// with everything in it: "As you put ... inside, you are blasted by a magical explosion!" Here that is a black hole on
// the hero's square: a dark core swells as a violet accretion ring spins tighter around it and motes spiral in from
// all round; it collapses to a point with a white pinprick; then the release, a pale shockwave racing out and the
// motes thrown wide. Keyed on the message, so it shows only what the hero sees. Additive, no lights added.
import * as THREE from 'three';

export const BAG = {inhale: .8, collapse: .25, release: .9, motes: 140, reach: 2.6};
const TOTAL = BAG.inhale + BAG.collapse + BAG.release;
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const bagBlast = text => /you are blasted by a magical explosion!?$/i.test(String(text || ''));

// The black hole's state at age t: core size, ring size and spin, flash, shockwave radius and its brightness, and
// how far the motes are from the centre (1 = start of the inhale, 0 = in the core, >1 = thrown out).
export function holePose(t) {
  if (t < 0 || t >= TOTAL) return null;
  const a = BAG.inhale, b = a + BAG.collapse;
  if (t < a) { const u = t / a;return {core: .45 * smooth(u / .6), ring: 1.2 - .7 * u, spin: u * 9, glow: .9 * smooth(u / .3), flash: 0, wave: 0, waveA: 0, motes: 1 - u * u}; }
  if (t < b) { const u = (t - a) / BAG.collapse;return {core: .45 * (1 - u), ring: .5 * (1 - u), spin: 9 + u * 6, glow: .9 * (1 - u), flash: Math.sin(u * Math.PI), wave: 0, waveA: 0, motes: 0}; }
  const u = (t - b) / BAG.release;
  return {core: 0, ring: 0, spin: 0, glow: 0, flash: (1 - u) * .3, wave: 3.2 * smooth(u), waveA: .85 * (1 - u), motes: 1 + 1.6 * smooth(u)};
}

export function createBagExplosion(THREE_ = THREE, parent) {
  const live = [];
  const add = (x, z) => {
    const g = new THREE.Group();g.name = 'Bag of holding blast';g.position.set(x, .6, z);parent.add(g);
    const add = (mat) => { mat.transparent = true;mat.depthWrite = false;return mat; };
    const core = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({color: 0x000000}));core.renderOrder = 5;g.add(core);
    const ringMat = add(new THREE.MeshBasicMaterial({color: 0xa070ff, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0, toneMapped: false}));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, .06, 8, 48), ringMat);ring.rotation.x = Math.PI / 2.4;g.add(ring);
    const flashMat = add(new THREE.SpriteMaterial({color: 0xffffff, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false}));
    const flash = new THREE.Sprite(flashMat);flash.scale.setScalar(.01);g.add(flash);
    const waveMat = add(new THREE.MeshBasicMaterial({color: 0xd8c8ff, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0, toneMapped: false}));
    const wave = new THREE.Mesh(new THREE.RingGeometry(.92, 1, 64), waveMat);wave.rotation.x = -Math.PI / 2;wave.position.y = -.55;g.add(wave);
    const n = BAG.motes, home = new Float32Array(n * 3), pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = BAG.reach * (.5 + Math.random() * .5), y = (Math.random() - .5) * 1.2;home[i * 3] = Math.cos(a) * r;home[i * 3 + 1] = y;home[i * 3 + 2] = Math.sin(a) * r; }
    const geo = new THREE.BufferGeometry();geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const moteMat = add(new THREE.PointsMaterial({color: 0xc0a0ff, size: .05, blending: THREE.AdditiveBlending, opacity: .9}));
    const motes = new THREE.Points(geo, moteMat);motes.frustumCulled = false;g.add(motes);
    live.push({g, core, ring, ringMat, flash, flashMat, wave, waveMat, motes, home, pos, t: 0, disposables: [core.geometry, core.material, ring.geometry, ringMat, flashMat, wave.geometry, waveMat, geo, moteMat]});
    return g;
  };
  const drop = e => { e.disposables.forEach(d => d.dispose());parent.remove(e.g); };
  return {
    add,
    message(text, x, z) { return bagBlast(text) && Number.isFinite(x) && Number.isFinite(z) ? add(x, z) : null; },
    update(dt) {
      for (let i = live.length - 1; i >= 0; i--) {
        const e = live[i];e.t += Math.min(Math.max(dt || 0, 0), .1);
        const p = holePose(e.t);
        if (!p) { drop(e);live.splice(i, 1);continue; }
        e.core.scale.setScalar(Math.max(p.core, .001));e.core.visible = p.core > .002;
        e.ring.scale.setScalar(Math.max(p.ring, .001));e.ring.rotation.z = p.spin;e.ringMat.opacity = p.glow;
        e.flash.scale.setScalar(.2 + p.flash * 1.6);e.flashMat.opacity = p.flash;
        e.wave.scale.setScalar(Math.max(p.wave, .001));e.waveMat.opacity = p.waveA;
        // motes: on a spiral that tightens with the inhale (and turns as they fall in), straight out on the release
        const twist = (1 - Math.min(1, p.motes)) * 6;
        for (let k = 0; k < e.home.length; k += 3) {
          const hx = e.home[k], hz = e.home[k + 2], c = Math.cos(twist), s = Math.sin(twist);
          e.pos[k] = (hx * c - hz * s) * p.motes;e.pos[k + 1] = e.home[k + 1] * Math.min(1, p.motes);e.pos[k + 2] = (hx * s + hz * c) * p.motes;
        }
        e.motes.geometry.attributes.position.needsUpdate = true;
        e.motes.material.opacity = p.motes > 1 ? .9 * clamp01(2.6 - p.motes) : .9;
      }
    },
    clear() { live.forEach(drop);live.length = 0; },
    get active() { return live.length; },
  };
}
