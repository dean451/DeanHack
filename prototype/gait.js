import * as THREE from 'three';
import {updateSleeves} from './sleeves.js';

// Walk cycles with character for the small folk (queue item 8). Gnomes waddle quickly with a
// nodding cap, hobbits step lightly and swing their arms, and dwarves stomp with a rolling sway,
// a swinging beard and the pick hoisted onto the shoulder. The pose blends in and out with
// `walk` (0..1), so an actor that stops settles back to its exact rest pose.
//
// Parts come from creatures.js humanoid(): legs, arms, body, hat, beard, pick. Everything here
// is written absolutely from a stored rest pose (or blended over what live.js wrote this frame
// for legs and body height), so it never drifts and the action layer's deltas still stack on top.

export const GAITS = {
  // rate: stride phase speed (rad/s, one full cycle = two steps); stride/arm: swing (rad);
  // bob: rise at midstance; dip: drop at each footfall; roll: side sway; lean: forward pitch;
  // hat/beard: lagging nod and sway (rad).
  gnome: {rate: 13.5, stride: .34, arm: .28, bob: .04, dip: 0, roll: .11, lean: .05, hat: .2, beard: .06},
  hobbit: {rate: 11.5, stride: .5, arm: .55, bob: .05, dip: 0, roll: .035, lean: .08, hat: 0, beard: 0, skip: true},
  dwarf: {rate: 8.5, stride: .34, arm: .2, bob: .015, dip: .035, roll: .08, lean: .1, hat: 0, beard: .14, carry: true},
};

export function gaitKind(actor) {
  const k = actor?.quirk;
  return k === 'gnome' || k === 'hobbit' || k === 'dwarf' ? k : null;
}

// The pose for a gait at stride phase `phase`, walk blend `w` and pick carry blend `carry`.
// Legs pass each other (midstance, body high) when sin(phase) = 0 and are spread (footfall) at
// |sin(phase)| = 1.
export function gaitPose(kind, phase, w = 1, carry = 0) {
  const G = GAITS[kind];
  if (!G || !(w > 0)) return REST;
  const s = Math.sin(phase), c = Math.cos(phase), mid = Math.abs(c), fall = Math.abs(s);
  // hobbits spring off each step: a sharper, higher rise
  const rise = G.skip ? Math.pow(mid, .6) : mid;
  const legs = [G.stride * s * w, -G.stride * s * w];
  const swing = G.arm * w;
  const arms = [-swing * s * (1 - carry), swing * s];
  return {
    legs,
    arms,
    bob: (G.bob * rise - G.dip * Math.pow(fall, 6)) * w,
    roll: G.roll * c * w,
    lean: G.lean * w,
    hatNod: G.hat * Math.cos(2 * phase - .8) * w,
    hatSway: -G.roll * 1.5 * Math.cos(phase - .7) * w,
    beardSwing: G.beard * Math.cos(2 * phase - 1) * w,
    beardSway: -G.roll * 1.3 * Math.cos(phase - .9) * w,
    pickBob: .02 * Math.cos(2 * phase - .5) * w * carry,
  };
}
const REST = Object.freeze({legs: [0, 0], arms: [0, 0], bob: 0, roll: 0, lean: 0, hatNod: 0, hatSway: 0, beardSwing: 0, beardSway: 0, pickBob: 0});

// The dwarf's pick, hoisted onto the left shoulder: gripped at chest height with the forged head
// riding up beside the helm, and the left arm raised forward to hold it.
export const PICK_CARRY = {pos: new THREE.Vector3(-.32, .6, .3), rot: new THREE.Euler(-.75, 0, .3), arm: -1};

const tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpV = new THREE.Vector3(), tmpP = new THREE.Vector3();

function restOf(state, part, pivot) {
  let r = state.rest.get(part);
  if (!r) {
    // the pivot (in the part's unscaled local frame) stays put while the part turns about it:
    // the cap's brim, the beard's chin
    r = {pos: part.position.clone(), quat: part.quaternion.clone(), pivot: pivot ? pivot.clone().multiply(part.scale) : null};
    state.rest.set(part, r);
  }
  return r;
}

// Rotate a part by (x, z) about its pivot from its rest pose.
function turn(state, part, x, z, pivot) {
  if (!part) return;
  const r = restOf(state, part, pivot);
  tmpQ.setFromEuler(tmpE.set(x, 0, z));
  part.quaternion.copy(r.quat).multiply(tmpQ);
  // without a pivot the part turns about its own origin and its position is left alone (the
  // body's height is the bob)
  if (r.pivot) {
    part.position.copy(r.pos);
    tmpV.copy(r.pivot).applyQuaternion(r.quat);
    tmpP.copy(r.pivot).applyQuaternion(part.quaternion);
    part.position.add(tmpV).sub(tmpP);
  }
}

// Walk blend eases in over ~0.15 s and out over ~0.25 s; the pick lifts and lowers more slowly.
const EASE_IN = 14, EASE_OUT = 9, CARRY_RATE = 5, SNAP = 1e-3;

function approach(v, to, rate, dt) {
  const n = to + (v - to) * Math.exp(-rate * dt);
  return Math.abs(n - to) < SNAP ? to : n;
}

