// "You find a hidden door." / "You find a hidden passage." / "You find a bear trap." Searching
// pays off. A thin ring of cold light creeps out of the hero's square, hesitates as if it had
// touched something, then lunges the last stretch while grit shakes loose from the stone
// around and drifts down. About three quarters of a second. Poses are functions of t and
// return exactly to rest (nothing showing) at the end.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's square; a
// search does not move her), update(dt) every frame and clear() on a level change.
// Remaining: the ring is centred on the hero; it does not yet point at the cell that was found.

import {clamp01, smooth} from './fx-textures.js';

export const SEARCH = {grit: 7, total: .8, hesitate: .3};
export const isSearchFindMessage = text => /^You find (a|an|the) (hidden|secret)?\s*\w/i.test(text || '') && /hidden (door|passage)|(trap|mine|pit|hole|door|portal|board|web|vent|field|plate|rune)\b/i.test(text);

// Ring radius and alpha: creeps, stalls, then lunges and thins out.
export function ringPose(t) {
  if (t <= 0 || t >= SEARCH.total) return {radius: .001, alpha: 0};
  const u = t / SEARCH.total, h = SEARCH.hesitate / SEARCH.total;
  const r = u < h ? .45 * smooth(u / h) : .45 + .75 * smooth((u - h - .08) / (1 - h - .08));
  return {radius: .2 + r, alpha: .7 * (1 - smooth((u - .6) / .4)) * Math.min(1, t * 14)};
}

// Grit i: a fleck shaken off above, falling in a dead straight drop with a little tremor.
export function gritPose(i, t) {
  const start = .12 + (i % 4) * .07, a = i * 2.4 + .5, r = .35 + (i % 3) * .22;
  // The last flake will not fall with the rest: halfway down it hangs a beat, then drops.
  const u = clamp01((t - start) / .4 - (i === SEARCH.grit - 1 ? .1 * Math.sin(Math.PI * clamp01((t - start - .12) / .16)) : 0));
  if (t <= start || u >= 1) return {x: 0, y: 0, z: 0, alpha: 0};
  return {x: Math.cos(a) * r + Math.sin(t * 40 + i) * .008, y: 1.1 * (1 - u * u) + .02, z: Math.sin(a) * r, alpha: .8 * (1 - smooth((u - .75) / .25))};
}

export function createSearchReveal(THREE, parent) {
  const live = [];
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'SearchReveal'; g.position.set(x, 0, z); parent.add(g);
    const ringGeo = new THREE.RingGeometry(.92, 1, 24), sph = new THREE.SphereGeometry(1, 5, 4), mats = [];
    const mk = c => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false}); mats.push(m); return m; };
    const ring = new THREE.Mesh(ringGeo, mk(0xaecbd8)); ring.rotation.x = -Math.PI / 2; ring.position.y = .03; g.add(ring);
    const grit = Array.from({length: SEARCH.grit}, () => { const m = new THREE.Mesh(sph, mk(0x6b6258)); m.scale.setScalar(.02); g.add(m); return m; });
    live.push({g, geos: [ringGeo, sph], mats, ring, grit, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    const r = ringPose(e.t); e.ring.visible = r.alpha > .01; e.ring.scale.setScalar(r.radius); e.ring.material.opacity = r.alpha;
    e.grit.forEach((m, i) => { const p = gritPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.material.opacity = p.alpha; });
    return e.t < SEARCH.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z) { if (isSearchFindMessage(text)) add(x, z); },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}
