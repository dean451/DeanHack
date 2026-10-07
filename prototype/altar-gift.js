// "Use my gift wisely!" The god is pleased and hands down an artifact. The gift does not drift
// in gently: a narrow shaft of cold light stabs down from above onto the altar, hangs a beat
// as if checking the aim, and cuts out, leaving a hard white flash on the stone and a ring of
// sparks thrown outward. A thin glint lingers where the thing lies.
//
// live.js calls message(text, x, z) with the hero's tile, update(dt) every frame and clear() on
// a level change. Poses are functions of t and return exactly to rest (nothing showing) at the
// end.

import {softRing, smooth, clamp01} from './fx-textures.js';

export const GIFT = {total: 2.0, drop: .22, sparks: 8};
export const isGiftMessage = text => /Use my gift wisely/i.test(text || '');

// The shaft at age t: height above the stone (0 to 1 of full), width and alpha. It falls fast,
// hangs, then is cut off from the top down (the base outlasts the head).
export function shaftPose(t) {
  if (t <= 0 || t >= GIFT.total) return {height: 0, width: 0, alpha: 0};
  const fall = 1 - (1 - clamp01(t / GIFT.drop)) ** 2, cut = smooth((t - .6) / .35);
  // Hanging there it second-guesses: one quick recoil upward, then it stabs back down.
  const w = clamp01((t - .38) / .16), recoil = 1 - .3 * Math.sin(Math.PI * w) ** 2;
  return {height: fall * (1 - cut) * recoil, width: .12 * (1 - .6 * cut) * (.92 + .08 * Math.sin(t * 40)), alpha: smooth(t / .04) * (1 - cut)};
}

// The flash on the stone: it lands as the shaft arrives, then dies back to a glint that lingers.
export function flashPose(t) {
  if (t < GIFT.drop || t >= GIFT.total) return {radius: 0, alpha: 0};
  const u = (t - GIFT.drop) / (GIFT.total - GIFT.drop);
  return {radius: .25 + .3 * (1 - (1 - clamp01(u * 4)) ** 3), alpha: .9 * (1 - smooth(u * 1.6)) + .15 * (1 - smooth((u - .5) / .5))};
}

// Spark i flung outward from the landing: distance and height above the stone.
export function sparkPose(i, t) {
  const age = t - GIFT.drop;
  if (age <= 0 || age >= .9) return {x: 0, z: 0, y: 0, alpha: 0};
  const a = i / GIFT.sparks * Math.PI * 2 + i * .7, r = .5 * (1 - (1 - age / .9) ** 2) * (.7 + .3 * (i % 3) / 2);
  return {x: Math.cos(a) * r, z: Math.sin(a) * r, y: .35 * Math.sin(age / .9 * Math.PI) * (1 - age / .9 * .4), alpha: 1 - smooth(age / .9)};
}

export function createAltarGift(THREE, parent) {
  const live = [];
  const cyl = new THREE.CylinderGeometry(.5, .5, 1, 8, 1, true).translate(0, .5, 0), ringGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), dot = new THREE.SphereGeometry(.03, 5, 4);
  function add(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    const g = new THREE.Group(); g.name = 'AltarGift'; g.position.set(x, .36, z); parent.add(g);
    const mk = (map, color) => new THREE.MeshBasicMaterial({map, color, transparent: true, opacity: 0, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false});
    const shaftMat = mk(null, 0xdce8f4), flashMat = mk(softRing(THREE), 0xf4f0e0), sparkMat = mk(null, 0xe8e0b0);
    const shaft = new THREE.Mesh(cyl, shaftMat); shaft.renderOrder = 4; g.add(shaft);
    const flash = new THREE.Mesh(ringGeo, flashMat); g.add(flash);
    const sparks = Array.from({length: GIFT.sparks}, () => { const m = new THREE.Mesh(dot, sparkMat); g.add(m); return m; });
    live.push({g, shaft, flash, sparks, mats: [shaftMat, flashMat, sparkMat], t: 0});
    return g;
  }
  function drop(e) { e.mats.forEach(m => m.dispose()); parent.remove(e.g); }
  const frame = (e, dt) => {
    e.t += Math.min(Math.max(dt || 0, 0), .1);
    const s = shaftPose(e.t), f = flashPose(e.t);
    e.shaft.scale.set(Math.max(s.width, .001), Math.max(s.height * 3, .001), Math.max(s.width, .001)); e.shaft.material.opacity = s.alpha * .75;
    e.flash.scale.setScalar(Math.max(f.radius * 2, .001)); e.flash.material.opacity = f.alpha;
    let spark = 0;
    e.sparks.forEach((m, i) => { const p = sparkPose(i, e.t); m.position.set(p.x, p.y, p.z); m.visible = p.alpha > 0; spark = Math.max(spark, p.alpha); });
    e.mats[2].opacity = spark;
    return e.t < GIFT.total;
  };
  return {
    add,
    message(text, x, z) { return isGiftMessage(text) ? add(x, z) : null; },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!frame(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    dispose() { this.clear(); cyl.dispose(); ringGeo.dispose(); dot.dispose(); },
    get active() { return live.length; },
  };
}
