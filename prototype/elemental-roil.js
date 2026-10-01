// The elementals' roil (creature animation queue item 7). Each elemental moves like its element,
// with a little menace: the body turns to face the hero (within RANGE tiles) and leans in.
//  - Air: a dust devil. The funnel spins hard, the rings and leaves whirl round the body, it leans
//    into gusts, and dust motes spiral up off the floor round the funnel. A surge is a gust: the
//    whirl races, it lifts and the dust boils up.
//  - Fire: a heat shimmer. The crown of flames and the funnel flicker and stretch, it jitters
//    like a flame, and embers rise off the crown and shoulders. A surge is a flare: the crown
//    leaps tall, it rears back and embers burst.
//  - Earth: falling grit. A slow, heavy sway, with grit trickling off the torso to the floor. A
//    surge is a grind: it twists with a shudder and grit pours, then it settles with a thump.
//  - Water: sloshing. It sways and the funnel lags against it, the droplets circle, the foam crest
//    bobs and drips fall from the fists. A surge is a crest: it heaves up, the foam rears and
//    curls forward and the slosh doubles.
//  - An attack lunges in (with a flare of its element); a hit flinches back with a burst of
//    particles. On death everything eases back to rest and the particles run out.
//
// Matched on the model's `element` (creatures.js gives it `swirl`, and `crown` for fire and
// water). It owns the body's rotation, the tail's x/y rotation and y scale, the swirl's rotation
// and the crown's rotation and scale, all written absolutely from the rest pose every frame; it
// adds to the body's height (live.js writes the hover bob first). live.js sways the tail's z and
// pulses the fire core; actions.js adds its offsets afterwards. One points cloud per elemental.
import * as THREE from 'three';

const TAU = Math.PI * 2;
// Hero tracking: range (tiles), body turn limit and rate (1/s).
export const RANGE = 7, TURN = .5, TURN_RATE = 2;
// Surges: first after FIRST_MIN..+FIRST_SPAN s, then GAP_MIN..+GAP_SPAN apart; SURGE_LEN s long.
export const FIRST_MIN = 2, FIRST_SPAN = 3, GAP_MIN = 4, GAP_SPAN = 5, SURGE_LEN = 2.4;
// The attack's lunge and the hit's flinch (body pitch, rad).
export const LUNGE = .2, FLINCH = -.16, HIT_LEN = .6;
// Particles: pool size and point size.
export const MOTES = 32, MOTE_SIZE = .05;
export const REST_RATE = 2.5;
const SNAP = 1e-3, FLOOR = .015;

// Per element: funnel spin and swirl spin (rad/s), how fast particles spawn (per s) at rest and in
// a surge, their life (s) and colour.
export const KINDS = {
  air: {spin: 9, swirl: 2.2, rate: 9, surgeRate: 40, life: 1.6, color: [.78, .72, .6], glow: false},
  fire: {spin: 0, swirl: 1.2, rate: 12, surgeRate: 45, life: 1, color: [1, .55, .15], glow: true},
  earth: {spin: 0, swirl: 0, rate: 4, surgeRate: 30, life: 1.4, color: [.45, .38, .3], glow: false},
  water: {spin: 0, swirl: 1.5, rate: 3, surgeRate: 18, life: 1.2, color: [.7, .88, 1], glow: false},
};

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const clamp = (v, m) => v < -m ? -m : v > m ? m : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
// a cheap flicker in -1..1 from three detuned sines
const flicker = (t, ph) => (Math.sin(t * 11.3 + ph) + Math.sin(t * 17.9 + ph * 2.1) * .6 + Math.sin(t * 5.1 + ph * .7) * .4) / 2;

export const roils = a => !!(a && !a.asset && KINDS[a.element] && a.body && a.swirl);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// The surge's strength at progress u (0..1): eases in over the first quarter, holds, eases out
// over the last third; 0 outside.
export function surgeAt(u) {
  if (!(u > 0) || !(u < 1)) return 0;
  return smooth(u / .25) * (1 - smooth((u - .66) / .34));
}

