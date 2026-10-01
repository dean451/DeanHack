// The lights' flare (creature animation queue item 7). A yellow or black light lives to drift up
// to you and burst, so it hangs in the air like a lure, gliding a little toward the hero.
//  - Yellow light: the core gutters like a candle that never goes out, and its motes circle out
//    and loop round it. A flare is a glare: the core blazes, the halo swells and the motes are
//    flung wide, then all of it draws back in.
//  - Black light: it drinks the light. The core throbs low and slow, and its motes spiral in from
//    the halo's edge and vanish into it. A flare is a gloom: the core all but goes out while the
//    halo swells dim and the motes pour in fast, then it lets go in one dark pulse.
//  - Both: it leans toward the hero within RANGE tiles, and the flicker or throb quickens as the
//    hero comes near. An attack (the burst) swells the halo up hard and blazes the core; a hit
//    makes it gutter. On death everything eases to rest (deaths.js does the rest).
//
// Matched on the model's `light`, `lift`, `halo` and `ring` (creatures.js' wisp()). It owns the
// lift's position, the halo's scale and opacity, the ring's rotation, each mote's position and
// scale, and the core's glow (live.js leaves the core alone once this has claimed it). live.js
// writes the hover bob on the body.

const TAU = Math.PI * 2;
// Hero range (tiles), how far it leans toward the hero, and how fast it closes that.
export const RANGE = 6, NEAR = 1.5, LEAN = .07, LEAN_RATE = 1.2;
// Flares: first after FIRST_MIN..+FIRST_SPAN s, then GAP_MIN..+GAP_SPAN apart; FLARE_LEN s long.
export const FIRST_MIN = 2, FIRST_SPAN = 3, GAP_MIN = 4, GAP_SPAN = 6, FLARE_LEN = 2;
// The core's glow at rest (what live.js used to pulse round), in a flare and in an attack.
export const CORE_BASE = 4.5, CORE_FLARE = 6, CORE_ATTACK = 9;
// The halo's swell in a flare and an attack; how far a flare flings the yellow motes.
export const HALO_FLARE = .5, HALO_ATTACK = 1.1, FLING = .6, PULSE_LEN = .6, REST_RATE = 3;
const SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export const flares = a => !!(a && !a.asset && (a.light === 'yellow' || a.light === 'black') && a.lift && a.halo && a.ring && a.core?.material);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// A flare's strength at progress u (0..1): eases in, holds, lets go; 0 outside.
export function flareAt(u) {
  if (!(u > 0) || !(u < 1)) return 0;
  return smooth(u / .35) * (1 - smooth((u - .7) / .3));
}
// A candle's gutter at time t: about 1, with quick shivers and now and then a dip; .55..1.15.
export function gutterAt(t, ph = 0) {
  const n = .55 * Math.sin(t * 7.3 + ph) + .3 * Math.sin(t * 13.1 + ph * 3) + .15 * Math.sin(t * 23.7 + ph * 5);
  const dip = Math.max(0, Math.sin(t * 1.37 + ph * 2) * Math.sin(t * 2.9 + ph)) ** 3;
  return Math.min(1.15, Math.max(.55, 1 + .12 * n - .4 * dip));
}

function setup(a) {
  const st = {seed: ((a.g?.id ?? 1) * 69621) % 2147483647 || 1, t: 0, life: 1, flare: null, wait: 0, near: 0, hit: -1, lastHit: null,
    lx: 0, lz: 0, f: 0, spin: 0, pull: 0, pt: -1,
    rest: {lift: a.lift.position.clone(), halo: a.halo.scale.clone(), opacity: a.halo.material.opacity, ring: a.ring.rotation.y,
      motes: a.ring.children.map(m => ({p: m.position.clone(), s: m.scale.clone()}))}};
  st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  st.ph = rand(st) * TAU;
  // the halo's material is the light's own already (wisp() makes one per light), and so is the core's
  a.core.material.emissiveIntensity = CORE_BASE;
  return st;
}

function current(a, kind) {
  const q = a.actions, cur = q?.current;
  return cur?.kind === kind && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
}

