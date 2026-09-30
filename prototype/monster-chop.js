// A weapon chop for monsters that hold a weapon on an arm without an elbow (goblins, elves,
// priests, soldiers, the watch...). The generic weapon wave in monster-attacks.js lifts the arm
// to its peak at the strike, so the blow lands with the blade pointing at the ceiling. Here the
// arm is raised overhead in the windup with the weapon cocked back behind the head, then
// brought down through the target at the strike (STRIKE_U in actions.js), the wrist snapping
// the blade forward. A hit stops dead on the target and pulls back; a miss follows through
// low before recovering.
//
// chopPose(u, result) gives {arm, grip, socket, wrist}: `arm` is the shoulder (arm rotation.x),
// `grip` the wrist bend (weaponSocket rotation.x), `socket` the roll that turns the edge down
// (weaponSocket rotation.z). All are 0 at u 0 and 1.

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

// Where the strike lands; matches STRIKE_U in actions.js (kept here to avoid an import cycle).
export const CHOP_STRIKE_U = .44;

// [u, arm, grip]: raised and cocked, down through the target, then the hit or the miss.
const WINDUP = [[0, 0, 0], [.3, -2.45, -.85]];
const HIT = [[CHOP_STRIKE_U, -.75, .9], [.54, -.7, .85], [.76, -.85, .45], [1, 0, 0]];
const MISS = [[CHOP_STRIKE_U, -.75, .9], [.56, -.2, 1.15], [.8, -.4, .5], [1, 0, 0]];

function keyed(keys, u) {
  if (u <= keys[0][0]) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    const [u1, ...b] = keys[i];
    if (u <= u1) {
      const [u0, ...a] = keys[i - 1], t = smooth((u - u0) / (u1 - u0));
      return [u, ...a.map((v, k) => v + (b[k] - v) * t)];
    }
  }
  return keys[keys.length - 1];
}

// Whether an actor chops: an arm and a weapon socket, no elbow (the hero's arm plays swing.js)
// and no centaur rig, armed or not (centaur-attack.js). The weapon has to be held pointing forward; an
// upright spear or halberd (the soldiers and the watch) would only be rolled out sideways, so
// those keep the generic wave. An empty socket chops with the arm alone. Measured once, at rest.
const heldForward = new WeakMap();
export function chops(actor) {
  const s = actor?.weaponSocket;
  if (!actor?.arm || !s || actor.elbow || actor.centaur !== undefined) return false;
  let fwd = heldForward.get(s);
  if (fwd === undefined) {
    let far = null, best = -1;
    const v = {x: 0, y: 0, z: 0}, e = new Float64Array(16);
    s.updateMatrixWorld(true);
    const inv = s.matrixWorld.clone().invert();
    s.traverse(m => {
      const p = m.isMesh && m.geometry?.attributes?.position;
      if (!p) return;
      e.set(m.matrixWorld.clone().premultiply(inv).elements);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        v.x = e[0] * x + e[4] * y + e[8] * z + e[12]; v.y = e[1] * x + e[5] * y + e[9] * z + e[13]; v.z = e[2] * x + e[6] * y + e[10] * z + e[14];
        const d = v.x * v.x + v.y * v.y + v.z * v.z;
        if (d > best) { best = d; far = {...v}; }
      }
    });
    fwd = !far || far.z > Math.abs(far.y);
    heldForward.set(s, fwd);
  }
  return fwd;
}

export function chopPose(u, result = 'hit') {
  u = Number.isFinite(u) ? clamp01(u) : 0;
  const [, arm, grip] = keyed([...WINDUP, ...(result === 'hit' ? HIT : MISS)], u);
  // The edge turns down as the weapon comes up, and back once the blow is spent.
  const socket = -1.1 * (u < .6 ? smooth(u / .25) : 1 - smooth((u - .6) / .4));
  return {arm, grip, socket, wrist: 0};
}
