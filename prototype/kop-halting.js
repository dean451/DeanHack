// The Kops' halt in play (Keystone Kop, Kop Sergeant, Kop Lieutenant, Kop Kaptain; family K, stage 5 step 2). A Kop
// standing to attention that finds the hero come near throws the halt kop-halt.js solves by role (baked by
// tools/bake-kop-halt.mjs into kop-halt-poses.js): the left arm shot straight out at him, the truncheon cocked up
// behind the helmet, rocked back on the heels. It holds the arm out while the club fist gives two short officious
// shakes, then lowers it all again. The uncanny part is the film: the whole halt plays at a silent comedy's cranking
// rate (FPS, from KOP's crankFps in creature-measures.js), each pose held for a frame and then jumped to the next,
// so the Kop alone moves in jerks while the dungeon around it moves smoothly. Once as the hero arrives, then again
// AGAIN seconds after each while he stays; walking, acting or dying drops it within DROP. Called from kop-settle.js
// after the stance at ease, and only on a Kop fully at attention: each value eases from wherever the frame left it
// toward the halt and the next call takes that back (kop-settle.js), so ending or breaking off returns every joint
// and the body exactly.
import {HALT_POSES} from './kop-halt-poses.js';
import {halts} from './kop-halt.js';
import {NEAR} from './insect-settle.js';
import {MEASURES} from './creature-measures.js';

// LEN: seconds the whole halt takes; ALERT: seconds from the hero's arrival to the halt; AGAIN: seconds after one
// ends before a hero who stays near sets off another; DROP: seconds it takes to drop when broken off; SHAKE: how far
// each shake of the club fist tips the wrist (radians); FPS: the film's frames a second (the middle of crankFps).
export const LEN = 3, ALERT = .5, AGAIN = 9, DROP = .2, SHAKE = .35;
export const FPS = (MEASURES.kop.crankFps[0] + MEASURES.kop.crankFps[1]) / 2;
// the halt's phases as shares of LEN: thrown out by OUT, held until HELD (the two shakes inside it), lowered by 1
export const OUT = .06, HELD = .6;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

// The baked halt for this Kop (by its name), or null when it has none that met every goal.
export function haltFor(a) {
  const b = HALT_POSES[(a?.species || a?.name || a?.g?.name || '').toLowerCase()];
  return b?.ok ? b.pose : null;
}

// The halt at progress u (0..1): {h} 0..1 how far into the halt, {shake} 0..1 the club fist's shake. Zero at both
// ends. Thrown out fast, lowered over the long last share.
export function haltMotion(u) {
  if (!(u > 0) || !(u < 1)) return {h: 0, shake: 0};
  const h = smooth(u / OUT) * (1 - smooth((u - HELD) / (1 - HELD)));
  // two shakes in the middle of the hold, each a quick tip and back
  const k = (u - OUT) / (HELD - OUT), s = (k - .2) / .5;
  const shake = s > 0 && s < 1 ? Math.max(0, Math.sin(2 * Math.PI * 2 * s)) : 0;
  return {h: clamp01(h), shake};
}

// The film's clock: elapsed seconds held to the last whole frame at FPS.
export const filmTime = t => Math.floor(t * FPS + 1e-9) / FPS;

// Called by kop-settle.js every frame, after the stance at ease and after taking back last frame's halt
// (`st.written`). `resting`: how far the stance at ease is in (0 at attention). Returns how far into the halt it is.
export function applyHalt(a, st, dt, busy, look, resting = 0) {
  if (!a || a.asset || !a.joints || !halts(a) || !haltFor(a)) return 0;
  const seen = !!look && Number.isFinite(look.x) && Number.isFinite(look.z);
  const near = seen && Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) < NEAR;
  const still = !busy && !a.actions?.dead;
  if (st.t == null) {
    if (!near) { st.wait = null; return 0; }
    if (st.wait == null) st.wait = ALERT;
    if (still && !(resting > 0)) st.wait -= dt;
    if (st.wait > 0 || !still || resting > 0) return 0;
    st.t = 0; st.h = 0; st.broken = false; st.wait = AGAIN;
  }
  if (!still || st.broken) { st.broken = true; st.h = Math.max(0, st.h - dt / DROP); }
  else st.t += dt;
  const u = filmTime(st.t) / LEN;
  if (st.t >= LEN || (st.broken && st.h <= 0)) { st.t = null; st.h = 0; st.broken = false; return 0; }
  const m = haltMotion(u);
  if (!st.broken) st.h = m.h;
  const pose = haltFor(a), h = st.h, shake = st.broken ? 0 : m.shake * SHAKE;
  if (!a.jointRest) { a.jointRest = {rest: {}, body: a.body.position.clone()}; for (const [n, o] of Object.entries(a.joints)) a.jointRest.rest[n] = {x: o.rotation.x, y: o.rotation.y, z: o.rotation.z}; }
  const {rest} = a.jointRest;
  const ease = (obj, ax, target) => {
    const now = obj[ax], next = now + (target - now) * h;
    if (next === now) return;
    obj[ax] = next; st.written.push({get: () => obj[ax], set: v => { obj[ax] = v; }, left: next, was: now});
  };
  // only the joints the halt moves: the legs, head and anything else stay as the frame left them
  for (const [n, p] of Object.entries(pose)) {
    const o = a.joints[n];
    if (!o || typeof p !== 'object') continue;
    for (const ax of ['x', 'y', 'z']) if (p[ax] || (n === 'rfore_2' && ax === 'x')) ease(o.rotation, ax, rest[n][ax] + (p[ax] || 0) + (n === 'rfore_2' && ax === 'x' ? -shake : 0));
  }
  if (pose.hipsY) ease(a.body.position, 'y', a.jointRest.body.y + pose.hipsY);
  return h;
}
