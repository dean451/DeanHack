// A chickatrice, cockatrice or pyrolisk walking bobs its head the way a cockerel does (creature-measures.js,
// MEASURES.fowl.bobPerStep: one head cycle per step, a hold and then a thrust): while the body moves on, the head stays
// where it was, so the neck swings back relative to the body over the hold, then snaps forward to the next
// place. Only the neck turns. Called from live.js's actor loop after updateCockatriceCrow. Like the crow it adds
// its share to the joint and takes that back at the start of the next call, so the neck returns exactly.
import {takeBackRest} from './insect-settle.js';
import {MEASURES} from './creature-measures.js';

// AMP: the swing of the neck, radians (set by eye, no measured amplitude was found); HOLD: the share of a cycle
// the head hangs back; RATE: head cycles per second, one per step of the legs' swing (sin(t * 22), a step every
// half period); FADE: how fast the bob comes in and goes out with the walk (1/s).
export const BOB = {amp: .16, hold: .7, rate: 22 / Math.PI * MEASURES.fowl.bobPerStep, fade: 8};

export const bobs = a => !!(a && !a.asset && a.quirk === 'cockatrice' && a.joints?.neck0);

// The neck's offset (radians, -amp..amp) at a phase 0..1 of one head cycle: a slow drift back over the hold, a
// quick thrust forward over the rest. Zero in neither end of the cycle's mean, so it is a sawtooth, not a sine.
export function bobAt(phase) {
  if (!Number.isFinite(phase)) return 0;
  const p = phase - Math.floor(phase);
  return BOB.amp * (p < BOB.hold ? 1 - 2 * p / BOB.hold : -1 + 2 * (p - BOB.hold) / (1 - BOB.hold));
}

// Called every frame for every actor; does nothing for a creature that is not a cockerel. Returns how far into
// the bob it is (0..1).
export function updateCockatriceBob(a, dt, walking) {
  if (!bobs(a)) return 0;
  const st = a.fowlBob || (a.fowlBob = {phase: 0, w: 0, written: []});
  takeBackRest(st);
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  // (not while lying down, mid-hiss or dead: those have the neck then)
  const go = !!walking && !a.actions?.dead && !(a.fowlRest?.p > 0) && !a.hissing?.hiss && !(a.fowlCrow?.s >= 0);
  st.w = go ? Math.min(1, st.w + dt * BOB.fade) : Math.max(0, st.w - dt * BOB.fade);
  if (go) st.phase = (st.phase + dt * BOB.rate) % 1;
  if (!st.w) return 0;
  const o = a.joints.neck0.rotation, now = o.x, add = bobAt(st.phase) * st.w;
  o.x = now + add;
  st.written.push({get: () => o.x, set: v => { o.x = v; }, left: now + add, was: now});
  return st.w;
}
