// "The throne vanishes in a puff of logic." When a throne square turns to floor, the throne
// doesn't just blink out with the tile. It glitches first: it shivers, and flickers three
// times into a glowing wireframe, as if it had only ever been a proof. Then it pulls up tall and
// thin and is gone in a white flash and a puff of lavender smoke, with a ring running across the
// floor. Out of the smoke fly the symbols of logic (∴ ∀ ∃ ¬ ⊢ ⊥ ≡ ∧ ∨ → ? !), spinning as they
// scatter and fade. Its sapphire and rubies tumble out and bounce. Last of all "Q.E.D." rises
// out of the smoke and fades.
//
// live.js calls add(x, z) at the hero's square when the game says the throne vanished
// (isThronePuff), update(dt) every frame, and clear() on a level change. It keys on the message,
// not on the tile: the bridge reports a square under the hero (or a monster or an item) as floor,
// so a throne tile also "turns to floor" every time something stands on it. A throne is terrain,
// so nothing here can reveal anything the hero doesn't know.

import {createThrone} from './throne.js';
import {softDot, softRing, glyphTexture, rng, smooth, clamp01} from './fx-textures.js';

export const VANISH = {flicker: .5, poof: .5, collapse: .18, total: 2.8};
export const LOGIC = ['∴', '∀', '∃', '¬', '⊢', '⊥', '≡', '∧', '∨', '→', '?', '!'];
// Only sitting can do it, and only the hero sits (sit.c), so the message always means the
// throne under the hero.
export const isThronePuff = text => /throne vanishes in a puff of logic/i.test(text || '');
const WIRE_ON = [[.12, .17], [.26, .32], [.39, .47]];
const PUFFS = 16, JEWELS = [0x5fd1ff, 0xff4058, 0xff4058, 0xff4058, 0xff4058];

// The throne's shape at time t (seconds since it started to go): shiver offset amplitude,
// whether it shows as wireframe, and its scale (tall and thin, then nothing).
export function thronePose(t) {
  const shiver = t < VANISH.poof ? .012 * t / VANISH.poof : 0;
  const wire = WIRE_ON.some(([a, b]) => t >= a && t < b);
  const k = clamp01((t - VANISH.poof) / VANISH.collapse);
  const sy = t < VANISH.poof ? 1 : k < .4 ? 1 + .35 * smooth(k / .4) : 1.35 * (1 - smooth((k - .4) / .6));
  const sxz = 1 - smooth(k);
  return {shiver, wire, sx: sxz, sy, sz: sxz, gone: t >= VANISH.poof + VANISH.collapse - 1e-9};
}

// A logic symbol's flight after the poof: out and up, slowing, spinning, fading.
export function glyphFlight(i, t, n = LOGIC.length) {
  const u = clamp01((t - VANISH.poof - .05) / (VANISH.total - VANISH.poof - .35));
  const a = i / n * Math.PI * 2 + (i % 3) * .4, reach = .55 + .25 * ((i * 5) % 4) / 3;
  const out = reach * (1 - (1 - u) ** 2.2);
  return {x: Math.cos(a) * out, y: .55 + .9 * out * (.6 + .4 * ((i * 7) % 3) / 2), z: Math.sin(a) * out,
    alpha: u <= 0 ? 0 : Math.min(1, u * 10) * (1 - smooth((u - .55) / .45)), spin: (i % 2 ? 1 : -1) * u * 4, size: .16 + .05 * Math.sin(u * Math.PI)};
}

