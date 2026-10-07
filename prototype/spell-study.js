// "You begin to memorize the runes." Opening a spellbook: faint runes peel off the page and
// hang round the hero's head, circling and hesitating as if unsure they were invited, then
// are dragged inward one by one, and the last one lingers, guttering, after the rest are gone.
// Under two seconds. Learning costs something, and it shows in how reluctantly they go.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's square),
// update(dt) every frame and clear() on a level change. Poses are functions of t and return
// exactly to rest (nothing showing) at the end.

import {glyphTexture, clamp01, smooth} from './fx-textures.js';

export const STUDY = {runes: 5, total: 1.8};
export const RUNES = ['∴', '≡', '⊢', '∨', '∃'];
export const isStudyMessage = text => /you begin to (?:memorize|recite) the runes/i.test(text || '');

// Rune i: rises off the floor in front of the hero, circles at head height, hesitates (it
// stalls for a beat, then lurches), then spirals into the hero's head. Later runes go last.
export function runePose(i, t) {
  const n = STUDY.runes, born = i * .07, pull = .7 + i * .12, end = pull + .35;
  if (t <= born || t >= Math.min(STUDY.total, end + (i === n - 1 ? .25 : 0))) return {x: 0, y: 0, z: 0, alpha: 0, spin: 0};
  const rise = smooth((t - born) / .3), draw = smooth((t - pull) / .35);
  // The orbit stalls twice, then lurches on.
  const stalled = t - born - .12 * Math.sin((t - born) * 9) ** 2;
  // Each rune flinches outward as the one before it is dragged in, as if it had seen what is coming.
  const flinch = i > 0 ? .22 * Math.sin(clamp01((t - (.7 + (i - 1) * .12 + .15)) / .14) * Math.PI) : 0;
  const a = i / n * Math.PI * 2 + stalled * 3.2, r = (.38 - .06 * i / n) * (1 - draw) * rise * (1 + flinch);
  const last = i === n - 1 && t > end, gutter = last ? .5 + .5 * Math.sin(t * 70) : 1;
  // Rune 2 loses its nerve: it bolts for the floor just before the pull, then is hauled back up.
  const bolt = i === 2 ? .14 * Math.sin(clamp01((t - (pull - .22)) / .22) * Math.PI) : 0;
  return {x: Math.cos(a) * r, y: Math.max(.2 + .75 * rise + .1 * draw - bolt, 0), z: Math.sin(a) * r,
    alpha: .8 * clamp01((t - born) / .12) * (1 - (last ? clamp01((t - end) / .25) : draw ** 2)) * gutter, spin: a * .5};
}

export function createSpellStudy(THREE, parent) {
  const live = [];
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'SpellStudy'; g.position.set(x, 0, z); parent.add(g);
    const mats = [], runes = RUNES.map((ch, i) => {
      const m = new THREE.SpriteMaterial({map: glyphTexture(THREE, ch), color: i % 2 ? 0xc8a0ff : 0x9a68d8, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false});
      mats.push(m); const s = new THREE.Sprite(m); s.scale.setScalar(.15); g.add(s); return s;
    });
    live.push({g, mats, runes, t: 0});
  }
  function step(e, dt) {
    e.t += Math.max(dt || 0, 0);
    e.runes.forEach((s, i) => { const p = runePose(i, e.t); s.visible = p.alpha > .01; s.position.set(p.x, p.y, p.z); s.material.opacity = p.alpha; s.material.rotation = p.spin; });
    return e.t < STUDY.total;
  }
  function drop(e) { e.mats.forEach(m => m.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z) { if (isStudyMessage(text) && Number.isFinite(x) && Number.isFinite(z)) add(x, z); },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}
