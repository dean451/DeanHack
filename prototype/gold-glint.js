// "$ - 12 gold pieces." The hero scoops up gold. The pile does not just vanish: a few coins
// are flicked off the floor in jerky arcs, spinning edge-on, and fall back dull as they are
// swallowed, while one hard glint cuts across the spot. One coin hangs a beat too long, as if
// reluctant. About half a second. No screen flash.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's last known
// square), settle(x, z) from each frame with the hero's new square, update(dt) every frame and
// clear() on a level change. Poses are functions of t and return exactly to rest (nothing
// showing) at the end.

import {clamp01, smooth} from './fx-textures.js';

export const GOLD = {coins: 5, glint: .22, total: .7};
export const PENDING_WAIT = .3;
// A fat purse flicks more coins than a few pieces: under 10 gold 2, under 100 gold 3, under 500 gold 4, else 5.
export const coinCount = text => { const n = +/^\$ - (\d+)/i.exec(text || '')?.[1]; return n >= 500 ? 5 : n >= 100 ? 4 : n >= 10 ? 3 : 2; };
export const isGoldMessage = text => /^\$ - \d+ gold pieces?\b/i.test(text || '');

// Coin i: flicked up on its own delay, spinning, then dropping dull. Coin 0 lingers at the top.
export function coinPose(i, t) {
  const start = i * .045, life = i === 0 ? .5 : .36, u = clamp01((t - start) / life);
  if (u <= 0 || u >= 1) return {x: 0, y: 0, z: 0, spin: 0, alpha: 0, shine: 0};
  const hang = i === 0 ? smooth(u * 1.4) * (1 - smooth(Math.max(0, u - .6) / .4)) : 4 * u * (1 - u), a = i * 2.4 + 1;
  // The reluctant coin shivers at the top of its climb, as if the air under it were not quite solid.
  const shiver = i === 0 ? .012 * Math.sin(u * 110) * Math.sin(Math.PI * clamp01((u - .3) / .3)) : 0;
  return {x: Math.cos(a) * (.05 + .1 * u), y: .05 + .38 * hang + shiver, z: Math.sin(a) * (.05 + .1 * u), spin: u * (14 + i * 3), alpha: Math.min(1, u * 12) * (1 - smooth((u - .7) / .3)), shine: 1 - u};
}

// The glint: a thin four-point cross that snaps open and shut once.
export function glintPose(t) {
  const u = clamp01(t / GOLD.glint);
  if (u <= 0 || u >= 1) return {size: .001, alpha: 0};
  // The cross does not die cleanly: it flares a second time, fainter, as the first fades.
  const twitch = .12 * Math.sin(Math.PI * clamp01((u - .5) / .35)) ** 2;
  return {size: .12 + .42 * Math.sin(Math.PI * u) ** 2, alpha: Math.min(1, (1 - u) * Math.min(1, u * 10) + 2 * twitch)};
}

export function createGoldGlint(THREE, parent) {
  const live = []; let pending = null;
  function add(x, z, n = GOLD.coins) {
    const g = new THREE.Group(); g.name = 'GoldGlint'; g.position.set(x, 0, z); parent.add(g);
    const disc = new THREE.CylinderGeometry(1, 1, .25, 8), bar = new THREE.PlaneGeometry(1, .06), mats = [];
    const mk = c => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false}); mats.push(m); return m; };
    const coins = Array.from({length: n}, () => { const m = new THREE.Mesh(disc, mk(0xd9a520)); m.scale.set(.05, .05, .05); g.add(m); return m; });
    const bars = [0, Math.PI / 2].map(r => { const m = new THREE.Mesh(bar, mk(0xfff2b0)); m.position.y = .12; m.rotation.z = r + .4; g.add(m); return m; });
    live.push({g, geos: [disc, bar], mats, coins, bars, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    e.coins.forEach((m, i) => { const p = coinPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.rotation.set(p.spin, 0, p.spin * .6); m.material.opacity = p.alpha; m.material.color.setHex(p.shine > .5 ? 0xf2c63a : 0x8a6414); });
    const q = glintPose(e.t); e.bars.forEach((m, i) => { m.visible = q.alpha > .01; m.scale.set(q.size, 1, 1); m.material.opacity = q.alpha; });
    return e.t < GOLD.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    // The message arrives before the frame that carries the hero's new square: hold it for the
    // next frame (settle), or fall back to the square given after PENDING_WAIT.
    message(text, x, z) { if (isGoldMessage(text)) { if (pending) add(pending.x, pending.z, pending.n); pending = {x, z, n: coinCount(text), wait: 0}; } },
    settle(x, z) { if (pending) { add(x, z, pending.n); pending = null; } },
    update(dt) {
      if (pending && (pending.wait += dt) >= PENDING_WAIT) { add(pending.x, pending.z, pending.n); pending = null; }
      for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); }
    },
    clear() { pending = null; live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}
