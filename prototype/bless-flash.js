// "Your dagger softly glows light blue." A blessing, a curse and a lifted curse each leave a
// mark on the hero's tile. Blessed: a pale ring rises off the floor like a held breath and
// lets go. Cursed: a dark ring does the opposite, it stutters inward as if something were
// reaching back for the item. Lifted (amber): dark flecks are shaken loose, fly out and fall.
//
// live.js calls message(text, x, z) with the hero's tile, update(dt) every frame and clear()
// on a level change. Poses are functions of t and return exactly to rest at the end.

import {softRing, softDot, smooth, clamp01} from './fx-textures.js';

export const BLESS = {total: 1.8, flecks: 7};
export const BLESS_COLORS = {blessed: 0xa8d0f0, cursed: 0x2a0c30, lifted: 0xd89a2c};
const GLOWS = {'light blue': 'blessed', black: 'cursed', amber: 'lifted'};
export function blessKind(text) {
  const m = /^(?:Your|The) .+? (?:softly )?glows? (?:with an? )?(light blue|black|amber)\b/i.exec(text || '');
  return m ? GLOWS[m[1].toLowerCase()] : null;
}

// The ring at age t: radius, height above the floor and alpha.
export function ringPose(kind, t) {
  if (!BLESS_COLORS[kind] || t <= 0 || t >= BLESS.total) return {radius: 0, lift: 0, alpha: 0};
  const u = t / BLESS.total, fade = 1 - smooth((u - .6) / .4);
  // A held breath: at the top the ring hangs and trembles, dipping a hair on each shiver, before it lets go.
  if (kind === 'blessed') {
    const hang = Math.sin(Math.PI * clamp01((u - .62) / .2)), tremble = .012 * hang * (1 + Math.sin(u * 140)) / 2;
    return {radius: .3 + .2 * smooth(u / .7), lift: .5 * smooth(u / .8) - .08 * smooth((u - .75) / .25) - tremble, alpha: .55 * smooth(u / .2) * fade};
  }
  if (kind === 'cursed') {
    const stutter = Math.floor(u * 9) % 2 ? .04 : 0;
    // Near the end the closing ring snaps back out once, as if the curse had pulled and been pulled back.
    const snap = .07 * Math.sin(clamp01((u - .62) / .16) * Math.PI);
    // Each stutter beat also twitches the ring a finger's width off the floor, as if something tugged at it from below.
    return {radius: .55 - .3 * smooth(u / .8) + stutter + snap, lift: stutter ? .03 * smooth(u / .15) * (1 - smooth((u - .7) / .3)) : 0, alpha: .7 * smooth(u / .15) * fade};
  }
  // The lifted ring is shaken, not eased: it shudders as the curse is wrung out, the tremor dying by a third.
  return {radius: .25 + .2 * smooth(u / .5) + .025 * Math.sin(u * 70) * (1 - smooth(u / .3)), lift: 0, alpha: .3 * smooth(u / .1) * (1 - smooth((u - .3) / .4))};
}

// Fleck i of a lifted curse: shaken out sideways, then pulled down to the floor.
export function fleckPose(i, t) {
  if (t <= 0 || t >= BLESS.total) return {x: 0, y: 0, z: 0, alpha: 0};
  const u = clamp01(t / BLESS.total), a = i / BLESS.flecks * Math.PI * 2 + i * .7, out = (.25 + .05 * (i % 3)) * (1 - (1 - clamp01(u / .6)) ** 2);
  const y = .45 * Math.sin(Math.min(u / .6, 1) * Math.PI * .5) - .45 * (u > .3 ? ((u - .3) / .7) ** 2 : 0);
  // The last fleck is reluctant: midway it is tugged back toward the item, then lets go and falls with the rest.
  const k = i === BLESS.flecks - 1 ? 1 - .7 * Math.sin(Math.PI * clamp01((u - .35) / .2)) : 1;
  return {x: Math.cos(a) * out * k, y: Math.max(y, 0), z: Math.sin(a) * out * k, alpha: smooth(u / .08) * (1 - smooth((u - .7) / .3)) * ember(i, u)};
}

// Wrung-out flecks gutter like dying embers: each dims and catches again at its own pitch while it falls.
const ember = (i, u) => 1 - .45 * clamp01((u - .25) / .2) * (1 + Math.sin(u * (60 + i * 9) + i)) / 2;

export function createBlessFlash(THREE, parent) {
  const live = [];
  const ringGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), dotGeo = new THREE.PlaneGeometry(.06, .06);
  function add(kind, x, z) {
    if (!BLESS_COLORS[kind] || !Number.isFinite(x) || !Number.isFinite(z)) return null;
    const g = new THREE.Group(); g.name = 'BlessFlash'; g.position.set(x, .06, z); parent.add(g);
    const dark = kind === 'cursed';
    const mk = (map, color, additive) => new THREE.MeshBasicMaterial({map, color, transparent: true, opacity: 0, side: THREE.DoubleSide,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false, toneMapped: false});
    const ringMat = mk(softRing(THREE), BLESS_COLORS[kind], !dark), ring = new THREE.Mesh(ringGeo, ringMat); g.add(ring);
    const mats = [ringMat], flecks = [];
    if (kind === 'lifted') {
      const dot = softDot(THREE);
      for (let i = 0; i < BLESS.flecks; i++) {
        const m = mk(dot, 0x1c0c20, false); mats.push(m); const f = new THREE.Mesh(dotGeo, m); f.rotation.x = -Math.PI / 2; g.add(f); flecks.push(f);
      }
    }
    live.push({g, kind, ring, mats, flecks, t: 0});
    return g;
  }
  function drop(e) { e.mats.forEach(m => m.dispose()); parent.remove(e.g); }
  const frame = (e, dt) => {
    e.t += Math.min(Math.max(dt || 0, 0), .1);
    const p = ringPose(e.kind, e.t);
    e.ring.scale.setScalar(Math.max(p.radius * 2, .001)); e.ring.position.y = p.lift; e.ring.material.opacity = p.alpha;
    e.flecks.forEach((f, i) => { const q = fleckPose(i, e.t); f.position.set(q.x, q.y, q.z); f.material.opacity = q.alpha * .9; });
    return e.t < BLESS.total;
  };
  return {
    add,
    message(text, x, z) { const k = blessKind(text); return k ? add(k, x, z) : null; },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!frame(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    dispose() { this.clear(); ringGeo.dispose(); dotGeo.dispose(); },
    get active() { return live.length; },
  };
}
