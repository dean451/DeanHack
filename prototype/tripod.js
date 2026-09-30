// A six-legged insect's tripod gait (ants in ant.js, the giant beetle in creatures.js). live.js
// swings every walker's legs about x (±.4 rad at 22 rad/s). An insect's legs splay out sideways,
// so that pitch reads as the legs lifting and dropping in place, not as a stride. Real insects
// walk on alternating tripods: the front and hind legs of one side step with the middle leg of
// the other side, while the other three stay planted. Each leg sweeps forward and back about its
// hip (yaw) and lifts clear of the floor only while it swings forward, so three feet are always
// down. The body dips a little as each tripod lands. Everything blends in and out with the walk,
// so an insect that stops settles back to its exact rest pose instead of snapping.
//
// The same scheme as the spider skitter (skitter.js). Leg pitch and body height are blended over
// what live.js wrote this frame; the leg yaw (rotation.y) and lift (rotation.z) are offsets that
// are taken back every frame, so they never drift and the action layer's deltas stack on top.
//
// ant.js and insect() list their legs in different orders, so each leg's side and place along
// the body come from its hip position (x for the side, z from front to back).

// rate: stride phase speed at scale 1 (rad/s; one cycle = one step of each tripod), slower for
// big insects; stride: leg sweep (rad); lift: leg raise while swinging (rad); dip: body drop.
export const TRIPOD = {rate: 15, stride: .22, lift: .18, dip: .006};
// Walk blend: in over ~.15 s, out over ~.3 s.
const EASE_IN = 14, EASE_OUT = 8, SNAP = 1e-3;

export const tripods = a => !!(a?.quirk === 'insect' && a.legs?.length === 6 && a.body && !a.asset);

// Per leg: side (+1 reaches to +x, -1 to -x) and tripod (+1 or -1, the two opposite phases).
// Front and hind legs of a side share a tripod; the middle leg joins the other side's pair.
export function tripodLayout(legs) {
  const side = legs.map(l => (l.position.x < 0 ? -1 : 1));
  const group = legs.map(() => 1);
  for (const s of [1, -1]) {
    const mine = legs.map((l, i) => i).filter(i => side[i] === s).sort((a, b) => legs[b].position.z - legs[a].position.z);
    mine.forEach((i, rank) => { group[i] = s * (rank % 2 ? -1 : 1); });
  }
  return {side, group};
}

// The pose at stride phase `phase` and walk blend `w`. A tripod sweeps forward (and is lifted)
// while cos(phase) is positive for it, and is planted, pushing back, for the other half cycle.
// yaw and lift are per leg, already signed for its side.
export function tripodPose({side, group}, phase, w = 1) {
  if (!(w > 0)) return {yaw: side.map(() => 0), lift: side.map(() => 0), bob: 0};
  const s = Math.sin(phase), c = Math.cos(phase);
  return {
    // forward is +z: a right leg (reaching to +x) swings forward with negative yaw, a left leg
    // with positive yaw
    yaw: side.map((sd, i) => -sd * group[i] * TRIPOD.stride * s * w),
    // positive z raises a right leg; a left leg rises with negative z
    lift: side.map((sd, i) => sd * TRIPOD.lift * Math.max(0, group[i] * c) * w),
    // the body drops a touch as each tripod lands (twice a cycle)
    bob: -TRIPOD.dip * s * s * w,
  };
}

function approach(v, to, rate, dt) {
  const n = to + (v - to) * Math.exp(-rate * dt);
  return Math.abs(n - to) < SNAP ? to : n;
}

// Call once per frame after live.js has written its generic leg swing and body bob, and before
// updateActions. Returns the pose applied (or null for other actors).
export function updateTripod(actor, dt, walking) {
  if (!tripods(actor)) return null;
  const st = actor.tripod || (actor.tripod = {w: 0, phase: 0, layout: tripodLayout(actor.legs), yaw: actor.legs.map(() => 0), lift: actor.legs.map(() => 0)});
  actor.legs.forEach((l, i) => { l.rotation.y -= st.yaw[i]; l.rotation.z -= st.lift[i]; st.yaw[i] = st.lift[i] = 0; });
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const moving = !!walking && !actor.actions?.dead;
  st.w = approach(st.w, moving ? 1 : 0, moving ? EASE_IN : EASE_OUT, dt);
  // small ants scurry, the big beetle trundles
  const scale = actor.g?.scale?.x > 0 ? actor.g.scale.x : 1;
  if (st.w > 0) st.phase = (st.phase + TRIPOD.rate / Math.sqrt(scale) * dt) % (Math.PI * 2);
  else st.phase = 0;
  const w = st.w, p = tripodPose(st.layout, st.phase, w);

  actor.legs.forEach((l, i) => {
    l.rotation.x *= 1 - w;
    st.yaw[i] = p.yaw[i]; st.lift[i] = p.lift[i];
    l.rotation.y += st.yaw[i]; l.rotation.z += st.lift[i];
  });
  actor.body.position.y = actor.body.position.y * (1 - w) + p.bob;
  return p;
}
