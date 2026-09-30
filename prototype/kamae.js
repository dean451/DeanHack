import * as THREE from 'three';

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
// sword arm, so it stays on the hilt as the stance fades in and out. An attack (monster-chop.js
// plays from the one-handed rest pose), a throw or death drops the stance within ~0.3 s, all but a
// hair of it by the blow; it comes back once the actor is idle or walking again.
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

const ZERO = () => ({arm: {x: 0, z: 0}, socket: {x: 0, y: 0, z: 0}, off: {x: 0, z: 0}, shoulders: [0, 0]});

// Whether the stance should drop: swinging, throwing or dead.
function breaking(q) {
  if (!q) return false;
  if (q.dead) return true;
  const drops = a => a?.kind === 'attack' || a?.kind === 'throw' || a?.kind === 'die';
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
  if (!(f > 0)) return null;

  const p = ZERO();
  p.shoulders = [SHOULDER[0] * f, SHOULDER[1] * f];
  left.position.z += p.shoulders[0]; right.position.z += p.shoulders[1];
  const breath = Number.isFinite(t) ? BREATH * Math.sin(t * BREATH_RATE) : 0;
  const k = kamaePose(st.rest, right.position, RAISE + breath);
  p.arm.x = k.arm.x * f; p.arm.z = k.arm.z * f;
  p.socket.x = k.socket.x * f; p.socket.y = k.socket.y * f; p.socket.z = k.socket.z * f;
  right.rotation.x += p.arm.x; right.rotation.z += p.arm.z;
  s.rotation.x += p.socket.x; s.rotation.y += p.socket.y; s.rotation.z += p.socket.z;

  // the left hand goes to the hilt wherever the sword arm is now
  const l = aim(left.position, hiltGrip(actor, tmpV));
  p.off.x = wrap(l.x - left.rotation.x) * f; p.off.z = wrap(l.z - left.rotation.z) * f;
  left.rotation.x += p.off.x; left.rotation.z += p.off.z;
  st.applied = p;
  return p;
}
