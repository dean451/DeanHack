// The lich's turn in play (family L, stage 5 step 2): a lich, demilich, master lich or arch-lich left standing, the
// hero coming within NEAR off to one side, turns to face him in one piece, the way lich-turn.js times it: a pause,
// then the whole figure ratchets round in shuffling steps (turnAt), the skull never leading, the weight rocking out
// over alternate feet (the upright shuffles baked by tools/bake-lich-turn.mjs into lich-turn-poses.js, blended by
// each step's sway). It keeps the heading it turned to, as a dog keeps facing the hero after its bow
// (canine-bowing.js); walking, acting or dying breaks the turn off at once. The shuffle is an offset on top of the
// frame, taken back at the start of the next call, so every joint returns exactly to its standing value.
// Called from live-frame.js's actor loop just before lich-settle.js (whose stoop it takes back first, as
// kobold-cringe.js does the kobold's crouch).
import {TURN_POSES} from './lich-turn-poses.js';
import {turnPlan, turnAt, turns} from './lich-turn.js';
import {takeBackRest, NEAR} from './insect-settle.js';

// FACE: how far off his bearing (rad) the hero may stand before the lich turns to him; GAP: seconds at least between
// the end of one turn and the start of the next. Both set by eye: no source gave a threshold or a rest.
export const TURNING = {FACE: .35, GAP: 1.5};

const wrap = v => Math.atan2(Math.sin(v), Math.cos(v));

// The baked shuffles for this lich (by its name), or null when it has none that met every goal.
export function shufflesFor(a) {
  const b = TURN_POSES[(a?.species || a?.name || a?.g?.name || '').toLowerCase()];
  return b?.ok ? b : null;
}

// Called every frame for every actor; does nothing for a creature that is not a lich. `look`: the hero's position.
// Returns how far round the current turn is (0 to 1), or 0 when it is not turning.
export function updateLichTurn(a, dt, busy, look = null) {
  if (!a || a.asset || !a.joints || !turns(a)) return 0;
  // the stoop (lich-settle.js) runs after this and eases these same joints: take it back first, so this call's own
  // take-back finds its values as it left them (it then re-eases from the frame this call writes)
  if (a.lichRest) takeBackRest(a.lichRest);
  const st = a.lichTurning || (a.lichTurning = {turn: null, since: Infinity, written: []});
  takeBackRest(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  if (busy || a.actions?.dead) { st.turn = null; st.since = 0; return 0; }
  const g = a.g;
  if (!st.turn) {
    st.since += dt;
    const seen = !!look && Number.isFinite(look.x) && Number.isFinite(look.z);
    if (!seen || st.since < TURNING.GAP) return 0;
    const dx = look.x - g.position.x, dz = look.z - g.position.z;
    if (Math.hypot(dx, dz) >= NEAR) return 0;
    const angle = wrap(Math.atan2(dx, dz) - g.rotation.y);
    if (Math.abs(angle) <= TURNING.FACE) return 0;
    st.turn = {plan: turnPlan(angle), from: g.rotation.y, t: 0};
  }
  const turn = st.turn;
  turn.t += dt;
  const s = turnAt(turn.plan, turn.t);
  g.rotation.y = turn.from + turn.plan.angle * s.yaw;
  if (s.done) { st.turn = null; st.since = 0; return 1; }
  const baked = shufflesFor(a), pose = baked && s.side ? baked[s.side < 0 ? 'l' : 'r'] : null;
  if (pose && s.sway > 0) for (const [n, p] of Object.entries(pose)) {
    const o = a.joints[n]?.rotation; if (!o) continue;
    for (const ax of ['x', 'y', 'z']) {
      if (!p[ax]) continue;
      const was = o[ax], next = was + p[ax] * s.sway;
      if (next === was) continue;
      o[ax] = next; st.written.push({get: () => o[ax], set: v => { o[ax] = v; }, left: next, was});
    }
  }
  return s.yaw;
}
