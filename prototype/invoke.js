// Idle incantation for the shamans (the kobold shaman and the orc shaman, whose models both carry
// an upright skull-topped staff in the right fist). A shaman that has stood still for a few
// seconds now and then calls on its gods: it tips its head back and raises the staff high, lifts
// its free hand palm up, sways its head as it chants while the staff rattles in its fist (the
// bones and feathers under the skull shaking), then brings the staff down with a thump and a
// sharp nod. Walking, an action or death fades it out within ~0.1 s.
//
// Wizards (wizard.js, whose upright quarterstaff ends in a claw round a glowing orb) cast the same
// way but with no bones to rattle: the staff only trembles a little in the fist, and instead the
// orb kindles. It brightens and swells as the staff goes up, flickers while the wizard chants, and
// flares at the thump before dying back to its resting glow. The orb's material is shared by
// every wizard, so a wizard gets its own copy the first time it casts (freed with the model).
//
// Only the head, the arms and the weapon socket (roll and pitch) move, as offsets on top of whatever the idle
// loop and actions.js posed this frame. The body is left alone, because the legs hang from it.
// Nothing else writes these parts absolutely each frame (actions.js also works in offsets), so
// the incantation takes back its own last offset first and then adds this frame's.

// RAISE: staff arm raised forward and up (negative x); PALM: the free arm lifted; LOOK: head
// tipped back (negative x); SWAY: the chanting sway of the head (roll); SHAKE: the staff arm's
// rattle (roll); RATTLE: the fist's twist in the rattle (socket roll); NOD: the nod at the thump.
// LEVEL: how much of the arm's raise the fist takes back (socket pitch), so the upright staff is
// lifted high and leans a little forward rather than tipping back over the shoulder.
export const RAISE = .95, PALM = .55, LOOK = .22, SWAY = .1, SHAKE = .06, RATTLE = .14, NOD = .16, LEVEL = 1.12;
// Seconds for one incantation; head sways and rattles per second.
export const INVOKE_LEN = 3.2, SWAY_RATE = 1.4, RATTLE_RATE = 8;
// First incantation after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 4, FIRST_SPAN = 4, GAP_MIN = 7, GAP_SPAN = 8;
const FADE_OUT = 14, SNAP = 1e-3;
const SHAMANS = new Set(['kobold shaman', 'orc shaman']);
// The wizard's orb: GLOW is the pose's glow at the flare (the chant holds about half of it); the
// orb's emissive intensity rises by BRIGHT and its scale by SWELL per unit of glow. The trembling
// staff is TREMBLE of a shaman's rattle. FLICKER_RATE: the orb's flickers per second while chanting.
export const GLOW = 1, BRIGHT = 3.2, SWELL = .35, TREMBLE = .25, FLICKER_RATE = 6;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
// 1 between a and b, easing in and out over `edge` either side; 0 outside.
const win = (u, a, b, edge) => smooth((u - a) / edge) - smooth((u - b) / edge);
// A rise-and-fall bump over [a, b], 0 at both ends, peaking at 1.
const hump = (u, a, b) => { const w = (u - a) / (b - a); return w > 0 && w < 1 ? Math.sin(Math.PI * w) : 0; };

const conjures = a => a.kind === 'wizard' && !!a.orb?.material;
export const invokes = a => !!(a && !a.asset && (SHAMANS.has(a.g?.name) || conjures(a)) && a.head && a.arm && a.weaponSocket && a.arms?.length >= 2);

const ZERO = () => ({raise: 0, palm: 0, look: 0, sway: 0, shake: 0, rattle: 0, glow: 0});

