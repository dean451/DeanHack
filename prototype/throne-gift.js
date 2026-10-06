// "A voice echoes: 'Thy audience pleaseth me.'" (and "Thou hast pleased me with thy presence")
// The throne is in a good mood and it is not warm about it. A thin gold ring is lowered from
// the dark like a crown, hangs a breath above the hero's head, drops with a sharp tick and
// rings once, while four gold glints crawl up the air and one of them stalls and twitches.
// About 1.4 seconds.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's square),
// update(dt) every frame and clear() on a level change. Poses are functions of t and return
// exactly to rest (nothing showing) at the end.

import {clamp01} from './fx-textures.js';

export const GIFT = {glints: 4, total: 1.4};
export const isThroneGiftMessage = text => /thy audience pleaseth me|thou hast pleased me with thy presence/i.test(text || '');

// The crown is lowered slowly to 1.7 high, hangs, drops to 1.45 at .75 with a tick, then fades.
export function crownPose(t) {
  if (t <= 0 || t >= GIFT.total) return {y: 2.6, scale: .5, alpha: 0};
  const lower = clamp01(t / .6), drop = clamp01((t - .75) / .06);
  const y = 2.6 - .9 * lower * lower * (3 - 2 * lower) - .25 * drop;
  const ring = t > .81 ? Math.exp(-(t - .81) * 5) * Math.sin((t - .81) * 60) * .05 : 0;
  return {y: y + ring, scale: .5 + ring, alpha: .85 * clamp01(t / .1) * (1 - clamp01((t - .95) / .4))};
}

// Glint i climbs the air round the hero; glint 0 stalls near .6 and twitches before moving on.
export function glintPose(i, t) {
  const start = .2 + i * .12;
  if (t <= start || t >= GIFT.total) return {x: 0, y: 0, z: 0, alpha: 0};
  const k = clamp01((t - start) / .9), a = i * (Math.PI * 2 / GIFT.glints) + k * 1.3;
  let rise = k;
  if (i === 0 && t > .6 && t < .85) rise = clamp01((.6 - start) / .9) + (t > .72 && t < .76 ? .03 : 0);
  return {x: Math.cos(a) * .4, y: .1 + 1.6 * rise, z: Math.sin(a) * .4, alpha: .8 * clamp01((t - start) / .05) * (1 - clamp01((t - 1) / .35))};
}

export function createThroneGift(THREE, parent) {
  const live = [];
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'ThroneGift'; g.position.set(x, 0, z); parent.add(g);
    const ringGeo = new THREE.RingGeometry(.9, 1, 20), boxGeo = new THREE.BoxGeometry(.03, .03, .03), mats = [];
    const mk = c => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false}); mats.push(m); return m; };
    const crown = new THREE.Mesh(ringGeo, mk(0xd8a830)); crown.rotation.x = -Math.PI / 2; g.add(crown);
    const glints = Array.from({length: GIFT.glints}, (_, i) => { const m = new THREE.Mesh(boxGeo, mk(i % 2 ? 0xf0d878 : 0xb88a20)); g.add(m); return m; });
    live.push({g, geos: [ringGeo, boxGeo], mats, crown, glints, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    const c = crownPose(e.t); e.crown.visible = c.alpha > .01; e.crown.position.y = c.y; e.crown.scale.setScalar(c.scale * .5); e.crown.material.opacity = c.alpha;
    e.glints.forEach((m, i) => { const p = glintPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.material.opacity = p.alpha; });
    return e.t < GIFT.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z) { if (isThroneGiftMessage(text)) add(x, z); },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}
