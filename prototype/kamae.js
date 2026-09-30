import * as THREE from 'three';
import {createSwingTrail} from './swing.js';
import {weaponReach} from './swing-fx.js';

// A two-handed katana grip for the samurai (samurai.js). At rest the model holds its katana in
// the right hand alone, low at the hip. Here it stands in chūdan-no-kamae instead: the right hand
// brought up in front of the chest just behind the tsuba, the blade pointing forward and up at the
// foe's throat with the edge down, and the left hand below it on the hilt, towards the pommel. The
// blade tip rises and falls a touch with the breath.
//
// The arms have no elbows, so a straight arm from the shoulder to the middle of the chest would
// pass through the dō. Both shoulders come forward a little instead (the left more, since it
// reaches across), which keeps the arms clear of the armour.
//
// The left hand is aimed at the hilt afresh every frame, after the action layer has moved the
// sword arm, so it stays on the hilt as the stance fades in and out. A throw or death drops the
// stance within ~0.3 s; it comes back once the actor is idle or walking again.
//
// A weapon attack is cut from the stance, two-handed (actions.js takes its generic arm wave off):
// the katana goes up over the head, blade back (furikaburi), comes down through the target to a
// little below level at the blow, and then either stops on the hit or follows through low on a
// miss, before settling back into kamae. The left hand rides the hilt all the way.
//
// The fast part of the cut, from the top of the raise down through the blow (and on through the
// follow-through on a miss), leaves a pale steel ribbon behind the blade, like the hero's swing
// trail. It hangs from the actor's own group, so it goes when the actor does, and fades out in
// ~0.14 s once the blade slows.
//
// Everything is an offset (the arms' and socket's Euler angles, the shoulders' positions), taken
// back first each frame, so actions.js's own offsets on the same parts still stack on top.

// HAND: where the right hand (the socket) is aimed, in the body's space; RAISE: the blade's angle
// above level (rad); BREATH: the tip's rise and fall with the breath (rad) at BREATH_RATE (rad/s);
// SHOULDER: how far each shoulder comes forward [left, right]; HILT: the stretch of hilt below the
// socket the left hand may grip (katana space, +y to the tip; the pommel cap is at -.082).
export const HAND = Object.freeze({x: .04, y: .76, z: .36}), RAISE = .55, BREATH = .025, BREATH_RATE = 1.7;
export const SHOULDER = Object.freeze([.07, .05]), HILT = Object.freeze([-.078, -.04]);
export const FADE_IN = 6, FADE_OUT = 24;
export const ARM_LEN = .37;
const SNAP = 1e-3;

export const holdsKamae = a => !!(a && !a.asset && a.kind === 'samurai' && a.arms?.length >= 2 && a.arm === a.arms[1] && a.weaponSocket && a.body);

// Arm angles (Euler XYZ, y = 0) that point an arm hanging along its local -y from `from` at `to`.
export function aim(from, to) {
  const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z, n = Math.hypot(dx, dy, dz) || 1;
  return {x: Math.atan2(-dz / n, -dy / n), z: Math.asin(Math.max(-1, Math.min(1, dx / n)))};
}

const wrap = v => v - 2 * Math.PI * Math.round(v / (2 * Math.PI));
const tmpE = new THREE.Euler(), tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion(), tmpM = new THREE.Matrix4();
const tmpV = new THREE.Vector3(), tmpW = new THREE.Vector3(), tmpD = new THREE.Vector3(), tmpN = new THREE.Vector3(), tmpX = new THREE.Vector3();

// The kamae's offsets for the sword arm and socket at blade angle `raise`, from their rest angles
// `rest` ({arm: {x, z}, socket: {x, y, z}}) and where the right shoulder is.
export function kamaePose(rest, shoulder, raise = RAISE, hand = HAND) {
  const r = aim(shoulder, hand);
  // the katana's +y along the blade, its +z (the edge) down and forward, square to it
  tmpD.set(0, Math.sin(raise), Math.cos(raise));
  tmpN.set(0, -Math.cos(raise), Math.sin(raise));
  tmpX.crossVectors(tmpD, tmpN);
  tmpQ.setFromRotationMatrix(tmpM.makeBasis(tmpX, tmpD, tmpN));
  tmpQ2.setFromEuler(tmpE.set(r.x, 0, r.z)).invert().multiply(tmpQ);
  tmpE.setFromQuaternion(tmpQ2, 'XYZ');
  return {arm: {x: wrap(r.x - rest.arm.x), z: wrap(r.z - rest.arm.z)},
    socket: {x: wrap(tmpE.x - rest.socket.x), y: wrap(tmpE.y - rest.socket.y), z: wrap(tmpE.z - rest.socket.z)}};
}

