// Dragon breath (motion queue item 15, part 5). A monster's breath is an ordinary zap
// beam in the fx stream (buzz() uses the same glyphs as a wand), so rays.js already draws
// the bolt. This adds what a wand doesn't have: a cone of flame, frost, gas or sparks
// billowing out of the breather's mouth along the first few cells, while the beam leaves.
//
// The engine says "The <monster> breathes <what>!" just before the beam, so a matching
// message arms the next zap timeline. The breather stands one step behind the first cell
// the beam drew; the cone starts there. Names are never used (dragon names are shuffled),
// only the cell, and the look comes from the ray type, which the beam shows anyway.
//
// breathFrame() is pure, so it can be tested without a renderer; createBreath() draws the
// particles with one instanced mesh.

import {RAY_LOOKS} from './rays.js';

// Mouth height and how far the cone reaches (tiles, from the mouth).
export const MOUTH_Y = .45;
export const CONE_REACH = 2.4;
// Half-angle of the cone (radians).
export const CONE_HALF = .36;
// Particles per breath, and how long each one lives (ms).
export const BREATH_PARTICLES = 64;
export const PARTICLE_MS = 520;
// The mouth keeps pouring for this long (ms), clamped to the beam's first few cells.
export const EMIT_MIN_MS = 200, EMIT_MAX_MS = 600;
// A "breathes" message arms the next zap for this long (seconds of update time).
export const ARM_S = 2;
// How long the bloom at the mouth lasts as the breath starts (ms).
export const FLASH_MS = 130;

