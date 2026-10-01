import * as THREE from 'three';

// Devil's Snare's vines (creature queue: "Devil's Snare vine writhe"). The plant is rooted and never
// walks; this makes its vines live, slow and patient until something comes near:
//  - Writhe: a slow wave climbs every vine from the knot to the hooked tip, each vine on its own
//    phase (by its bearing round the knot), so they coil and sway like something feeling the air.
//  - Constrict: every so often the whole nest draws in and twists tight, as if wringing something,
//    then lets go.
//  - The hero near: the writhe quickens, every vine leans toward the hero and the hooked tips crook
//    in and out at them, beckoning, each out of step.
//  - Attack: the vines rear back, then lash forward at the target (the actions turn the plant).
//  - Blow: the vines recoil away from the blow's side and writhe hard for a moment.
//  - Death: the writhe dies away and the vines slump down and out onto the floor.
//  - Stone: holds the pose it was caught in.
//
// The plant is two merged meshes (vines, thorns and sap), so there are no vine handles. Like
// beholder-writhe.js, each snare gets its own copy of the geometry the first time it's updated and
// the vertices are moved on the CPU by a smooth field: a vertex's offset grows with its height
// (w = h^1.6, h its height over TOP), so the root knot and the floor runners stay planted, and the
// thorns and sap beads, sharing the field, ride with their vines. Working on the geometry keeps the
// pose through the death fade's and petrify's material clones, and in the shadow.

// RANGE: tiles within which it notices the hero. TOP: the height counted as a vine's tip.
// WAVE/WAVE_NEAR: writhe size at the tip; RATE/RATE_NEAR: writhe speed; AGITATE: extra speed and
// size just after a blow. LEAN: how far the tips lean toward the hero; BECKON: the tips' crook at
// the hero, at BECKON_HZ. LASH: the attack's rear (back) and strike (fwd, down). RECOIL: a blow's
// kick speed. CONSTRICT: the draw-in (fraction of the distance to the axis) and TWIST (rad) at full
// squeeze, CONSTRICT_LEN s long, every CONSTRICT_WAIT s. DROOP: the dead vines' fall; REST_RATE: how
// fast the dead writhe stops. K and D: the stiffness and damping of the lean spring.
export const RANGE = 5, TOP = .85, WAVE = .022, WAVE_NEAR = .034, RATE = .8, RATE_NEAR = 1.6, AGITATE = 2.2;
export const LEAN = .07, BECKON = .035, BECKON_HZ = .55, LASH = {back: .06, fwd: .16, down: .05}, RECOIL = .9;
export const CONSTRICT = .22, TWIST = .3, CONSTRICT_LEN = 2.4, CONSTRICT_WAIT = [5, 11];
export const DROOP = {down: .2, out: .09}, REST_RATE = 2.2, K = 40, D = 8;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

export const writhes = a => !!(a && !a.asset && a.kind === 'devils snare' && a.body && a.g);

// A per-vertex rest table: position, weight w, bearing and how far up the tip the vertex is (for
// the beckon).
function own(mesh) {
  const geo = mesh.geometry.clone(), pos = geo.attributes.position, n = pos.count;
  const rest = new Float32Array(pos.array), w = new Float32Array(n), ang = new Float32Array(n), tip = new Float32Array(n), hh = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = rest[i * 3], y = rest[i * 3 + 1], z = rest[i * 3 + 2], h = clamp01(y / TOP);
    hh[i] = h; w[i] = Math.pow(h, 1.6); ang[i] = Math.atan2(z, x); tip[i] = smooth((h - .55) / .4);
  }
  geo.computeBoundingSphere(); geo.boundingSphere.radius += .25;
  mesh.geometry = geo;
  const before = mesh.userData.dispose;
  mesh.userData.dispose = () => { geo.dispose(); before?.(); };
  return {mesh, geo, rest, w, ang, tip, h: hh};
}

function setup(a) {
  const parts = a.body.children.filter(c => c.isMesh && (c.userData.part === 'vines' || c.userData.part === 'thorns'));
  if (!parts.length) return null;
  const st = {seed: ((a.g.id ?? 1) * 48271) % 2147483647 || 1, P: 0, A: WAVE, near: 0, agit: 0, life: 1, B: 0,
    sq: 0, squeeze: null, wait: 0, lastHit: null, s: new THREE.Vector3(), v: new THREE.Vector3(), aim: {x: 0, z: 1},
    parts: parts.map(own)};
  st.P = rand(st) * 10; st.B = rand(st) * 10;
  st.wait = CONSTRICT_WAIT[0] + (CONSTRICT_WAIT[1] - CONSTRICT_WAIT[0]) * rand(st);
  return st;
}

function current(a, kind) {
  const q = a.actions, cur = q?.current;
  return cur?.kind === kind && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
}

