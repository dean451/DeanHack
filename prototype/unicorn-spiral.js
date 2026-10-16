// "This makes you feel better!" (a unicorn horn put right a lost attribute). A pearl-white
// spiral of light climbs the hero from the boots to the crown; behind it the ailments are drawn
// out as grey and green shards that drift up and gutter. One pearl mote hangs back, hesitates
// at the knee, then has to hurry to catch the rest. About 1.8 s.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's last known
// square) and update(dt) every frame. Poses end exactly at rest (hidden).

import {clamp01, smooth} from './fx-textures.js';

export const SPIRAL = {pearls: 6, wisps: 4, total: 1.8};
export const isSpiralMessage = text => /^This makes you feel (better|great)!/.test(text || '');

// Pearl i rides a helix up the body. The lagging pearl (the last) stalls near the knee, then catches up.
export function pearlPose(i, t) {
  const lag = i === SPIRAL.pearls - 1;
  let u = clamp01((t - i * .06) / 1);
  if (lag) u = u < .3 ? u : u < .6 ? .3 + (u - .3) * .08 : .324 + (u - .6) / .4 * .676;
  if (u <= 0 || u >= 1) return {x: 0, y: 0, z: 0, scale: .001, alpha: 0};
  const a = i * 1.05 + u * 9, r = .5 - .18 * u;
  return {x: Math.cos(a) * r, y: .1 + 1.6 * smooth(u), z: Math.sin(a) * r, scale: .07 * (1 - .4 * u), alpha: .8 * Math.min(1, u * 10) * (1 - smooth((u - .8) / .2))};
}

// Wisp i is drawn off the hero after the pearls pass, drifts up and out, shrinking as it fades.
export function wispPose(i, t) {
  const u = clamp01((t - .45 - i * .12) / .9);
  if (u <= 0 || u >= 1) return {x: 0, y: 0, z: 0, scale: .001, alpha: 0};
  const a = i * 1.6 + 1, d = .25 + .55 * smooth(u);
  return {x: Math.cos(a) * d, y: .8 + .5 * u + i * .12, z: Math.sin(a) * d, scale: .09 * (1 - .6 * u), alpha: .55 * Math.min(1, u * 6) * (1 - smooth((u - .5) / .5))};
}

export function createUnicornSpiral(THREE, parent) {
  const live = [];
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'UnicornSpiral'; g.position.set(x, 0, z); parent.add(g);
    const geo = new THREE.OctahedronGeometry(1), mats = [];
    const mk = c => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, toneMapped: false}); mats.push(m); return m; };
    const pearls = Array.from({length: SPIRAL.pearls}, () => { const m = new THREE.Mesh(geo, mk(0xe8e4d8)); g.add(m); return m; });
    const wisps = Array.from({length: SPIRAL.wisps}, (_, i) => { const m = new THREE.Mesh(geo, mk(i % 2 ? 0x5a7a52 : 0x7a8078)); g.add(m); return m; });
    live.push({g, geos: [geo], mats, pearls, wisps, t: 0});
  }
  const place = (m, p) => { m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.scale.set(p.scale, p.scale * 1.6, p.scale); m.material.opacity = p.alpha; };
  function step(e, dt) {
    e.t += dt;
    e.pearls.forEach((m, i) => place(m, pearlPose(i, e.t)));
    e.wisps.forEach((m, i) => place(m, wispPose(i, e.t)));
    return e.t < SPIRAL.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    message(text, x, z) { if (isSpiralMessage(text)) add(x, z); },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}
