// Idle wing flex for beetles (beetle.js, flagged `beetle`, with `elytra` and `hindwings`). A beetle that has stood
// still a while now and then cracks its wing cases open, lifts and parts them, swings its folded flying wings out
// and buzzes them in a blur for a moment, as if about to take off, then thinks better of it: the wings fold back
// in and the cases come down and shut with a last little shudder. Walking, an action or death folds it away
// within ~0.15 s. It never starts while the gnash (beetle-gnash.js) is playing.
//
// Offsets on top of the cases' and wings' rest pose: LIFT raises the cases' tips (x), PART swings them out (y);
// the wings turn from folded (their userData.fold) out to SPREAD of a right angle, buzzing by BUZZ (z) at BUZZ_HZ.
// The wings are shown only while they are out.
export const LIFT = .7, PART = .45, SPREAD = .92, BUZZ = .35, BUZZ_HZ = 38;
// Seconds for one flex.
export const FLEX_LEN = 2.6;
// First flex after FIRST_MIN..+FIRST_SPAN s of standing still, then GAP_MIN..+GAP_SPAN apart.
export const FIRST_MIN = 7, FIRST_SPAN = 8, GAP_MIN = 14, GAP_SPAN = 14;
const FADE_OUT = 14, SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const win = (u, a, b, edge) => smooth((u - a) / edge) - smooth((u - b) / edge);
const hump = (u, a, b) => { const w = (u - a) / (b - a); return w > 0 && w < 1 ? Math.sin(Math.PI * w) : 0; };

export const flexes = a => !!(a && !a.asset && a.beetle && a.elytra?.length === 2 && a.hindwings?.length === 2);

const ZERO = () => ({lift: 0, part: 0, spread: 0, buzz: 0});

// Phases in u: the cases crack open .02-.14 and part .08-.22, then the wings swing out .18-.32, buzz .3-.66 (the
// cases quivering with them), swing in .62-.76, and the cases come down .72-.9, shutting with a small shudder .9-.98.
export function flexPose(u, f = 1, t = 0) {
  const p = ZERO();
  if (!(f > 0) || !(u > 0) || !(u < 1)) return p;
  const open = win(u, .02, .82, .14);
  p.lift = LIFT * (open + .06 * hump(u, .9, .98)) * f;
  p.part = PART * win(u, .08, .78, .14) * f;
  p.spread = SPREAD * win(u, .18, .7, .14) * f;
  const buzzing = win(u, .3, .66, .04);
  p.buzz = BUZZ * buzzing * Math.sin(t * BUZZ_HZ * 2 * Math.PI) * f;
  p.lift += .04 * buzzing * Math.sin(t * BUZZ_HZ * Math.PI) * f;
  return p;
}

function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after updateActions (and the gnash). `busy` is true while the actor walks or has an action
// playing or queued. Returns the pose applied this frame, or null when not flexing.
export function updateBeetleFlex(actor, dt, t, busy) {
  if (!flexes(actor)) return null;
  const st = actor.beetleFlex || (actor.beetleFlex = {seed: ((actor.g?.id ?? 1) * 69069 + 7) % 2147483647 || 1, wait: 0, cur: null, f: 0, applied: ZERO()});
  const {elytra, hindwings} = actor, o = st.applied;
  // take back last frame's offsets
  elytra.forEach(c => { const s = c.userData.side; c.rotation.x -= o.lift; c.rotation.y += s * o.part; });
  hindwings.forEach(w => { const s = w.userData.side; w.rotation.y += s * o.spread * Math.PI / 2; w.rotation.z -= s * o.buzz; });
  st.applied = ZERO();
  if (!st.wait && !st.cur) st.wait = FIRST_MIN + FIRST_SPAN * rand(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const still = !busy && !actor.actions?.dead && !actor.beetleGnash?.cur;
  if (st.cur) {
    // an interrupted flex always folds away; it never picks back up
    if (still && !st.cur.broken) st.cur.u += dt / FLEX_LEN;
    else { st.cur.broken = true; st.f *= Math.exp(-FADE_OUT * dt); if (st.f < SNAP) st.f = 0; }
    if (st.cur.u >= 1 || !(st.f > 0)) {
      st.cur = null; st.f = 0;
      st.wait = still ? GAP_MIN + GAP_SPAN * rand(st) : FIRST_MIN + FIRST_SPAN * rand(st);
    }
  } else if (still) {
    st.wait -= dt;
    if (st.wait <= 0) { st.cur = {u: 0}; st.f = 1; st.wait = 0; }
  } else st.wait = Math.max(st.wait, FIRST_MIN);

  const p = st.cur ? flexPose(st.cur.u, st.f, t) : ZERO();
  elytra.forEach(c => { const s = c.userData.side; c.rotation.x += p.lift; c.rotation.y -= s * p.part; });
  hindwings.forEach(w => { const s = w.userData.side; w.rotation.y -= s * p.spread * Math.PI / 2; w.rotation.z += s * p.buzz; w.visible = p.spread > .02; });
  st.applied = p;
  return st.cur ? p : null;
}