// The hero's direction in the plant's frame (x, z) and distance, or null out of range.
function sense(a, look) {
  const g = a.g;
  if (!look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return null;
  const dx = look.x - g.position.x, dz = look.z - g.position.z, d = Math.hypot(dx, dz);
  if (!(d > 1e-3) || d > RANGE) return null;
  const r = -g.rotation.y, c = Math.cos(r), s = Math.sin(r);
  return {x: (dx * c + dz * s) / d, z: (-dx * s + dz * c) / d, d};
}

const tgt = new THREE.Vector3(), kick = new THREE.Vector3();

// Call once a frame (fidget.js does). `look` is where the hero stands. Returns the state.
export function updateSnareWrithe(a, dt, t, busy, look = null) {
  if (!writhes(a)) return null;
  const st = a.snareWrithe === undefined ? (a.snareWrithe = setup(a)) : a.snareWrithe;
  if (!st || a.stone) return st;
  dt = Math.min(Math.max(0, dt || 0), .1);
  const dead = !!a.actions?.dead;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  const h = dead ? null : sense(a, look);
  if (h) st.aim = {x: h.x, z: h.z};
  st.near = approach(st.near, h ? clamp01(1.2 - h.d / RANGE) : 0, 2, dt);
  st.agit = approach(st.agit, 0, 1.3, dt);

  // a blow: the vines recoil away from the hero's side (or back) and writhe hard
  const hit = dead ? null : current(a, 'hit');
  if (hit && hit !== st.lastHit) {
    st.lastHit = hit; st.agit = 1;
    const ax = h ? -h.x : 0, az = h ? -h.z : -1;
    st.v.addScaledVector(kick.set(ax + (rand(st) - .5) * .6, .35, az + (rand(st) - .5) * .6).normalize(), RECOIL);
  }
  // now and then the nest draws in and wrings tight
  if (!dead && !st.squeeze) {
    st.wait -= dt * (1 + st.near);
    if (st.wait <= 0) st.squeeze = {u: 0, dir: rand(st) < .5 ? -1 : 1};
  }
  if (st.squeeze) {
    st.squeeze.u += dt / CONSTRICT_LEN;
    const u = st.squeeze.u;
    st.sq = st.squeeze.dir * smooth(u / .35) * (1 - smooth((u - .6) / .4));
    if (u >= 1 || dead) { st.squeeze = null; st.wait = CONSTRICT_WAIT[0] + (CONSTRICT_WAIT[1] - CONSTRICT_WAIT[0]) * rand(st); }
  } else st.sq = approach(st.sq, 0, 4, dt);

  const atk = dead ? null : current(a, 'attack'), u = atk ? a.actions.u ?? 0 : 0;
  const rear = atk ? smooth(u / .3) * (1 - smooth((u - .3) / .15)) : 0, strike = atk ? smooth((u - .3) / .15) * (1 - smooth((u - .7) / .3)) : 0;

  st.P += dt * (RATE + (RATE_NEAR - RATE) * st.near + AGITATE * st.agit) * st.life;
  st.B += dt * BECKON_HZ * Math.PI * 2 * st.life;
  st.A = (WAVE + (WAVE_NEAR - WAVE) * st.near) * (1 + st.agit * .9) * st.life;

  // the lean spring: toward the hero, home in death (the attack is too quick for it and goes on directly)
  tgt.set(st.aim.x, .1, st.aim.z).multiplyScalar(LEAN * st.near);
  if (atk) tgt.multiplyScalar(1 - Math.max(rear, strike));
  if (dead) tgt.multiplyScalar(st.life);
  st.v.addScaledVector(kick.copy(tgt).sub(st.s), K * dt).multiplyScalar(Math.exp(-D * dt));
  st.s.addScaledVector(st.v, dt);
  if (dead && st.life < .02) { st.s.multiplyScalar(st.life); st.v.set(0, 0, 0); }

  const lz = -LASH.back * rear + LASH.fwd * strike, ly = .06 * rear - LASH.down * strike;
  const {s, A, P, B, sq, aim} = st, bk = BECKON * st.near * st.life, slump = 1 - st.life, cz = CONSTRICT * Math.abs(sq), tw = TWIST * sq;
  for (const part of st.parts) {
    const pos = part.geo.attributes.position, arr = pos.array, {rest, w, ang, tip} = part, n = w.length;
    for (let i = 0; i < n; i++) {
      const wi = w[i], j = i * 3;
      let x = rest[j], y = rest[j + 1], z = rest[j + 2];
      if (wi > 1e-5) {
        const g = ang[i], hi = part.h[i];
        // wring: twist about the knot's axis and draw in toward it
        if (cz || tw) {
          const a2 = tw * wi, c = Math.cos(a2), sn = Math.sin(a2), k = 1 - cz * wi;
          const nx = (x * c - z * sn) * k, nz = (x * sn + z * c) * k; x = nx; z = nz;
        }
        const sway = .8 + .2 * Math.sin(g * 2 + 1);
        x += wi * (A * Math.sin(P * 1.2 + g * 3 - hi * 6) + s.x * sway);
        y += wi * (A * .5 * Math.sin(P * .9 + g * 5 - hi * 4) + s.y);
        z += wi * (A * Math.cos(P + g * 2.3 - hi * 5.5) + s.z * sway);
        if (atk) { z += wi * wi * lz; y += wi * wi * ly; }
        // the hooked tips crook at the hero, each out of step
        if (bk && tip[i]) { const c = bk * tip[i] * (.5 + .5 * Math.sin(B + g * 1.7)); x += aim.x * c; z += aim.z * c; y -= c * .4; }
        // dead, the vines slump down and out over the floor
        if (slump) {
          const r = Math.hypot(rest[j], rest[j + 2]) || 1;
          x += rest[j] / r * DROOP.out * wi * slump; z += rest[j + 2] / r * DROOP.out * wi * slump;
          y -= DROOP.down * wi * slump;
        }
        if (y < .002) y = Math.min(rest[j + 1], .002);
      }
      arr[j] = x; arr[j + 1] = y; arr[j + 2] = z;
    }
    pos.needsUpdate = true;
  }
  return st;
}