// Where the left hand grips, in the body's space, from the sword arm and socket as posed now: the
// point on HILT an arm's length from the left shoulder, or the nearer end when none is.
export function hiltGrip(actor, out = new THREE.Vector3()) {
  const {arm, weaponSocket: s} = actor, shoulder = actor.arms[0].position;
  arm.updateMatrix(); s.updateMatrix();
  const reach = y => tmpW.set(0, y, 0).applyMatrix4(s.matrix).applyMatrix4(arm.matrix).distanceTo(shoulder) - ARM_LEN;
  let lo = HILT[0], hi = HILT[1];
  const a = reach(lo), b = reach(hi);
  let y = Math.abs(a) < Math.abs(b) ? lo : hi;
  if (a * b < 0) {
    // along so short a stretch the reach only runs one way: bisect for where it is exact
    for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; if ((reach(m) < 0) === (a < 0)) lo = m; else hi = m; }
    y = (lo + hi) / 2;
  }
  return out.set(0, y, 0).applyMatrix4(s.matrix).applyMatrix4(arm.matrix);
}

// The cut, as [u, blade angle, hand y, hand z] (hand x stays at HAND.x), keyed on the attack's
// phase. CUT_STRIKE_U matches STRIKE_U in actions.js (kept here to avoid an import cycle).
export const CUT_STRIKE_U = .44;
const CUT_UP = [[0, RAISE, HAND.y, HAND.z], [.3, 2.2, 1.02, .2]];
const CUT_HIT = [[CUT_STRIKE_U, -.15, .74, .42], [.54, -.1, .75, .41], [.76, .3, .75, .38], [1, RAISE, HAND.y, HAND.z]];
const CUT_MISS = [[CUT_STRIKE_U, -.15, .74, .42], [.56, -.6, .6, .38], [.8, .1, .7, .37], [1, RAISE, HAND.y, HAND.z]];
const smooth = v => { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); };

// The blade angle and where the right hand is aimed, at phase u of a cut.
export function cutPose(u, result = 'hit') {
  const keys = [...CUT_UP, ...(result === 'hit' ? CUT_HIT : CUT_MISS)];
  u = Number.isFinite(u) ? Math.max(0, Math.min(1, u)) : 0;
  let k = keys[keys.length - 1];
  for (let i = 1; i < keys.length; i++) {
    if (u > keys[i][0]) continue;
    const a = keys[i - 1], b = keys[i], w = smooth((u - a[0]) / (b[0] - a[0]));
    k = a.map((v, j) => v + (b[j] - v) * w);
    break;
  }
  return {raise: k[1], hand: {x: HAND.x, y: k[2], z: k[3]}};
}

// The stretch of the cut (by phase) the trail is drawn over, per result, and where along the blade
// the ribbon's inner edge sits.
export const TRAIL_U = Object.freeze({hit: Object.freeze([.28, .46]), miss: Object.freeze([.28, .58])}), TRAIL_INNER = .3;
export const cutTrailOn = (u, result = 'hit') => { const w = TRAIL_U[result === 'miss' ? 'miss' : 'hit']; return u > w[0] && u < w[1]; };

