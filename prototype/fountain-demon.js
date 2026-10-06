// "You unleash a water demon!" The basin does not gush, it is torn open. A column of black
// water heaves up and swells at the top into something with shoulders, sways as if it were
// looking the hero over, and two red coals open in the dark where a face would be. It holds
// there a moment too long, then slumps back into the basin all at once. The real demon
// arrives in the map frames; this is only its birth.
//
// live.js calls message(text, x, z) with every engine message and x, z the hero's square (the
// fountain is always the hero's own), update(dt) every frame and clear() on a level change.
// Poses are functions of t and return exactly to rest (nothing showing) at the end.

import {clamp01, smooth} from './fx-textures.js';

export const DEMON = {rise: .7, hold: 1.5, sink: .5, total: 3.2};
export const isDemonMessage = text => /you unleash a water demon/i.test(text || '');

// The column at time t: height, base width, a swell of shoulders near the top, a sway and
// alpha. It lunges up fast, sways while held, then drops away.
export function columnPose(t) {
  const up = 1 - (1 - clamp01(t / DEMON.rise)) ** 3;
  const down = smooth((t - DEMON.rise - DEMON.hold) / DEMON.sink);
  const h = 1.3 * up * (1 - down), live = up > 0 && down < 1;
  return {height: h, width: .16 + .06 * up, shoulders: live ? smooth((t - .3) / .6) * (1 - down) : 0, sway: live ? Math.sin(t * 2.6) * .12 * up * (1 - down) : 0, alpha: live ? .8 * Math.min(1, t * 8) * (1 - down * down) : 0};
}

// The two eyes at time t: they open late, flicker once and shut before the slump.
export function eyePose(t) {
  const open = smooth((t - 1) / .15) * (1 - smooth((t - DEMON.rise - DEMON.hold + .1) / .15));
  const flick = t > 1.6 && t < 1.7 ? .35 : 1;
  return {alpha: open * flick};
}

// The water takes the slump badly: a dark ring spreads from the basin as the column drops,
// and then, after the surface has gone still, a second small ring comes up from the middle
// as if something below had turned over. Both are nothing at the start and the end.
export function ripplePose(t) {
  const ring = (start, len, reach, peak) => {
    const u = clamp01((t - start) / len);
    return u <= 0 || u >= 1 ? {radius: .001, alpha: 0} : {radius: .1 + reach * (1 - (1 - u) ** 2), alpha: peak * Math.sin(Math.PI * Math.min(1, u * 1.4) / 1) * (1 - u)};
  };
  const first = ring(DEMON.rise + DEMON.hold + .15, .6, .8, .5), second = ring(DEMON.rise + DEMON.hold + .75, .25, .3, .35);
  return {first, second};
}

export function createFountainDemon(THREE, parent) {
  const live = [];
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'FountainDemon'; g.position.set(x, 0, z); parent.add(g);
    const colGeo = new THREE.CylinderGeometry(1, 1.5, 1, 8, 1, true), headGeo = new THREE.SphereGeometry(1, 8, 6), eyeGeo = new THREE.SphereGeometry(.03, 6, 4), mats = [];
    const mk = (c, side) => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, side}); mats.push(m); return m; };
    const col = new THREE.Mesh(colGeo, mk(0x0b1c24, THREE.DoubleSide)), head = new THREE.Mesh(headGeo, mk(0x0b1c24, THREE.FrontSide));
    const eyeMat = mk(0xff3a1a, THREE.FrontSide), eyes = [-1, 1].map(s => { const m = new THREE.Mesh(eyeGeo, eyeMat); m.position.x = s * .05; head.add(m); return m; });
    g.add(col, head);
    const ringGeo = new THREE.RingGeometry(.85, 1, 24), rings = [0, 1].map(() => { const m = new THREE.Mesh(ringGeo, mk(0x0b1c24, THREE.DoubleSide)); m.rotation.x = -Math.PI / 2; m.position.y = .52; g.add(m); return m; });
    live.push({g, geos: [colGeo, headGeo, eyeGeo, ringGeo], mats, col, head, eyeMat, eyes, rings, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    const p = columnPose(e.t), show = p.alpha > .01;
    e.col.visible = e.head.visible = show;
    e.col.scale.set(p.width, Math.max(p.height, .001), p.width); e.col.position.set(p.sway * .5, .5 + p.height / 2, 0);
    e.head.scale.setScalar(.04 + .17 * p.shoulders); e.head.position.set(p.sway, .5 + p.height, 0);
    e.col.material.opacity = e.head.material.opacity = p.alpha; e.eyeMat.opacity = eyePose(e.t).alpha;
    e.eyes.forEach(m => { m.position.set(m.position.x, .02, .17); });
    const r = ripplePose(e.t);
    [r.first, r.second].forEach((q, i) => { const m = e.rings[i]; m.visible = q.alpha > .01; m.scale.setScalar(q.radius); m.material.opacity = q.alpha; });
    return e.t < DEMON.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z) { if (isDemonMessage(text)) add(x, z); },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}
