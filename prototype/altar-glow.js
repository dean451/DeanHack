// "There is an altar to Anhur (lawful) here." Stepping onto an altar, the stone answers in the
// colour of its god: pale gold for law, a cold grey-blue for neutrality, a dried-blood red for
// chaos, and a bruised near-black for the godless. The glow does not bloom, it breathes: a slow
// ring swells out of the floor, hitches once as if something below inhaled, and sinks back.
//
// live.js calls message(text, x, z) with the hero's tile (the altar is always the hero's own),
// update(dt) every frame and clear() on a level change. Poses are functions of t and return
// exactly to rest (nothing showing) at the end.

import {softRing, smooth, clamp01} from './fx-textures.js';

export const GLOW = {total: 2.6};
export const GLOW_COLORS = {lawful: 0xd8cc90, neutral: 0x6c8c9c, chaotic: 0x8c1830, unaligned: 0x40142c};
export function glowAlignment(text) {
  const m = /^There is an altar to .+ \((lawful|neutral|chaotic|unaligned)\) here\./i.exec(text || '');
  return m ? m[1].toLowerCase() : null;
}

// Four steps from 0 to 1, each a quick smooth rise followed by a hold; exactly 0 at 0 and 1 from 1 on.
const ratchet = x => { const s = clamp01(x) * 4, i = Math.min(Math.floor(s), 3); return (i + smooth(Math.min(1, (s - i) * 3))) / 4; };

// The glow at age t: ring radius and alpha. It swells, hitches (a short dip and surge) and sinks.
// A chaotic altar gutters like a bad flame, and a godless one sinks early, as if the stone gave up.
export function glowPose(t, kind) {
  if (t <= 0 || t >= GLOW.total) return {radius: 0, alpha: 0};
  // A neutral altar barely notices the hitch: its god is indifferent, and the ring simply endures.
  const u = t / GLOW.total, hitch = 1 - (kind === 'neutral' ? .15 : .45) * Math.exp(-(((u - .5) / .05) ** 2));
  const gutter = kind === 'chaotic' && u > .2 && u < .8 ? .8 + .2 * Math.sin(u * 95) * Math.sin(u * 37) : 1;
  const sink = kind === 'unaligned' ? .08 * smooth((u - .45) / .3) : 0;
  // A lawful altar answers like a judge counting: the swell climbs in four hard steps, each one settling
  // into place, rather than easing out in one breath.
  // A godless altar flinches once as it gives up: the glow blinks out for an instant and comes back weaker.
  const flinch = kind === 'unaligned' ? 1 - .8 * Math.exp(-(((u - .42) / .015) ** 2)) : 1;
  const swell = kind === 'lawful' ? ratchet(u / .6) : smooth(u / .6);
  return {radius: .3 + .25 * swell - .12 * smooth((u - .7) / .3) - sink, alpha: .6 * smooth(u / .25) * (1 - smooth((u - .65) / .35)) * hitch * gutter * flinch};
}

export function createAltarGlow(THREE, parent) {
  const live = [];
  const ringGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  function add(kind, x, z) {
    if (!GLOW_COLORS[kind] || !Number.isFinite(x) || !Number.isFinite(z)) return null;
    const g = new THREE.Group(); g.name = 'AltarGlow'; g.position.set(x, .36, z); parent.add(g);
    const mat = new THREE.MeshBasicMaterial({map: softRing(THREE), color: GLOW_COLORS[kind], transparent: true, opacity: 0, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false});
    const ring = new THREE.Mesh(ringGeo, mat); g.add(ring);
    live.push({g, kind, ring, mat, t: 0});
    return g;
  }
  function drop(e) { e.mat.dispose(); parent.remove(e.g); }
  const frame = (e, dt) => {
    e.t += Math.min(Math.max(dt || 0, 0), .1);
    const p = glowPose(e.t, e.kind);
    e.ring.scale.setScalar(Math.max(p.radius * 2, .001)); e.mat.opacity = p.alpha;
    return e.t < GLOW.total;
  };
  return {
    add,
    message(text, x, z) { const k = glowAlignment(text); return k ? add(k, x, z) : null; },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!frame(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    dispose() { this.clear(); ringGeo.dispose(); },
    get active() { return live.length; },
  };
}
