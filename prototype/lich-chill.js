// The liches' cold (creature animation queue item 7). A lich in NetHack is an undead sorcerer
// whose touch is cold and who casts spells, so its idle is a slow, patient menace:
//  - Its claw fingers never quite stop: they flex one after another in a slow ripple, like
//    something playing an instrument nobody can hear. The staff hand only tightens its grip.
//  - Now and then the free hand rises and spreads its claws wide, holds, then slowly clenches
//    into a fist, and the cold motes around it are drawn into the grip as if it were wringing
//    the warmth out of the air. Then the hand sinks and loosens.
//  - Cold motes drift off the free hand and the staff's orb and sink slowly to the floor.
//  - The orb breathes, and swells as it casts.
//  - When it attacks (a cold touch or a spell), the free hand thrusts forward with its claws
//    splayed, the orb swells and a spray of frost motes is flung toward the target.
//  - On death everything eases back to rest and the motes thin out to nothing.
//
// The module owns the free arm's rotation.x, the fingers' rotation and the orb's scale (nothing
// else writes them; `lichHands` and `orb` are the model's handles in creatures.js), plus one point
// cloud on the body. Its material is shared; one extra draw per lich.
import * as THREE from 'three';

const TAU = Math.PI * 2;
// The finger ripple: base curl, amplitude, rate (Hz) and phase step finger to finger. The staff
// hand flexes GRIP of that.
export const CURL = .25, RIPPLE = .32, RIPPLE_HZ = .45, RIPPLE_STEP = 1.1, GRIP = .3;
// A grasp: first after FIRST_MIN..+FIRST_SPAN s, then GAP_MIN..+GAP_SPAN apart; GRASP_LEN s long.
export const FIRST_MIN = 2, FIRST_SPAN = 3, GAP_MIN = 5, GAP_SPAN = 5, GRASP_LEN = 3.6;
// The grasp's pose: how far the arm rises (rad, negative = forward/up), the splay (negative
// curl) and spread (rad), and the fist's curl.
export const RAISE = -.55, SPLAY = -.45, SPREAD = .32, FIST = 1.15;
// The attack thrust: arm, splay, spread; the orb's swell on a cast and its breathing.
export const THRUST = -.75, ORB_CAST = .55, ORB_BREATH = .08, ORB_HZ = .3;
// Motes: drifting ones, the frost spray of a cast, peak opacity.
export const MOTES = 16, MOTE_LEN = 3.4, MOTE_ALPHA = .7, SPRAY = 14, SPRAY_LIFE = .9, SPRAY_SPEED = 1.3, SPRAY_ALPHA = .8;
// How fast the motion eases out after death (1/s).
export const REST_RATE = 2.5;
const SNAP = 1e-3;
// The fingertip, in arm space (creatures.js: the claws hang to y -.495).
const TIP = new THREE.Vector3(0, -.46, .04);

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);

export const chills = a => !!(a && !a.asset && a.body && Array.isArray(a.lichHands) && a.lichHands.length);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// The grasp at progress u (0..1): {raise, splay, fist, pull}. The hand rises and spreads (to .3),
// holds, clenches slowly (.42–.72), holds the fist, and sinks and loosens. `pull` (0..1) is how
// strongly the motes are drawn into the hand.
export function graspPose(u) {
  if (!(u > 0) || !(u < 1)) return {raise: 0, splay: 0, fist: 0, pull: 0};
  const up = smooth(u / .25) * (1 - smooth((u - .8) / .2));
  const fist = smooth((u - .42) / .3) * (1 - smooth((u - .82) / .18));
  const splay = smooth(u / .28) * (1 - smooth((u - .42) / .16));
  const pull = smooth((u - .4) / .2) * (1 - smooth((u - .72) / .1));
  return {raise: up, splay, fist, pull};
}

// The attack thrust at action phase u (0..1): quick out, hold, back.
export function thrustPose(u) {
  if (!(u > 0) || !(u < 1)) return 0;
  return u < .3 ? smooth(u / .3) : 1 - smooth((u - .55) / .45);
}

