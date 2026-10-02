import * as THREE from 'three';

// A living flap for a cloth tail baked into a merged head mesh (so there is no part to swing):
// Lord Carnarvon's puggaree, the frayed khaki tail hanging down the back of his pith helmet. It
// finds the tail's vertices by its box (the same placement the model builds it with) and swings
// them about the tail's top edge, like a hinge sewn under the brim.
//
// Three things move it:
//  - Trail: a soft, underdamped spring in the figure's own frame. Walking forward lifts the tail
//    out behind the helmet; walking sideways swings it across in its own plane; at the stop it
//    swings past, taps back against the helmet and settles.
//  - Breeze: a dry, gusty tomb draught that never quite stops while he lives. It lifts the tail a
//    little in uneven puffs and rocks it from side to side.
//  - Fray: the ragged bottom end twists on its own, quicker, as if worrying at a loose thread.
// Dead, it all eases out and the rest shape is written back once. Stone (`a.stone`) holds.
//
// Shared head geometry is cloned per actor on first use, so other copies stay still; the clone is
// disposed with the actor (userData.dispose, which live.js's release calls).

// part: the mesh (userData.part) holding the tail; pos/rot/size: the tail box as the model places it
// (head space); lag: the most it lifts out (radians) at speed `sat`; side: the most it swings across;
// freq/damp: the trail spring; inward: how far it may tip back toward the helmet (radians);
// breeze/breezeHz: the draught; fray: the bottom end's twist (radians).
export const FLAPS = {
  'lord carnarvon': {
    part: 'head', pos: [.02, .11, -.098], rot: [.25, 0, .12], size: [.03, .09, .004],
    lag: .6, side: .45, sat: 1.1, freq: 7.5, damp: .22, inward: .1,
    breeze: .12, breezeHz: .23, fray: .35,
  },
};
// TELEPORT: a speed (world units/s) no walk reaches
const STEP = 1 / 120, MAX_DT = .1, EASE = 1.5, TELEPORT = 20, REST = 1e-4, EPS = 1e-4;

export const isFlap = a => !!a && !a.asset && !!FLAPS[a.kind] && !!a.head;

function flapMesh(actor, P) {
  let found = null;
  actor.head.traverse(o => { if (!found && o.isMesh && o.userData.part === P.part) found = o; });
  return found;
}

// The per-actor setup: the cloned geometry, its rest positions and, for each tail vertex, its
// position in the tail's own frame (x across, y up the tail, z out of its face).
function setup(actor, P) {
  const mesh = flapMesh(actor, P);
  if (!mesh?.geometry?.attributes?.position) return null;
  const box = new THREE.Matrix4().compose(new THREE.Vector3(...P.pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...P.rot)), new THREE.Vector3(1, 1, 1));
  const inv = box.clone().invert(), [hx, hy, hz] = P.size.map(s => s / 2 + EPS);
  const p = mesh.geometry.attributes.position, v = new THREE.Vector3(), idx = [], loc = [];
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(inv);
    if (Math.abs(v.x) > hx || Math.abs(v.y) > hy || Math.abs(v.z) > hz) continue;
    idx.push(i); loc.push(v.x, v.y, v.z);
  }
  if (!idx.length) return null;
  const geo = mesh.geometry.clone();
  mesh.geometry = geo;
  const prev = mesh.userData.dispose;
  mesh.userData.dispose = () => { prev?.(); geo.dispose(); };
  const seed = Math.abs(Math.sin((actor.g.id || 1) * 78.233)) * 43758.5453 % (Math.PI * 2);
  return {
    geo, box, rest: Float32Array.from(geo.attributes.position.array), idx: Uint32Array.from(idx),
    loc: Float32Array.from(loc), half: P.size[1] / 2, seed,
    lift: 0, vl: 0, swing: 0, vs: 0, px: actor.g.position.x, pz: actor.g.position.z,
    life: 1, settled: false,
  };
}

// The flap's angles at one frame: lift (about the tail's top edge, + = out from the helmet), swing
// (across, in its own plane) and twist (the bottom end, about the tail's length).
export function flapAngles(P, st, t) {
  const ph = st.seed, life = st.life, w = P.breezeHz * Math.PI * 2;
  // gusts: a slow swell with a quicker, uneven puff riding on it, never below zero
  const gust = Math.max(0, .55 + .45 * Math.sin(w * t + ph)) * (.7 + .3 * Math.sin(w * 3.7 * t + ph * 2.3));
  const lift = st.lift + P.breeze * life * gust;
  const swing = st.swing + P.breeze * .6 * life * Math.sin(w * 1.9 * t + ph * 1.3);
  const twist = P.fray * life * (.4 + .6 * gust) * Math.sin(5.3 * t + ph) * Math.sin(1.7 * t + ph * .7);
  return {lift: Math.max(-P.inward, lift), swing, twist};
}

