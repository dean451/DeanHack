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
// The skeleton (skeleton.js) rattles: its legs snap from one stride to the next and hang there,
// like a puppet's, the stiff arms jerk along with them, and at every footfall the skull clatters
// from side to side and dies away before the next step, while the jaw clacks open and shut a
// few times with it.
//
// The legs are set outright; body height is blended over what live.js wrote this frame (like
// plod.js), so the idle breathing comes back as the walk fades. The lurch
// (body.rotation.z), the head dip (head.rotation.x), the skeleton's skull rattle
// (head.rotation.z), its jaw clack (jaw.rotation.x, scaled by jawReach) and the arm swing (arms[i].rotation.x) are offsets taken back every frame, so they never drift and the action layer's deltas still
// stack on top.
import {speciesSlide, SPECIES_SLIDE} from './slide.js';
import {jawReach} from './jaw.js';

// rate: stride phase speed at cruise (rad/s; one cycle = one step with each leg); stride: leg
// swing (rad); roll: side-to-side lurch (rad); dip: body drop at each footfall; sharp: how
// abruptly the footfall lands (higher = a harder stamp); nod: head dip at the footfall (rad);
// arm: loose arm swing (rad), lagging the legs by `lag` (rad of phase); snap: how abruptly the
// legs and arms flick between strides (0 = a plain sine; the curve is tanh(snap·sin)/tanh(snap),
// so the peak stays at `stride`); rattle: the skull's side-to-side clatter after each footfall
// (rad), ringing at `ring` shakes per step and dying away by the next one; clack: how far the jaw
// flies open after each footfall (rad, before jawReach), shutting `chatter` times per step.
export const TRUDGE = {
  zombie: {rate: 8, stride: .3, roll: .05, dip: .018, sharp: 2},
  golem: {rate: 6, stride: .22, roll: .025, dip: .026, sharp: 6},
  ghoul: {rate: 10.5, stride: .42, roll: .02, dip: .032, sharp: 1.5, nod: .09, arm: .24, lag: .6},
  skeleton: {rate: 9, stride: .34, roll: .03, dip: .014, sharp: 4, nod: .04, arm: .16, lag: .15,
    snap: 2.2, rattle: .07, ring: 3, clack: .24, chatter: 3},
};
// The skull rattle's decay per radian of phase: e^(-2.4π) ≈ .0005 is left when the next
// footfall comes, so it restarts from (almost exactly) nothing.
const RATTLE_DECAY = 2.4;
// The jaw dies away more slowly, so it gets two or three clacks in (peaks ≈ .53, .15, .04 of
// `clack`); |sin(chatter·since)| is 0 at each footfall, so it's continuous across steps anyway.
const CLACK_DECAY = 1.2;
// Walk blend: in over ~.25 s, out over ~.4 s. Below this share of cruise the stride stops slowing.
const EASE_IN = 9, EASE_OUT = 6, SNAP = 1e-3, MIN_PACE = .4;

// The trudge profile for an actor, or null. Oozes slide slowly too but have no legs.
export function trudgeKind(a) {
  if (!a || a.asset || !a.body || a.legs?.length !== 2) return null;
  const s = speciesSlide(a.species);
  if (s === SPECIES_SLIDE.zombie) return 'zombie';
  if (s === SPECIES_SLIDE.golem) return 'golem';
  if (s === SPECIES_SLIDE.ghoul) return 'ghoul';
  if (s === SPECIES_SLIDE.skeleton) return 'skeleton';
  return null;
}

// The pose at stride phase `phase` and walk blend `w`. The legs pass (body high) when
// sin(phase) = 0 and are spread (footfall, body low) at |sin(phase)| = 1.
export function trudgePose(kind, phase, w = 1) {
  const T = TRUDGE[kind];
  if (!T || !(w > 0)) return {legs: [0, 0], bob: 0, roll: 0, nod: 0, arms: [0, 0], shake: 0, jaw: 0};
  const s = Math.sin(phase), c = Math.cos(phase), fall = Math.pow(Math.abs(s), T.sharp);
  const flick = v => T.snap ? Math.tanh(T.snap * v) / Math.tanh(T.snap) : v;
  const leg = T.stride * flick(s) * w;
  // each arm swings against its own side's leg, a beat late, like a dead weight
  const arm = (T.arm || 0) * flick(Math.sin(phase - (T.lag || 0))) * w;
  // phase since the last footfall (|sin| = 1 at π/2 + nπ), in [0, π)
  const since = ((phase - Math.PI / 2) % Math.PI + Math.PI) % Math.PI;
  const jaw = T.clack ? T.clack * Math.abs(Math.sin(since * (T.chatter || 1))) * Math.exp(-CLACK_DECAY * since) * w : 0;
  const shake = T.rattle ? T.rattle * Math.sin(since * 2 * (T.ring || 1)) * Math.exp(-RATTLE_DECAY * since) * w : 0;
  return {
    legs: [leg, -leg],
    bob: -T.dip * fall * w,
    // leans onto the planted leg, a quarter cycle behind the swing
    roll: T.roll * c * w,
    // + tips the head's forward axis down
    nod: (T.nod || 0) * fall * w,
    arms: [-arm, arm],
    // + rolls the skull toward its left
    shake,
    // + opens the jaw; never closes it past rest
    jaw,
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
  const st = actor.trudge || (actor.trudge = {w: 0, phase: 0, roll: 0, nod: 0, shake: 0, jaw: 0, arms: [0, 0]});
  actor.body.rotation.z -= st.roll;
  st.roll = 0;
  if (actor.head) { actor.head.rotation.x -= st.nod; actor.head.rotation.z -= st.shake || 0; }
  if (actor.jaw) actor.jaw.rotation.x -= st.jaw || 0;
  st.nod = 0; st.shake = 0; st.jaw = 0;
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
  if (actor.head) {
    st.nod = p.nod; actor.head.rotation.x += st.nod;
    st.shake = p.shake; actor.head.rotation.z += st.shake;
  }
  if (actor.jaw && p.jaw) { st.jaw = p.jaw * jawReach(actor); actor.jaw.rotation.x += st.jaw; }
  (actor.arms || []).forEach((a, i) => { if (i < 2) { st.arms[i] = p.arms[i]; a.rotation.x += st.arms[i]; } });
  return p;
}
