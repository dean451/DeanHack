import * as THREE from 'three';
import {THROW_TIME, RELEASE_U} from './throw-motion.js';

// The hero's sling (sling.js) whirls when it lets fly. During a throw action (throw-motion.js)
// whose missile is a stone or gem (only those go in a sling), the whole sling spins about the
// hand: from a standstill it whips round faster and faster through the windup, one full turn,
// so it comes back over the top just as the arm does and the stone leaves on the release. The flint in the pouch goes
// with it (hidden until the action ends, when the next stone is in). The empty pouch flies on
// round one more turn, slowing hard, and is hanging at rest again well before the action ends.
//
// Only the sling group's own rotation is touched (about its local x, so the pouch circles the
// hand in the plane of the cords' lean); the rest of the throw (arm, elbow, lean) is the
// action layer's. A throw of anything else, or no sling in hand, leaves it alone. The missile
// shape comes from flights.js, which already draws it, so nothing here reveals identity.

// Turns before the release (ending at rest, pouch up) and after it (the empty pouch flying on).
export const WINDUP_TURNS = 1, FLOP_TURNS = 1;
const TAU = Math.PI * 2;
const SLUNG = new Set(['stone', 'gem']);

export const isSling = w => !!w?.userData?.sling;
export const heldSling = socket => socket?.children?.find(isSling) ?? null;
export const slings = action => action?.kind === 'throw' && SLUNG.has(action.shape);

// The spin (rad) at throw phase u (0..1). 0 at both ends; a whole number of turns at the
// release and the end, so the sling is back at rest; always increasing, no jump at the release.
export function whirlAngle(u) {
  if (!(u > 0)) return 0;
  if (u >= 1) return 0;
  const R = RELEASE_U, wind = WINDUP_TURNS * TAU;
  // The flop eases out as 1-(1-v)^3, starting at 3 times its mean speed and ending at none;
  // the windup's power is picked so it reaches just that speed at the release.
  const flop = FLOP_TURNS * TAU, power = 3 * R / (1 - R) * flop / wind;
  if (u <= R) return wind * (u / R) ** power;
  return wind + flop * (1 - (1 - (u - R) / (1 - R)) ** 3);
}

// Whether the flint is still in the pouch at throw phase u.
export const stoneIn = u => !(u >= RELEASE_U && u < 1);

const spin = new THREE.Quaternion(), X = new THREE.Vector3(1, 0, 0);
function stoneMeshes(weapon) {
  const out = [];
  weapon.traverse(o => { if (o.isMesh && o.userData.part === 'stone') out.push(o); });
  return out;
}

// Per frame, after actions.js has posed the hero. Does nothing unless a sling is in hand.
export function updateSlingWhirl(actor) {
  const weapon = heldSling(actor?.weaponSocket);
  if (!weapon) return;
  let s = weapon.userData.slingWhirl;
  const q = actor.actions, a = q?.current;
  const u = slings(a) ? Math.min(1, Math.max(0, q.age / THROW_TIME)) : 0;
  const angle = whirlAngle(u), held = stoneIn(u);
  if (!s) {
    if (!angle && held) return;
    s = weapon.userData.slingWhirl = {rest: weapon.quaternion.clone(), angle: 0, held: true, stones: stoneMeshes(weapon)};
  }
  if (angle !== s.angle) {
    weapon.quaternion.copy(s.rest);
    if (angle) weapon.quaternion.multiply(spin.setFromAxisAngle(X, angle));
    s.angle = angle;
  }
  if (held !== s.held) {
    for (const m of s.stones) m.visible = held;
    s.held = held;
  }
}
