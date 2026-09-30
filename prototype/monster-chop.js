// A weapon chop for monsters that hold a weapon forward on an arm without an elbow (goblins,
// elves, priests...). Soldiers and the watch, who hold theirs upright, thrust instead (thrusts()). The generic weapon wave in monster-attacks.js lifts the arm
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

// How an armed actor holds its weapon: 'forward' (a blade or club held out, which chops),
// 'upright' (a spear or halberd planted at its side, which thrusts) or null (no arm and socket,
// an elbowed hero arm that plays swing.js, or a centaur rig, armed or not, which plays
// centaur-attack.js). An empty socket counts as forward and chops with the arm alone. Measured
// once, at rest, from the weapon's far end.
const grips = new WeakMap();
function weaponGrip(actor) {
  const s = actor?.weaponSocket;
  if (!actor?.arm || !s || actor.elbow || actor.centaur !== undefined) return null;
  let grip = grips.get(s);
  if (grip === undefined) {
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
    grip = !far || far.z > Math.abs(far.y) ? 'forward' : far.y > .5 ? 'upright' : null;
    grips.set(s, grip);
  }
  return grip;
}

// Whether an actor chops: it holds its weapon (or nothing) forward.
export const chops = actor => weaponGrip(actor) === 'forward';
// Whether an actor thrusts instead: a long polearm held upright (the soldiers' spears and the
// watch's halberds). actions.js drops it level and drives it at the target with the centaur's
// spear thrust (centaur-attack.js), which uses the same shoulder and hand handles.
export const thrusts = actor => weaponGrip(actor) === 'upright';

export function chopPose(u, result = 'hit') {
  u = Number.isFinite(u) ? clamp01(u) : 0;
  const [, arm, grip] = keyed([...WINDUP, ...(result === 'hit' ? HIT : MISS)], u);
  // The edge turns down as the weapon comes up, and back once the blow is spent.
  const socket = -1.1 * (u < .6 ? smooth(u / .25) : 1 - smooth((u - .6) / .4));
  return {arm, grip, socket, wrist: 0};
}
