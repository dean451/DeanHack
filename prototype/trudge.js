// A slow trudge for the heavy bipeds that slide.js moves slowly: zombies and the heavy golems.
// live.js swings every walker's legs ±.4 rad at 22 rad/s, which suited the old quick glide but
// now that a zombie takes ~1.2 s to cross a cell it looks like its legs are running in place.
// Instead the stride is slow and short, and its pace follows the slide speed, so the feet slow
// as the body pulls away and brakes. A zombie lurches from side to side onto each planted leg;
// a golem stamps down hard at each footfall. Everything blends in and out with the walk, so a
// monster that stops eases its legs back to rest instead of snapping them straight.
//
// The legs are set outright; body height is blended over what live.js wrote this frame (like
// plod.js), so the idle breathing comes back as the walk fades. The lurch
// (body.rotation.z) is an offset taken back every frame, so it never drifts and the action
// layer's deltas still stack on top.
import {speciesSlide, SPECIES_SLIDE} from './slide.js';

// rate: stride phase speed at cruise (rad/s; one cycle = one step with each leg); stride: leg
// swing (rad); roll: side-to-side lurch (rad); dip: body drop at each footfall; sharp: how
// abruptly the footfall lands (higher = a harder stamp).
export const TRUDGE = {
  zombie: {rate: 8, stride: .3, roll: .05, dip: .018, sharp: 2},
  golem: {rate: 6, stride: .22, roll: .025, dip: .026, sharp: 6},
};
// Walk blend: in over ~.25 s, out over ~.4 s. Below this share of cruise the stride stops slowing.
const EASE_IN = 9, EASE_OUT = 6, SNAP = 1e-3, MIN_PACE = .4;

// The trudge profile for an actor, or null. Oozes slide slowly too but have no legs.
export function trudgeKind(a) {
  if (!a || a.asset || !a.body || a.legs?.length !== 2) return null;
  const s = speciesSlide(a.species);
  if (s === SPECIES_SLIDE.zombie) return 'zombie';
  if (s === SPECIES_SLIDE.golem) return 'golem';
  return null;
}

// The pose at stride phase `phase` and walk blend `w`. The legs pass (body high) when
// sin(phase) = 0 and are spread (footfall, body low) at |sin(phase)| = 1.
export function trudgePose(kind, phase, w = 1) {
  const T = TRUDGE[kind];
  if (!T || !(w > 0)) return {legs: [0, 0], bob: 0, roll: 0};
  const s = Math.sin(phase), c = Math.cos(phase);
  return {
    legs: [T.stride * s * w, -T.stride * s * w],
    bob: -T.dip * Math.pow(Math.abs(s), T.sharp) * w,
    // leans onto the planted leg, a quarter cycle behind the swing
    roll: T.roll * c * w,
  };
}

function approach(v, to, rate, dt) {
  const n = to + (v - to) * Math.exp(-rate * dt);
  return Math.abs(n - to) < SNAP ? to : n;
}

// Call once per frame after live.js has written its generic leg swing and body bob, and before
// updateActions. Returns the pose applied (or null for other actors).
export function updateTrudge(actor, dt, walking) {
  const kind = trudgeKind(actor);
  if (!kind) return null;
  const T = TRUDGE[kind];
  const st = actor.trudge || (actor.trudge = {w: 0, phase: 0, roll: 0});
  actor.body.rotation.z -= st.roll;
  st.roll = 0;
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const moving = !!walking && !actor.actions?.dead;
  st.w = approach(st.w, moving ? 1 : 0, moving ? EASE_IN : EASE_OUT, dt);
  if (st.w > 0) {
    const cruise = speciesSlide(actor.species).cruise;
    const pace = moving ? Math.min(1, Math.max(MIN_PACE, (actor.slideSpeed || 0) / cruise)) : MIN_PACE;
    st.phase = (st.phase + T.rate * pace * dt) % (Math.PI * 2);
  } else st.phase = 0;
  const w = st.w, p = trudgePose(kind, st.phase, w);

  // The legs are owned outright (live.js writes 0 at rest anyway), so none of the generic
  // scurry leaks in while the walk blends in.
  actor.legs.forEach((l, i) => { l.rotation.x = p.legs[i]; });
  actor.body.position.y = actor.body.position.y * (1 - w) + p.bob;
  st.roll = p.roll;
  actor.body.rotation.z += st.roll;
  return p;
}
