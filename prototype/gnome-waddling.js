// The gnomes' waddle in play (gnome, gnome lord, gnome king, gnomish wizard; family G, stage 5 step 2). A gnome
// standing still that finds the hero come near lurches all at once into the waddle's widest stride (gnome-waddle.js,
// solved by role and baked by tools/bake-gnome-waddle.mjs into gnome-waddle-poses.js): the left boot flung ahead, the
// pelvis swung round, the weapon thrown out. Then it stops dead there, one foot out, as if it had meant to march off
// and forgotten where, a shiver running down the twisted hips, before it creeps back to standing as slowly as a thing
// hoping not to be noticed. Once as the hero arrives, then again AGAIN seconds after each while he stays; walking, acting
// or dying drops it within DROP. Called from gnome-settle.js after the slump, and only on a gnome fully up: each value
// eases from wherever the frame left it toward the stride and the next call takes that back (gnome-settle.js, and
// gnome-tug.js before its own), so ending or breaking off returns every joint and the body exactly.
import {WADDLE_POSES} from './gnome-waddle-poses.js';
import {waddles} from './gnome-waddle.js';
import {NEAR} from './insect-settle.js';

// LEN: seconds the whole waddle takes; ALERT: seconds from the hero's arrival to the lurch; AGAIN: seconds after one
// ends before a hero who stays near sets off another; DROP: seconds it takes to drop when broken off; SHIVER: how far the hips'
// shiver turns the body while it is held (radians).
export const LEN = 2.6, ALERT = .45, AGAIN = 8, DROP = .2, SHIVER = .03;
// the waddle's phases as shares of LEN: flung into the stride by OUT, held still until HELD, crept back by 1
export const OUT = .07, HELD = .55;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

// The baked stride for this gnome (by its name), or null when it has none that met every goal.
export function waddleFor(a) {
  const b = WADDLE_POSES[(a?.species || a?.name || a?.g?.name || '').toLowerCase()];
  return b?.ok ? b.pose : null;
}

// The waddle at progress u (0..1): {w} 0..1 how far into the stride, {shiver} -1..1 the hips' shiver. Zero at both
// ends. The lurch out is fast; the creep back is long, eased in and out.
export function waddleMotion(u) {
  if (!(u > 0) || !(u < 1)) return {w: 0, shiver: 0};
  const out = smooth(u / OUT), back = (u - HELD) / (1 - HELD);
  const w = out * (1 - smooth(back));
  const h = (u - OUT) / (HELD - OUT);
  // a shiver that dies away while it holds the stride, ending on a zero crossing
  const shiver = h > 0 && h < 1 ? Math.sin(2 * Math.PI * 9 * h) * (1 - h) : 0;
  return {w: clamp01(w), shiver};
}

// Called by gnome-settle.js every frame, after the slump and after taking back last frame's waddle (`st.written`).
// `sitting`: how far the slump is down (0 standing). Returns how far into the stride it is (0..1).
export function applyWaddle(a, st, dt, busy, look, sitting = 0) {
  if (!a || a.asset || !a.joints || !waddles(a) || !waddleFor(a)) return 0;
  const seen = !!look && Number.isFinite(look.x) && Number.isFinite(look.z);
  const near = seen && Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) < NEAR;
  const still = !busy && !a.actions?.dead;
  if (st.u == null) {
    if (!near) { st.wait = null; return 0; }
    if (st.wait == null) st.wait = ALERT;
    if (still && !(sitting > 0)) st.wait -= dt;
    if (st.wait > 0 || !still || sitting > 0) return 0;
    st.u = 0; st.w = 0; st.broken = false; st.wait = AGAIN;
  }
  if (!still || st.broken) { st.broken = true; st.w = Math.max(0, st.w - dt / DROP); }
  else st.u += dt / LEN;
  if (st.u >= 1 || (st.broken && st.w <= 0)) { st.u = null; st.w = 0; st.broken = false; return 0; }
  const m = waddleMotion(st.u);
  if (!st.broken) st.w = m.w;
  const pose = waddleFor(a), w = st.w, shiver = st.broken ? 0 : m.shiver * SHIVER;
  if (!a.jointRest) { a.jointRest = {rest: {}, body: a.body.position.clone()}; for (const [n, o] of Object.entries(a.joints)) a.jointRest.rest[n] = {x: o.rotation.x, y: o.rotation.y, z: o.rotation.z}; }
  if (!a.jointRest.turn) a.jointRest.turn = {y: a.body.rotation.y};
  const {rest, body, turn} = a.jointRest;
  const ease = (obj, ax, target, k = w) => {
    const now = obj[ax], next = now + (target - now) * k;
    if (next === now) return;
    obj[ax] = next; st.written.push({get: () => obj[ax], set: v => { obj[ax] = v; }, left: next, was: now});
  };
  // only the joints the stride moves: the head, the cap and anything else stay as the frame left them
  for (const [n, p] of Object.entries(pose)) {
    const o = a.joints[n];
    if (!o || typeof p !== 'object') continue;
    for (const ax of ['x', 'y', 'z']) if (p[ax]) ease(o.rotation, ax, rest[n][ax] + p[ax]);
  }
  ease(a.body.position, 'y', body.y + (pose.hipsY || 0));
  ease(a.body.rotation, 'y', turn.y + (pose.body?.y || 0) + shiver);
  return w;
}
