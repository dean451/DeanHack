import * as THREE from 'three';
import {CURVE, TAPE_HI} from './rubber-hose.js';

// The hero's rubber hose (rubber-hose.js) flops on a swing. The model is rigid, so this bends its
// vertices: everything past the top of the taped grip swings about a pivot there, more the further
// out along the hose it is, while the grip in the fist stays put. The bend is driven by a lagging
// point: the hose's tip as it would be, chased by a soft, underdamped spring. On the windup and
// strike the heavy end trails behind the arm; when the arm stops (the hitstop on a hit, or the end
// of the follow-through) it whips on past and wobbles back to rest in about half a second.
//
// The spring works in the hero group's own space, so walking across the map doesn't bend the hose;
// only the arm and body moving (and the hero turning) do. Any weapon-magic skin on the fittings
// (weapon-magic.js addShell, a child mesh with the same vertex order) bends with them.

// FREQ: spring stiffness (rad/s); DAMP: damping ratio (under 1, so the end wobbles before it
// settles); MAX: the most the hose bends either way (rad), reached softly.
export const FREQ = 17, DAMP = .3, MAX = .5;
// Where along the hose the bend starts (curve u), just past the tape.
export const PIVOT_U = TAPE_HI + .015;
// How many steps the bend is split into along the hose. A bend under REST rad (a few mm at the
// end) counts as straight, so the idle breath doesn't rewrite the mesh every frame.
const BINS = 24, SAMPLES = 96, STEP = 1 / 120, REST = .01, LOST = 1.5;

const PIVOT = CURVE.getPointAt(PIVOT_U), TIP = CURVE.getPointAt(1);
const ARM = TIP.clone().sub(PIVOT), ARM_LEN = ARM.length();
// In-plane direction the tip moves when the bend opens about z, and the out-of-plane axis.
const SIDE = new THREE.Vector3(-ARM.y, ARM.x, 0).normalize(), NAXIS = SIDE.clone();
const soft = v => MAX * Math.tanh(v / MAX);

export const isHose = w => !!w?.userData?.rubberHose;
export const heldHose = socket => socket?.children?.find(isHose) ?? null;

// The bend at a tip lag `d` (local weapon space, from the rest tip): `a` opens or closes the curl
// in its own plane, `b` swings it out of the plane. Both go to the tip moving toward `d`.
export function bendAngles(d) {
  if (!d || ![d.x, d.y, d.z].every(Number.isFinite)) return {a: 0, b: 0};
  return {a: soft((d.x * SIDE.x + d.y * SIDE.y) / ARM_LEN), b: soft(d.z / ARM_LEN)};
}

// How far along the bend each curve u is: 0 up to the pivot, 1 at the end.
export const bendWeight = u => u <= PIVOT_U ? 0 : Math.min(1, (u - PIVOT_U) / (1 - PIVOT_U));

const curvePts = Array.from({length: SAMPLES + 1}, (_, i) => CURVE.getPointAt(i / SAMPLES));
function nearestU(x, y, z) {
  let best = 0, bd = Infinity;
  for (let i = 0; i <= SAMPLES; i++) {
    const p = curvePts[i], d = (p.x - x) ** 2 + (p.y - y) ** 2 + (p.z - z) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return best / SAMPLES;
}

// Rotation (row-major 3x3) for the bend at weight s: about z by a·s, then about the in-plane
// axis by b·s.
const mats = Array.from({length: BINS + 1}, () => new Float32Array(9));
function fillMat(m, a, b) {
  const ca = Math.cos(a), sa = Math.sin(a);
  // about NAXIS (unit, in the xy plane) by -b: tips the end toward +z for positive b
  const c = Math.cos(-b), s = Math.sin(-b), t = 1 - c, x = NAXIS.x, y = NAXIS.y;
  const n = [t * x * x + c, t * x * y, s * y, t * x * y, t * y * y + c, -s * x, -s * y, s * x, c];
  const z = [ca, -sa, 0, sa, ca, 0, 0, 0, 1];
  for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++)
    m[r * 3 + k] = z[r * 3] * n[k] + z[r * 3 + 1] * n[3 + k] + z[r * 3 + 2] * n[6 + k];
}