// ---- shared resources (built once) ----
let shared = null;
function moteTexture() {
  const n = 32, data = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (i + .5) / n * 2 - 1, y = (j + .5) / n * 2 - 1, d = Math.hypot(x, y);
    // a hard bright pinpoint inside a soft halo, with faint cross spikes like ice catching light
    const a = Math.max(clamp01(1 - d * 3.5), .45 * clamp01(1 - d) ** 2,
      .5 * clamp01(1 - Math.abs(x) * 10) * clamp01(1 - Math.abs(y)) ** 3, .5 * clamp01(1 - Math.abs(y) * 10) * clamp01(1 - Math.abs(x)) ** 3);
    const k = (j * n + i) * 4;
    data[k] = data[k + 1] = data[k + 2] = 255; data[k + 3] = Math.round(a * 255);
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}
function sharedResources() {
  return shared || (shared = {
    moteMat: new THREE.PointsMaterial({size: .055, map: moteTexture(), vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending}),
  });
}

function setup(a) {
  const R = sharedResources();
  const hands = a.lichHands.map(h => ({...h, restX: h.arm.rotation.x,
    rest: h.fingers.map(f => ({x: f.rotation.x, z: f.rotation.z}))}));
  // the free hand is the left (-x); the right holds the staff
  const free = hands.find(h => h.side < 0) || hands[0];
  const st = {seed: ((a.g?.id ?? 1) * 48271) % 2147483647 || 1, t: 0, life: 1, hands, free,
    orbScale: a.orb ? a.orb.scale.clone() : null, grasp: null, wait: 0, spray: [], lastAttack: null};
  st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  st.ph = rand(st) * TAU;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((MOTES + SPRAY) * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array((MOTES + SPRAY) * 4), 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .8, 0), 1.6);
  st.points = new THREE.Points(geo, R.moteMat);
  st.points.userData.part = 'lichMotes'; st.points.frustumCulled = false; st.points.castShadow = st.points.receiveShadow = false;
  a.body.add(st.points);
  // each mote is born at the free hand or the orb and sinks, wavering, to the floor
  st.motes = Array.from({length: MOTES}, (_, i) => ({off: i / MOTES + rand(st) * .05, len: MOTE_LEN * (.8 + rand(st) * .4),
    orb: !!a.orb && rand(st) < .35, th: rand(st) * TAU, r: .03 + rand(st) * .05, wob: .5 + rand(st)}));
  // the mote colour: frost white-blue with a breath of the lich's own glow
  const g = a.orb?.material?.color || new THREE.Color(1, 1, 1);
  st.color = [.72 + .28 * g.r * .35, .86 + .14 * g.g * .35, 1].map(v => Math.min(1, v));
  return st;
}

const tmp = new THREE.Vector3(), tmpE = new THREE.Euler();
// The free hand's fingertip in body space, for the arm's current rotation.
function handPoint(h, out) {
  return out.copy(TIP).applyEuler(tmpE.set(h.arm.rotation.x, h.arm.rotation.y, h.arm.rotation.z)).add(h.arm.position);
}

function current(a, kind) {
  const q = a.actions, cur = q?.current;
  return cur?.kind === kind && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
}

