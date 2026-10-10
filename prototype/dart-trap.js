// "An arrow shoots out at you!" / "A little dart shoots out at you!" The arrow and dart traps'
// trigger moment. A shaft streaks in flat from the wall side in a blink, buries itself at the
// square and quivers, the shiver dying away in hard little beats, then it fades. A dart is a
// shorter, faster, thinner thing than an arrow. A pale scratch of a streak hangs behind it.
// Over in under a second.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's last known
// square), settle(x, z) each frame with the hero's new square, which is the trap's, update(dt)
// every frame and clear() on a level change. Poses are functions of t and return exactly to
// rest (nothing showing) at the end.

import {clamp01, smooth} from './fx-textures.js';

export const SHOT = {flight: .09, total: .9, arrow: {len: .55, thick: .016, from: 1.5}, dart: {len: .28, thick: .01, from: 1.8}};
export const PENDING_WAIT = .3;
export const shotKind = text => /an arrow shoots out at you/i.test(text || '') ? 'arrow' : /a little dart shoots out at you/i.test(text || '') ? 'dart' : null;

// A buried dart is light and shivers fast and thin; an arrow is heavy, shivers slow and its tail sags
// a little under its own weight as the shiver dies. Always within +-.35.
const quiver = (kind, h) => kind === 'dart' ? Math.sin(h * 120) * .3 * Math.exp(-h * 9) : Math.sin(h * 70) * .3 * Math.exp(-h * 7) - .05 * (1 - Math.exp(-h * 4)) * Math.exp(-h * 2);

// The shaft's pose along its line: x runs from the far side into the square, then it quivers
// (a damped wobble in pitch) and fades out over the last quarter.
export function shaftPose(kind, t) {
  const from = SHOT[kind].from;
  if (t <= 0 || t >= SHOT.total) return {x: 0, tilt: 0, alpha: 0};
  const u = clamp01(t / SHOT.flight), h = Math.max(0, t - SHOT.flight);
  const x = -from * (1 - u * u);
  // Long after it looks still, the buried shaft gives one last late jerk, as if something pulled it.
  const late = .09 * Math.sin(clamp01((h - .3) / .07) * Math.PI) * Math.sin(h * 90);
  // A heavy arrow is driven a hair deeper by its own weight a moment after it lands, then rocks back.
  const drive = kind === 'arrow' ? .015 * Math.sin(clamp01(h / .05) * Math.PI) : 0;
  return {x: u < 1 ? x : -.04 * Math.exp(-h * 30) + drive, tilt: u < 1 ? 0 : quiver(kind, h) + late, alpha: 1 - smooth(clamp01((t - .6) / .3))};
}

// The streak hanging in the air behind the flight: bright at the strike, gone as the shaft lands.
export function streakPose(kind, t) {
  const u = clamp01(t / (SHOT.flight * 2.5));
  if (t <= 0 || u >= 1) return {x: 0, len: 0, alpha: 0};
  const s = SHOT[kind];
  return {x: -s.from * .5 * (1 - u), len: s.from * (1 - u * .4), alpha: .35 * (1 - u) * (.75 + .25 * Math.sin(u * 50) ** 2)};
}

export function createDartTrap(THREE, parent) {
  const live = []; let pending = null;
  function add(kind, x, z, yaw) {
    const s = SHOT[kind], g = new THREE.Group(); g.name = 'DartTrap'; g.position.set(x, 0, z); g.rotation.y = yaw; parent.add(g);
    const box = new THREE.BoxGeometry(1, 1, 1), mats = [];
    const mk = (c, o) => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: o, depthWrite: false, toneMapped: false}); mats.push(m); return m; };
    const shaft = new THREE.Mesh(box, mk(0x9a8f7e, 0)); shaft.scale.set(s.len, s.thick, s.thick); shaft.position.y = .3;
    const streak = new THREE.Mesh(box, mk(0xd8d2c4, 0)); streak.position.y = .3; streak.scale.set(1, .004, .004);
    g.add(shaft, streak);
    live.push({g, kind, geos: [box], mats, shaft, streak, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    const p = shaftPose(e.kind, e.t), s = streakPose(e.kind, e.t);
    e.shaft.visible = p.alpha > .01; e.shaft.position.x = p.x; e.shaft.rotation.z = p.tilt; e.shaft.material.opacity = p.alpha;
    e.streak.visible = s.alpha > .01; e.streak.position.x = s.x; e.streak.scale.x = Math.max(.001, s.len); e.streak.material.opacity = s.alpha;
    return e.t < SHOT.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z, yaw = 0) { const kind = shotKind(text); if (kind) { if (pending) add(pending.kind, pending.x, pending.z, pending.yaw); pending = {kind, x, z, yaw, wait: 0}; } },
    settle(x, z) { if (pending) { add(pending.kind, x, z, pending.yaw); pending = null; } },
    update(dt) {
      if (pending && (pending.wait += dt) >= PENDING_WAIT) { add(pending.kind, pending.x, pending.z, pending.yaw); pending = null; }
      for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); }
    },
    clear() { pending = null; live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}
