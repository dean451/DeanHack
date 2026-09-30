// The gelatinous cube's remains (three skulls, bones and a rusted dagger, one merged mesh from
// creatures.js) float in the jelly instead of hanging fixed. They turn slowly back and forth,
// rock a little and rise and sink, all on long, uneven periods so the drift never looks like a
// loop. When the cube slides along, the jelly drags them: they trail and tip back, and swing
// forward again when it stops.
//
// The mesh turns about the cube's centre, not its base, so everything stays inside the block.
// It is the only thing that moves the remains, so each frame sets their pose outright.
import * as THREE from 'three';

// Centre of the jelly (the block is .5 on a side, standing on y 0).
export const CENTER = .25;
// Yaw sway (radians) from two slow waves, tilt (radians) and bob (world units).
export const YAW = .45, TILT = .06, BOB = .012;
// Backward tip and sideways slip while the cube moves; how fast the drag builds and settles.
export const DRAG_TIP = .1, DRAG_SLIP = .015, DRAG_RATE = 3;

const Y = new THREE.Vector3(0, 1, 0), C = new THREE.Vector3(0, CENTER, 0);
const qYaw = new THREE.Quaternion(), qTilt = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3();

export const drifts = a => !!(a && !a.asset && a.quirk === 'cube' && remainsOf(a));

function remainsOf(a) {
  if (a.g.userData.remains !== undefined) return a.g.userData.remains;
  let r = null;
  a.g.traverse(o => { if (!r && o.userData.part === 'remains') r = o; });
  return (a.g.userData.remains = r);
}

// The drift pose at time t for phase ph, with drag d (0 still, 1 moving): yaw, tilt x/z, bob.
export function driftPose(t, ph = 0, d = 0) {
  t = Number.isFinite(t) ? t : 0;
  d = d > 0 ? Math.min(d, 1) : 0;
  return {
    yaw: YAW * (.7 * Math.sin(t * .31 + ph) + .3 * Math.sin(t * .83 + ph * 2.3)),
    tx: TILT * Math.sin(t * .47 + ph * 1.7) - DRAG_TIP * d,
    tz: TILT * .8 * Math.sin(t * .37 + ph * .6),
    bob: BOB * Math.sin(t * .58 + ph * 3.1) - DRAG_SLIP * d,
  };
}

// Call once per frame. `walking` is true while the cube slides toward a new cell.
export function updateCubeDrift(a, dt, t, walking) {
  if (!drifts(a)) return null;
  const r = remainsOf(a);
  const st = a.cubeDrift || (a.cubeDrift = {ph: ((a.g.id ?? 1) * 2.399) % (Math.PI * 2), drag: 0});
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  st.drag += ((walking && !a.actions?.dead ? 1 : 0) - st.drag) * (1 - Math.exp(-DRAG_RATE * dt));
  const p = driftPose(t, st.ph, st.drag);
  qYaw.setFromAxisAngle(Y, p.yaw);
  qTilt.setFromEuler(e.set(p.tx, 0, p.tz));
  r.quaternion.multiplyQuaternions(qTilt, qYaw);
  // turn about the centre: position = C - R·C, then the bob
  r.position.copy(C).sub(v.copy(C).applyQuaternion(r.quaternion));
  r.position.y += p.bob;
  return p;
}
