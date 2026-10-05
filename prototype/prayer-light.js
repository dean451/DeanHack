// Prayer: the god's answer. While the hero kneels, a pale pillar of light lowers itself out of
// the dark, slowly and without hurry, as if something were deciding. When the god is pleased
// the pillar burns gold, holds, then withdraws and leaves a tight ring of ash-gold on the floor.
//
// live.js calls message(text, x, z) with the hero's tile, update(dt) every frame and clear()
// on a level change. An angry god answers with a thin dark-red bolt that snaps down and stutters out.
// It keys on the message text only, so it shows nothing the hero doesn't know.

import {softRing, smooth, clamp01} from './fx-textures.js';

export const PRAYER = {begin: 2.4, boon: 3.0, height: 5};
export const TOTAL = {begin: PRAYER.begin, boon: PRAYER.boon, wrath: .8};

// Which kind of moment a message starts, or null.
export function prayerKind(text) {
  const t = text || '';
  if (/^You begin praying to /.test(t)) return 'begin';
  if (/^You are surrounded by a shimmering light\.$/.test(t)) return 'boon';
  if (/^Suddenly,? a bolt of lightning (strikes you|comes down at you)|^"?Thou hast angered me\.|^"?Thou durst call upon me|^"?Thou must relearn thy lessons/.test(t)) return 'wrath';
  return null;
}

// The pillar of a kind at age t: how far down it has reached (0..1 of its height), its
// brightness and its width scale. Zero outside its life.
export function pillarPose(kind, t) {
  const total = TOTAL[kind];
  if (!total || t < 0 || t >= total) return {reach: 0, alpha: 0, width: 0};
  const u = t / total;
  if (kind === 'begin') // lowers slowly, hesitates, never quite bright
    return {reach: smooth(u / .8) ** 1.4, alpha: .32 * smooth(u / .3) * (1 - smooth((u - .85) / .15)) * (.85 + .15 * Math.sin(t * 9)), width: .7 + .25 * u};
  // wrath: a thin bolt slams down at once and stutters as it dies
  if (kind === 'wrath') return {reach: smooth(u / .08), alpha: .95 * smooth(u / .04) * (1 - smooth((u - .3) / .7)) * (Math.sin(t * 70) > -.4 ? 1 : .25), width: .22 + .1 * Math.sin(t * 40)};
  // boon: drops fast, burns gold, holds, then draws thin and withdraws
  return {reach: smooth(u / .18), alpha: .85 * smooth(u / .12) * (1 - smooth((u - .7) / .3)), width: 1.1 * (1 - .8 * smooth((u - .65) / .35))};
}

// The floor ring at age t: only a boon leaves one, drawn in as the pillar thins.
export function glowPose(kind, t) {
  if (kind !== 'boon' || t < 0 || t >= TOTAL.boon) return {radius: 0, alpha: 0};
  const u = t / TOTAL.boon;
  return {radius: .9 - .35 * smooth((u - .3) / .5), alpha: .8 * smooth((u - .1) / .2) * (1 - smooth((u - .75) / .25))};
}

export function createPrayerLight(THREE, parent) {
  const live = [];
  const beamGeo = new THREE.CylinderGeometry(.5, .5, PRAYER.height, 14, 1, true).translate(0, PRAYER.height / 2, 0);
  const ringGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const colours = {begin: 0xcfd3d8, boon: 0xe0b85a, wrath: 0xa01818};
  function add(kind, x, z) {
    if (!TOTAL[kind] || !Number.isFinite(x) || !Number.isFinite(z)) return null;
    // an answer takes over from the begin pillar already standing there
    for (let i = live.length - 1; i >= 0; i--) if (live[i].kind === 'begin' && kind !== 'begin') { drop(live[i]); live.splice(i, 1); }
    const g = new THREE.Group(); g.name = 'PrayerLight'; g.position.set(x, 0, z); parent.add(g);
    const mk = (map, color) => new THREE.MeshBasicMaterial({map, color, transparent: true, opacity: 0, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false});
    const beamMat = mk(null, colours[kind]), ringMat = mk(softRing(THREE), 0xc9a85a);
    const beam = new THREE.Mesh(beamGeo, beamMat); beam.renderOrder = 4; g.add(beam);
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.y = .03; g.add(ring);
    live.push({g, kind, beam, ring, mats: [beamMat, ringMat], t: 0});
    return g;
  }
  function drop(e) { e.mats.forEach(m => m.dispose()); parent.remove(e.g); }
  const frame = (e, dt) => {
    e.t += Math.min(Math.max(dt || 0, 0), .1);
    const p = pillarPose(e.kind, e.t), r = glowPose(e.kind, e.t);
    e.beam.scale.set(p.width, Math.max(p.reach, .001), p.width); e.beam.material.opacity = p.alpha;
    e.ring.scale.setScalar(r.radius * 2); e.ring.material.opacity = r.alpha;
    return e.t < TOTAL[e.kind];
  };
  return {
    add,
    message(text, x, z) { const k = prayerKind(text); return k ? add(k, x, z) : null; },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!frame(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    dispose() { this.clear(); beamGeo.dispose(); ringGeo.dispose(); },
    get active() { return live.length; },
  };
}