// The incantation's offsets at progress u (0..1), scaled by f (0..1). Everything is 0 at u = 0 and 1.
// With `orb` (a wizard), the rattle shrinks to a tremble and `glow` carries the orb's kindling;
// without it, glow stays 0.
export function invokePose(u, f = 1, orb = false) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  const s = u * INVOKE_LEN, chant = hump(u, .14, .7);
  // the staff goes up slowly and comes down fast (the thump is at about u = .75)
  p.raise = RAISE * (smooth((u - .1) / .25) - smooth((u - .7) / .06)) * f;
  p.palm = PALM * win(u, .14, .7, .12) * f;
  // head back while the staff is up, swaying as it chants; a sharp nod as the staff lands
  p.look = (-LOOK * win(u, .08, .68, .1) + NOD * hump(u, .74, .9)) * f;
  p.sway = SWAY * chant * Math.sin(2 * Math.PI * (s - .14 * INVOKE_LEN) * SWAY_RATE) * f;
  // the rattle: the arm shivers and the fist twists, a quarter-cycle apart
  p.shake = SHAKE * chant * Math.sin(2 * Math.PI * s * RATTLE_RATE) * f;
  p.rattle = RATTLE * chant * Math.cos(2 * Math.PI * s * RATTLE_RATE) * f;
  if (orb) {
    p.shake *= TREMBLE; p.rattle *= TREMBLE;
    // it kindles with the raise, flickers through the chant, flares at the thump and dies back
    const kindle = .5 * win(u, .12, .74, .14) * (1 + .2 * chant * Math.sin(2 * Math.PI * s * FLICKER_RATE));
    const flare = hump(u, .72, .98);
    p.glow = GLOW * Math.max(kindle, flare * flare) * f;
  }
  return p;
}

// Nothing else writes the orb's glow or scale, so they are set outright from the resting values.
function setOrb(orb, rest, glow) {
  orb.scale.setScalar(rest.scale * (1 + SWELL * glow));
  if (rest.own) orb.material.emissiveIntensity = rest.base + BRIGHT * glow;
}

// Deterministic per-actor PRNG, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not invoking.
export function updateInvoke(actor, dt, t, busy) {
  if (!invokes(actor)) return null;
  const st = actor.invoke || (actor.invoke = {seed: ((actor.g?.id ?? 1) * 15485863) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  const {head, arm, arms, weaponSocket: socket} = actor, o = st.applied;
  head.rotation.x -= o.look; head.rotation.z -= o.sway;
  arm.rotation.x += o.raise; arm.rotation.z -= o.shake;
  arms[0].rotation.x += o.palm;
  socket.rotation.z -= o.rattle; socket.rotation.x -= o.raise * LEVEL;
  st.applied = ZERO();
  const orb = conjures(actor) ? actor.orb : null;
  if (orb && !st.orb) st.orb = {base: orb.material.emissiveIntensity, scale: orb.scale.x, own: false};
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted incantation always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / INVOKE_LEN;
    else { st.cur.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP) st.f = 0; }
    if (st.cur.u >= 1 || !(st.f > 0)) {
      st.cur = null; st.f = 0;
      st.wait = still ? GAP_MIN + GAP_SPAN * rand(st) : FIRST_MIN + FIRST_SPAN * rand(st);
    }
  } else if (still) {
    st.wait -= dt;
    if (st.wait <= 0) { st.cur = {u: 0}; st.f = 1; st.wait = 0; }
  } else st.wait = Math.max(st.wait, FIRST_MIN);

  if (!st.cur) { if (orb) setOrb(orb, st.orb, 0); return null; }
  const p = invokePose(st.cur.u, st.f, !!orb);
  if (orb) {
    if (!st.orb.own) {
      const own = orb.material = orb.material.clone(), prev = orb.userData.dispose;
      orb.userData.dispose = () => { prev?.(); own.dispose(); };
      st.orb.own = true;
    }
    setOrb(orb, st.orb, p.glow);
  }
  head.rotation.x += p.look; head.rotation.z += p.sway;
  arm.rotation.x -= p.raise; arm.rotation.z += p.shake;
  arms[0].rotation.x -= p.palm;
  socket.rotation.z += p.rattle; socket.rotation.x += p.raise * LEVEL;
  st.applied = p;
  return p;
}
