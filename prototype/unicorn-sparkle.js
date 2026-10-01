// Unicorns (creature animation queue item 4). The model is creatures.js's horse({horn}): a head
// group on the end of the neck with a spiral horn on the brow, and four legs (front left, hind
// left, front right, hind right). Unicorns in NetHack are proud, skittish and dangerous up close,
// so the idle is a coiled one:
//  - Motes drift off the horn, spiralling round it and rising past the tip. They follow alignment:
//    pale gold on the white unicorn, cold silver on the gray, gold-orange on the ki-rin, and on the
//    black unicorn a dark violet smoke-spark that curls down off the horn and sinks instead of
//    rising. While it moves the motes trail behind it.
//  - Every few seconds a glint runs up the horn from root to tip (on the black one, a dim bruise
//    of violet).
//  - Standing still, it now and then paws the floor: a front hoof lifts slowly and strikes down
//    hard, three times, while the head drops to level the horn, like a bull before a charge.
//  - Or it tosses its head: a sharp snap up and aside, a held glare, then a slow glide home. The
//    glint fires at the top of the toss.
//  - Walking, an action or death breaks off a paw or toss within ~0.1 s. On death the motes thin
//    out to nothing and the head and leg settle exactly back to rest.
//
// The head offsets are taken back each frame (only this module turns a unicorn's head). The leg
// offset is added on top of the swing live.js writes to the legs every frame, so it isn't taken
// back. The motes and glint are one Points cloud on the body (one extra draw), sharing a material
// per look across unicorns.
import * as THREE from 'three';

const TAU = Math.PI * 2;
// Per species: mote colour (rgb 0..1), peak alpha, glint colour, additive blending, and whether
// the motes sink (black) instead of rising.
export const LOOKS = {
  'white unicorn': {mote: [1, .94, .78], alpha: .9, glint: [1, .97, .88], add: true},
  'gray unicorn': {mote: [.72, .8, .94], alpha: .65, glint: [.86, .92, 1], add: true},
  'black unicorn': {mote: [.2, .06, .3], alpha: .85, glint: [.45, .1, .55], add: false, sink: true},
  'ki-rin': {mote: [1, .7, .3], alpha: .85, glint: [1, .88, .55], add: true},
};
// Motes: how many, seconds each lives (MOTE_LEN..×1.4), spiral radius out to, rise past the tip,
// trail speed while walking (units/s, body −z).
export const MOTES = 14, MOTE_LEN = 1.7, MOTE_SPREAD = .07, MOTE_RISE = .16, TRAIL = .3;
// Glint: seconds to run root to tip, and GLINT_MIN..+GLINT_SPAN s between runs.
export const GLINT_LEN = .45, GLINT_MIN = 2.5, GLINT_SPAN = 2.5;
// Paw: strikes, seconds per strike, how far the hoof lifts (rad, negative swings it forward) and
// how far it strikes back past rest; the head drops PAW_HEAD to level the horn.
export const STRIKES = 3, STRIKE_S = .6, PAW_LIFT = -.62, PAW_STRIKE = .14, PAW_HEAD = .2;
// Toss: snap up (negative x lifts the muzzle) and aside, in SNAP_S, hold, then glide home.
export const TOSS_UP = -.48, TOSS_SIDE = .3, SNAP_S = .12, TOSS_HOLD = .25, TOSS_GLIDE = 1.1;
// First paw or toss after FIRST_MIN..+FIRST_SPAN s still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 2, FIRST_SPAN = 3, GAP_MIN = 4, GAP_SPAN = 5;
// Fades (1/s): a broken-off paw or toss, and the motes after death.
export const BREAK_RATE = 14, DEATH_RATE = 2.5;
const SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const sparkles = a => !!(a && !a.asset && a.body && LOOKS[a.species]);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

export const pawLength = () => STRIKES * STRIKE_S;
export const tossLength = () => SNAP_S + TOSS_HOLD + TOSS_GLIDE;

// The pawing hoof at s seconds in: {leg, head} offsets (rad). Each strike lifts slowly (60%),
// stamps down in a snap (15%) and drags back to rest (25%). The head eases down and back up.
export function pawPose(s) {
  const len = pawLength();
  if (!(s > 0) || !(s < len)) return {leg: 0, head: 0};
  const u = (s % STRIKE_S) / STRIKE_S;
  let leg;
  if (u < .6) leg = PAW_LIFT * smooth(u / .6);
  else if (u < .75) leg = PAW_LIFT + (PAW_STRIKE - PAW_LIFT) * ((u - .6) / .15) ** 2;
  else leg = PAW_STRIKE * (1 - smooth((u - .75) / .25));
  const head = PAW_HEAD * smooth(s / .35) * (1 - smooth((s - len + .45) / .45));
  return {leg, head};
}