// ---- shared resources (built once) ----
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
function sharedResources() {
  if (shared) return shared;
  const map = softTexture(), base = {size: MOTE_SIZE, map, vertexColors: true, transparent: true, depthWrite: false};
  return shared = {soft: new THREE.PointsMaterial(base), glow: new THREE.PointsMaterial({...base, blending: THREE.AdditiveBlending})};
}

const rot = o => ({x: o.rotation.x, y: o.rotation.y, z: o.rotation.z});
function setup(a) {
  const R = sharedResources(), K = KINDS[a.element];
  const st = {seed: ((a.g?.id ?? 1) * 40692) % 2147483647 || 1, t: 0, life: 1, surge: null, wait: 0, aim: 0, hit: -1, lastHit: null,
    spin: 0, whirl: 0, owed: 0, slosh: {x: 0, z: 0, vx: 0, vz: 0}, body: rot(a.body), swirl: rot(a.swirl),
    tail: a.tail ? {x: a.tail.rotation.x, y: a.tail.rotation.y, sy: a.tail.scale.y} : null,
    crown: a.crown ? {...rot(a.crown), s: a.crown.scale.clone()} : null,
    motes: Array.from({length: MOTES}, () => ({age: 1, life: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), ang: 0, r: 0}))};
  st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  st.ph = rand(st) * TAU;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MOTES * 4), 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .6, 0), 1.2);
  st.cloud = new THREE.Points(geo, K.glow ? R.glow : R.soft);
  st.cloud.userData.part = 'elementalMotes'; st.cloud.frustumCulled = false; st.cloud.castShadow = st.cloud.receiveShadow = false;
  a.g.add(st.cloud);
  return st;
}

function current(a, kind) {
  const q = a.actions, cur = q?.current;
  return cur?.kind === kind && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
}

