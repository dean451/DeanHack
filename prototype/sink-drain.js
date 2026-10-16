// "You drop a ring down the drain." The ring does not just go: two broken arcs of grey water
// wind inward and down the sink, tightening as they turn, a single rust-coloured drip falls in
// a beat after them, and the drain coughs one dull bubble that swells and pops too late. About
// 0.95 s.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's last known
// square) and update(dt) every frame. Poses end exactly at rest (hidden).

import {clamp01, smooth} from './fx-textures.js';

export const DRAIN = {arcs: 2, total: .95};
export const isDrainMessage = text => /^You drop .+ down the drain\b/.test(text || '');

// Arc i winds inward and turns faster as it tightens; the second arc trails the first.
export function arcPose(i, t) {
  const u = clamp01((t - i * .12) / .6);
  if (u <= 0 || u >= 1) return {scale: .001, spin: 0, alpha: 0};
  return {scale: .34 * (1 - smooth(u)) ** 1.4 + .02, spin: (i ? -1 : 1) * (u + u * u * 3) * 4, alpha: .5 * Math.min(1, u * 9) * (1 - smooth((u - .8) / .2))};
}

// The rust drip falls from a hand's height into the drain and is gone.
export function dripPose(t) {
  const u = clamp01((t - .3) / .3);
  if (u <= 0 || u >= 1) return {y: 0, alpha: 0};
  return {y: .45 * (1 - u * u) + .02, alpha: Math.min(1, u * 10) * (1 - smooth((u - .9) / .1))};
}

// The bubble swells slowly and pops late: it is the last thing seen.
export function bubblePose(t) {
  const u = clamp01((t - .6) / .35);
  if (u <= 0 || u >= 1) return {scale: .001, alpha: 0};
  return {scale: .03 + .06 * smooth(Math.min(1, u * 1.15)), alpha: u > .86 ? .45 * (1 - u) / .14 : .45 * Math.min(1, u * 6)};
}

export function createSinkDrain(THREE, parent) {
  const live = [];
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'SinkDrain'; g.position.set(x, 0, z); parent.add(g);
    const arc = new THREE.RingGeometry(.8, 1, 16, 1, 0, Math.PI * 1.3), dot = new THREE.SphereGeometry(1, 6, 4), ring = new THREE.RingGeometry(.8, 1, 14), mats = [];
    const mk = c => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false}); mats.push(m); return m; };
    const arcs = Array.from({length: DRAIN.arcs}, () => { const m = new THREE.Mesh(arc, mk(0x56606a)); m.rotation.x = -Math.PI / 2; m.position.y = .03; g.add(m); return m; });
    const drip = new THREE.Mesh(dot, mk(0x9a4a14)); drip.scale.set(.02, .035, .02); g.add(drip);
    const bubble = new THREE.Mesh(ring, mk(0x7a848c)); bubble.rotation.x = -Math.PI / 2; bubble.position.y = .035; g.add(bubble);
    live.push({g, geos: [arc, dot, ring], mats, arcs, drip, bubble, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    e.arcs.forEach((m, i) => { const p = arcPose(i, e.t); m.visible = p.alpha > .01; m.scale.set(p.scale, p.scale, 1); m.rotation.z = p.spin; m.material.opacity = p.alpha; });
    const d = dripPose(e.t); e.drip.visible = d.alpha > .01; e.drip.position.y = d.y; e.drip.material.opacity = d.alpha;
    const b = bubblePose(e.t); e.bubble.visible = b.alpha > .01; e.bubble.scale.set(b.scale, b.scale, 1); e.bubble.material.opacity = b.alpha;
    return e.t < DRAIN.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    message(text, x, z) { if (isDrainMessage(text)) add(x, z); },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}
