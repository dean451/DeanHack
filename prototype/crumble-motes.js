// The disintegrator coming apart (creature animation queue, from the graphics routine's #524).
// Its rear plates are broken into lifted shards; this keeps them burning down. Green motes flake
// off the crumbling rump and drift up and back, wavering, flaring and fading as they go.
//  - At rest a slow, steady shedding.
//  - With the hero near it sheds faster and brighter: the thing is hungry.
//  - When it strikes, a gust of motes is flung forward off its back with the lash.
//  - A blow knocks a burst of motes loose, scattering outward.
//  - On death the last motes burn out and nothing more is shed.
//  - Turned to stone, the cloud holds where it is.
//
// One Points cloud on the body (body space, so it rides the hop and sway), one shared material:
// one extra draw per disintegrator. rust-feel.js calls it with its own state, so it uses that
// module's hero nearness and attack phase.
import * as THREE from 'three';

export const MOTES = 22;
// Where motes come off: the crumbling rump in body space (x half-width, y range, z range).
export const RUMP = {x: .13, y0: .4, y1: .5, z0: -.14, z1: -.36};
// Lifetimes (s), rise speed (body units/s) and the drift back (+ is forward, so negative).
export const LIFE_MIN = 1.6, LIFE_SPAN = 1.8, RISE = .1, BACK = -.03;
// Shedding rate (motes/s) at rest and fully excited, and a blow's burst and the lash's gust.
export const SHED = 4, SHED_NEAR = 11, BURST = 9, GUST = 7;
export const MOTE_SIZE = .045, ALPHA = .85;
const COLOR = [.49, 1, .35], HOT = [.85, 1, .7];

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

let shared = null;
function softTexture() {
  const n = 16, data = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const d = Math.hypot((i + .5) / n * 2 - 1, (j + .5) / n * 2 - 1), k = (j * n + i) * 4;
    data[k] = data[k + 1] = data[k + 2] = 255; data[k + 3] = Math.round(clamp01(1 - d) ** 1.5 * 255);
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}
const material = () => shared || (shared = new THREE.PointsMaterial({size: MOTE_SIZE, map: softTexture(), vertexColors: true,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}));

export const crumbles = a => !!(a && !a.asset && a.kind === 'disintegrator' && a.body);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

function setup(a) {
  const st = {seed: ((a.g?.id ?? 1) * 40692) % 2147483647 || 1, owed: 0, lastHit: null, lastAtk: null, gusted: false,
    motes: Array.from({length: MOTES}, () => ({age: 1, life: 1, hot: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), wob: 0}))};
  // start part-way through so it doesn't pop in all at once
  for (const m of st.motes) if (rand(st) < .6) { spawn(st, m, 0); m.age = rand(st) * .9; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MOTES * 4), 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .5, -.2), 1);
  st.cloud = new THREE.Points(geo, material());
  st.cloud.userData.part = 'crumbleMotes'; st.cloud.frustumCulled = false; st.cloud.castShadow = st.cloud.receiveShadow = false;
  st.cloud.userData.dispose = () => geo.dispose();
  a.body.add(st.cloud);
  return st;
}

// kind 0: shed (rising slowly); 1: a blow's burst (outward); 2: the lash's gust (flung forward)
function spawn(st, m, kind) {
  m.age = 0; m.life = (LIFE_MIN + LIFE_SPAN * rand(st)) * (kind ? .55 : 1);
  m.p.set((rand(st) * 2 - 1) * RUMP.x, RUMP.y0 + (RUMP.y1 - RUMP.y0) * rand(st), RUMP.z0 + (RUMP.z1 - RUMP.z0) * rand(st));
  const side = rand(st) * 2 - 1;
  if (kind === 1) m.v.set(side * .35, .18 + .2 * rand(st), -.1 + .25 * (rand(st) - .5));
  else if (kind === 2) m.v.set(side * .12, .1 + .1 * rand(st), .35 + .25 * rand(st));
  else m.v.set(side * .02, RISE * (.7 + .6 * rand(st)), BACK * (.5 + rand(st)));
  m.hot = kind ? 1 : .3 * rand(st);
  m.wob = rand(st) * 6.283;
}

function emit(st, n, kind) {
  for (const m of st.motes) { if (n <= 0) return; if (m.age >= 1) { spawn(st, m, kind); n--; } }
}

// Call from rust-feel.js once a frame. `ex` 0..1 is the hero nearness, `lash` 0..1 the attack's
// lash, `hit` the current hit action (or null), `dead` and `w` (life, 1 → 0) from that module.
export function updateCrumbleMotes(a, dt, T, ex, lash, hit, dead, w) {
  if (!crumbles(a)) return null;
  const st = a.crumble_ || (a.crumble_ = setup(a));
  if (a.stone) return st;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  if (!dead) {
    st.owed += (SHED + (SHED_NEAR - SHED) * clamp01(ex)) * dt;
    const n = Math.floor(st.owed); st.owed -= n; emit(st, n, 0);
    if (hit && hit !== st.lastHit) { st.lastHit = hit; emit(st, BURST, 1); }
    if (lash > .5 && !st.gusted) { st.gusted = true; emit(st, GUST, 2); }
    if (lash < .05) st.gusted = false;
  }
  const pos = st.cloud.geometry.attributes.position, col = st.cloud.geometry.attributes.color;
  st.motes.forEach((m, i) => {
    if (m.age < 1) {
      m.age = Math.min(1, m.age + dt / m.life);
      const drag = Math.exp(-1.6 * dt);
      m.v.x *= drag; m.v.z *= drag; m.v.y = m.v.y * drag + RISE * (1 - drag);
      m.p.addScaledVector(m.v, dt);
      m.p.x += .04 * Math.sin(T * 2.3 + m.wob) * dt;
    }
    if (m.age >= 1) { pos.setXYZ(i, 0, RUMP.y0, RUMP.z0); col.setXYZW(i, 0, 0, 0, 0); return; }
    const u = m.age, flick = .75 + .25 * Math.sin(T * 17 + m.wob * 3);
    const alpha = ALPHA * smooth(u / .12) * (1 - u) ** 1.3 * flick * w;
    const h = m.hot * (1 - u);
    pos.setXYZ(i, m.p.x, m.p.y, m.p.z);
    col.setXYZW(i, COLOR[0] + (HOT[0] - COLOR[0]) * h, COLOR[1], COLOR[2] + (HOT[2] - COLOR[2]) * h, alpha);
  });
  pos.needsUpdate = col.needsUpdate = true;
  return st;
}