// The hero's bearing relative to its facing, or null when out of range.
function bearing(a, look) {
  const g = a.g;
  if (!g || !look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return null;
  const dx = look.x - g.position.x, dz = look.z - g.position.z, d = Math.hypot(dx, dz);
  if (!(d > 1e-3) || d > RANGE) return null;
  return wrap(Math.atan2(dx, dz) - g.rotation.y);
}

// Start one particle for the element (in the elemental's own space, before g's scale).
function spawn(st, kind, m, kick) {
  const r = () => rand(st), K = KINDS[kind];
  m.age = 0; m.life = K.life * (.7 + .6 * r());
  if (kind === 'air') {
    // dust off the floor round the funnel, spiralling up
    m.ang = r() * TAU; m.r = .22 + .12 * r();
    m.p.set(Math.cos(m.ang) * m.r, FLOOR + .02 * r(), Math.sin(m.ang) * m.r);
    m.v.set(0, .25 + .35 * r() + .4 * kick, 0);
  } else if (kind === 'fire') {
    // embers off the crown and shoulders
    const a = r() * TAU, rr = .04 + .18 * r();
    m.p.set(Math.cos(a) * rr, .85 + .25 * r(), Math.sin(a) * rr * .6);
    m.v.set((r() - .5) * .2 * (1 + kick), .35 + .35 * r() + .4 * kick, (r() - .5) * .2 * (1 + kick));
  } else if (kind === 'earth') {
    // grit off the torso and shoulders
    const a = r() * TAU, rr = .08 + .14 * r();
    m.p.set(Math.cos(a) * rr * 1.3, .45 + .35 * r(), Math.sin(a) * rr * .8);
    m.v.set(Math.cos(a) * .08 * (1 + 2 * kick), -.05 * r(), Math.sin(a) * .08 * (1 + 2 * kick));
  } else {
    // drips off the fists (or sprayed off the body in a surge)
    const side = r() < .5 ? -1 : 1;
    if (kick > .3 && r() < .5) { const a = r() * TAU; m.p.set(Math.cos(a) * .2, .55 + .3 * r(), Math.sin(a) * .15); m.v.set(Math.cos(a) * .5, .4 + .3 * r(), Math.sin(a) * .5); }
    else { m.p.set(side * .3 + (r() - .5) * .03, .37, .1 + (r() - .5) * .03); m.v.set(0, -.1 * r(), 0); }
  }
}

function stepMotes(st, kind, dt, rate, alive, kick) {
  const K = KINDS[kind], pos = st.cloud.geometry.attributes.position, col = st.cloud.geometry.attributes.color;
  // spawn by rate, carried between frames
  st.owed = alive ? Math.min(st.owed + rate * dt, MOTES) : 0;
  for (const m of st.motes) {
    if (st.owed < 1) break;
    if (m.age < m.life) continue;
    spawn(st, kind, m, kick); st.owed--;
  }
  st.owed = Math.min(st.owed, 2);
  for (let i = 0; i < MOTES; i++) {
    const m = st.motes[i];
    let alpha = 0;
    if (m.age < m.life) {
      m.age += dt;
      if (kind === 'air') {
        m.ang += (3.5 + 3 * kick) * dt; m.r = Math.max(.08, m.r - .04 * dt);
        m.p.set(Math.cos(m.ang) * m.r, m.p.y + m.v.y * dt, Math.sin(m.ang) * m.r);
      } else if (kind === 'fire') {
        m.v.x += Math.sin(m.age * 9 + i) * .4 * dt; m.v.y *= Math.exp(-1.2 * dt);
        m.p.addScaledVector(m.v, dt);
      } else {
        m.v.y -= 2.6 * dt;
        m.p.addScaledVector(m.v, dt);
        if (m.p.y < FLOOR) { m.p.y = FLOOR; m.v.set(0, 0, 0); m.age = Math.max(m.age, m.life - .25); }
      }
      const u = m.age / m.life;
      alpha = u >= 1 ? 0 : smooth(u / .12) * (1 - smooth((u - .6) / .4)) * (kind === 'air' ? .6 : .95);
    }
    pos.setXYZ(i, m.p.x, m.p.y, m.p.z);
    // embers cool from yellow to deep red as they rise
    const c = K.color, cool = kind === 'fire' ? clamp01(m.age / m.life) : 0;
    col.setXYZW(i, c[0], c[1] * (1 - .7 * cool) + .3 * (1 - cool), c[2] * (1 - cool), alpha);
  }
  pos.needsUpdate = col.needsUpdate = true;
}

// Call once a frame (fidget.js does). `busy` holds off a surge while it moves or acts; `look` is
// the hero's position (same parent as actor.g), or null.
export function updateElementalRoil(a, dt, t, busy, look = null) {
  if (!roils(a)) return null;
  const kind = a.element, K = KINDS[kind];
  const st = a.elementalRoil || (a.elementalRoil = setup(a));
  const dead = !!a.actions?.dead;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.t += dt;
  const T = st.t, ph = st.ph;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  const w = st.life;

  // a blow: it flinches back and sheds a burst of its element
  const hit = dead ? null : a.actions?.current?.kind === 'hit' ? a.actions.current : null;
  if (hit && hit !== st.lastHit) { st.lastHit = hit; st.hit = 0; st.surge = null; st.owed = Math.min(MOTES, st.owed + 8); }
  if (st.hit >= 0) { st.hit += dt / HIT_LEN; if (st.hit >= 1) st.hit = -1; }
  const flinch = st.hit < 0 ? 0 : Math.sin(Math.min(1, st.hit * 3) * Math.PI / 2) * (1 - smooth((st.hit - .3) / .7));

  // the attack: a lunge in, with a flare of its element
  const atk = dead ? null : current(a, 'attack');
  if (atk) st.surge = null;
  const au = atk ? a.actions.u ?? 0 : 0, lunge = atk ? smooth(au / .3) * (1 - smooth((au - .55) / .45)) : 0;

  // surges on their own clock, only while it holds still
  if (st.surge != null) {
    st.surge += dt / SURGE_LEN;
    if (st.surge >= 1) st.surge = null;
  } else if (!dead) {
    st.wait -= dt;
    if (st.wait <= 0 && !busy) { st.surge = 0; st.wait = GAP_MIN + GAP_SPAN * rand(st); }
  }
  if (dead) st.surge = null;
  const s = surgeAt(st.surge ?? 0), kick = Math.max(s, lunge, flinch);

  // turn to face the hero
  const b = dead ? null : bearing(a, look);
  st.aim = approach(st.aim, b == null ? .25 * Math.sin(T * .17 + ph) : clamp(b, TURN), TURN_RATE, dt);

  // the body: each element's own sway, plus the lunge and flinch
  let px = 0, py = st.aim, pz = 0, lift = 0;
  const f = flicker(T, ph);
  if (kind === 'air') {
    px = .05 * Math.sin(T * 1.3 + ph) + .03 * f; pz = .06 * Math.sin(T * .9 + ph * 1.3) + .1 * s * Math.sin(T * 6);
    lift = .06 * s;
  } else if (kind === 'fire') {
    px = .025 * f - .12 * s; pz = .03 * flicker(T * .8, ph + 2);
    lift = .03 * s;
  } else if (kind === 'earth') {
    // a slow heavy sway; the grind twists with a shudder, then it settles with a thump
    const grind = s * Math.sin((st.surge ?? 0) * TAU * 1.5);
    pz = .025 * Math.sin(T * .45 + ph) + .015 * s * Math.sin(T * 31);
    py += .16 * grind;
    lift = -.03 * smooth(((st.surge ?? 0) - .78) / .08) * (1 - smooth(((st.surge ?? 0) - .86) / .14));
  } else {
    // a damped spring sloshes behind a slow drive; a crest doubles the drive and heaves it up
    const drive = 1 + s, sl = st.slosh;
    const tx = .05 * drive * Math.sin(T * 1.25 + ph), tz = .05 * drive * Math.sin(T * 1.05 + ph * 1.7);
    sl.vx += ((tx - sl.x) * 30 - sl.vx * 4) * dt; sl.vz += ((tz - sl.z) * 30 - sl.vz * 4) * dt;
    sl.x += sl.vx * dt; sl.z += sl.vz * dt;
    px = sl.x; pz = sl.z; lift = .06 * s;
  }
  a.body.rotation.x = st.body.x + (px + LUNGE * lunge + FLINCH * flinch) * w;
  a.body.rotation.y = st.body.y + py * w;
  a.body.rotation.z = st.body.z + pz * w;
  a.body.position.y += lift * w;

  // the funnel: air spins it, fire stretches it, water lags against the slosh
  if (a.tail && st.tail) {
    st.spin = dead ? approach(wrap(st.spin), 0, REST_RATE, dt) : st.spin + K.spin * (1 + 1.5 * kick) * dt;
    a.tail.rotation.y = st.tail.y + wrap(st.spin) * w;
    a.tail.rotation.x = st.tail.x + (kind === 'water' ? -1.6 * px : 0) * w;
    a.tail.scale.y = st.tail.sy * (1 + (kind === 'fire' ? .12 * f + .25 * kick : 0) * w);
  }

  // the swirl: circles the body, racing in a surge
  st.whirl = dead ? approach(wrap(st.whirl), 0, REST_RATE, dt) : st.whirl + K.swirl * (1 + 2.5 * kick) * dt;
  a.swirl.rotation.set(st.swirl.x + .06 * Math.sin(T * .8 + ph) * w, st.swirl.y + wrap(st.whirl) * w, st.swirl.z + .05 * Math.sin(T * 1.1 + ph) * w);

  // the crown: flames flicker and leap; foam bobs, and rears and curls forward in a crest
  if (a.crown && st.crown) {
    const c = a.crown, r = st.crown;
    if (kind === 'fire') {
      c.scale.set(r.s.x * (1 - .05 * f * w), r.s.y * (1 + (.16 * f + .6 * kick) * w), r.s.z);
      c.rotation.set(r.x, r.y, r.z + .08 * flicker(T * 1.3, ph + 4) * w);
    } else {
      c.scale.set(r.s.x, r.s.y * (1 + (.06 * Math.sin(T * 2.2 + ph) + .5 * kick) * w), r.s.z * (1 + .2 * kick * w));
      c.rotation.set(r.x + (-.45 * kick + .5 * px) * w, r.y, r.z + .5 * pz * w);
    }
  }

  stepMotes(st, kind, dt, K.rate + (K.surgeRate - K.rate) * kick, !dead, kick);
  return st;
}
