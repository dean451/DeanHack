// Armour destroyed on the hero (a scroll of destroy armour, a monster's spell, black dragon breath on a worn piece):
// the piece greys to ash and comes apart. do_wear.c destroy_arm() says which piece went and how, and each gets its
// own way of going:
// - cloak "crumbles and turns to dust": ash pours down the back and settles;
// - suit "turns to dust and falls to the floor": the body sheds a heap that lands round the feet;
// - shirt "crumbles into tiny threads and falls apart": light threads flutter down;
// - helm "turns to dust and is blown away": the head's dust is caught by a gust and carried off;
// - gloves "vanish": a quick glitter at the hands;
// - boots "disintegrate": the feet crumble and sink into a low drift;
// - shield "crumbles away": the shield arm sheds its dust.
// The dust is sampled from the hero's own meshes in that piece's place, coloured like them, so it reads as the
// armour itself. The model is a class outfit, not the worn kit, so the piece is not hidden afterwards: it flashes
// to ash while the dust leaves, then its colour comes back. Particles only, no lights; everything is disposed.
import * as THREE from 'three';

// [pattern, slot] for the lines destroy_arm() prints ("Your %s ..."); the slot names the band and the motion
const LINES = [
  [/^Your .+ crumbles and turns to dust!/, 'cloak'],
  [/^Your .+ turns? to dust and falls? to the /, 'suit'],
  [/^Your shirt crumbles into tiny threads and falls apart!/, 'shirt'],
  [/^Your .+ turns to dust and is blown away!/, 'helm'],
  [/^Your .+ vanish!/, 'gloves'],
  [/^Your .+ disintegrate!/, 'boots'],
  [/^Your .+ crumbles away!/, 'shield'],
];
// where each piece sits (0 feet .. 1 crown of the hero), which part it comes from, and how its dust moves
export const SLOTS = {
  cloak: {band: [.35, .9], motion: 'fall', life: 2.2},
  suit: {band: [.3, .8], motion: 'fall', life: 2.6},
  shirt: {band: [.42, .74], motion: 'flutter', life: 2.2},
  helm: {band: [.84, 1.01], motion: 'blow', life: 1.8},
  gloves: {band: [0, .66], parts: ['elbow', 'shieldElbow'], motion: 'vanish', life: .9},
  boots: {band: [-.01, .17], motion: 'sink', life: 1.8},
  shield: {band: [0, 1.01], parts: ['shieldArm'], motion: 'fall', life: 2},
};
export const armourDust = text => { const s = String(text ?? '').trim();for (const [re, slot] of LINES) if (re.test(s)) return slot;return null; };

const ASH = new THREE.Color(0x8d877c), MAX = 420, TRIES = 2400;
const skip = o => !o.isMesh || !o.visible || !o.material || Array.isArray(o.material) || o.userData.outline || o.material.transparent || !o.geometry?.attributes?.position;
// ash tint over a crumble: up fast, a short hold, back slower (0..1)
export const ashAt = (t, life) => { const up = .3, hold = .25, down = Math.max(.3, life * .35);return t < 0 ? 0 : t < up ? t / up : t < up + hold ? 1 : Math.max(0, 1 - (t - up - hold) / down); };

// the meshes of a piece and the hero's height span; rnd for tests
function gather(hero, slot) {
  const g = hero.g, roots = slot.parts ? slot.parts.map(k => hero.parts?.[k]).filter(Boolean) : [];
  const from = roots.length ? roots : [g], meshes = [], seen = new Set();
  g.updateMatrixWorld(true);
  const box = new THREE.Box3(), whole = new THREE.Box3();
  g.traverse(o => { if (skip(o)) return;if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();whole.union(box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld)); });
  for (const r of from) r.traverse(o => { if (skip(o) || seen.has(o)) return;seen.add(o);meshes.push(o); });
  return {meshes, lo: whole.min.y, hi: whole.max.y};
}

