// A slow trudge for the heavy bipeds that slide.js moves slowly: zombies and the heavy golems.
// live.js swings every walker's legs ±.4 rad at 22 rad/s, which suited the old quick glide but
// now that a zombie takes ~1.2 s to cross a cell it looks like its legs are running in place.
// Instead the stride is slow and short, and its pace follows the slide speed, so the feet slow
// as the body pulls away and brakes. A zombie lurches from side to side onto each planted leg;
// a golem stamps down hard at each footfall. Everything blends in and out with the walk, so a
// monster that stops eases its legs back to rest instead of snapping them straight.
// The ghoul (ghoul.js) lopes instead: a quicker, longer, springier stride with a deep crouch at
// each footfall, its skull dipping with the step and its long arms swinging loose, a beat
// behind the legs, so the claws drag back and forth near its knees.
//
// The legs are set outright; body height is blended over what live.js wrote this frame (like
// plod.js), so the idle breathing comes back as the walk fades. The lurch
// (body.rotation.z), the ghoul's head dip (head.rotation.x) and arm swing (arms[i].rotation.x)
// are offsets taken back every frame, so they never drift and the action layer's deltas still
// stack on top.
import {speciesSlide, SPECIES_SLIDE} from './slide.js';

// rate: stride phase speed at cruise (rad/s; one cycle = one step with each leg); stride: leg
// swing (rad); roll: side-to-side lurch (rad); dip: body drop at each footfall; sharp: how
// abruptly the footfall lands (higher = a harder stamp); nod: head dip at the footfall (rad);
// arm: loose arm swing (rad), lagging the legs by `lag` (rad of phase).
export const TRUDGE = {
  zombie: {rate: 8, stride: .3, roll: .05, dip: .018, sharp: 2},
  golem: {rate: 6, stride: .22, roll: .025, dip: .026, sharp: 6},
  ghoul: {rate: 10.5, stride: .42, roll: .02, dip: .032, sharp: 1.5, nod: .09, arm: .24, lag: .6},
};
// Walk blend: in over ~.25 s, out over ~.4 s. Below this share of cruise the stride stops slowing.
const EASE_IN = 9, EASE_OUT = 6, SNAP = 1e-3, MIN_PACE = .4;

// The trudge profile for an actor, or null. Oozes slide slowly too but have no legs.
export function trudgeKind(a) {
  if (!a || a.asset || !a.body || a.legs?.length !== 2) return null;
  const s = speciesSlide(a.species);
  if (s === SPECIES_SLIDE.zombie) return 'zombie';
  if (s === SPECIES_SLIDE.golem) return 'golem';
  if (s === SPECIES_SLIDE.ghoul) return 'ghoul';
  return null;
}

// The pose at stride phase `phase` and walk blend `w`. The legs pass (body high) when
// sin(phase) = 0 and are spread (footfall, body low) at |sin(phase)| = 1.
export function trudgePose(kind, phase, w = 1) {
  const T = TRUDGE[kind];
  if (!T || !(w > 0)) return {legs: [0, 0], bob: 0, roll: 0, nod: 0, arms: [0, 0]};
  const s = Math.sin(phase), c = Math.cos(phase), fall = Math.pow(Math.abs(s), T.sharp);
  // each arm swings against its own side's leg, a beat late, like a dead weight
  const arm = (T.arm || 0) * Math.sin(phase - (T.lag || 0)) * w;
  return {
    legs: [T.stride * s * w, -T.stride * s * w],
    bob: -T.dip * fall * w,
    // leans onto the planted leg, a quarter cycle behind the swing
    roll: T.roll * c * w,
    // + tips the head's forward axis down
    nod: (T.nod || 0) * fall * w,
    arms: [-arm, arm],
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
  const st = actor.trudge || (actor.trudge = {w: 0, phase: 0, roll: 0, nod: 0, arms: [0, 0]});
  actor.body.rotation.z -= st.roll;
  st.roll = 0;
  if (actor.head) actor.head.rotation.x -= st.nod;
  st.nod = 0;
  (actor.arms || []).forEach((a, i) => { if (i < 2) a.rotation.x -= st.arms[i]; });
  st.arms = [0, 0];
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
  if (actor.head) { st.nod = p.nod; actor.head.rotation.x += st.nod; }
  (actor.arms || []).forEach((a, i) => { if (i < 2) { st.arms[i] = p.arms[i]; a.rotation.x += st.arms[i]; } });
  return p;
}
