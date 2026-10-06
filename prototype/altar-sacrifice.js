// A sacrifice is taken. "Your sacrifice is consumed in a flash of light!" A pale, hungry tongue
// of light licks up out of the altar, stalls as if swallowing, and snaps shut to a point. Where
// the god is a stranger ("...in a burst of flame!") the same tongue is a ragged red fire that
// gutters twice before it dies. Either way the stone is left with a scorched ring.
//
// live.js calls message(text, x, z) with the hero's tile (the altar is always the hero's own),
// update(dt) every frame and clear() on a level change. Poses are functions of t and return
// exactly to rest (nothing showing) at the end.

import {softRing, smooth, clamp01} from './fx-textures.js';

export const SACRIFICE = {light: 1.5, flame: 1.9};
export function sacrificeKind(text) {
  const t = text || '';
  if (/^Your sacrifice is consumed in a flash of light!/.test(t)) return 'light';
  if (/^Your sacrifice is consumed in a burst of flame!/.test(t)) return 'flame';
  return null;
}

// The tongue at age t: height and width (0 to 1 of full) and alpha. It lunges up, hangs, then
// is sucked back down to a point; a flame also gutters twice on the way out.
export function tonguePose(kind, t) {
  const total = SACRIFICE[kind];
  if (!total || t < 0 || t >= total) return {height: 0, width: 0, alpha: 0};
  const u = t / total, rise = 1 - (1 - clamp01(u / .2)) ** 3, shut = smooth((u - .55) / .4);
  const gutter = kind === 'flame' ? (Math.sin(t * 38) > -.2 ? 1 : .35) * (1 - .3 * Math.sin(smooth((u - .35) / .3) * Math.PI * 2) ** 2) : 1;
  return {height: rise * (1 - shut), width: (kind === 'flame' ? .8 : .55) * (1 - .9 * shut) * (.9 + .1 * Math.sin(t * 17)), alpha: smooth(u / .05) * (1 - smooth((u - .8) / .2)) * gutter};
}

// The hunger before the tongue: a dark ring on the stone that draws inward, hitching twice like
// a throat working, and is gone as the tongue lunges (the first fifth of the life).
export function drawPose(kind, t) {
  const total = SACRIFICE[kind];
  if (!total || t <= 0 || t >= total * .22) return {radius: 0, alpha: 0};
  const u = t / (total * .22), hitch = .5 + .5 * Math.sin(u * Math.PI * 4 + 1.2);
  return {radius: .6 - .45 * smooth(u) + .03 * hitch, alpha: .55 * smooth(u / .2) * (1 - smooth((u - .7) / .3))};
}

// The scorch ring left on the stone: appears as the tongue peaks and fades slowly after.
export function scorchPose(kind, t) {
  const total = SACRIFICE[kind];
  if (!total || t < 0 || t >= total) return {radius: 0, alpha: 0};
  const u = t / total;
  return {radius: .35 + .15 * smooth((u - .1) / .4), alpha: .5 * smooth((u - .1) / .15) * (1 - smooth((u - .6) / .4))};
}

export function createAltarSacrifice(THREE, parent) {
  const live = [];
  const cone = new THREE.ConeGeometry(.5, 1, 10, 1, true).translate(0, .5, 0), ringGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  function add(kind, x, z) {
    if (!SACRIFICE[kind] || !Number.isFinite(x) || !Number.isFinite(z)) return null;
    const g = new THREE.Group(); g.name = 'AltarSacrifice'; g.position.set(x, .35, z); parent.add(g);
    const mk = (map, color) => new THREE.MeshBasicMaterial({map, color, transparent: true, opacity: 0, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false});
    const flame = kind === 'flame', tongueMat = mk(null, flame ? 0xc02808 : 0xf2ecd2), ringMat = mk(softRing(THREE), flame ? 0x701004 : 0xb09a5a);
    const tongue = new THREE.Mesh(cone, tongueMat); tongue.renderOrder = 4; g.add(tongue);
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.y = -.3; g.add(ring);
    const drawMat = new THREE.MeshBasicMaterial({map: softRing(THREE), color: 0x120806, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false});
    const draw = new THREE.Mesh(ringGeo, drawMat); draw.position.y = -.28; g.add(draw);
    live.push({g, kind, tongue, ring, draw, mats: [tongueMat, ringMat, drawMat], t: 0});
    return g;
  }
  function drop(e) { e.mats.forEach(m => m.dispose()); parent.remove(e.g); }
  const frame = (e, dt) => {
    e.t += Math.min(Math.max(dt || 0, 0), .1);
    const p = tonguePose(e.kind, e.t), r = scorchPose(e.kind, e.t);
    e.tongue.scale.set(p.width, Math.max(p.height * 1.8, .001), p.width); e.tongue.material.opacity = p.alpha * .8;
    e.ring.scale.setScalar(r.radius * 2); e.ring.material.opacity = r.alpha;
    const d = drawPose(e.kind, e.t); e.draw.scale.setScalar(Math.max(d.radius * 2, .001)); e.draw.material.opacity = d.alpha;
    return e.t < SACRIFICE[e.kind];
  };
  return {
    add,
    message(text, x, z) { const k = sacrificeKind(text); return k ? add(k, x, z) : null; },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!frame(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    dispose() { this.clear(); cone.dispose(); ringGeo.dispose(); },
    get active() { return live.length; },
  };
}
