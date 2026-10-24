// A dragon dozing off in play: once it has stood still, untroubled, with no hero in range for a while, it
// folds its wings, lies down and lowers its head into its baked sleeping pose (dragon-sleep-poses.js, solved
// by dragon-rest.js); when it moves, acts or the hero comes in range it wakes, head first, then it rises,
// then the wings open. Called from updateDragonMenace (dragon-menace.js) after everything else has written
// the frame, it eases each joint from wherever the frame left it toward its sleeping value, and takes that
// back at the start of the next frame, so waking returns every joint exactly to its awake value.
import {SLEEP_POSES} from './dragon-sleep-poses.js';

// SETTLE: seconds of stillness before it starts to doze (a big cat sleeps 16 to 20 hours a day, so not long:
// creature-measures.js); DOZE and WAKE: how many seconds falling asleep and waking take.
export const SETTLE = 10, DOZE = 3.5, WAKE = .8;

const smooth = v => { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); };
// How far each part is asleep at progress p (0 awake, 1 asleep). Falling asleep the wings fold first, then
// the body lies down, then the head lowers; waking runs it backward: the head lifts first, the wings last.
export const parts = p => ({wings: smooth(p / .4), body: smooth((p - .2) / .5), head: smooth((p - .55) / .45)});
const region = n => /^neck|^head/.test(n) ? 'head' : /wing/.test(n) ? 'wings' : 'body';

// The baked pose for an actor (by species), or null when it has none that passed (dragon-sleep-poses.js `ok`).
export function sleepFor(a) { const e = SLEEP_POSES[a?.species]; return e?.ok ? e.pose : null; }

function rest(a) {
  if (!a.jointRest) { a.jointRest = {rest: {}, body: a.body.position.clone(), bodyRz: a.body.rotation.z}; for (const [n, o] of Object.entries(a.joints)) a.jointRest.rest[n] = {x: o.rotation.x, y: o.rotation.y, z: o.rotation.z, s: o.scale.x}; }
  return a.jointRest;
}

// Undoes last frame's easing. A value something else rewrote since (live.js writes the wings, the tail and
// the body bob afresh every frame) is left alone; one only the sleep touched goes back exactly.
export function takeBackSleep(a, st) {
  for (const w of st.written || []) { const now = w.get(); if (now === w.left) w.set(now - w.delta); }
  st.written = [];
}

// Eases the frame toward sleep. `quiet`: nothing wants the dragon awake this frame (still, no action, no hero
// in range, alive). Returns the progress (0..1).
export function applySleep(a, st, dt, quiet) {
  const pose = sleepFor(a);
  if (!pose || !a.joints) { st.p = 0; return 0; }
  st.idle = quiet ? (st.idle || 0) + dt : 0;
  const want = quiet && st.idle >= SETTLE ? 1 : 0;
  st.p = want ? Math.min(1, (st.p || 0) + dt / DOZE) : Math.max(0, (st.p || 0) - dt / WAKE);
  if (!st.p) return 0;
  const k = parts(st.p), {rest: r, body} = rest(a);
  const ease = (n, obj, ax, target, w) => {
    const now = obj[ax], next = now + (target - now) * w, delta = next - now;
    if (!delta) return;
    obj[ax] = next; st.written.push({get: () => obj[ax], set: v => { obj[ax] = v; }, left: next, delta});
  };
  // every joint the pose names, and the ones the waking frame sways (the tail's own group, the whole body's wobble)
  for (const [n, o] of Object.entries(a.joints)) {
    const p = pose[n] || {}, w = k[region(n)];
    for (const ax of ['x', 'y', 'z']) ease(n, o.rotation, ax, r[n][ax] + (p[ax] || 0), w);
    if (p.s !== undefined) { const s = o.scale.x, next = s + (p.s - s) * w; if (next !== s) { o.scale.setScalar(next); st.written.push({get: () => o.scale.x, set: v => o.scale.setScalar(v), left: next, delta: next - s}); } }
  }
  if (a.tail) for (const ax of ['x', 'y', 'z']) ease('tail', a.tail.rotation, ax, 0, k.body);
  ease('g', a.g.rotation, 'z', 0, k.body);
  ease('body', a.body.position, 'y', body.y + (pose.body?.y || 0), k.body);
  ease('bodyR', a.body.rotation, 'z', (a.jointRest.bodyRz || 0) + (pose.body?.rz || 0), k.body);
  return st.p;
}