// The toss at s seconds in, to side `side` (±1): {x, z} head offsets (rad).
export function tossPose(s, side = 1) {
  const len = tossLength();
  if (!(s > 0) || !(s < len)) return {x: 0, z: 0};
  // a hard snap (ease-out), then a smooth glide home
  const e = s < SNAP_S ? 1 - (1 - s / SNAP_S) ** 3 : 1 - smooth((s - SNAP_S - TOSS_HOLD) / TOSS_GLIDE);
  return {x: TOSS_UP * e, z: TOSS_SIDE * side * e * (s < SNAP_S + TOSS_HOLD ? 1 : Math.sqrt(e))};
}

// A mote at progress u (0..1) round a horn from `base` to `tip` (body frame). `th` is its start
// angle, `k` where along the horn it starts (0..1). Returns position and alpha (before look alpha).
const _a = new THREE.Vector3(), _p = new THREE.Vector3(), _q = new THREE.Vector3(), _w = new THREE.Vector3();
export function moteAt(u, base, tip, th, k, sink, out = new THREE.Vector3()) {
  u = clamp01(u);
  _a.copy(tip).sub(base);
  const len = _a.length() || 1;
  _a.divideScalar(len);
  // two axes across the horn
  _p.set(1, 0, 0).sub(_w.copy(_a).multiplyScalar(_a.x)).normalize();
  _q.copy(_a).cross(_p);
  const ang = th + u * TAU * 1.3, r = .012 + MOTE_SPREAD * u;
  if (sink) {
    // starts at the tip side, coils down round the horn and sinks below the brow
    out.copy(base).addScaledVector(_a, len * (1 - k * .5) * (1 - u));
    out.y -= .22 * u * u;
  } else {
    out.copy(base).addScaledVector(_a, len * (k + (1 - k) * u));
    out.y += MOTE_RISE * u * u;
  }
  out.addScaledVector(_p, Math.cos(ang) * r).addScaledVector(_q, Math.sin(ang) * r);
  return {pos: out, alpha: Math.sin(Math.PI * u) ** 1.2};
}

// ---- shared resources ----
const mats = new Map();
let tex = null;
function starTexture() {
  if (tex) return tex;
  const n = 32, data = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (i + .5) / n * 2 - 1, y = (j + .5) / n * 2 - 1, d = Math.hypot(x, y);
    // a soft core with four thin spikes
    const a = Math.max(clamp01(1 - d * 2.4) ** 1.5, clamp01(1 - Math.abs(x) * 10) * clamp01(1 - Math.abs(y)) ** 2, clamp01(1 - Math.abs(y) * 10) * clamp01(1 - Math.abs(x)) ** 2);
    const k = (j * n + i) * 4;
    data[k] = data[k + 1] = data[k + 2] = 255; data[k + 3] = Math.round(a * 255);
  }
  tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}
function material(look) {
  const key = look.add ? 'add' : 'normal';
  if (!mats.has(key)) mats.set(key, new THREE.PointsMaterial({size: .045, map: starTexture(), vertexColors: true, transparent: true,
    depthWrite: false, blending: look.add ? THREE.AdditiveBlending : THREE.NormalBlending}));
  return mats.get(key);
}

const HORN_H = .27;
function setup(a) {
  const look = LOOKS[a.species];
  const head = a.body.children.find(c => !c.isMesh && !c.isPoints && !(a.legs || []).includes(c) && c !== a.tail) || null;
  const horn = head?.children.find(m => m.isMesh && m.geometry?.type === 'CylinderGeometry' && m.geometry.parameters?.radiusTop === 0) || null;
  // horn root and tip in the head's frame
  let base, tip;
  if (horn) {
    const h = horn.geometry.parameters.height;
    base = new THREE.Vector3(0, -h / 2, 0).applyQuaternion(horn.quaternion).add(horn.position);
    tip = new THREE.Vector3(0, h / 2, 0).applyQuaternion(horn.quaternion).add(horn.position);
  } else {
    base = new THREE.Vector3(0, .075, .06);
    tip = new THREE.Vector3(0, .075 + HORN_H, .033);
  }
  const st = {seed: ((a.g?.id ?? 1) * 6007) % 2147483647 || 1, look, head, base, tip, life: 1,
    cur: null, f: 0, wait: 0, glintWait: 0, glintAge: null, head0: {x: 0, z: 0}, leg: 0, legIndex: 0,
    hb: new THREE.Vector3(), ht: new THREE.Vector3(), clock: 0, side: 1};
  st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  st.glintWait = GLINT_MIN * rand(st);
  st.motes = Array.from({length: MOTES}, (_, i) => ({off: i / MOTES + rand(st) * .05, len: MOTE_LEN * (1 + .4 * rand(st)),
    th: rand(st) * TAU, k: rand(st) * .6, tw: 5 + rand(st) * 7, drift: new THREE.Vector3(), age: 0, born: false}));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((MOTES + 1) * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array((MOTES + 1) * 4), 4));
  st.points = new THREE.Points(geo, material(look));
  st.points.userData.part = 'hornMotes';
  st.points.frustumCulled = false; st.points.castShadow = st.points.receiveShadow = false;
  a.body.add(st.points);
  return st;
}

