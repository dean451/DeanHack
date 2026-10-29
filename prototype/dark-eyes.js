// Eyes in the dark. A monster the frame puts on a cell the hero cannot see (`cell.visible` false:
// the hero knows it is there by infravision, telepathy or detection, not by light) is a shape in
// the dark: a pair of eye glints over it and a soft shadow over its body (thinner when the screen
// is already under the darkness veil, darkness.js). At first the shadow is thick, so
// the eyes are what reads; over SETTLE seconds it thins so the shape still shows, because the
// engine does show the hero which monster it is. The moment its cell is in sight again the eyes and
// shadow go, and the monster is drawn as before.
//
// Nothing here changes the monster's own materials (no clones, no fade, no batching changes): the
// glints and the shadow are sprites hung on the monster's group, sharing two textures. A monster
// that is hidden (the unseen-monster marker) gets none. At most EYES_MAX monsters carry them.

import {VEIL_ORDER} from './darkness.js';

export const EYES_MAX = 12;
// Shadow opacity when the monster first sinks into the dark, and where it settles after SETTLE s;
// under the veil, which already darkens it, the shadow is VEILED times as thick.
export const SHADOW_FIRST = .9, SHADOW_KEEP = .5, SETTLE = 1.6, VEILED = .5;
// Glint size (world units) and how fast eyes and shadow come and go (1/s).
export const GLINT = .13, FADE_IN = 5, FADE_OUT = 7;
export const HOSTILE_GLINT = 0xffa040, CALM_GLINT = 0xc8e0b0;

// True when the frame puts this monster cell in the dark: perceived, but its square is not in sight.
export const inDark = cell => !!cell && (cell.kind === 'monster' || cell.kind === 'pet') && !cell.visible && !cell.invisible;

function glowTexture(THREE, stops) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d'), g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (const [at, col] of stops) g.addColorStop(at, col);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// Where a creature's eyes are, in its own group's space: the front of its head when the actor
// names one, else near the top front of its body. Measured once, when it first goes dark.
export function eyeSpot(actor, THREE) {
  const g = actor.g, inv = new THREE.Matrix4(), m = new THREE.Matrix4(), box = new THREE.Box3(), part = new THREE.Box3();
  g.updateWorldMatrix(true, true); inv.copy(g.matrixWorld).invert();
  const measure = root => { box.makeEmpty(); root.traverse(o => {
    if (!o.isMesh || !o.geometry || o.userData.ring || o.userData.outline || o.userData.darkEyes) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    part.copy(o.geometry.boundingBox).applyMatrix4(m.multiplyMatrices(inv, o.matrixWorld)); box.union(part);
  }); return !box.isEmpty(); };
  const head = actor.head?.isObject3D ? actor.head : null;
  if (head && measure(head)) {
    const w = box.max.x - box.min.x, h = box.max.y - box.min.y;
    return {x: (box.min.x + box.max.x) / 2, y: box.min.y + h * .6, z: box.max.z + .02, spread: Math.min(.09, Math.max(.03, w * .22)), height: null, size: Math.min(1, Math.max(.6, w * 3))};
  }
  if (!measure(g)) return {x: 0, y: .5, z: .15, spread: .05, height: .7, size: .8};
  const w = box.max.x - box.min.x, h = box.max.y - box.min.y;
  return {x: (box.min.x + box.max.x) / 2, y: box.max.y - h * .16, z: box.max.z * .85 + .02, spread: Math.min(.09, Math.max(.03, w * .12)), height: h, size: Math.min(1.2, Math.max(.6, h))};
}

