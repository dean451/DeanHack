// "You stumble into a spider web!" The web trap's trigger moment. Pale strands lash out from
// the hero's square in every direction and snap taut at the ends of their reach, then twang,
// each at its own wrong pitch, and sag, glistening, as the silk settles. A stray strand
// keeps twitching after the rest are still, as if something far off had felt it. About 1.8s.
//
// live.js calls message(text, x, z), settle(x, z), update(dt) and clear() like the other trap
// moments. Poses are functions of t and return exactly to rest (nothing showing) at the end.

import {clamp01, smooth} from './fx-textures.js';

export const WEB = {strands: 7, total: 1.8, reach: .62};
export const PENDING_WAIT = .3;
export const isWebMessage = text => /you stumble into a spider web/i.test(text || '');

// Strand i: shoots out to its reach by about .12s (overshooting a hair), twangs while it fades.
// The last strand is the stray: it twitches on into the tail of the effect.
export function strandPose(i, t) {
  const start = .025 * i, stray = i === WEB.strands - 1, end = stray ? WEB.total : WEB.total - .35;
  if (t <= start || t >= end) return {len: .01, lift: 0, alpha: 0, angle: i * 2.4};
  const u = clamp01((t - start) / .12), shot = smooth(u) + .08 * Math.sin(u * Math.PI) * (1 - u);
  const age = t - start - .12, twang = age > 0 ? Math.sin(age * (38 + 7 * i)) * .05 * Math.exp(-age * (stray ? 1.2 : 4)) : 0;
  const sag = smooth(clamp01((t - start - .3) / (end - start - .3))) * .1;
  const fade = 1 - smooth(clamp01((t - (end - .5)) / .5));
  return {len: Math.max(.01, WEB.reach * (.8 + .06 * (i % 3)) * shot), lift: .18 + .05 * (i % 3) + twang - sag + (stray ? .04 * Math.sin(clamp01((t - 1.15) / .15) * Math.PI) : 0), alpha: .8 * clamp01(u * 4) * fade, angle: i * 2.4 + .1 * twang};
}

export function createWebSnare(THREE, parent) {
  const live = []; let pending = null;
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'WebSnare'; g.position.set(x, 0, z); parent.add(g);
    const box = new THREE.BoxGeometry(1, .012, .012), mats = [];
    const strands = Array.from({length: WEB.strands}, () => {
      const m = new THREE.MeshBasicMaterial({color: 0xcfd2c6, transparent: true, opacity: 0, depthWrite: false, toneMapped: false}); mats.push(m);
      const s = new THREE.Mesh(box, m); g.add(s); return s;
    });
    live.push({g, geos: [box], mats, strands, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    e.strands.forEach((s, i) => {
      const p = strandPose(i, e.t); s.visible = p.alpha > .01;
      s.scale.x = p.len; s.rotation.y = -p.angle; s.position.set(Math.cos(p.angle) * p.len / 2, p.lift, Math.sin(p.angle) * p.len / 2); s.material.opacity = p.alpha;
    });
    return e.t < WEB.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z) { if (isWebMessage(text)) { if (pending) add(pending.x, pending.z); pending = {x, z, wait: 0}; } },
    settle(x, z) { if (pending) { add(x, z); pending = null; } },
    update(dt) {
      if (pending && (pending.wait += dt) >= PENDING_WAIT) { add(pending.x, pending.z); pending = null; }
      for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); }
    },
    clear() { pending = null; live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}
