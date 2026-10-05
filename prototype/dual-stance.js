// Two-weapon stance: the hero's off arm settles into a ready guard (held out and forward, the
// blade cocked) when a second weapon is wielded, and drops back when it is put away. The shift
// is not a plain blend: as the arm moves it flares a little past its mark and tightens back, a
// quick wary twitch, and the guard keeps a faint restless tremor while it stands.
//
// The sword arm shifts with it: it draws in and drops to a lower, cocked guard, a half-beat
// behind the off arm so the two hands do not move as one.
//
// Everything is an offset on the arms' and elbows' pitch (swing.js's strike poses stack on
// top), taken back first each frame, so it returns exactly to rest and never fights the frame
// loop's own absolute poses (which set the arm's roll, not its pitch).

export const READY = Object.freeze({arm: -.38, elbow: .3});
export const SWORD_READY = Object.freeze({arm: -.14, elbow: .2});
export const FLARE = .22, SETTLE_RATE = 7, TREMOR = .018;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

// Offsets for a stance at fullness k (0 = hands at rest, 1 = ready) at time t seconds.
export function stancePose(k, t = 0) {
  k = clamp01(Number.isFinite(k) ? k : 0);
  const e = smooth(k), flare = Math.sin(Math.PI * e) * FLARE;
  const tremor = Math.sin((Number.isFinite(t) ? t : 0) * 9.3) * TREMOR * e;
  const lag = smooth(k * k), sflare = Math.sin(Math.PI * lag) * FLARE * .5;
  return {arm: READY.arm * e - flare + tremor, elbow: READY.elbow * e + flare * .6 - tremor * .5,
    sword: 0 + SWORD_READY.arm * lag - sflare - tremor * .4, swordElbow: SWORD_READY.elbow * lag + sflare * .6 + tremor * .3};
}

const rigged = a => !!(a && a.shieldArm && a.shieldElbow);

export function unposeDualStance(actor) {
  const o = actor?.dualStance?.applied;
  if (!o || !rigged(actor)) return;
  actor.shieldArm.rotation.x -= o.arm;
  actor.shieldElbow.rotation.x -= o.elbow;
  if (actor.arm) actor.arm.rotation.x -= o.sword;
  if (actor.elbow) actor.elbow.rotation.x -= o.swordElbow;
  actor.dualStance.applied = null;
}

// Call once a frame after the rest pose is set and before actions are applied. Moves the stance
// toward ready while the actor wields two weapons (`actor.dual`), toward rest otherwise.
export function updateDualStance(actor, dt, t = 0) {
  if (!rigged(actor)) return 0;
  const st = actor.dualStance ??= {k: 0, applied: null};
  unposeDualStance(actor);
  const goal = actor.dual ? 1 : 0;
  const step = 1 - Math.exp(-SETTLE_RATE * Math.max(0, Number.isFinite(dt) ? dt : 0));
  st.k += (goal - st.k) * step;
  if (Math.abs(goal - st.k) < 1e-3) st.k = goal;
  // A fully rested stance stays exactly off the rig.
  if (st.k === 0) return 0;
  const p = stancePose(st.k, t);
  actor.shieldArm.rotation.x += p.arm;
  actor.shieldElbow.rotation.x += p.elbow;
  if (actor.arm) actor.arm.rotation.x += p.sword;
  if (actor.elbow) actor.elbow.rotation.x += p.swordElbow;
  st.applied = p;
  return st.k;
}