// Call once a frame (fidget.js does). `busy` holds off a grasp while it walks or acts.
export function updateLichChill(a, dt, t, busy) {
  if (!chills(a)) return null;
  const st = a.lichChill || (a.lichChill = setup(a));
  const dead = !!a.actions?.dead;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.t += dt;
  const T = st.t;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  const w = st.life;

  // grasps on their own clock
  if (st.grasp) { st.grasp.u += dt / GRASP_LEN; if (st.grasp.u >= 1) st.grasp = null; }
  else if (!dead) { st.wait -= dt; if (st.wait <= 0 && !busy) { st.grasp = {u: 0}; st.wait = GAP_MIN + GAP_SPAN * rand(st); } }
  const gp = graspPose(st.grasp ? st.grasp.u : 0);

  // an attack: the free hand thrusts, the orb swells and frost is flung at the target
  const atk = dead ? null : current(a, 'attack');
  const th = atk ? thrustPose(a.actions.u ?? 0) * w : 0;
  if (atk && atk !== st.lastAttack) {
    st.lastAttack = atk;
    st.grasp = null;
    st.spray.length = 0;
    for (let i = 0; i < SPRAY; i++) st.spray.push({x: 0, y: 0, z: 0, vx: (rand(st) - .5) * .5, vy: (rand(st) - .2) * .5,
      vz: SPRAY_SPEED * (.6 + rand(st) * .5), age: -rand(st) * .15, life: SPRAY_LIFE * (.7 + rand(st) * .5), born: false});
  }

  const raise = gp.raise * w, splay = Math.max(gp.splay * w, th), fist = gp.fist * w * (1 - th);
  for (const h of st.hands) {
    const isFree = h === st.free;
    if (isFree) h.arm.rotation.x = h.restX + RAISE * raise + THRUST * th;
    h.fingers.forEach((f, i) => {
      const r = h.rest[i], k = i - (h.fingers.length - 1) / 2;
      const ripple = RIPPLE * Math.sin(T * RIPPLE_HZ * TAU - i * RIPPLE_STEP + st.ph + (isFree ? 0 : 2));
      if (isFree) {
        const curl = (CURL + ripple) * (1 - splay) * (1 - fist) + SPLAY * splay + FIST * fist;
        f.rotation.x = r.x + curl * w;
        f.rotation.z = r.z + k * SPREAD * splay - k * .12 * fist * w;
      } else {
        f.rotation.x = r.x + (CURL + GRIP * ripple) * w;
        f.rotation.z = r.z;
      }
    });
  }
  if (a.orb && st.orbScale) {
    const s = 1 + (ORB_BREATH * Math.sin(T * ORB_HZ * TAU + st.ph) + ORB_CAST * th + .25 * gp.pull) * w;
    a.orb.scale.copy(st.orbScale).multiplyScalar(s);
  }

  // drifting motes: born at the hand or the orb, sinking to the floor; drawn in during a fist
  const hp = handPoint(st.free, tmp), hx = hp.x, hy = hp.y, hz = hp.z;
  const ox = a.orb ? a.orb.position.x : hx, oy = a.orb ? a.orb.position.y : hy, oz = a.orb ? a.orb.position.z : hz;
  const pos = st.points.geometry.attributes.position, col = st.points.geometry.attributes.color, C = st.color;
  const pull = gp.pull * w;
  st.motes.forEach((m, i) => {
    const u = ((T / m.len) + m.off) % 1;
    const bx = m.orb ? ox : hx, by = m.orb ? oy : hy, bz = m.orb ? oz : hz;
    const ang = m.th + u * 2.2 * m.wob, r = m.r + .1 * u;
    let x = bx + Math.cos(ang) * r + .03 * Math.sin(T * 1.3 * m.wob + i);
    let y = Math.max(.03, by - (by - .03) * u ** 1.6);
    let z = bz + Math.sin(ang) * r;
    // the clench wrings them in: the hand's own motes are pulled toward the grip
    if (!m.orb && pull > 0) { const k = pull * (1 - u * .3); x += (hx - x) * k; y += (hy - y) * k; z += (hz - z) * k; }
    const alpha = MOTE_ALPHA * smooth(u / .1) * (1 - u) ** 1.2 * w * (1 + .4 * pull);
    pos.setXYZ(i, x, y, z); col.setXYZW(i, C[0], C[1], C[2], Math.min(1, alpha));
  });
  // the cast's frost spray, flung forward (+z in body space, the way it faces) from the claws
  for (let i = 0; i < SPRAY; i++) {
    const p = st.spray[i], j = MOTES + i;
    if (!p || p.age >= p.life) { pos.setXYZ(j, hx, hy, hz); col.setXYZW(j, 0, 0, 0, 0); continue; }
    p.age += dt;
    if (p.age < 0) { pos.setXYZ(j, hx, hy, hz); col.setXYZW(j, 0, 0, 0, 0); continue; }
    if (!p.born) { p.born = true; p.x = hx; p.y = hy; p.z = hz; }
    const drag = Math.exp(-2.2 * dt);
    p.vx *= drag; p.vz *= drag; p.vy = p.vy * drag - .6 * dt;
    p.x += p.vx * dt; p.y = Math.max(.03, p.y + p.vy * dt); p.z += p.vz * dt;
    const u = clamp01(p.age / p.life);
    pos.setXYZ(j, p.x, p.y, p.z); col.setXYZW(j, C[0], C[1], C[2], SPRAY_ALPHA * smooth(u / .08) * (1 - u) ** 1.4 * w);
  }
  if (dead && w === 0) st.spray.length = 0;
  pos.needsUpdate = col.needsUpdate = true;
  return st;
}