const q = new THREE.Vector3(), out = new THREE.Vector3(), ex = new THREE.Euler();
const rot = new THREE.Matrix4(), tw = new THREE.Matrix4();

// Per frame, after the slide. Returns the actor's flap state, or null for other actors.
export function updateFlap(actor, dt, t) {
  if (!isFlap(actor)) return null;
  const P = FLAPS[actor.kind];
  let st = actor.clothFlap;
  if (st === undefined) st = actor.clothFlap = setup(actor, P);
  if (!st || actor.stone) return st;
  dt = Number.isFinite(dt) ? Math.min(MAX_DT, Math.max(0, dt)) : 0;
  t = Number.isFinite(t) ? t : 0;
  const g = actor.g, dead = !!actor.actions?.dead;

  // velocity in the figure's own frame (+z forward)
  let fx = 0, fz = 0;
  if (dt > 0) {
    let vx = (g.position.x - st.px) / dt, vz = (g.position.z - st.pz) / dt;
    // a jump (a new level, a trapdoor) shouldn't fling it
    if (!(Math.hypot(vx, vz) <= TELEPORT)) vx = vz = 0;
    const yaw = g.rotation.y, sy = Math.sin(yaw), cy = Math.cos(yaw);
    fx = vx * cy - vz * sy; fz = vx * sy + vz * cy;
  }
  st.px = g.position.x; st.pz = g.position.z;
  // walking forward lifts it out behind; sideways swings its bottom the other way
  const tl = dead ? 0 : P.lag * Math.tanh(Math.max(0, fz) / P.sat);
  const ts = dead ? 0 : P.side * Math.tanh(fx / P.sat);
  const k = P.freq * P.freq, c = 2 * P.damp * P.freq;
  for (let left = dt; left > 1e-9; left -= STEP) {
    const h = Math.min(STEP, left);
    st.vl += (k * (tl - st.lift) - c * st.vl) * h; st.lift += st.vl * h;
    st.vs += (k * (ts - st.swing) - c * st.vs) * h; st.swing += st.vs * h;
    // the helmet stops it tipping in: a soft tap that kills most of the swing back
    if (st.lift < -P.inward) { st.lift = -P.inward; if (st.vl < 0) st.vl *= -.25; }
  }
  st.lift = Math.min(st.lift, P.lag * 1.4);
  st.swing = Math.max(-P.side * 1.4, Math.min(P.side * 1.4, st.swing));
  st.life += ((dead ? 0 : 1) - st.life) * (1 - Math.exp(-EASE * dt));

  const quiet = dead && st.life < .01 && Math.abs(st.lift) < REST && Math.abs(st.swing) < REST
    && Math.abs(st.vl) < REST && Math.abs(st.vs) < REST;
  if (quiet && st.settled) return st;
  const pos = st.geo.attributes.position.array, rest = st.rest, a = flapAngles(P, st, t);
  // in the tail's frame: lift turns about x and swing about z, both through the top edge
  rot.makeRotationFromEuler(ex.set(a.lift, 0, -a.swing, 'XZY'));
  for (let n = 0; n < st.idx.length; n++) {
    const j = st.idx[n] * 3;
    if (quiet) { pos[j] = rest[j]; pos[j + 1] = rest[j + 1]; pos[j + 2] = rest[j + 2]; continue; }
    q.set(st.loc[n * 3], st.loc[n * 3 + 1], st.loc[n * 3 + 2]);
    // the twist grows toward the frayed end and is nothing at the top
    const w = Math.max(0, Math.min(1, (st.half - q.y) / (2 * st.half)));
    tw.makeRotationY(a.twist * w * w);
    out.copy(q).applyMatrix4(tw);
    out.y -= st.half;
    out.applyMatrix4(rot);
    out.y += st.half;
    out.applyMatrix4(st.box);
    pos[j] = out.x; pos[j + 1] = out.y; pos[j + 2] = out.z;
  }
  st.settled = quiet;
  st.geo.attributes.position.needsUpdate = true;
  return st;
}
