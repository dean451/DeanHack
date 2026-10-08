// "You fail to cast the spell correctly." A spell going wrong at the hero's hands: a thin
// ring of sickly violet gathers inward as if the magic were being drawn, then stutters and
// snaps out with the hero's own sputtering sparks, and a few dim motes slump to the floor
// like spent ash. Nothing is lost visually but the hero's confidence. About a second.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's square),
// update(dt) every frame and clear() on a level change. Poses are functions of t and return
// exactly to rest (nothing showing) at the end.

import {clamp01} from './fx-textures.js';

export const FIZZLE = {sparks: 6, total: 1.0};
export const isSpellFailMessage = text => /you fail to cast the spell correctly/i.test(text || '');

// The ring draws in until .35s, stuttering, then bursts out and thins.
export function ringPose(t) {
  if (t <= 0 || t >= FIZZLE.total) return {scale: .6, alpha: 0};
  if (t < .35) {
    // The draw-in catches: it advances in jerks and every third beat the ring gutters.
    const k = Math.floor(t / .05), j = (k + clamp01((t - k * .05) / .012)) * .05 / .35;
    return {scale: .6 - .45 * Math.min(j, 1) ** 2, alpha: .7 * clamp01(t / .08) * (k % 3 === 2 ? .4 : 1)};
  }
  const u = clamp01((t - .4) / .6);
  // One last cough: the thinning ring blinks out for a beat mid-way and comes back, as if the spell
  // had tried again and failed again.
  const cough = t > .6 && t < .67 ? .25 : 1;
  return {scale: .15 + .65 * (1 - (1 - u) ** 3), alpha: (t < .4 ? .7 : .7 * (1 - u)) * cough};
}

// Spark i: spat out at the snap, arcs up and slumps back down, flickering.
export function sparkPose(i, t) {
  const s = t - .38;
  if (s <= 0 || t >= FIZZLE.total) return {x: 0, y: 0, z: 0, alpha: 0};
  const u = s / (FIZZLE.total - .38), a = i * 2.1, r = .1 + .3 * u * (.7 + .1 * (i % 4));
  const flick = .6 + .4 * Math.sin(s * 60 + i * 3);
  // The last spark has slumped dead, then twitches up once more and drops again.
  const twitch = i === FIZZLE.sparks - 1 && u > .72 && u < .92 ? .07 * Math.sin((u - .72) / .2 * Math.PI) : 0;
  // The first spark is slow to die: it lands, skips once more on the floor, and only then goes out.
  const skip = i === 0 && u > .6 ? .06 * Math.abs(Math.sin((u - .6) / .4 * Math.PI)) : 0;
  // The third spark flares white-hot for a blink at the snap before it slumps like the rest.
  const flare = i === 2 && s < .08 ? 1 + .5 * Math.sin(Math.PI * s / .08) : 1;
  // The second spark is a dud: it gutters out halfway up its arc, long before the rest.
  const dud = i === 1 ? 1 - clamp01((u - .35) / .15) : 1;
  return {x: Math.cos(a) * r, y: .15 + .5 * 4 * u * (1 - u) * (.6 + .1 * (i % 3)) * (1 - .6 * u) + twitch + skip, z: Math.sin(a) * r, alpha: Math.min(.85, Math.max(0, .85 * (1 - u) * flick * flare * dud))};
}

export function createSpellFizzle(THREE, parent) {
  const live = [];
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'SpellFizzle'; g.position.set(x, 0, z); parent.add(g);
    const ringGeo = new THREE.RingGeometry(.9, 1, 20), sph = new THREE.SphereGeometry(1, 5, 3), mats = [];
    const mk = c => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false}); mats.push(m); return m; };
    const ring = new THREE.Mesh(ringGeo, mk(0x8a50c8)); ring.rotation.x = -Math.PI / 2; ring.position.y = .05; g.add(ring);
    const sparks = Array.from({length: FIZZLE.sparks}, (_, i) => { const m = new THREE.Mesh(sph, mk(i % 2 ? 0xc8a0ff : 0x5a3a78)); m.scale.setScalar(.02); g.add(m); return m; });
    live.push({g, geos: [ringGeo, sph], mats, ring, sparks, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    const r = ringPose(e.t); e.ring.visible = r.alpha > .01; e.ring.scale.setScalar(r.scale); e.ring.material.opacity = r.alpha;
    e.sparks.forEach((m, i) => { const p = sparkPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.material.opacity = p.alpha; });
    return e.t < FIZZLE.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z) { if (isSpellFailMessage(text)) add(x, z); },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}