export function createThroneVanish(THREE, parent) {
  const live = [];
  const additive = (map, color) => new THREE.SpriteMaterial({map, color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false});
  function add(x, z, seed = 0) {
    const rand = rng(seed + 5);
    const g = new THREE.Group(); g.name = 'ThroneVanish'; g.position.set(x, 0, z); parent.add(g);
    const throne = createThrone(); throne.name = 'Throne (vanishing)'; g.add(throne);
    const wireMat = new THREE.MeshBasicMaterial({color: 0xbfe6ff, wireframe: true, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false});
    const meshes = []; throne.traverse(o => { if (o.isMesh) meshes.push({o, mat: o.material}); });
    const mats = [wireMat];
    const sprite = (mat) => { mats.push(mat); const s = new THREE.Sprite(mat); g.add(s); return s; };
    const flash = sprite(additive(softDot(THREE), 0xffffff)); flash.position.y = .6;
    const ringMat = new THREE.MeshBasicMaterial({map: softRing(THREE), color: 0xd8c8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false});
    const ringGeo = new THREE.PlaneGeometry(1, 1); ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.y = .02; g.add(ring); mats.push(ringMat);
    const puffs = Array.from({length: PUFFS}, (_, i) => {
      const a = rand() * Math.PI * 2, up = rand();
      const mat = new THREE.SpriteMaterial({map: softDot(THREE), color: i % 3 ? 0xf2ecff : 0xd6c8ff, transparent: true, opacity: 0, depthWrite: false});
      return {s: sprite(mat), dir: [Math.cos(a) * (.4 + .5 * rand()), .25 + up * .7, Math.sin(a) * (.4 + .5 * rand())], y0: .15 + up * .7, size: .35 + rand() * .3};
    });
    const glyphs = LOGIC.map(ch => sprite(additive(glyphTexture(THREE, ch), 0xfff0c0)));
    const qed = sprite(additive(glyphTexture(THREE, 'Q.E.D.', 'italic 600 64px Georgia, serif', 256), 0xffffff));
    const jewels = JEWELS.map((c, i) => {
      const a = i / JEWELS.length * Math.PI * 2 + rand();
      const out = .25 + rand() * .2;
      return {s: sprite(additive(softDot(THREE), c)), v: [Math.cos(a) * out, 1.2 + rand() * .6, Math.sin(a) * out], p: [0, .7, 0]};
    });
    live.push({g, throne, meshes, wireMat, flash, ring, puffs, glyphs, qed, jewels, mats, ringGeo, t: 0, rand});
  }
  function step(e, dt) {
    e.t += dt; const t = e.t;
    const pose = thronePose(t);
    if (e.throne && pose.gone) { e.throne.userData.dispose?.(); e.g.remove(e.throne); e.throne = null; }
    if (e.throne) {
      e.throne.position.set((e.rand() - .5) * 2 * pose.shiver, 0, (e.rand() - .5) * 2 * pose.shiver);
      e.throne.scale.set(pose.sx, pose.sy, pose.sz);
      for (const m of e.meshes) m.o.material = pose.wire ? e.wireMat : m.mat;
    }
    const p = t - VANISH.poof;
    e.flash.material.opacity = p < 0 ? 0 : Math.max(0, 1 - p / .28); e.flash.scale.setScalar(.6 + 1.6 * smooth(p / .2));
    const rk = clamp01(p / .55); e.ring.scale.set(.2 + 1.5 * rk, 1, .2 + 1.5 * rk); e.ring.material.opacity = p < 0 ? 0 : .9 * (1 - rk);
    for (const f of e.puffs) {
      const u = clamp01(p / 1.7), out = 1 - (1 - u) ** 3;
      f.s.position.set(f.dir[0] * out * .7, f.y0 + f.dir[1] * out * .6, f.dir[2] * out * .7);
      f.s.scale.setScalar(f.size * (.3 + 1.2 * out));
      f.s.material.opacity = p < 0 ? 0 : .55 * Math.min(1, p / .06) * (1 - smooth(u));
    }
    e.glyphs.forEach((s, i) => { const q = glyphFlight(i, t); s.position.set(q.x, q.y, q.z); s.material.opacity = q.alpha; s.material.rotation = q.spin; s.scale.setScalar(q.size); });
    const qu = clamp01((t - 1.2) / (VANISH.total - 1.2));
    e.qed.position.set(0, .8 + .5 * smooth(qu), 0); e.qed.scale.set(.6, .6, 1);
    e.qed.material.opacity = qu <= 0 ? 0 : Math.min(1, qu * 5) * (1 - smooth((qu - .6) / .4));
    for (const j of e.jewels) {
      if (p < 0) { j.s.material.opacity = 0; continue; }
      j.v[1] -= 5 * dt;
      for (let k = 0; k < 3; k++) j.p[k] += j.v[k] * dt;
      if (j.p[1] < .03 && j.v[1] < 0) { j.p[1] = .03; j.v[1] *= -.35; j.v[0] *= .6; j.v[2] *= .6; }
      j.s.position.set(j.p[0], j.p[1], j.p[2]); j.s.scale.setScalar(.09);
      j.s.material.opacity = 1 - smooth((t - 1.8) / (VANISH.total - 1.8));
    }
    return t < VANISH.total;
  }
  function drop(e) {
    if (e.throne) { e.throne.userData.dispose?.(); }
    for (const m of e.mats) m.dispose(); e.ringGeo.dispose();
    parent.remove(e.g);
  }
  return {
    add,
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}