// The horn's root and tip in the body's frame, with the head as it is posed now.
function hornNow(st) {
  const h = st.head;
  if (!h) { st.hb.copy(st.base); st.ht.copy(st.tip); return; }
  st.hb.copy(st.base).applyQuaternion(h.quaternion).add(h.position);
  st.ht.copy(st.tip).applyQuaternion(h.quaternion).add(h.position);
}

// Call once per frame after updateActions (bask.js does, for every actor). `busy` is walking or
// acting, as live.js works it out.
export function updateUnicornSparkle(a, dt, t, busy) {
  if (!sparkles(a)) return null;
  const st = a.unicorn || (a.unicorn = setup(a));
  dt = Number.isFinite(dt) ? Math.min(Math.max(0, dt), .1) : 0;
  // take back last frame's head offset
  if (st.head) { st.head.rotation.x -= st.head0.x; st.head.rotation.z -= st.head0.z; }
  st.head0.x = st.head0.z = 0;

  const dead = !!a.actions?.dead, still = !busy && !dead;
  const walking = !!(a.target && a.g && a.g.position.distanceTo(a.target) > .025) && !dead;
  st.life = dead ? (st.life * Math.exp(-DEATH_RATE * dt) < SNAP ? 0 : st.life * Math.exp(-DEATH_RATE * dt)) : 1;

  // ---- paw or toss ----
  if (st.cur) {
    if (still && !st.cur.broken) { st.cur.s += dt; st.f = 1; }
    else { st.cur.broken = true; st.f *= Math.exp(-BREAK_RATE * dt); if (st.f < SNAP) st.f = 0; }
    if (st.f === 0 || st.cur.s >= st.cur.len) { st.cur = null; st.f = 0; st.wait = GAP_MIN + GAP_SPAN * rand(st); }
  } else if (still) {
    st.wait -= dt;
    if (st.wait <= 0) {
      const paw = rand(st) < .55;
      st.cur = {kind: paw ? 'paw' : 'toss', s: 0, len: paw ? pawLength() : tossLength(), side: rand(st) < .5 ? -1 : 1, leg: rand(st) < .5 ? 0 : 2, fired: false};
      st.f = 1;
    }
  }
  let legOff = 0, legIndex = 0;
  if (st.cur) {
    const c = st.cur;
    if (c.kind === 'paw') {
      const p = pawPose(c.s);
      legOff = p.leg * st.f; legIndex = c.leg;
      st.head0.x = p.head * st.f;
    } else {
      const p = tossPose(c.s, c.side);
      st.head0.x = p.x * st.f; st.head0.z = p.z * st.f;
      if (!c.fired && c.s >= SNAP_S) { c.fired = true; st.glintAge = 0; }
    }
  }
  if (st.head) { st.head.rotation.x += st.head0.x; st.head.rotation.z += st.head0.z; }
  // the leg swing is rewritten by live.js every frame, so this is added, never taken back
  const leg = a.legs?.[legIndex];
  if (leg && legOff) leg.rotation.x += legOff;
  st.leg = legOff; st.legIndex = legIndex;

  // ---- motes and glint ----
  hornNow(st);
  const pos = st.points.geometry.attributes.position, col = st.points.geometry.attributes.color;
  const L = st.look, v = new THREE.Vector3();
  st.clock += dt;
  for (let i = 0; i < MOTES; i++) {
    const m = st.motes[i];
    const prev = m.age;
    m.age = ((st.clock / m.len + m.off) % 1);
    // a new cycle: start the trail afresh (and stop spawning once dead)
    if (m.age < prev || !m.born) { m.drift.set(0, 0, 0); m.born = true; m.dead = dead; }
    if (walking) m.drift.z -= TRAIL * dt;
    const {alpha} = moteAt(m.age, st.hb, st.ht, m.th, m.k, L.sink, v);
    v.add(m.drift);
    pos.setXYZ(i, v.x, v.y, v.z);
    const tw = .65 + .35 * Math.sin(t * m.tw + m.th * 3);
    const al = m.dead ? 0 : alpha * tw * L.alpha * st.life;
    col.setXYZW(i, L.mote[0], L.mote[1], L.mote[2], al);
  }
  // the glint: runs up the horn
  st.glintWait -= dt;
  if (st.glintAge == null && st.glintWait <= 0 && !dead) st.glintAge = 0;
  let ga = 0;
  if (st.glintAge != null) {
    st.glintAge += dt;
    const u = st.glintAge / GLINT_LEN;
    if (u >= 1) { st.glintAge = null; st.glintWait = GLINT_MIN + GLINT_SPAN * rand(st); }
    else { v.copy(st.hb).lerp(st.ht, smooth(u)); ga = Math.sin(Math.PI * u) * st.life; }
  }
  if (!ga) v.copy(st.ht);
  pos.setXYZ(MOTES, v.x, v.y, v.z);
  col.setXYZW(MOTES, L.glint[0], L.glint[1], L.glint[2], ga);
  pos.needsUpdate = col.needsUpdate = true;
  st.points.visible = st.life > 0;
  return st;
}