// Per ray type: end is the colour a particle fades to; rise lifts (or drops) it over its
// life; puff scales its size; wobble {amp, hz} is how far and how fast it swirls sideways
// and up and down as it ages (fire licks fast, gas rolls slow, frost hangs nearly still). Death (disintegration) throws violet sparks, not a dark cone.
export const BREATH_LOOKS = {
  'magic missile': {end: 0x2a3a90, rise: .05, puff: .8, wobble: {amp: 0.03, hz: 0.01}},
  fire: {end: 0x3a1208, rise: .38, puff: 1.2, wobble: {amp: 0.11, hz: 0.02}},
  cold: {end: 0xbfe8ff, rise: -.08, puff: 1, wobble: {amp: 0.03, hz: 0.006}},
  sleep: {end: 0x5a3a8a, rise: .06, puff: 1.1, wobble: {amp: 0.07, hz: 0.005}},
  death: {end: 0x2a0a3a, rise: .02, puff: .55, sparks: true, wobble: {amp: 0, hz: 0}},
  lightning: {end: 0x6a90ff, rise: 0, puff: .5, sparks: true, wobble: {amp: 0, hz: 0}},
  'poison gas': {end: 0x2f5a12, rise: .1, puff: 1.4, wobble: {amp: 0.12, hz: 0.007}},
  lava: {end: 0x301008, rise: .15, puff: 1, wobble: {amp: 0.06, hz: 0.009}},
  acid: {end: 0x4a6a08, rise: -.22, puff: .8, wobble: {amp: 0.05, hz: 0.014}},
};

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const hash = (a, b = 0, c = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
const DIR_AXIS = {horizontal: [1, 0], vertical: [0, 1], lslant: [1, 1], rslant: [1, -1]};

// The breath a message announces: {what} or null. "breathes fire on himself." (a fire
// horn gone wrong) ends with a full stop and has no beam, so it doesn't match.
export function breathMessage(text) {
  const m = /^(.+?) breathes (.+)!$/.exec(String(text ?? '').trim());
  return m ? {what: m[2]} : null;
}

const occupied = (frame, x, z) => !frame || (frame.cells ?? []).some(c => c.x === x && c.z === z && c.visible &&
  (c.kind === 'monster' || c.kind === 'pet'));

// The breaths in a zap timeline: {x, z, dir:[dx,dz], zap, t0, t1} per beam whose first
// drawn cell has a visible monster one step behind it (the mouth). With one cell, the
// beam's glyph gives the axis and the frame says which side the breather is on.
export function breathsFromFx(timeline, frame) {
  const runs = new Map();
  for (const s of timeline?.sprites ?? []) {
    if (s.effect?.kind !== 'zap' || !RAY_LOOKS[s.effect.zap] || !Number.isFinite(s.x) || !Number.isFinite(s.z)) continue;
    if (!runs.has(s.seq)) runs.set(s.seq, []);
    runs.get(s.seq).push(s);
  }
  const out = [];
  for (const run of runs.values()) {
    run.sort((a, b) => a.from - b.from);
    const a = run[0], b = run[1];
    let dirs;
    if (b && (b.x !== a.x || b.z !== a.z)) dirs = [[Math.sign(b.x - a.x), Math.sign(b.z - a.z)]];
    else {
      const [ax, az] = DIR_AXIS[a.effect.dir] ?? [1, 0];
      dirs = [[ax, az], [-ax, -az]];
    }
    const dir = dirs.find(([dx, dz]) => occupied(frame, a.x - dx, a.z - dz));
    if (!dir) continue;
    const reach = run[Math.min(3, run.length - 1)];
    const emit = Math.min(EMIT_MAX_MS, Math.max(EMIT_MIN_MS, reach.from - a.from + 150));
    out.push({x: a.x - dir[0], z: a.z - dir[1], dir, zap: a.effect.zap, t0: a.from, t1: a.from + emit});
  }
  return out;
}

// The cone at time t (ms on the timeline's clock): {particles:[{x, y, z, size, color,
// alpha}], glow} or null once it has died away. Particles are born through the emit window,
// fly out along the cone and slow, billow, drift by type and fade from core to glow to end.
// glow (0..1) is the mouth's own brightness, for a light.
export function breathFrame(breath, t) {
  if (!breath || t >= breath.t1 + PARTICLE_MS) return null;
  const ray = RAY_LOOKS[breath.zap] ?? RAY_LOOKS.fire, look = BREATH_LOOKS[breath.zap] ?? BREATH_LOOKS.fire;
  const len = Math.hypot(breath.dir[0], breath.dir[1]) || 1;
  const fx = breath.dir[0] / len, fz = breath.dir[1] / len;
  const px = -fz, pz = fx;
  const emit = breath.t1 - breath.t0;
  const particles = [];
  for (let i = 0; i < BREATH_PARTICLES; i++) {
    const born = breath.t0 + emit * i / BREATH_PARTICLES;
    const age = t - born;
    if (age < 0 || age >= PARTICLE_MS) continue;
    const u = age / PARTICLE_MS;
    const d = .15 + CONE_REACH * (.8 + .2 * hash(i, 1)) * (1 - (1 - u) * (1 - u));
    const th = (hash(i, 2) * 2 - 1) * CONE_HALF, ph = (hash(i, 3) * 2 - 1) * CONE_HALF * .5;
    // A tight throat that flares as it goes, so the cone reads as a billow, not a wedge.
    const along = Math.cos(th) * d, side = Math.sin(th) * d * (.35 + .65 * Math.sqrt(u));
    // Sparks crackle sideways a little; everything else billows.
    // Each particle swirls on its own phase, growing with age so the throat stays tight.
    const sw = look.wobble.amp * u * Math.sin(age * look.wobble.hz * 2 * Math.PI + hash(i, 5) * 6.28);
    const lift = look.wobble.amp * .5 * u * Math.sin(age * look.wobble.hz * 1.7 * Math.PI + hash(i, 6) * 6.28);
    const jit = look.sparks ? (hash(i, Math.floor(t / 40), 4) * 2 - 1) * .08 : 0;
    const y = MOUTH_Y + Math.sin(ph) * d + look.rise * u * u + lift;
    particles.push({x: breath.x + fx * along + px * (side + jit + sw), y: Math.max(.03, y), z: breath.z + fz * along + pz * (side + jit + sw),
      size: look.puff * (look.sparks ? .05 : .07 + .2 * u), u,
      color: u < .25 ? mixHex(ray.core, ray.glow, u / .25) : mixHex(ray.glow, look.end, (u - .25) / .75),
      alpha: clamp01(age / 40) * Math.pow(1 - u, 1.5)});
  }
  // The mouth flash: a hot bloom at the throat for the first instant, before the cone fills.
  const flashAge = t - breath.t0;
  if (flashAge >= 0 && flashAge < FLASH_MS) {
    const k = flashAge / FLASH_MS;
    for (let j = 0; j < 2; j++) {
      const lead = .12 + .18 * j;
      particles.push({x: breath.x + fx * lead, y: MOUTH_Y + .03 * j, z: breath.z + fz * lead,
        size: look.puff * (.2 + .1 * k) * (look.sparks ? .8 : 1), u: k, color: mixHex(0xffffff, ray.core, k), alpha: clamp01(1 - k) * (j ? .6 : 1)});
    }
  }
  const glow = t < breath.t0 ? 0 : t < breath.t1 ? clamp01((t - breath.t0) / 60) : clamp01(1 - (t - breath.t1) / 180);
  return {particles, glow: ray.dark && !look.sparks ? 0 : glow};
}

function mixHex(a, b, k) {
  k = clamp01(k);
  const ch = s => {
    const x = (a >> s) & 255, y = (b >> s) & 255;
    return Math.round(x + (y - x) * k) << s;
  };
  return ch(16) | ch(8) | ch(0);
}

const MAX_PARTICLES = 192;

// message(text) arms the next zap; fromFx(timeline, frame) starts a cone for each breath in
// it (only while armed, unless {always:true}); update(dt, origin) advances and draws them,
// returning {count, particles, glow, color, x, z} (the brightest mouth, for a light).
export function createBreath(THREE, parent) {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const mat = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false});
  const mesh = new THREE.InstancedMesh(geo, mat, MAX_PARTICLES);
  mesh.frustumCulled = false; mesh.renderOrder = 5; mesh.userData.part = 'breath'; mesh.count = 0;
  parent.add(mesh);
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scale = new THREE.Vector3();
  const color = new THREE.Color();
  const playing = [];
  let armed = 0;

  function message(text) {
    if (breathMessage(text)) armed = ARM_S;
  }
  function add(breath, t = 0) {
    playing.push({breath, t});
  }
  function fromFx(timeline, frame, {always = false} = {}) {
    if (!armed && !always) return 0;
    const found = breathsFromFx(timeline, frame);
    for (const b of found) add(b);
    if (found.length) armed = 0;
    return found.length;
  }

  function update(dt, origin) {
    armed = Math.max(0, armed - dt);
    const ox = origin?.x ?? 0, oz = origin?.z ?? 0;
    let n = 0, best = {glow: 0, color: 0xffffff, x: 0, z: 0};
    for (let i = playing.length - 1; i >= 0; i--) {
      const p = playing[i];
      p.t += dt * 1000;
      const f = breathFrame(p.breath, p.t);
      if (!f) { playing.splice(i, 1); continue; }
      if (f.glow > best.glow) best = {glow: f.glow, color: (RAY_LOOKS[p.breath.zap] ?? RAY_LOOKS.fire).glow, x: p.breath.x, z: p.breath.z};
      for (const s of f.particles) {
        if (n >= MAX_PARTICLES) break;
        pos.set(s.x - ox, s.y, s.z - oz);
        matrix.compose(pos, q, scale.set(s.size, s.size, s.size));
        mesh.setMatrixAt(n, matrix);
        mesh.setColorAt(n, color.setHex(s.color).multiplyScalar(s.alpha));
        n++;
      }
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return {count: playing.length, particles: n, glow: best.glow, color: best.color, x: best.x, z: best.z};
  }

  const clear = () => { playing.length = 0; armed = 0; update(0); };
  const dispose = () => { parent.remove(mesh); geo.dispose(); mat.dispose(); };
  return {message, add, fromFx, update, clear, dispose, mesh, get armed() { return armed > 0; }, get active() { return playing.length; }};
}
