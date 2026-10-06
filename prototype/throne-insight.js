// "You are granted an insight!" The throne shows you something. A pale lidded eye pries open
// in the air over the hero's head, stares, darts its pupil to one side as if something moved
// behind you, blinks, and blinks again a beat too late before it shuts and is gone. About 1.5s.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's square),
// update(dt) every frame and clear() on a level change. Poses are functions of t and return
// exactly to rest (nothing showing) at the end.

import {clamp01} from './fx-textures.js';

export const INSIGHT = {total: 1.5};
export const isThroneInsightMessage = text => /you are granted an insight/i.test(text || '');

// How far the lid is open: prises open, holds, blinks at .75, blinks again late at 1.05.
export function lidPose(t) {
  if (t <= 0 || t >= INSIGHT.total) return {open: 0, y: 1.55, alpha: 0};
  const rise = clamp01(t / .3), blink = (c, w) => Math.max(0, 1 - Math.abs(t - c) / w);
  const open = rise * rise * (3 - 2 * rise) * (1 - blink(.75, .07)) * (1 - blink(1.05, .05)) * (1 - clamp01((t - 1.15) / .3));
  return {open, y: 1.45 + .1 * rise, alpha: .75 * clamp01(t / .08) * (1 - clamp01((t - 1.2) / .3))};
}

// The pupil holds, flicks sideways at .5 (looking at something behind you) and snaps back.
export function pupilPose(t) {
  if (t <= .3 || t >= INSIGHT.total) return {x: 0, alpha: 0};
  const flick = t > .5 && t < .72 ? 1 : 0;
  return {x: flick * .1 * Math.sin(clamp01((t - .5) / .22) * Math.PI) + flick * .02, alpha: .95 * clamp01((t - .3) / .06) * (1 - clamp01((t - 1.15) / .2))};
}

export function createThroneInsight(THREE, parent) {
  const live = [];
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'ThroneInsight'; g.position.set(x, 0, z); parent.add(g);
    const lidGeo = new THREE.RingGeometry(.9, 1, 16), pupGeo = new THREE.SphereGeometry(1, 6, 4), mats = [];
    const mk = c => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false}); mats.push(m); return m; };
    const lid = new THREE.Mesh(lidGeo, mk(0xd8d2b0)); lid.position.y = 1.5; g.add(lid);
    const pupil = new THREE.Mesh(pupGeo, mk(0x1a0a10)); pupil.scale.set(.05, .09, .02); pupil.position.y = 1.5; g.add(pupil);
    live.push({g, geos: [lidGeo, pupGeo], mats, lid, pupil, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    const l = lidPose(e.t); e.lid.visible = l.alpha > .01 && l.open > .02; e.lid.position.y = l.y; e.lid.scale.set(.32, .32 * Math.max(l.open, .02) * .55, 1); e.lid.material.opacity = l.alpha;
    const p = pupilPose(e.t); e.pupil.visible = e.lid.visible && p.alpha > .01; e.pupil.position.set(p.x, l.y, .01); e.pupil.scale.y = .09 * Math.max(l.open, .1); e.pupil.material.opacity = p.alpha;
    return e.t < INSIGHT.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z) { if (isThroneInsightMessage(text)) add(x, z); },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}
