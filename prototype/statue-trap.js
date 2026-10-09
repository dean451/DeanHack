// "The statue comes to life!" The statue trap's trigger moment. The stone shell bursts: grey
// shards are flung out at every height, clatter down and skip once, while a ring of pale dust
// rolls out and a cold glint flashes where the eyes were. The shards land at uneven times, the
// last one rocking to a stop well after the dust has thinned. Over in about 1.6s.
//
// live.js calls message(text, x, z), settle(x, z), update(dt) and clear() like the other trap
// moments. Poses are functions of t and return exactly to rest (nothing showing) at the end.

import {clamp01, smooth} from './fx-textures.js';

export const STATUE = {shards: 8, total: 1.6, flight: .5};
export const PENDING_WAIT = .3;
export const isStatueTrapMessage = text => /the statue comes to life/i.test(text || '');

// Shard i: thrown from chest height, falls under gravity, skips once on the floor, rests.
// Alpha is zero before the burst and after the shard has lain a while and faded.
export function shardPose(i, t) {
  const life = STATUE.total - .1 * (i % 4);
  if (t <= 0 || t >= life) return {x: 0, y: 0, z: 0, spin: 0, alpha: 0};
  const a = i * 2.4 + .3, reach = .3 + .08 * (i % 3), air = STATUE.flight + .04 * (i % 3);
  const u = clamp01(t / air), skip = t > air ? clamp01((t - air) / .25) : 0;
  const y = .02 + (t > air ? .09 * Math.sin(skip * Math.PI) : (.55 + .1 * (i % 2)) * 4 * u * (1 - u) + .3 * (1 - u) * (1 - u) * u);
  const r = reach * Math.sqrt(u) + (t > air ? .06 * smooth(skip) : 0);
  // The first shard has not finished: long after it lies still it rocks back once, as if something under it stirred.
  const rock = i === 0 ? .35 * Math.sin(clamp01((t - air - .45) / .25) * Math.PI) : 0;
  return {x: Math.cos(a) * r, y, z: Math.sin(a) * r, spin: 9 * smooth(Math.min(1, t / (air + .25))) * (i % 2 ? 1 : -1) - rock, alpha: .9 * (1 - smooth(clamp01((t - (life - .4)) / .4)))};
}

// The dust ring rolls out and thins; the glint is a two-beat flash.
export function dustPose(t) {
  if (t <= 0 || t >= .9) return {scale: .1, alpha: 0};
  const u = t / .9;
  return {scale: .15 + .6 * Math.sqrt(u), alpha: .5 * clamp01(t / .05) * (1 - smooth(u))};
}
export function glintPose(t) {
  // Once the dust has thinned the cold eye opens once more, dim and slow, as if the thing were looking about.
  if (t > .6 && t < .85) { const v = (t - .6) / .25; return {scale: .05 + .03 * Math.sin(v * Math.PI), alpha: .45 * Math.sin(v * Math.PI) ** 2}; }
  if (t <= 0 || t >= .35) return {scale: .01, alpha: 0};
  const u = t / .35;
  return {scale: .06 + .12 * Math.sin(u * Math.PI), alpha: .9 * (u < .5 ? 1 : .5 * Math.sin(u * 30) ** 2) * (1 - smooth(u))};
}

export function createStatueTrap(THREE, parent) {
  const live = []; let pending = null;
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'StatueTrap'; g.position.set(x, 0, z); parent.add(g);
    const shard = new THREE.TetrahedronGeometry(1, 0), tor = new THREE.TorusGeometry(1, .06, 4, 16), sph = new THREE.SphereGeometry(1, 6, 4), mats = [];
    const mk = (c, o) => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: o, depthWrite: false, toneMapped: false}); mats.push(m); return m; };
    const shards = Array.from({length: STATUE.shards}, (_, i) => { const m = new THREE.Mesh(shard, mk(i % 3 ? 0x6e6a64 : 0x4a4640, 0)); m.scale.setScalar(.035 + .012 * (i % 3)); g.add(m); return m; });
    const dust = new THREE.Mesh(tor, mk(0xa8a49a, 0)); dust.rotation.x = Math.PI / 2; dust.position.y = .05; g.add(dust);
    const glint = new THREE.Mesh(sph, mk(0xd8e8ff, 0)); glint.position.y = .75; g.add(glint);
    live.push({g, geos: [shard, tor, sph], mats, shards, dust, glint, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    e.shards.forEach((m, i) => { const p = shardPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.rotation.set(p.spin, p.spin * .7, 0); m.material.opacity = p.alpha; });
    const d = dustPose(e.t); e.dust.visible = d.alpha > .01; e.dust.scale.setScalar(d.scale); e.dust.material.opacity = d.alpha;
    const l = glintPose(e.t); e.glint.visible = l.alpha > .01; e.glint.scale.setScalar(l.scale); e.glint.material.opacity = l.alpha;
    return e.t < STATUE.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z) { if (isStatueTrapMessage(text)) { if (pending) add(pending.x, pending.z); pending = {x, z, wait: 0}; } },
    settle(x, z) { if (pending) { add(x, z); pending = null; } },
    update(dt) {
      if (pending && (pending.wait += dt) >= PENDING_WAIT) { add(pending.x, pending.z); pending = null; }
      for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); }
    },
    clear() { pending = null; live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}