// Call once per frame, after live.js has written its generic leg swing and body bob and before
// the action layer applies its deltas.
export function updateGait(actor, dt, walking) {
  const kind = gaitKind(actor);
  // Ghosts have no legs to walk on; their empty sleeves drift instead (sleeves.js).
  if (!kind) { updateSleeves(actor, dt, walking); return null; }
  if (actor.asset || !actor.body) return null;
  const G = GAITS[kind];
  const st = actor.gait || (actor.gait = {w: 0, carry: 0, phase: 0, rest: new Map()});
  const moving = walking && !actor.actions?.dead;
  st.w = approach(st.w, moving ? 1 : 0, moving ? EASE_IN : EASE_OUT, dt);
  if (G.carry && actor.pick) st.carry = approach(st.carry, moving ? 1 : 0, CARRY_RATE, dt);
  if (st.w > 0) st.phase = (st.phase + G.rate * dt) % (Math.PI * 2);
  else st.phase = 0;
  const p = gaitPose(kind, st.phase, st.w, st.carry), w = st.w;

  // Legs and body height: blend over what live.js wrote this frame.
  actor.legs?.forEach((l, i) => { if (i < 2) l.rotation.x = l.rotation.x * (1 - w) + p.legs[i]; });
  actor.body.position.y = actor.body.position.y * (1 - w) + p.bob;
  turn(st, actor.body, p.lean, p.roll);

  const arms = actor.arms || [];
  arms.forEach((arm, i) => {
    const lift = i === 0 ? PICK_CARRY.arm * st.carry : 0;
    turn(st, arm, p.arms[i] + lift, 0);
  });
  turn(st, actor.hat, p.hatNod, p.hatSway, HAT_PIVOT);
  turn(st, actor.beard, p.beardSwing, p.beardSway, BEARD_PIVOT);

  if (actor.pick) {
    const r = restOf(st, actor.pick);
    const k = st.carry;
    actor.pick.position.copy(r.pos).lerp(PICK_CARRY.pos, k);
    actor.pick.position.y += p.pickBob;
    tmpQ.setFromEuler(PICK_CARRY.rot);
    actor.pick.quaternion.copy(r.quat).slerp(tmpQ, k);
  }
  return p;
}

// Unit pivots in the part's own frame: the cap cone (height .36) turns about its brim; the beard
// sphere (radius ~.2) swings from the chin.
const HAT_PIVOT = new THREE.Vector3(0, -.18, 0), BEARD_PIVOT = new THREE.Vector3(0, .19, 0);

// Wingbeats for the 'bat' quirk (live.js writes wing.rotation.z = side * wingFlap(style, t)).
// Bats keep their fast, even flutter. Ravens (their own model in raven.js, which reuses the quirk)
// beat about once a second, with a quick downstroke and a slower recovery, and every few seconds
// hold their wings out and glide before beating again. The couatl (couatl.js, quirk 'hover') gets
// a slow, lazy feathered beat about the same axis instead of the generic forward/back wing sway,
// and every so often hangs with its wings held up in their V while it drifts down a little.
export const FLIGHT = {
  bat: {rate: 14, amp: .65},
  raven: {rate: 6.5, amp: .5, skew: .5, cycle: 6, glide: 2.2, ease: .45, drift: .03, hold: 0, hover: .03, lift: .012, sink: .05, climb: .6},
  couatl: {rate: 3.4, amp: .3, skew: .35, cycle: 8.5, glide: 1.8, ease: .6, drift: .025, hold: .12, hover: .045, lift: .014, sink: .025, climb: .5},
};

export function flapStyle(name) {
  const kind = /\braven\b/i.test(name || '') ? 'raven' : /\bcouatl\b/i.test(name || '') ? 'couatl' : null;
  return kind ? {kind, phase: Math.random() * FLIGHT[kind].cycle} : null;
}

const flight = style => FLIGHT[style?.kind] && style.kind !== 'bat' ? FLIGHT[style.kind] : null;

const smooth = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);

// How much a raven is beating (1) versus gliding (0) at cycle time u: beat, ease out, glide, ease in.
export function beatWeight(u, F = FLIGHT.raven) {
  const beat = F.cycle - F.glide;
  u = ((u % F.cycle) + F.cycle) % F.cycle;
  if (u < beat) return smooth(u / F.ease);
  return 1 - smooth((u - beat) / F.ease);
}

export function wingFlap(style, t) {
  const F = flight(style);
  if (!F) return Math.sin(t * FLIGHT.bat.rate) * FLIGHT.bat.amp;
  const u = t + (style.phase || 0), th = u * F.rate;
  // phase warp: one half of the stroke passes quicker than the other
  const stroke = Math.sin(th + F.skew * Math.sin(th)) * F.amp;
  const w = beatWeight(u, F);
  return stroke * w + (F.hold + Math.sin(u * 1.8) * F.drift) * (1 - w);
}

// Height of a flier's body (live.js writes body.position.y). Bats and other hoverers keep their bob.
// A raven bobs gently, lifts a little on each downstroke, sinks slowly through its glide and
// climbs back over the first beats, so the loop joins up each cycle.
export function glideSink(u, F = FLIGHT.raven) {
  const beat = F.cycle - F.glide;
  u = ((u % F.cycle) + F.cycle) % F.cycle;
  if (u < beat) return -F.sink * (1 - smooth(u / (beat * F.climb)));
  return -F.sink * smooth((u - beat) / F.glide);
}

export function flightBob(style, t, seed = 0) {
  const F = flight(style);
  if (!F) return Math.sin(t * 2.2 + seed) * .06;
  const u = t + (style.phase || 0), th = u * F.rate;
  const w = beatWeight(u, F);
  // the body rides up while the wings sweep down (a quarter stroke ahead of the wings)
  const lift = -Math.cos(th + F.skew * Math.sin(th)) * F.lift * w;
  return Math.sin(u * 1.1) * F.hover + lift + glideSink(u, F);
}
