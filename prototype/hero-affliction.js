// The deadly countdowns, on the hero. The status screen already closes in for stoning, sliming and strangulation
// (status-screen.js); this puts them on the body too, paced by the turns the bridge says are left
// (`player.countdowns`: stone, slime, strngl):
// - stoning turns the hero grey from the feet up, the front climbing each turn, the colour and shine going out of
//   whatever it covers (the same front a petrified monster uses, petrify.js);
// - sliming creeps a sick green up the body the same way, with a wet sheen;
// - strangling makes the hero gasp: the head jerks back and the shoulders hunch, harder each turn.
// A cure (the countdown gone from the frame) puts every material and pose back.
import * as THREE from 'three';
import {STONE, STONE_DARK, stoneAt} from './petrify.js';

export const SLIME = new THREE.Color(0x6fae2e), SLIME_DARK = new THREE.Color(0x4d8a1f), SLIME_GLOW = new THREE.Color(0x2a4a08);
const skip = o => !o.isMesh || !o.material || Array.isArray(o.material) || o.userData.outline || o.userData.ring || o.material.transparent;

// How far along a countdown is (0 at its first turn, 1 at the last): turns left against the most it has shown.
export function progress(left, most) { return most > 1 ? Math.min(1, Math.max(0, (most - left) / (most - 1))) : most === 1 ? 1 : 0; }

function capture(g) {
  const box = new THREE.Box3(), inv = new THREE.Matrix4(), c = new THREE.Vector3(), list = [];
  g.updateMatrixWorld(true);inv.copy(g.matrixWorld).invert();
  g.traverse(o => { if (skip(o)) return;if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld).applyMatrix4(inv);list.push([o, box.getCenter(c).y]); });
  let lo = Infinity, hi = -Infinity;for (const [, y] of list) { lo = Math.min(lo, y);hi = Math.max(hi, y); }
  const span = hi - lo > 1e-6 ? hi - lo : 1;
  return list.map(([o, y], i) => { const mat = o.material, m = mat.clone();o.material = m;return {o, mat, m, h: (y - lo) / span, i, color: m.color?.clone() ?? null, emissive: m.emissive?.clone() ?? null, ei: m.emissiveIntensity ?? 0, rough: m.roughness, metal: m.metalness}; });
}

// One covering (stone or slime): the front climbs to k (never back down while it lasts).
function cover(kind) {
  let saved = null, k = 0;
  return {
    get active() { return !!saved; },
    set(g, next) {
      if (!saved) { saved = capture(g);k = 0; }
      k = Math.max(k, next);
      for (const s of saved) {
        const f = stoneAt(k, s.h), m = s.m, dark = s.i % 2;
        if (kind === 'stone') {
          if (s.color) m.color.copy(s.color).lerp(dark ? STONE_DARK : STONE, f);
          if (s.emissive) m.emissive.copy(s.emissive).multiplyScalar(1 - f);
          if ('emissiveIntensity' in m) m.emissiveIntensity = s.ei * (1 - f);
          if (Number.isFinite(s.rough)) m.roughness = s.rough + (.98 - s.rough) * f;
          if (Number.isFinite(s.metal)) m.metalness = s.metal * (1 - f);
        } else {
          if (s.color) m.color.copy(s.color).lerp(dark ? SLIME_DARK : SLIME, f * .85);
          if (s.emissive) m.emissive.copy(s.emissive).lerp(SLIME_GLOW, f);
          if ('emissiveIntensity' in m) m.emissiveIntensity = s.ei + (.6 - s.ei) * f;
          if (Number.isFinite(s.rough)) m.roughness = s.rough + (.25 - s.rough) * f; // wet
        }
      }
    },
    clear() { if (!saved) return;for (const s of saved) { s.m.dispose();s.o.material = s.mat; }saved = null;k = 0; },
  };
}

export function createHeroAffliction() {
  const stone = cover('stone'), slime = cover('slime'), most = {};
  let gasp = {head: 0, body: 0}, heroRef = null;
  const unpose = () => {
    if (!heroRef) return;
    const head = heroRef.head ?? heroRef.parts?.head;if (head) head.rotation.x -= gasp.head;
    if (heroRef.body) heroRef.body.rotation.x -= gasp.body;
    gasp = {head: 0, body: 0};
  };
  return {
    get stoning() { return stone.active; },
    get sliming() { return slime.active; },
    // takes last frame's gasp off, before the frame's own poses are written (live-frame.js calls it first)
    unpose,
    // countdowns: the frame's player.countdowns ({stone, slime, strngl}: turns left), or null; called last in the frame
    update(hero, countdowns, t) {
      unpose();heroRef = hero;
      if (!hero?.g) return;
      const cd = countdowns && typeof countdowns === 'object' ? countdowns : {};
      for (const key of ['stone', 'slime', 'strngl']) { if (Number.isFinite(cd[key])) most[key] = Math.max(most[key] ?? 0, cd[key]);else delete most[key]; }
      if (Number.isFinite(cd.stone)) stone.set(hero.g, progress(cd.stone, most.stone));else stone.clear();
      if (Number.isFinite(cd.slime)) slime.set(hero.g, progress(cd.slime, most.slime));else slime.clear();
      if (Number.isFinite(cd.strngl)) {
        // a gasp every ~1.3 s: a sharp pull back, a slack beat; deeper as the turns run out
        const k = progress(cd.strngl, most.strngl), beat = (t % 1.3) / 1.3, pull = beat < .25 ? Math.sin(beat / .25 * Math.PI) : 0;
        gasp = {head: -.35 * pull * (.4 + .6 * k), body: .18 * pull * (.4 + .6 * k)};
        const head = hero.head ?? hero.parts?.head;if (head) head.rotation.x += gasp.head;
        if (hero.body) hero.body.rotation.x += gasp.body;
      }
    },
    clear() { unpose();stone.clear();slime.clear();for (const k of Object.keys(most)) delete most[k]; },
  };
}
