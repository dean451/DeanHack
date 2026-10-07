// "The spellbook crumbles to dust!" A spellbook read too often gives out in the hero's hands:
// grey flecks of page slough off at hand height, sag, drift and settle on the floor, and one
// stubborn flake hangs in the air long after the rest, tipping over and over before it too lands.
// Under two seconds, grey and quiet. Nothing is cute about it: the book is simply gone.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's square),
// update(dt) every frame and clear() on a level change. Poses are functions of t and return
// exactly to rest (nothing showing) at the end.

export const CRUMBLE = {flecks: 9, total: 1.9};
export const isCrumbleMessage = text => /the spellbook crumbles to dust/i.test(text || '');

// Fleck i: born at hand height one after another, drifts out, sags to the floor and fades.
// The last fleck is slow: it lingers and tumbles (spin) well after the others have settled.
export function fleckPose(i, t) {
  const n = CRUMBLE.flecks, last = i === n - 1, born = last ? .15 : i * .06, life = last ? CRUMBLE.total - born : .9 + .04 * (i % 3);
  const u = (t - born) / life;
  if (u <= 0 || u >= 1) return {x: 0, y: 0, z: 0, alpha: 0, spin: 0};
  const a = i * 2.4, r = (.05 + .22 * Math.sqrt(u)) * (.7 + .1 * (i % 4));
  // Sags in an accelerating fall; the last one falls late, on a long sway.
  // The stubborn flake catches on nothing mid-fall: it stalls a beat, then drops the rest of the way.
  const fall = last ? (u < .5 ? u ** 2.6 : u < .62 ? .5 ** 2.6 + (u - .5) * .08 : .5 ** 2.6 + .0096 + (u - .62) / .38 * (1 - .5 ** 2.6 - .0096)) : u ** 1.7, sway = last ? .06 * Math.sin(u * 14) : .012 * Math.sin(u * 22 + i * 1.7);
  return {x: Math.cos(a) * r + sway, y: Math.max(.5 - .47 * fall, .03), z: Math.sin(a) * r,
    alpha: .7 * Math.min(u / .08, 1) * (u > .75 ? (1 - u) / .25 : 1), spin: last ? u * 18 : u * 4 * (i % 2 ? 1 : -1)};
}

export function createSpellCrumble(THREE, parent) {
  const live = [];
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'SpellCrumble'; g.position.set(x, 0, z); parent.add(g);
    const geo = new THREE.PlaneGeometry(1, 1), mats = [];
    const flecks = Array.from({length: CRUMBLE.flecks}, (_, i) => {
      const m = new THREE.MeshBasicMaterial({color: i % 3 ? 0x7a7670 : 0x4a4640, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false});
      mats.push(m); const s = new THREE.Mesh(geo, m); s.scale.set(.05, .035, 1); g.add(s); return s;
    });
    live.push({g, geo, mats, flecks, t: 0});
  }
  function step(e, dt) {
    e.t += Math.max(dt || 0, 0);
    e.flecks.forEach((s, i) => { const p = fleckPose(i, e.t); s.visible = p.alpha > .01; s.position.set(p.x, p.y, p.z); s.rotation.set(p.spin, p.spin * .7, p.spin * 1.3); s.material.opacity = p.alpha; });
    return e.t < CRUMBLE.total;
  }
  function drop(e) { e.geo.dispose(); e.mats.forEach(m => m.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z) { if (isCrumbleMessage(text) && Number.isFinite(x) && Number.isFinite(z)) add(x, z); },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}
