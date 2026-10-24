// A dragon's baked folded wings and wingbeat in play (dragon-wing-poses.js, solved by dragon-wings.js): walking,
// the wings fold the bat's way over the back instead of the hand-set furl; rising from sleep, they open and beat
// twice, up over the back and down under the shoulders, and settle back. Called from updateDragonMenace
// (dragon-menace.js) after the frame's own wing writes; every write is undone first thing next frame (back to
// exactly the value found), so the wings end exactly where they were.
import {WING_POSES} from './dragon-wing-poses.js';

// The flap: OPEN s to the top of the first beat, BEAT s for each half-beat (down, up, down: BEATS full beats),
// SETTLE s back to the fold or the standing wings.
export const FLAP = {open: .3, beat: .22, beats: 2, settle: .5};
export const flapLength = () => FLAP.open + FLAP.beats * 2 * FLAP.beat - FLAP.beat + FLAP.settle;

// The baked wings for an actor (by species), or null when it has none that met its goals.
export function wingsFor(a) { const e = WING_POSES[a?.species]; return e?.ok ? e : null; }

const smooth = v => { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); };
const AXES = ['x', 'y', 'z'];
// a pose `k` of the way from nothing (the standing wings) to `p`
const part = (p, k) => { const o = {}; for (const [n, q] of Object.entries(p)) { o[n] = {}; for (const ax of AXES) if (q[ax]) o[n][ax] = q[ax] * k; if (q.s !== undefined) o[n].s = 1 + (q.s - 1) * k; } return o; };
const mix = (a, b, k) => { const o = {}; for (const n of new Set([...Object.keys(a), ...Object.keys(b)])) { o[n] = {}; for (const ax of AXES) o[n][ax] = (a[n]?.[ax] || 0) + ((b[n]?.[ax] || 0) - (a[n]?.[ax] || 0)) * k; const s0 = a[n]?.s ?? 1, s1 = b[n]?.s ?? 1; if (s0 !== 1 || s1 !== 1) o[n].s = s0 + (s1 - s0) * k; } return o; };

// The flap's pose s seconds in, from (and back to) `from`: up, down, up, down..., then back.
export function flapPose(e, s, from) {
  const keys = [[0, from], [FLAP.open, e.up]];
  for (let i = 1; i < FLAP.beats * 2; i++) keys.push([keys.at(-1)[0] + FLAP.beat, i % 2 ? e.down : e.up]);
  keys.push([keys.at(-1)[0] + FLAP.settle, from]);
  for (let i = 1; i < keys.length; i++) if (s <= keys[i][0]) return mix(keys[i - 1][1], keys[i][1], smooth((s - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
  return from;
}

export function takeBackWings(st) {
  for (let i = st.written.length - 1; i >= 0; i--) { const w = st.written[i]; if (w.get() === w.left) w.set(w.was); }
  st.written.length = 0;
}

// One frame: `furl` (0..1) how far folded, `flap` the flap's time (s) or null. Writes the wings' pose on top of
// whatever the frame wrote.
export function applyWings(a, st, e, furl, flap) {
  let pose = part(e.fold, furl);
  if (flap !== null) pose = flapPose(e, flap, pose);
  for (const [n, p] of Object.entries(pose)) {
    const o = a.joints?.[n]; if (!o) continue;
    for (const ax of AXES) { const d = p[ax]; if (!d) continue; const r = o.rotation, was = r[ax]; r[ax] += d; st.written.push({get: () => r[ax], set: v => { r[ax] = v; }, left: r[ax], was}); }
    if (p.s !== undefined && p.s !== 1) { const was = o.scale.x, next = was * p.s; o.scale.setScalar(next); st.written.push({get: () => o.scale.x, set: v => o.scale.setScalar(v), left: next, was}); }
  }
}