export function createDarkEyes(THREE) {
  const glintTex = glowTexture(THREE, [[0, 'rgba(255,255,255,1)'], [.25, 'rgba(255,255,255,.85)'], [.6, 'rgba(255,255,255,.15)'], [1, 'rgba(255,255,255,0)']]);
  const shadowTex = glowTexture(THREE, [[0, 'rgba(0,0,0,1)'], [.55, 'rgba(0,0,0,.85)'], [1, 'rgba(0,0,0,0)']]);
  const glintMat = col => new THREE.SpriteMaterial({map: glintTex, color: col, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false, transparent: true});
  const glints = {hostile: glintMat(HOSTILE_GLINT), calm: glintMat(CALM_GLINT)};
  const worn = new Set(); // actors carrying eyes now

  function attach(actor) {
    const spot = eyeSpot(actor, THREE), rig = new THREE.Group();
    rig.name = 'dark eyes'; rig.userData.darkEyes = true;
    const calm = actor.darkCalm ? glints.calm : glints.hostile;
    const eyes = [-1, 1].map(s => { const e = new THREE.Sprite(calm); e.position.set(spot.x + s * spot.spread, spot.y, spot.z); e.renderOrder = VEIL_ORDER + 2; e.userData.darkEyes = true; rig.add(e); return e; });
    const shadowMat = new THREE.SpriteMaterial({map: shadowTex, color: 0x000000, transparent: true, depthTest: false, depthWrite: false, opacity: 0, toneMapped: false});
    const shadow = new THREE.Sprite(shadowMat);
    const bodyH = spot.height ?? spot.y * 1.1;
    shadow.position.set(spot.x, bodyH * .5, 0); shadow.scale.set(Math.max(.7, bodyH * 1.15), Math.max(.7, bodyH * 1.3), 1);
    shadow.renderOrder = VEIL_ORDER + 1; shadow.userData.darkEyes = true; rig.add(shadow);
    rig.userData.dispose = () => shadowMat.dispose();
    actor.g.add(rig);
    actor.darkEyes = {rig, eyes, shadow, b: 0, age: 0, size: spot.size, seed: (actor.g.id * 7.31) % 6.28};
    worn.add(actor);
  }
  function drop(actor) {
    const d = actor?.darkEyes;
    if (!d) return;
    d.rig.removeFromParent(); d.shadow.material.dispose();
    actor.darkEyes = null; worn.delete(actor);
  }
  return {
    glints, worn,
    get count() { return worn.size; },
    // Mark an actor from its cell this frame (live.js apply): in the dark or not, calm or hostile.
    mark(actor, cell) { actor.inDark = inDark(cell); actor.darkCalm = cell?.kind === 'pet' || !!cell?.peaceful; },
    drop,
    // Per frame: grow eyes on actors newly in the dark (up to EYES_MAX), fade them on the rest.
    // veiled: the darkness veil is up and already darkens the body, so its shadow is thinner.
    update(actors, dt, t, {veiled = false} = {}) {
      dt = Math.max(0, dt || 0);
      const seen = new Set();
      for (const a of actors) {
        seen.add(a);
        const want = !!a.inDark && a.g?.visible !== false && !a.actions?.dead;
        if (want && !a.darkEyes && worn.size < EYES_MAX) attach(a);
        const d = a.darkEyes;
        if (!d) continue;
        d.b += ((want ? 1 : 0) - d.b) * (1 - Math.exp(-(want ? FADE_IN : FADE_OUT) * dt));
        if (!want && d.b < .02) { drop(a); continue; }
        d.age = want ? d.age + dt : 0;
        // A slow blink now and then, each creature on its own beat.
        const beat = (t * .37 + d.seed) % 4.3, blink = beat < .14 ? Math.abs(beat - .07) / .07 : 1;
        const s = GLINT * d.size * d.b;
        for (const e of d.eyes) e.scale.set(s, s * Math.max(.08, blink), 1);
        const settle = Math.min(1, d.age / SETTLE), thick = SHADOW_FIRST + (SHADOW_KEEP - SHADOW_FIRST) * settle * settle * (3 - 2 * settle);
        d.shadow.material.opacity = thick * d.b * (veiled ? VEILED : 1);
        d.shadow.visible = d.shadow.material.opacity > .01;
      }
      for (const a of [...worn]) if (!seen.has(a)) drop(a);
    },
    clear() { for (const a of [...worn]) drop(a); },
  };
}