const trailBase = new THREE.Vector3(), trailTip = new THREE.Vector3();
function updateCutTrail(actor, st, dt, on) {
  if (on && !st.trail) {
    st.trail = createSwingTrail(THREE);
    st.trail.mesh.userData.keepOpaque = true; // it fades itself; a death fade would pin its visibility
    actor.g.add(st.trail.mesh);
  }
  if (!st.trail) return;
  if (on) {
    const s = actor.weaponSocket, reach = weaponReach(s);
    s.updateWorldMatrix(true, false);
    const inv = tmpM.copy(actor.g.matrixWorld).invert();
    s.localToWorld(trailBase.set(0, reach * TRAIL_INNER, 0)).applyMatrix4(inv);
    s.localToWorld(trailTip.set(0, reach, 0)).applyMatrix4(inv);
    if ([trailBase.x, trailBase.y, trailBase.z, trailTip.x, trailTip.y, trailTip.z].every(Number.isFinite)) st.trail.sample(trailBase, trailTip);
  }
  st.trail.update(dt);
}

const cutting = q => q?.current?.kind === 'attack' && q.current.attack === 'weapon' && !q.dead;

const ZERO = () => ({arm: {x: 0, z: 0}, socket: {x: 0, y: 0, z: 0}, off: {x: 0, z: 0}, shoulders: [0, 0]});

// Whether the stance should drop: swinging, throwing or dead.
function breaking(q) {
  if (!q) return false;
  if (q.dead) return true;
  const drops = a => a?.kind === 'throw' || a?.kind === 'die' || (a?.kind === 'attack' && a.attack !== 'weapon');
  return drops(q.current) || !!q.queue?.some(drops);
}

// Call once per frame after updateActions. Returns the offsets applied this frame, or null.
export function updateKamae(actor, dt, t) {
  if (!holdsKamae(actor)) return null;
  const [left, right] = actor.arms, s = actor.weaponSocket;
  let st = actor.kamae;
  if (!st) {
    st = actor.kamae = {f: breaking(actor.actions) ? 0 : 1, applied: ZERO(),
      rest: {arm: {x: right.rotation.x, z: right.rotation.z}, socket: {x: s.rotation.x, y: s.rotation.y, z: s.rotation.z}}};
  }
  const o = st.applied;
  right.rotation.x -= o.arm.x; right.rotation.z -= o.arm.z;
  s.rotation.x -= o.socket.x; s.rotation.y -= o.socket.y; s.rotation.z -= o.socket.z;
  left.rotation.x -= o.off.x; left.rotation.z -= o.off.z;
  left.position.z -= o.shoulders[0]; right.position.z -= o.shoulders[1];
  st.applied = ZERO();

  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const hold = !breaking(actor.actions), to = hold ? 1 : 0;
  st.f = to + (st.f - to) * Math.exp(-(hold ? FADE_IN : FADE_OUT) * dt);
  if (Math.abs(st.f - to) < SNAP) st.f = to;
  const f = st.f;
  if (!(f > 0)) { updateCutTrail(actor, st, dt, false); return null; }

  const p = ZERO();
  p.shoulders = [SHOULDER[0] * f, SHOULDER[1] * f];
  left.position.z += p.shoulders[0]; right.position.z += p.shoulders[1];
  const breath = Number.isFinite(t) ? BREATH * Math.sin(t * BREATH_RATE) : 0;
  const cuts = cutting(actor.actions);
  const cut = cuts ? cutPose(actor.actions.u, actor.actions.current.result) : {raise: RAISE, hand: HAND};
  const k = kamaePose(st.rest, right.position, cut.raise + breath, cut.hand);
  p.arm.x = k.arm.x * f; p.arm.z = k.arm.z * f;
  p.socket.x = k.socket.x * f; p.socket.y = k.socket.y * f; p.socket.z = k.socket.z * f;
  right.rotation.x += p.arm.x; right.rotation.z += p.arm.z;
  s.rotation.x += p.socket.x; s.rotation.y += p.socket.y; s.rotation.z += p.socket.z;

  // the left hand goes to the hilt wherever the sword arm is now
  const l = aim(left.position, hiltGrip(actor, tmpV));
  p.off.x = wrap(l.x - left.rotation.x) * f; p.off.z = wrap(l.z - left.rotation.z) * f;
  left.rotation.x += p.off.x; left.rotation.z += p.off.z;
  st.applied = p;
  updateCutTrail(actor, st, dt, cuts && f > .5 && cutTrailOn(actor.actions.u, actor.actions.current.result));
  return p;
}
