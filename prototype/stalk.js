// Cats stalk (motion queue item 7, part 2). A cat standing still within a couple of tiles of
// prey (the same list cats.js pounces on) sinks into a low crouch facing it, forepaws set
// forward, tail held low with its tip twitching in short bursts and now and then a rear
// wiggle. It eases out as soon as the cat moves or starts an action, so the pounce (which
// begins with its own crouch) takes over smoothly.
//
// The pose is applied as offsets that clearStalk() takes back off at the start of the next
// frame, like the action layer; the tail's side flick is blended over the frame loop's swish.
// Only the heading is left behind: the cat keeps facing where it last watched.

import {catSize, isPrey} from './cats.js';
import {foreLegs} from './monster-attacks.js';

// Prey within this many tiles (centre to centre) is watched.
export const STALK_RANGE = 2.3;
const EASE_IN = 3.5, EASE_OUT = 9, TURN_RATE = 5, SNAP = 1e-3;
const TAU = Math.PI * 2;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const turnTo = (a, b) => { const d = (b - a) % TAU; return d > Math.PI ? d - TAU : d < -Math.PI ? d + TAU : d; };

const posOf = a => a?.target ?? a?.g?.position ?? null;

// The nearest living prey actor within range of a cat, as {actor, dx, dz, d}; null if the
// actor isn't a cat or nothing is in reach.
export function findPrey(cat, actors, range = STALK_RANGE) {
  const size = catSize(cat?.species);
  const p = posOf(cat);
  if (!size || !p || !actors) return null;
  let best = null;
  for (const other of actors) {
    if (!other || other === cat || other.actions?.dead || !isPrey(other.species, size)) continue;
    const q = posOf(other);
    if (!q) continue;
    const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
    if (d > 1e-3 && d <= range && (!best || d < best.d)) best = {actor: other, dx, dz, d};
  }
  return best;
}

// Offsets for the crouch at blend w (0..1) and time t (s); `seed` desyncs cats.
export function stalkPose(w, t, seed = 0) {
  w = clamp01(w);
  if (!(w > 0)) return REST;
  // The tail tip flicks in bursts about every 2 s; the rear wiggles in rarer, shorter bursts.
  const flickGate = smooth((Math.sin(t * 2.9 + seed) - .15) / .5);
  const wiggleGate = smooth((Math.sin(t * 1.1 + seed * 1.7) - .72) / .2);
  return {
    stretch: 1 - .11 * w,
    pitch: .07 * w,
    roll: .05 * w * wiggleGate * Math.sin(t * 21 + seed),
    fore: -.22 * w,
    tail: .32 * w,
    flick: .38 * flickGate * Math.sin(t * 17 + seed),
  };
}
const REST = Object.freeze({stretch: 1, pitch: 0, roll: 0, fore: 0, tail: 0, flick: 0});

// Takes last frame's crouch back off. Call at the start of the frame, after clearActionPose.
export function clearStalk(actor) {
  const s = actor?.stalk, o = s?.applied;
  if (!o || !actor.g) return;
  const g = actor.g;
  if (o.stretch !== 1) { const k = Math.sqrt(o.stretch); g.scale.y /= o.stretch; g.scale.x *= k; g.scale.z *= k; }
  g.rotation.x -= o.pitch; g.rotation.z -= o.roll;
  if (actor.tail) actor.tail.rotation.x -= o.tail;
  if (o.fore) for (const l of foreLegs(actor)) l.rotation.x -= o.fore;
  s.applied = null;
}

// Eases the crouch in or out and poses the cat. `prey` is findPrey()'s result; `busy` is true
// while the cat walks or plays an action. Call after the frame loop's rest pose (tail swish,
// body bob) and before updateActions. Returns the blend.
export function updateStalk(actor, dt, t, prey, busy) {
  if (!actor?.g || actor.asset || !catSize(actor.species)) return 0;
  const s = actor.stalk || (actor.stalk = {w: 0, applied: null, seed: (actor.g.id % 17) * .7});
  const on = !!prey && !busy && !actor.actions?.dead;
  const to = on ? 1 : 0;
  s.w = to + (s.w - to) * Math.exp(-(on ? EASE_IN : EASE_OUT) * Math.max(0, dt));
  if (Math.abs(s.w - to) < SNAP) s.w = to;
  if (!(s.w > 0)) return 0;
  const g = actor.g, p = stalkPose(s.w, t, s.seed);
  if (g.rotation.order !== 'YXZ') g.rotation.reorder('YXZ');
  // Turn to watch the prey (kept afterwards, like an attacker facing where it struck).
  if (on) g.rotation.y += turnTo(g.rotation.y, Math.atan2(prey.dx, prey.dz)) * (1 - Math.exp(-TURN_RATE * dt));
  if (p.stretch !== 1) { const k = Math.sqrt(p.stretch); g.scale.y *= p.stretch; g.scale.x /= k; g.scale.z /= k; }
  g.rotation.x += p.pitch; g.rotation.z += p.roll;
  if (actor.tail) {
    actor.tail.rotation.x += p.tail;
    actor.tail.rotation.z = actor.tail.rotation.z * (1 - s.w) + p.flick * s.w;
  }
  if (p.fore) for (const l of foreLegs(actor)) l.rotation.x += p.fore;
  s.applied = p;
  return s.w;
}