export function createArmourDust(THREE_, parent, {rnd = Math.random} = {}) {
  let fx = null;
  const v = new THREE.Vector3();
  function stop() {
    if (!fx) return;
    for (const s of fx.tinted) { s.m.color.copy(s.color);if (s.o.material === s.m) { s.o.material = s.mat;s.m.dispose(); } }
    parent.remove(fx.points);fx.points.geometry.dispose();fx.points.material.dispose();fx = null;
  }
  return {
    get active() { return !!fx; },
    get count() { return fx ? fx.n : 0; },
    // text: a message line; hero: the live hero (g, parts). True when it started a crumble.
    message(text, hero) {
      const name = armourDust(text);if (!name || !hero?.g) return false;
      const slot = SLOTS[name], {meshes, lo, hi} = gather(hero, slot), span = hi - lo > 1e-6 ? hi - lo : 1;
      if (!meshes.length) return false;
      stop();
      const total = meshes.reduce((a, o) => a + o.geometry.attributes.position.count, 0);
      const pos = [], col = [], vel = [], wait = [], tinted = [], tint = new Set(), c = new THREE.Color();
      for (let i = 0; i < TRIES && pos.length / 3 < MAX; i++) {
        let pick = rnd() * total, o = meshes[0];
        for (const m of meshes) { const n = m.geometry.attributes.position.count;if (pick < n) { o = m;break; }pick -= n; }
        const attr = o.geometry.attributes.position, k = Math.min(attr.count - 1, Math.floor(rnd() * attr.count));
        v.fromBufferAttribute(attr, k).applyMatrix4(o.matrixWorld);
        const h = (v.y - lo) / span;if (h < slot.band[0] || h > slot.band[1]) continue;
        tint.add(o);parent.worldToLocal(v);pos.push(v.x, v.y, v.z);
        c.copy(o.material.color ?? ASH).lerp(ASH, .45);if (slot.motion === 'vanish') c.lerp(new THREE.Color(1, 1, 1), .4);col.push(c.r, c.g, c.b);
        // dust leaves the top of the piece first (the bottom first for boots, all at once for gloves)
        wait.push(slot.motion === 'vanish' ? rnd() * .15 : .25 + (slot.motion === 'sink' ? h : 1 - (h - slot.band[0]) / (slot.band[1] - slot.band[0])) * .5 + rnd() * .15);
        const a = rnd() * Math.PI * 2;vel.push(Math.cos(a) * (.05 + rnd() * .25), rnd() * .25, Math.sin(a) * (.05 + rnd() * .25));
      }
      if (!pos.length) return false;
      for (const o of tint) { const mat = o.material, m = mat.clone();o.material = m;tinted.push({o, mat, m, color: m.color?.clone() ?? new THREE.Color(1, 1, 1)}); }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      const mat = new THREE.PointsMaterial({size: slot.motion === 'flutter' ? .022 : .034, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true});
      const points = new THREE.Points(geo, mat);points.frustumCulled = false;points.name = 'armourDust';parent.add(points);
      const floor = v.set(0, lo, 0);parent.worldToLocal(floor);
      const wind = rnd() * Math.PI * 2;
      fx = {points, slot, n: pos.length / 3, vel, wait, tinted, t: 0, floor: floor.y + .01, wind: [Math.cos(wind), Math.sin(wind)]};
      return true;
    },
    update(dt) {
      if (!fx) return;
      fx.t += Math.min(dt, .1);const {t, slot, vel, wait, floor, wind} = fx, attr = fx.points.geometry.attributes.position, d = Math.min(dt, .1);
      if (t >= slot.life) { stop();return; }
      const f = ashAt(t, slot.life);for (const s of fx.tinted) s.m.color.copy(s.color).lerp(ASH, f * .8);
      for (let i = 0; i < fx.n; i++) {
        if (t < wait[i]) continue;
        let x = attr.getX(i), y = attr.getY(i), z = attr.getZ(i), j = i * 3;
        if (slot.motion === 'blow') { vel[j] += wind[0] * 2.4 * d;vel[j + 2] += wind[1] * 2.4 * d;vel[j + 1] += (.5 - .3 * Math.sin(t * 6 + i)) * d; }
        else if (slot.motion === 'flutter') { vel[j + 1] = Math.max(vel[j + 1] - 1.1 * d, -.45);vel[j] += Math.sin(t * 7 + i) * .6 * d;vel[j + 2] += Math.cos(t * 6 + i * 1.3) * .6 * d; }
        else if (slot.motion === 'vanish') { vel[j + 1] += .5 * d; }
        else vel[j + 1] -= (slot.motion === 'sink' ? 1.2 : 3.4) * d;
        x += vel[j] * d;y += vel[j + 1] * d;z += vel[j + 2] * d;
        if (y < floor) { y = floor;vel[j + 1] = 0;vel[j] *= .8;vel[j + 2] *= .8; } // settles in a heap round the feet
        attr.setXYZ(i, x, y, z);
      }
      attr.needsUpdate = true;
      const left = slot.life - t;fx.points.material.opacity = slot.motion === 'vanish' ? Math.max(0, 1 - t / slot.life) : Math.min(1, left / (slot.life * .4));
    },
    clear: stop,
  };
}
