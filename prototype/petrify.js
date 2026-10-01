// Turning to stone (the bridge's `stoned` death: two weeping angels locking eyes, a cockatrice's
// touch). deaths.js's 'petrify' style gasps and holds; this module does the rest:
//  - applyStone(actor, k): stone creeps up the body from the feet as k goes 0 → 1. Each mesh's
//    material (cloned per actor) greys to statue stone, goes matte and loses its glow once the
//    stone reaches its height. The idle motion the frame loop keeps writing (the wing beat, the
//    hover bob, the tail swing) is held still as it sets.
//  - createPetrify().adopt(actors, cell, x, z): when the statue object shows up on the square,
//    the stoned body itself becomes the statue (same model, same pose and facing) instead of a
//    fresh sculpture, and plays out whatever is left of its death. update(dt) runs those.
import * as THREE from 'three';
import {clearActionPose, updateActions} from './actions.js';

// The statue stone (as live.js's statues), the band (in body heights) over which a mesh turns,
// and how far the stone has to climb past the top.
export const STONE = new THREE.Color(0x898b86), STONE_DARK = new THREE.Color(0x777b78), BAND = .35;
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

const skip = o => !o.isMesh || !o.material || Array.isArray(o.material) || o.userData.outline || o.userData.ring;

// Captures each mesh's material and height (0 feet .. 1 top) and the parts to hold still.
function capture(actor) {
  const g = actor.g, box = new THREE.Box3(), inv = new THREE.Matrix4(), c = new THREE.Vector3(), saved = [];
  g.updateMatrixWorld(true);
  inv.copy(g.matrixWorld).invert();
  const ys = [];
  g.traverse(o => {
    if (skip(o)) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
    ys.push([o, box.getCenter(c).y]);
  });
  let lo = Infinity, hi = -Infinity;
  for (const [, y] of ys) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
  const span = hi - lo > 1e-6 ? hi - lo : 1;
  ys.forEach(([o, y], i) => {
    const mat = o.material, m = mat.clone();
    saved.push({o, mat, m, h: (y - lo) / span, color: m.color?.clone() ?? null, emissive: m.emissive?.clone() ?? null,
      ei: m.emissiveIntensity ?? 0, rough: m.roughness, metal: m.metalness, stone: i % 2 ? STONE_DARK : STONE});
    o.material = m;
  });
  const hold = [];
  const keep = (obj, prop, axis) => obj && hold.push({obj, prop, axis, v: obj[prop][axis]});
  for (const w of actor.wings || []) { keep(w, 'rotation', 'y'); if (actor.quirk === 'bat' || actor.flap) keep(w, 'rotation', 'z'); }
  keep(actor.body, 'position', 'y');
  if (actor.tail) keep(actor.tail, 'rotation', 'z');
  return {saved, hold, k: 0};
}

// How far stone has reached a mesh at height h (0..1) when the whole is k along.
export const stoneAt = (k, h) => smooth((k * (1 + BAND) - h) / BAND);

export function applyStone(actor, k) {
  if (!actor?.g) return;
  k = clamp01(Number.isFinite(k) ? k : 0);
  if (!actor.stone) { if (!(k > 0)) return; actor.stone = capture(actor); }
  const st = actor.stone;
  st.k = Math.max(st.k, k);
  for (const s of st.saved) {
    const f = stoneAt(st.k, s.h), m = s.m;
    if (s.color) m.color.copy(s.color).lerp(s.stone, f);
    if (s.emissive) m.emissive.copy(s.emissive).multiplyScalar(1 - f);
    if ('emissiveIntensity' in m) m.emissiveIntensity = s.ei * (1 - f);
    if (Number.isFinite(s.rough)) m.roughness = s.rough + (.98 - s.rough) * f;
    if (Number.isFinite(s.metal)) m.metalness = s.metal * (1 - f);
    // vertex colours and textures would show through the grey; drop them once it's stone
    if (f > .97 && (m.vertexColors || m.map)) { m.vertexColors = false; m.map = null; m.needsUpdate = true; }
  }
  const hold = smooth(st.k / .6);
  for (const p of st.hold) p.obj[p.prop][p.axis] += (p.v - p.obj[p.prop][p.axis]) * hold;
}

// Puts the shared materials back (a monster saved from stoning).
export function restoreStone(actor) {
  if (!actor?.stone) return;
  for (const s of actor.stone.saved) { s.m.dispose(); s.o.material = s.mat; }
  actor.stone = null;
}

const isStatue = cell => (cell?.object?.kind === 'statue' || /statue/i.test(cell?.object?.name || '')) && !!cell.object?.creature;

export function createPetrify({onBurst = null} = {}) {
  const adopted = new Set();
  // The stoned actor standing on (x, z) for a statue cell, taken over as the statue: returns
  // the icon group (to be placed at x, 0, z), or null.
  function adopt(actors, cell, x, z) {
    if (!isStatue(cell) || !actors) return null;
    const want = String(cell.object.creature).toLowerCase();
    let a = null;
    for (const c of actors.values()) {
      const q = c.actions, die = q?.current?.kind === 'die' ? q.current : q?.queue?.find(d => d.kind === 'die');
      if (!q?.dead || die?.style !== 'petrify' || !c.g?.parent) continue;
      if (c.species && c.species !== want) continue;
      const p = c.target ?? c.g.position;
      if (Math.hypot(p.x - x, p.z - z) < .6) { a = c; break; }
    }
    if (!a) return null;
    const g = a.g, icon = new THREE.Group(), drop = [];
    g.parent.remove(g);
    // the label and the disposition ring belong to the monster, not the statue
    g.traverse(o => { if (o.isSprite || o.userData.ring) drop.push(o); });
    for (const o of drop) { o.userData.dispose?.(); o.parent?.remove(o); }
    g.position.x -= x; g.position.z -= z;
    icon.add(g);
    icon.name = `Stone statue of ${cell.object.creature}`;
    icon.userData.restingWeapon = true;
    // the actor keeps an empty group, so live.js releases it without touching the statue
    a.g = new THREE.Group();
    const rec = {actor: {...a, g}, icon};
    // what's left behind stays dead (so it's never matched to a live monster) and owns nothing
    a.actions = {queue: [], current: null, age: 0, applied: null, dead: true, finished: true};
    a.stone = null;
    if (!rec.actor.actions.current && !rec.actor.actions.queue.length) applyStone(rec.actor, 1);
    else adopted.add(rec);
    icon.userData.dispose = () => { adopted.delete(rec); restoreStone(rec.actor); };
    return icon;
  }
  // Plays out what's left of each adopted statue's death.
  function update(dt) {
    for (const rec of adopted) {
      const {actor, icon} = rec, q = actor.actions;
      if (!icon.parent) { adopted.delete(rec); continue; }
      clearActionPose(actor, q);
      updateActions(actor, q, dt);
      if (q.deathBurst) {
        if (onBurst) { icon.updateMatrixWorld(true); onBurst(q.deathBurst, actor.g.getWorldPosition(new THREE.Vector3()), actor); }
        q.deathBurst = null;
      }
      if (q.finished) { applyStone(actor, 1); adopted.delete(rec); }
    }
    return adopted.size;
  }
  return {adopt, update, get size() { return adopted.size; }};
}