// Where the hero is from the light, in its parent's space: {near 0..1, dx, dz unit}, or null.
function heroFrom(a, look) {
  const g = a.g;
  if (!g || !look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return null;
  const dx = look.x - g.position.x, dz = look.z - g.position.z, d = Math.hypot(dx, dz);
  if (!(d > 1e-6)) return null;
  return {near: 1 - smooth((d - NEAR) / (RANGE - NEAR)), dx: dx / d, dz: dz / d};
}

// Call once a frame (fidget.js does). `busy` holds off a flare while it moves or acts; `look` is
// the hero's position (same parent as actor.g), or null.
export function updateLightFlare(a, dt, t, busy, look = null) {
  if (!flares(a)) return null;
  const black = a.light === 'black';
  const st = a.lightFlare || (a.lightFlare = setup(a));
  const dead = !!a.actions?.dead;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.t += dt;
  const T = st.t;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  const w = st.life;

  // a blow makes it gutter, nearly out, and knocks any flare out of it
  const hit = dead ? null : a.actions?.current?.kind === 'hit' ? a.actions.current : null;
  if (hit && hit !== st.lastHit) { st.lastHit = hit; st.hit = 0; st.flare = null; }
  if (st.hit >= 0) { st.hit += dt / .6; if (st.hit >= 1) st.hit = -1; }
  const gut = st.hit < 0 ? 0 : smooth(st.hit / .3) * (1 - smooth((st.hit - .15) / .85));
  // the core sputters while it gutters; the halo just shrinks
  const sputter = gut * (.6 + .4 * Math.sin(T * 41) ** 2);

  // the attack (the burst): the halo swells up hard and the core blazes
  const atk = dead ? null : current(a, 'attack');
  if (atk) st.flare = null;
  const au = atk ? a.actions.u ?? 0 : 0, swell = atk ? smooth(au / .5) * (1 - smooth((au - .75) / .25)) : 0;

  // flares on their own clock, only while it holds still
  if (st.flare != null) { st.flare += dt / FLARE_LEN; if (st.flare >= 1) { st.flare = null; st.pt = 0; } }
  else if (!dead) {
    st.wait -= dt;
    if (st.wait <= 0 && !busy) { st.flare = 0; st.wait = GAP_MIN + GAP_SPAN * rand(st); }
  }
  if (dead) st.flare = null;
  // eased, so a blow or the burst cutting a flare short lets it go fast rather than in one frame
  st.f = approach(st.f, flareAt(st.flare ?? 0), 8, dt);
  const f = st.f;
  // the release at a flare's end: one swell and fall over PULSE_LEN s
  if (st.pt >= 0) { st.pt += dt / PULSE_LEN; if (st.pt >= 1 || dead) st.pt = -1; }
  const pulse = st.pt < 0 ? 0 : Math.sin(Math.PI * st.pt) ** 2;

  // it leans toward the hero, and quickens as they come near
  const h = dead ? null : heroFrom(a, look);
  st.near = approach(st.near, h ? h.near : 0, 2, dt);
  const lean = h ? LEAN * h.near * (1 + swell) : 0;
  st.lx = approach(st.lx, h ? h.dx * lean : 0, LEAN_RATE + 6 * swell, dt);
  st.lz = approach(st.lz, h ? h.dz * lean : 0, LEAN_RATE + 6 * swell, dt);
  const quick = 1 + 1.2 * st.near;
  // a slow wander on top, a lazy figure-of-eight
  const wx = .03 * Math.sin(T * .41 + st.ph), wz = .03 * Math.sin(T * .82 + st.ph * 2), wy = .02 * Math.sin(T * .63 + st.ph);
  const R = st.rest;
  a.lift.position.set(R.lift.x + (wx + st.lx) * w, R.lift.y + (wy + .03 * swell - .03 * gut) * w, R.lift.z + (wz + st.lz) * w);

  // the core: a yellow light gutters like a candle; a black one throbs low and slow, and a flare
  // all but puts it out before the dark pulse at the end
  let glow;
  if (black) {
    const throb = .5 - .5 * Math.cos(T * (1.1 * quick) + st.ph);
    glow = CORE_BASE - 1.6 + 2.2 * throb - (CORE_BASE - 1) * f + 3 * pulse;
  } else glow = CORE_BASE * gutterAt(T * quick, st.ph) + CORE_FLARE * f;
  glow += CORE_ATTACK * swell - 3.5 * sputter;
  a.core.material.emissiveIntensity = Math.max(.4, CORE_BASE + (glow - CORE_BASE) * w);

  // the halo: swells in a flare and the burst, shrinks at a blow
  const hs = 1 + (HALO_FLARE * f + HALO_ATTACK * swell - .25 * gut + (black ? .04 : .03) * Math.sin(T * 1.7 * quick + st.ph) + .2 * pulse) * w;
  a.halo.scale.copy(R.halo).multiplyScalar(hs);
  a.halo.material.opacity = R.opacity * (1 + ((black ? .7 : .5) * f + .6 * swell - .5 * gut) * w);

  // the motes: yellow ones circle out and loop up and down; black ones spiral in and vanish
  st.spin = dead ? approach(wrap(st.spin), 0, REST_RATE, dt) : st.spin + (black ? -1 : 1) * (.9 + 1.5 * f + 2 * swell) * quick * dt;
  a.ring.rotation.y = R.ring + wrap(st.spin) * w;
  st.pull = (st.pull + (dead ? 0 : (.25 + 1.4 * f) * quick * dt)) % 1;
  a.ring.children.forEach((m, i) => {
    const r = R.motes[i];
    if (!r) return;
    let k = 1, y = 0, s = 1;
    if (black) {
      // each mote's own place on the inward spiral (0 at the halo's edge, 1 in the core)
      const u = (st.pull + i / R.motes.length) % 1;
      k = 1.15 - u; s = smooth(u / .15) * (1 - smooth((u - .7) / .3)) * (1 - .4 * gut);
    } else {
      k = 1 + .12 * Math.sin(T * 1.3 * quick + i * 1.9) + FLING * f + .5 * swell - .3 * gut;
      y = .06 * Math.sin(T * 2.1 * quick + i * 2.3);
      s = 1 + .5 * f + .4 * (gutterAt(T * quick + i, st.ph) - 1);
    }
    m.position.set(r.p.x * (1 + (k - 1) * w), r.p.y * (1 + (k - 1) * w) + y * w, r.p.z * (1 + (k - 1) * w));
    m.scale.copy(r.s).multiplyScalar(1 + (s - 1) * w);
  });
  return st;
}
