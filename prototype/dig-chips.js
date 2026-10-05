// Digging flavor, step one: rock chips and dust fly off with each blow. dig.c reports the
// work as messages ("You hit the rock with all your might." for every dig started, then "You
// dig a pit in the floor.", "You dig a hole through the floor.", "You succeed in cutting away
// some rock.", "You make an opening in the wall."), so this keys on those and bursts from the
// hero's square. A blow throws a few grey chips that tumble and bounce once; the finishing
// strikes throw more, and a pit or hole adds a low ring of dust. One Points cloud holds every
// burst (capped), so the cost is a single draw.
//
// live.js calls message(text, x, z) with the hero's tile, update(dt) every frame and clear()
// on a level change. Nothing here reveals anything the hero does not already know.

import {clamp01, smooth, rng} from './fx-textures.js';

export const MAX_BURSTS = 4, CHIPS = 14;
// How each message looks: chips thrown, how hard, how long (s) the burst lives and a dust ring.
export const DIG_LOOKS = {
  blow: {chips: 6, speed: 1.3, life: .7, dust: 0},
  pit: {chips: 10, speed: 1.5, life: .95, dust: 1},
  hole: {chips: CHIPS, speed: 1.8, life: 1.2, dust: 1},
  breach: {chips: CHIPS, speed: 2, life: 1.1, dust: 1},
};

export function digMessage(text) {
  if (typeof text !== 'string') return null;
  if (/^You hit the .+ with all your might\.$/.test(text)) return 'blow';
  if (/^You dig a pit in the /.test(text)) return 'pit';
  if (/^You dig a hole through the /.test(text)) return 'hole';
  if (/^You succeed in cutting away some rock\.$|^You make an opening in the wall\.$/.test(text)) return 'breach';
  return null;
}

const GRAVITY = 6;
// Chip i of a burst at age t (s): position about the hero's feet, a size and an alpha. Chips
// leave low from the front of the tile, arc up and fall back, bounce once and fade.
export function chipFlight(kind, seed, i, t) {
  const look = DIG_LOOKS[kind] ?? DIG_LOOKS.blow;
  if (!(t >= 0) || t >= look.life || i >= look.chips) return null;
  const r = rng(seed * 31 + i * 7 + 1);
  const a = r() * Math.PI * 2, sp = look.speed * (.4 + .6 * r()), up = 1 + 1.4 * r();
  let y = .35 + up * t - .5 * GRAVITY * t * t;
  if (y < .03) {
    // landed: one small hop, half the speed it came down with, then rest on the floor
    const hop = t - (up + Math.sqrt(up * up + 2 * GRAVITY * .32)) / GRAVITY;
    y = .03 + Math.max(0, .5 * up * hop - .5 * GRAVITY * hop * hop * .5) * .4;
  }
  const drag = 1 - Math.exp(-3 * t);
  return {x: Math.cos(a) * sp * drag / 3, y, z: Math.sin(a) * sp * drag / 3,
    size: .028 + .02 * r(), alpha: 1 - smooth((t / look.life - .55) / .45), grey: .35 + .3 * r()};
}

export function createDigChips(THREE, parent) {
  const N = MAX_BURSTS * CHIPS;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setDrawRange(0, 0);
  const points = new THREE.Points(geo, new THREE.PointsMaterial({size: .05, vertexColors: true, transparent: true,
    depthWrite: false, toneMapped: false}));
  points.frustumCulled = false; points.renderOrder = 3; points.userData.part = 'dig-chips';
  parent.add(points);
  const ringGeo = new THREE.RingGeometry(.9, 1, 20).rotateX(-Math.PI / 2);
  const bursts = [];
  let count = 0;

  function drop(b) { if (b.ring) { parent.remove(b.ring); b.ring.material.dispose(); } }
  function add(kind, x, z) {
    if (!DIG_LOOKS[kind] || !Number.isFinite(x) || !Number.isFinite(z)) return null;
    const b = {kind, x, z, t: 0, seed: ++count, ring: null};
    if (DIG_LOOKS[kind].dust) {
      b.ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({color: 0x9a8f80, transparent: true, opacity: 0,
        depthWrite: false, side: THREE.DoubleSide}));
      b.ring.position.set(x, .03, z); b.ring.renderOrder = 2;
      parent.add(b.ring);
    }
    bursts.push(b);
    if (bursts.length > MAX_BURSTS) drop(bursts.shift());
    return b;
  }
  const message = (text, x, z) => { const k = digMessage(text); return k ? add(k, x, z) : null; };

  function update(dt) {
    let n = 0;
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.t += Math.min(Math.max(dt || 0, 0), .1);
      if (b.t >= DIG_LOOKS[b.kind].life) { drop(b); bursts.splice(i, 1); }
    }
    for (const b of bursts) {
      const look = DIG_LOOKS[b.kind];
      for (let i = 0; i < look.chips; i++) {
        const c = chipFlight(b.kind, b.seed, i, b.t);
        if (!c) continue;
        pos[n * 3] = b.x + c.x; pos[n * 3 + 1] = c.y; pos[n * 3 + 2] = b.z + c.z;
        const g = c.grey * c.alpha;
        col[n * 3] = g * 1.05; col[n * 3 + 1] = g; col[n * 3 + 2] = g * .9;
        n++;
      }
      if (b.ring) {
        const k = clamp01(b.t / look.life);
        b.ring.scale.setScalar(.12 + .5 * smooth(k));
        b.ring.material.opacity = .4 * (1 - k) * Math.min(1, b.t * 8);
      }
    }
    geo.setDrawRange(0, n);
    geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = true;
    return {bursts: bursts.length, chips: n};
  }
  const clear = () => { while (bursts.length) drop(bursts.pop()); update(0); };
  const dispose = () => { clear(); parent.remove(points); geo.dispose(); points.material.dispose(); ringGeo.dispose(); };
  return {add, message, update, clear, dispose};
}