// A mesh's rest positions and normals, and each vertex's bend bin, cached per geometry.
const rest = new WeakMap();
function restOf(geo) {
  let r = rest.get(geo);
  if (r) return r;
  const p = geo.attributes.position;
  const bins = new Uint8Array(p.count);
  for (let i = 0; i < p.count; i++) bins[i] = Math.round(bendWeight(nearestU(p.getX(i), p.getY(i), p.getZ(i))) * BINS);
  r = {pos: Float32Array.from(p.array), nor: geo.attributes.normal ? Float32Array.from(geo.attributes.normal.array) : null, bins};
  rest.set(geo, r);
  return r;
}

// Bend every mesh under the hose group by (a, b). With both 0 it puts the rest shape back.
export function bendHose(weapon, a, b) {
  for (let i = 0; i <= BINS; i++) fillMat(mats[i], a * i / BINS, b * i / BINS);
  const px = PIVOT.x, py = PIVOT.y, pz = PIVOT.z;
  weapon.traverse(o => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const geo = o.geometry, r = restOf(geo), pos = geo.attributes.position.array, nor = geo.attributes.normal?.array;
    for (let i = 0, n = r.bins.length; i < n; i++) {
      const bin = r.bins[i], j = i * 3;
      if (!bin) { pos[j] = r.pos[j]; pos[j + 1] = r.pos[j + 1]; pos[j + 2] = r.pos[j + 2]; if (nor && r.nor) { nor[j] = r.nor[j]; nor[j + 1] = r.nor[j + 1]; nor[j + 2] = r.nor[j + 2]; } continue; }
      const m = mats[bin], x = r.pos[j] - px, y = r.pos[j + 1] - py, z = r.pos[j + 2] - pz;
      pos[j] = m[0] * x + m[1] * y + m[2] * z + px;
      pos[j + 1] = m[3] * x + m[4] * y + m[5] * z + py;
      pos[j + 2] = m[6] * x + m[7] * y + m[8] * z + pz;
      if (nor && r.nor) {
        const u = r.nor[j], v = r.nor[j + 1], w = r.nor[j + 2];
        nor[j] = m[0] * u + m[1] * v + m[2] * w; nor[j + 1] = m[3] * u + m[4] * v + m[5] * w; nor[j + 2] = m[6] * u + m[7] * v + m[8] * w;
      }
    }
    geo.attributes.position.needsUpdate = true;
    if (geo.attributes.normal) geo.attributes.normal.needsUpdate = true;
  });
}

// One spring step: the lag point `s.p` (velocity `s.v`) chases `target`.
export function stepLag(s, target, dt) {
  const k = FREQ * FREQ, c = 2 * DAMP * FREQ;
  for (let left = Math.min(Math.max(dt, 0), .05); left > 1e-6; left -= STEP) {
    const h = Math.min(STEP, left);
    for (const ax of ['x', 'y', 'z']) {
      s.v[ax] += (k * (target[ax] - s.p[ax]) - c * s.v[ax]) * h;
      s.p[ax] += s.v[ax] * h;
    }
  }
}

const tmp = new THREE.Vector3(), lagLocal = new THREE.Vector3();
// Per frame, after actions.js has posed the hero. Does nothing unless a rubber hose is in hand.
export function updateHoseFlop(actor, dt) {
  const socket = actor?.weaponSocket, root = actor?.g, weapon = heldHose(socket);
  if (!weapon || !root) return;
  let s = weapon.userData.hoseFlop;
  socket.updateWorldMatrix(true, false);
  // the rest tip in the hero group's space
  const target = root.worldToLocal(weapon.localToWorld(tmp.copy(TIP)));
  if (![target.x, target.y, target.z].every(Number.isFinite)) return;
  if (!s || s.p.distanceTo(target) > LOST) s = weapon.userData.hoseFlop = {p: target.clone(), v: new THREE.Vector3(), a: 0, b: 0};
  stepLag(s, target, dt);
  // the lag point back in the hose's own space
  const d = weapon.worldToLocal(root.localToWorld(lagLocal.copy(s.p))).sub(TIP);
  let {a, b} = bendAngles(d);
  if (Math.abs(a) < REST && Math.abs(b) < REST) a = b = 0;
  if (a === s.a && b === s.b) return;
  s.a = a; s.b = b;
  bendHose(weapon, a, b);
}

// For tests: the rest tip and pivot in weapon space.
export const HOSE_TIP = TIP.clone(), HOSE_PIVOT = PIVOT.clone();
