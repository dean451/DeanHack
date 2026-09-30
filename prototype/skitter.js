// A spider's skitter (spider.js). live.js swings every walker's legs about x (±.4 rad at 22 rad/s).
// A spider's legs splay out sideways, so that pitch reads as the legs lifting and dropping in
// place, not as a stride. Instead the spider walks with an alternating tetrapod gait: right 1,
// left 2, right 3 and left 4 step together, then the other four. Each leg sweeps forward and back
// about its hip (yaw) and lifts clear of the floor only while it swings forward, so four feet are
// always down. The body dips a little at each footfall. Everything blends in and out with the
// walk, so a spider that stops settles back to its exact rest pose instead of snapping.
//
// Leg pitch and body height are blended over what live.js wrote this frame (like plod.js). The
// leg yaw (rotation.y) and lift (rotation.z) are offsets that are taken back every frame, so they
// never drift and the action layer's deltas still stack on top.

// rate: stride phase speed at scale 1 (rad/s; one cycle = one step of each group), faster for
// small spiders; stride: leg sweep (rad); lift: leg raise while swinging (rad); dip: body drop.
export const SKITTER = {rate: 13, stride: .2, lift: .2, dip: .008};
// Walk blend: in over ~.15 s, out over ~.3 s.
const EASE_IN = 14, EASE_OUT = 8, SNAP = 1e-3;
// spider.js builds the right legs front to back, then the left legs front to back. The two
// tetrapod groups get opposite phase: +1 = R1 R3 L2 L4, -1 = R2 R4 L1 L3.
const SIDE = [1, 1, 1, 1, -1, -1, -1, -1];
const GROUP = [1, -1, 1, -1, -1, 1, -1, 1];

export const skitters = a => !!(a?.quirk === 'spider' && a.legs?.length === 8 && a.body && !a.asset);

// The pose at stride phase `phase` and walk blend `w`. A group sweeps forward (and is lifted)
// while cos(phase) is positive for it, and is planted, pushing back, for the other half cycle.
// yaw and lift are per leg, already signed for its side.
export function skitterPose(phase, w = 1) {
  if (!(w > 0)) return {yaw: SIDE.map(() => 0), lift: SIDE.map(() => 0), bob: 0};
  const s = Math.sin(phase), c = Math.cos(phase);
  return {
    // forward is +z: a right leg (reaching to +x) swings forward with negative yaw, a left leg
    // (reaching to -x) with positive yaw
    yaw: SIDE.map((side, i) => -side * GROUP[i] * SKITTER.stride * s * w),
    // positive z raises a right leg; a left leg rises with negative z
    lift: SIDE.map((side, i) => side * SKITTER.lift * Math.max(0, GROUP[i] * c) * w),
    // the body drops a touch as each group lands (twice a cycle)
    bob: -SKITTER.dip * s * s * w,
  };
}

function approach(v, to, rate, dt) {
  const n = to + (v - to) * Math.exp(-rate * dt);
  return Math.abs(n - to) < SNAP ? to : n;
}

// Call once per frame after live.js has written its generic leg swing and body bob, and before
// updateActions. Returns the pose applied (or null for other actors).
export function updateSkitter(actor, dt, walking) {
  if (!skitters(actor)) return null;
  const st = actor.skitter || (actor.skitter = {w: 0, phase: 0, yaw: SIDE.map(() => 0), lift: SIDE.map(() => 0)});
  actor.legs.forEach((l, i) => { l.rotation.y -= st.yaw[i]; l.rotation.z -= st.lift[i]; st.yaw[i] = st.lift[i] = 0; });
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const moving = !!walking && !actor.actions?.dead;
  st.w = approach(st.w, moving ? 1 : 0, moving ? EASE_IN : EASE_OUT, dt);
  // small spiders patter faster, big ones stalk
  const scale = actor.g?.scale?.x > 0 ? actor.g.scale.x : 1;
  if (st.w > 0) st.phase = (st.phase + SKITTER.rate / Math.sqrt(scale) * dt) % (Math.PI * 2);
  else st.phase = 0;
  const w = st.w, p = skitterPose(st.phase, w);

  actor.legs.forEach((l, i) => {
    l.rotation.x *= 1 - w;
    st.yaw[i] = p.yaw[i]; st.lift[i] = p.lift[i];
    l.rotation.y += st.yaw[i]; l.rotation.z += st.lift[i];
  });
  actor.body.position.y = actor.body.position.y * (1 - w) + p.bob;
  return p;
}
