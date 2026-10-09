// "You are momentarily blinded by a flash of light." A level teleporter takes the hero. On the
// old level a white flash punches out and a thin column of light snaps upward, taking the hero's
// outline with it (the message text is from NetHack source and unconfirmed against a live engine).
// On the new level the hero does not simply appear: a ring of light collapses onto the square and
// a hard flash marks the arrival, a beat after the lights flicker once. Nothing here is gentle.
//
// live.js calls message(text, x, z) with every engine message, levelChanged(x, z) when a new level
// arrives, update(dt) every frame and clear() otherwise. Poses are functions of t and return
// exactly to rest (nothing showing) at the end.

import {clamp01, smooth} from './fx-textures.js';

export const BLINK = {flash: .14, streak: .5, arrive: .55, armed: 3};
// A teleport trap is no polite hop: its arrival ring is wider, slower and the landing flash harder.
export const GRAND = {size: 1.5, time: 1.4, light: 1.8};
export const isTeleportMessage = text => /^You are momentarily blinded by a flash of light/.test(text || '');

// The hard flash at the departure square.
export function flashPose(t) {
  const u = clamp01(t / BLINK.flash);
  return {size: .25 + 1.1 * u, alpha: t <= 0 || u >= 1 ? 0 : (1 - u) * (1 - u)};
}

// The column that snaps upward: it shoots high and thins to a wire as it goes.
export function streakPose(t) {
  if (t <= 0 || t >= BLINK.streak) return {height: .001, width: .001, alpha: 0};
  const u = t / BLINK.streak, up = smooth(Math.min(1, u * 2.5));
  return {height: .1 + 2.6 * up, width: .22 * (1 - u) * (1 - u * .5) + .01, alpha: .9 * (1 - u) * Math.min(1, t * 25) * (u > .12 && u < .5 && Math.floor(t * 70) % 3 === 0 ? .35 : 1)};  // the column stutters as it tears free, like a bad connection
}

// The ring that collapses onto the arrival square, then the flash on top of it. The ring gutters
// out for an instant a third of the way in, as if the place nearly refused the arrival.
export function arrivePose(t) {
  if (t <= 0 || t >= BLINK.arrive) return {ring: 1.4, ringAlpha: 0, flash: 0, flashAlpha: 0};
  const k = t / BLINK.arrive, c = clamp01(k / .6), f = clamp01((k - .6) / .4);
  return {ring: 1.4 - 1.25 * c * c, ringAlpha: k < .6 ? .8 * c * (k > .28 && k < .35 ? .2 : 1) : 0, flash: .2 + .9 * f, flashAlpha: k < .6 ? 0 : (1 - f) * (1 - f) * (f > .3 && f < .45 ? .4 : 1)};  // the landing flash stutters once, as if the place flinched
}

export function createTeleportBlink(THREE, parent) {
  const live = [], pending = []; let armed = 0;
  function build(x, z, kind, grand = false) {
    const g = new THREE.Group(); g.name = 'TeleportBlink'; g.position.set(x, 0, z); parent.add(g);
    const cone = new THREE.ConeGeometry(1, 1, 8, 1, true), sph = new THREE.SphereGeometry(1, 8, 6), ringGeo = new THREE.RingGeometry(.85, 1, 24), mats = [];
    const mk = c => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false}); mats.push(m); return m; };
    const flash = new THREE.Mesh(sph, mk(0xf4f8ff)); flash.position.y = .5; g.add(flash);
    const streak = new THREE.Mesh(cone, mk(0xcfe0ff)); g.add(streak);
    const ring = new THREE.Mesh(ringGeo, mk(0x9ab4ff)); ring.rotation.x = -Math.PI / 2; ring.position.y = .03; g.add(ring);
    const light = new THREE.PointLight(0xbcd0ff, 0, 6); light.position.y = .8; g.add(light);
    live.push({g, geos: [cone, sph, ringGeo], mats, flash, streak, ring, light, kind, grand, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    const out = e.kind === 'out', gs = e.grand ? GRAND.size : 1, gt = e.grand ? GRAND.time : 1, f = out ? flashPose(e.t) : null, s = out ? streakPose(e.t) : null, a = out ? null : arrivePose(e.t / gt);
    const fa = out ? f.alpha : a.flashAlpha, fs = out ? f.size : a.flash * gs;
    e.flash.visible = fa > .01; e.flash.scale.setScalar(fs); e.flash.material.opacity = fa;
    e.streak.visible = out && s.alpha > .01;
    if (out) { e.streak.scale.set(s.width, s.height, s.width); e.streak.position.y = s.height / 2; e.streak.material.opacity = s.alpha; }
    e.ring.visible = !out && a.ringAlpha > .01;
    if (!out) { e.ring.scale.setScalar(a.ring * gs); e.ring.material.opacity = a.ringAlpha; }
    e.light.intensity = (fa * 5 + (out ? s.alpha * 2 : a.ringAlpha * 2)) * (e.grand ? GRAND.light : 1);
    return e.t < (out ? BLINK.streak : BLINK.arrive * gt);
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); e.light.dispose?.(); parent.remove(e.g); }
  return {
    message(text, x, z) { if (isTeleportMessage(text)) { build(x, z, 'out'); armed = BLINK.armed; } },
    // A new level arrived: drop the old level's effects and, if the blink was ours, light the arrival.
    // A same-level teleport (the bridge's `teleport` event): blink out at `from`, and a beat later arrive at `to`.
    hop(from, to, trap = false) { build(from.x, from.z, 'out'); pending.push({x: to.x, z: to.z, wait: BLINK.flash * 2, grand: !!trap}); },
    levelChanged(x, z) { live.forEach(drop); live.length = 0; pending.length = 0; if (armed > 0) build(x, z, 'in'); armed = 0; },
    update(dt) {
      if (armed > 0) armed = Math.max(0, armed - dt);
      for (let i = pending.length - 1; i >= 0; i--) if ((pending[i].wait -= dt) <= 0) { build(pending[i].x, pending[i].z, 'in', pending[i].grand); pending.splice(i, 1); }
      for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); }
    },
    clear() { armed = 0; pending.length = 0; live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}
