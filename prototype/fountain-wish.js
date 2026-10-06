// "Grateful for his release, he grants you a wish!" The demon pays its debt. Gold motes are
// drawn in from the dark around the basin, spiralling inward faster as they come, until they
// collapse into one hard point of light over the water that flares once and is gone. It is
// not generous light: it arrives like something being taken back.
//
// live.js calls message(text, x, z) with every engine message and x, z the hero's square (the
// fountain is always the hero's own), update(dt) every frame and clear() on a level change.
// Poses are functions of t and return exactly to rest (nothing showing) at the end.

import {clamp01, smooth} from './fx-textures.js';

export const WISH = {motes: 16, pull: 1.6, flare: .35, settle: .6, total: 3.2};
// The fountain demon's line, or the prompt every wish ends in (a wand, a throne, a lamp), so a
// wish by any means plays on the hero's square.
export const isWishMessage = text => /grateful for his release, he grants you a wish|for what do you wish\?/i.test(text || '');

// Mote i at time t: radius from the middle, spiral angle, height and alpha. Each starts at its
// own distance, accelerates inward and vanishes into the point.
export function motePose(i, t) {
  const u = clamp01((t - i * .04) / WISH.pull), r0 = .7 + (i % 4) * .12, pull = u * u;
  return {r: r0 * (1 - pull), angle: i * 2.4 + u * 7 + pull * 4, y: .35 + .45 * Math.sin(Math.PI * Math.min(1, u * 1.2)) * .5 + (i % 3) * .05, alpha: u <= 0 || u >= 1 ? 0 : .9 * Math.min(1, u * 5)};
}

// The point of light: it swells as the motes land, flares once and is gone.
export function flarePose(t) {
  const u = clamp01((t - WISH.pull - .5) / WISH.flare), grow = smooth(t / (WISH.pull + .5));
  return {size: u > 0 && u < 1 ? .08 + .5 * Math.sin(Math.PI * u) : .06 * grow * (t < WISH.pull + .5 ? 1 : 0), alpha: t <= 0 || u >= 1 ? 0 : u > 0 ? Math.sin(Math.PI * u) : .5 * grow};
}

// After the flare something is left behind: a thin gold column of light stands up from the
// water for a breath, as if the wish were being weighed, then thins and drops away, while one
// ring spreads over the floor. Both are nothing at the start and at the end.
export function afterPose(t) {
  const u = clamp01((t - WISH.pull - .5 - WISH.flare) / WISH.settle);
  if (u <= 0 || u >= 1) return {ring: .001, ringAlpha: 0, column: .001, columnAlpha: 0};
  const rise = smooth(Math.min(1, u * 3)), fade = 1 - smooth(clamp01((u - .45) / .55));
  return {ring: .2 + .7 * smooth(u), ringAlpha: .5 * (1 - u) * (1 - u), column: .02 + .5 * rise * (1 - .8 * u), columnAlpha: .55 * fade * Math.min(1, u * 6)};
}

// The wish takes form: a small gold shard condenses out of the point of light, turns over
// twice as if being inspected, gives one wrong-footed twitch and then sinks into the water
// as the column thins. Nothing before the flare and nothing at the end.
export function formPose(t) {
  const u = clamp01((t - WISH.pull - .5 - WISH.flare * .6) / (WISH.settle + .2));
  if (u <= 0 || u >= 1) return {size: .001, y: .6, spin: 0, tilt: 0, alpha: 0};
  const twitch = u > .62 && u < .7 ? Math.sin((u - .62) / .08 * Math.PI) * .5 : 0;
  return {size: .03 + .07 * smooth(u * 4) * (1 - smooth(clamp01((u - .8) / .2))), y: .6 - .05 * u - .35 * smooth(clamp01((u - .8) / .2)), spin: u * Math.PI * 4, tilt: .3 + twitch, alpha: .95 * Math.min(1, u * 8) * (1 - smooth(clamp01((u - .85) / .15)))};
}

export function createFountainWish(THREE, parent) {
  const live = [];
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'FountainWish'; g.position.set(x, 0, z); parent.add(g);
    const geo = new THREE.SphereGeometry(1, 6, 4), mats = [];
    const mk = c => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false}); mats.push(m); return m; };
    const motes = Array.from({length: WISH.motes}, () => { const m = new THREE.Mesh(geo, mk(0xe0b040)); m.scale.setScalar(.025); g.add(m); return m; });
    const point = new THREE.Mesh(geo, mk(0xfff0b0)); point.position.y = .6; g.add(point);
    const ringGeo = new THREE.RingGeometry(.85, 1, 24), ring = new THREE.Mesh(ringGeo, mk(0xe0b040)); ring.rotation.x = -Math.PI / 2; ring.position.y = .03; g.add(ring);
    const column = new THREE.Mesh(geo, mk(0xfff0b0)); column.position.y = .6; g.add(column);
    const shardGeo = new THREE.OctahedronGeometry(1), shard = new THREE.Mesh(shardGeo, mk(0xe0b040)); g.add(shard);
    live.push({g, geos: [geo, ringGeo, shardGeo], mats, motes, point, ring, column, shard, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    e.motes.forEach((m, i) => { const p = motePose(i, e.t); m.visible = p.alpha > .01; m.position.set(Math.cos(p.angle) * p.r, p.y, Math.sin(p.angle) * p.r); m.material.opacity = p.alpha; });
    const f = flarePose(e.t); e.point.visible = f.alpha > .01; e.point.scale.setScalar(Math.max(f.size, .001)); e.point.material.opacity = f.alpha;
    const a = afterPose(e.t);
    e.ring.visible = a.ringAlpha > .01; e.ring.scale.setScalar(a.ring); e.ring.material.opacity = a.ringAlpha;
    e.column.visible = a.columnAlpha > .01; e.column.scale.set(.035, a.column, .035); e.column.material.opacity = a.columnAlpha;
    const s = formPose(e.t); e.shard.visible = s.alpha > .01; e.shard.position.y = s.y; e.shard.rotation.set(s.tilt, s.spin, 0); e.shard.scale.set(s.size * .6, s.size, s.size * .6); e.shard.material.opacity = s.alpha;
    return e.t < WISH.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z) { if (isWishMessage(text) && !live.length) add(x, z); },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}
