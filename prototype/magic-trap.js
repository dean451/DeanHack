// "You hear a deafening roar!" The magic trap's trigger moment (its flash and roar branch). With
// no sound in this game the roar is shown as a concussion: three violet-white rings slam out of
// the floor one after another, each a little less sure than the last, while grit is thrown up
// and settles. Over in a second.
//
// live.js calls message(text, x, z), settle(x, z), update(dt) and clear() like the other trap
// moments. Poses are functions of t and return exactly to rest (nothing showing) at the end.

import {clamp01} from './fx-textures.js';

export const MAGIC = {rings: 3, gap: .16, life: .5, grit: 8, total: 1.0};
export const PENDING_WAIT = .3;
export const isMagicTrapMessage = text => /you hear a deafening roar/i.test(text || '');
// "Your pack shakes violently!": the same trap, a quieter outcome: one tight ring and a few rattling motes.
export const isPackShakeMessage = text => /your pack shakes violently/i.test(text || '');
// "A shiver runs up and down your spine!", "You smell charred flesh.", "You hear distant howling." and "You suddenly
// yearn for your distant homeland.": the same trap's omens. Nothing but a chill, a wrong smell or a far-off cry comes
// of them, so they show the same quiet ring.
export const isOmenMessage = text => /a shiver runs up and down your spine|you smell charred flesh|you hear distant howling|you suddenly yearn for/i.test(text || '');

// "You feel tired.": another of the trap's non-outcomes. The same quiet ring, but drowsy: it plays at
// two thirds speed and its grit stays low, hardly leaving the floor.
export const isTiredMessage = text => /^\s*you feel tired\./i.test(text || '');
export const TIRED_SLOW = .65;

// Ring i leaves the floor at i * gap, expanding fast then dragging; later rings are weaker.
export function ringPose(i, t) {
  const s = t - i * MAGIC.gap;
  if (s <= 0 || s >= MAGIC.life) return {scale: .05, y: .05, alpha: 0};
  const u = s / MAGIC.life;
  return {scale: .1 + .9 * (1 - (1 - u) ** 3) * (1 - .12 * i), y: .05 + .1 * u, alpha: (.85 - .2 * i) * (1 - u) * clamp01(s / .02)};
}

// Grit i: thrown up on the first slam, hangs, falls back to the floor. The last mote is the odd
// one out: it stalls on the way up and hangs there, trembling, as if it were listening, before
// it drops with the rest.
export function gritPose(i, t) {
  if (t <= 0 || t >= MAGIC.total) return {x: 0, y: 0, z: 0, alpha: 0};
  const u = t / MAGIC.total, a = i * 2.4, r = .15 + .35 * (1 - (1 - u) ** 2) * (.6 + .1 * (i % 4));
  const stray = i === MAGIC.grit - 1, w = !stray ? u : u < .4 ? u * .75 : u < .62 ? .3 + (u - .4) * .1 : .322 + (u - .62) * (.678 / .38);
  const shake = stray && u > .4 && u < .62 ? .012 * Math.sin(t * 90) : 0;
  return {x: Math.cos(a) * r + shake, y: Math.max(0, 1.1 * (.5 + .08 * (i % 3)) * 4 * w * (1 - w)), z: Math.sin(a) * r, alpha: .8 * (1 - u) * clamp01(t / .03)};
}

export function createMagicTrap(THREE, parent) {
  const live = []; let pending = null;
  function add(x, z, quiet, tired = false) {
    const g = new THREE.Group(); g.name = 'MagicTrap'; g.position.set(x, 0, z); parent.add(g);
    const sph = new THREE.SphereGeometry(1, 5, 3), tor = new THREE.TorusGeometry(1, .035, 4, 18), mats = [];
    const mk = (c, o) => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: o, depthWrite: false, toneMapped: false}); mats.push(m); return m; };
    const rings = Array.from({length: MAGIC.rings}, (_, i) => { const m = new THREE.Mesh(tor, mk(i ? 0xa070ff : 0xe8e0ff, 0)); m.rotation.x = Math.PI / 2; g.add(m); return m; });
    const grit = Array.from({length: MAGIC.grit}, () => { const m = new THREE.Mesh(sph, mk(0x6a5a78, 0)); m.scale.setScalar(.025); g.add(m); return m; });
    live.push({g, geos: [sph, tor], mats, rings, grit, t: 0, quiet, tired});
  }
  function step(e, dt) {
    e.t += dt * (e.tired ? TIRED_SLOW : 1);
    e.rings.forEach((m, i) => { const p = ringPose(i, e.t); if (e.quiet) { p.alpha = i ? 0 : p.alpha * .6; p.scale *= .45; } m.visible = p.alpha > .01; m.position.y = p.y; m.scale.setScalar(p.scale); m.material.opacity = p.alpha; });
    e.grit.forEach((m, i) => { const p = gritPose(i, e.t); if (e.quiet) { p.y *= e.tired ? .12 : .35; p.x += .02 * Math.sin(e.t * 70 + i * 2); p.alpha *= i < 4 ? 1 : 0; } m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.material.opacity = p.alpha; });
    return e.t < MAGIC.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z) { if (isTiredMessage(text)) add(x, z, true, true); else if (isPackShakeMessage(text) || isOmenMessage(text)) add(x, z, true); else if (isMagicTrapMessage(text)) { if (pending) add(pending.x, pending.z); pending = {x, z, wait: 0}; } },
    settle(x, z) { if (pending) { add(x, z); pending = null; } },
    update(dt) {
      if (pending && (pending.wait += dt) >= PENDING_WAIT) { add(pending.x, pending.z); pending = null; }
      for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); }
    },
    clear() { pending = null; live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}
