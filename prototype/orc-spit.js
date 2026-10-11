// Idle hawk-and-spit for orcs (orc.js). An orc that has stood still for a few seconds now and then
// scrapes its throat: the head drops and heaves back twice, the free (left) forearm comes up to
// wipe the tusks on a knuckle, then the head snaps forward and aside in a hard spit and the orc
// glares after it, daring anything to comment. Walking, an action or death fades it out within
// ~0.1 s.
//
// Only the head and the left arm move, as offsets on top of whatever the idle loop and actions.js
// posed this frame. The spit takes back its own last offset first and then adds this frame's.

// RAISE: left arm lifted to the mouth (negative x); IN: arm swung across (z); HEAVE: head thrown
// back on each hawk (negative x); HUNCH: head dropped before it (+x); SPIT: the snap aside (y).
export const RAISE = 1.5, IN = .38, HEAVE = .3, HUNCH = .24, SPIT = .7;
// Seconds for one spit.
export const SPIT_LEN = 3;
// First spit after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 6, FIRST_SPAN = 5, GAP_MIN = 10, GAP_SPAN = 9;
const FADE_OUT = 14, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const win = (u, a, b, edge) => smooth((u - a) / edge) - smooth((u - b) / edge);
const hump = (u, a, b) => { const w = (u - a) / (b - a); return w > 0 && w < 1 ? Math.sin(Math.PI * w) : 0; };

export const spits = a => !!(a && !a.asset && a.quirk === 'orc' && !a.troll && a.weaponSocket && a.head && Array.isArray(a.arms) && a.arms.length === 2);

const ZERO = () => ({raise: 0, across: 0, heave: 0, hunch: 0, spit: 0});

// Phases in u: hunch .05-.7, two hawks (heaves) .15-.5, wipe .5-.78, the spit .6-.7 then a glare
// back the other way .72-.9.
export function spitPose(u, f = 1) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  p.hunch = HUNCH * win(u, .05, .62, .08) * f;
  p.heave = HEAVE * (hump(u, .15, .31) + hump(u, .31, .5)) * f;
  const wipe = win(u, .46, .8, .08);
  p.raise = RAISE * wipe * f;
  p.across = IN * wipe * f;
  // the snap aside is sudden; the glare back is slow
  p.spit = SPIT * (smooth((u - .6) / .04) - smooth((u - .7) / .05) - .35 * hump(u, .72, .92)) * f;
  return p;
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after updateActions. `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not spitting.
export function updateOrcSpit(actor, dt, t, busy) {
  if (!spits(actor)) return null;
  const st = actor.orcSpit || (actor.orcSpit = {seed: ((actor.g?.id ?? 1) * 40503719) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  const {head, arms: [hand]} = actor, o = st.applied;
  hand.rotation.x += o.raise; hand.rotation.z -= o.across;
  head.rotation.x -= o.hunch - o.heave; head.rotation.y -= o.spit;
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead;
  if (st.cur) {
    // An interrupted spit always fades out; it never picks back up.
    if (still && !st.cur.broken) st.cur.u += dt / SPIT_LEN;
    else { st.cur.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP) st.f = 0; }
    if (st.cur.u >= 1 || !(st.f > 0)) {
      st.cur = null; st.f = 0;
      st.wait = still ? GAP_MIN + GAP_SPAN * rand(st) : FIRST_MIN + FIRST_SPAN * rand(st);
    }
  } else if (still) {
    st.wait -= dt;
    if (st.wait <= 0) { st.cur = {u: 0}; st.f = 1; st.wait = 0; }
  } else st.wait = Math.max(st.wait, FIRST_MIN);

  if (!st.cur) return null;
  const p = spitPose(st.cur.u, st.f);
  hand.rotation.x -= p.raise; hand.rotation.z += p.across;
  head.rotation.x += p.hunch - p.heave; head.rotation.y += p.spit;
  st.applied = p;
  return p;
}
