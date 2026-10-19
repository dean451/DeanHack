// The pet cat sculpted as one body, for the skinned pet (feline-skin.js). feline.js builds every cat
// from primitives (a ball head, a stretched-sphere torso, tubes and knobs for legs), and the hull
// grown over those keeps their shapes: a round head, a hump where the neck ball sits, a point where
// the torso's end cap meets the rump ball, and knobbed joints. This describes the cat's anatomy
// as signed distances instead, joined with smooth minimums whose reach suits each join (a wide
// fillet where a thigh meets the flank, a tight one between toes), and feline-hull.js grows the
// skin from it the same way.
// - Trunk: a loft along the spine, a cross-section per station from the rump to the chest: a level
//   back that rises a little over the loins, a deep keel between the elbows, the belly line rising
//   to the flank.
// - Neck: thick, flowing from the withers into the back of the skull, with the throat under it.
// - Hind leg: a broad thigh and hamstring that make the haunch and round off the rear, a slim shin
//   with the calf behind it, a hock point, a long upright foot, an oval paw with four toes.
// - Foreleg: the shoulder blade flat under the skin, the upper arm against the chest, the elbow
//   point, a straight forearm, a round paw with four toes.
// - Head: a wedge, not a ball: a braincase, a flat brow sloping to the nose, wide cheeks, whisker
//   pads, a small chin, the eyes set in sockets; thin cupped ears and whiskers kept as their own
//   geometry.
// - Tail: about two thirds of the body, tapering steadily to a rounded tip.
// Joint positions are the rig's (feline.js's layout), so the gait and every clip carry over
// unchanged. Sizes are body units at the housecat's build, before the look's scale.
import * as THREE from 'three';
import {rgb, mix} from './homunculus.js';

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

// Joins: how far each fillet reaches (body units).
export const JOIN = {ear: .008, trunk: .045, neck: .04, thigh: .035, arm: .03, leg: .016, paw: .012, toe: .005, head: .02, face: .012, tail: .02};
// The trunk's stations along z: [z, top, bottom, half-width], top and bottom from the hip line Y.
export const TRUNK = {
  rear: -.315, front: .278,
  stations: [
    [-.27, .066, -.05, .07],
    [-.23, .09, -.074, .086],
    [-.18, .1, -.086, .094],
    [-.11, .1, -.1, .098],
    [-.04, .096, -.114, .1],
    [.03, .092, -.124, .099],
    [.09, .09, -.126, .094],
    [.15, .093, -.128, .086],
    [.2, .09, -.117, .078],
    [.245, .078, -.088, .066],
  ],
};
// The tail's radius at the root and the tip, and how much longer than the look's tail curve
// (feline.js) the pets carry it: a real cat's tail is about 0.6 of its head and body.
export const TAIL_SCULPT = {root: .034, tip: .016};
// The sculpted head is drawn this much larger than feline.js's head size, about the neck pivot.
export const HEAD_SCALE = 1.1;

// ---- distance functions ----
// A cone with rounded ends between a (radius ra) and b (radius rb) (Inigo Quilez's round cone).
export function roundCone(a, b, ra, rb) {
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], l2 = bx * bx + by * by + bz * bz, rr = ra - rb, a2 = l2 - rr * rr, il2 = 1 / l2;
  return (x, y, z) => {
    const px = x - a[0], py = y - a[1], pz = z - a[2], yy = px * bx + py * by + pz * bz, zz = yy - l2;
    const qx = px * l2 - bx * yy, qy = py * l2 - by * yy, qz = pz * l2 - bz * yy, x2 = qx * qx + qy * qy + qz * qz, y2 = yy * yy * l2, z2 = zz * zz * l2;
    const k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - rb;
    if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - ra;
    return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - ra;
  };
}
// An ellipsoid centred at c with radii r, turned by Euler angles rot (an approximate distance,
// good near the surface).
export function ellipsoid(c, r, rot = [0, 0, 0]) {
  const inv = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)).invert(), v = new THREE.Vector3(), turned = rot.some(a => a);
  return (x, y, z) => {
    v.set(x - c[0], y - c[1], z - c[2]); if (turned) v.applyQuaternion(inv);
    const k0 = Math.hypot(v.x / r[0], v.y / r[1], v.z / r[2]), k1 = Math.hypot(v.x / (r[0] * r[0]), v.y / (r[1] * r[1]), v.z / (r[2] * r[2]));
    return k1 < 1e-9 ? -Math.min(...r) : k0 * (k0 - 1) / k1;
  };
}
// Narrows a shape across x about cx by f (< 1 flattens it side to side).
export const squash = (f, cx, k) => (x, y, z) => f(cx + (x - cx) / k, y, z) * k;

// The pets' longer body: `stretch` more length put in at the middle of the back, the rear half
// (hips, hind legs, rump, tail) moved back by half of it and the front half (chest, forelegs, neck,
// head) forward by half, over the middle 0.2 of the back. Returns z -> stretched z.
export const stretchZ = stretch => z => z <= -.1 ? z - stretch / 2 : z >= .1 ? z + stretch / 2 : z + stretch / 2 * z / .1;
const unstretchZ = stretch => { const m = .1 + stretch / 2; return z => z <= -m ? z + stretch / 2 : z >= m ? z - stretch / 2 : z * .1 / m; };
// Catmull-Rom through a column of the stations.
function profile(stations, col) {
  const zs = stations.map(s => s[0]), vs = stations.map(s => s[col]), n = zs.length;
  return z => {
    if (z <= zs[0]) return vs[0]; if (z >= zs[n - 1]) return vs[n - 1];
    let i = 0; while (zs[i + 1] < z) i++;
    const t = (z - zs[i]) / (zs[i + 1] - zs[i]), p0 = vs[Math.max(0, i - 1)], p1 = vs[i], p2 = vs[i + 1], p3 = vs[Math.min(n - 1, i + 2)];
    return .5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  };
}
// The trunk: an ellipse per station, top and bottom radii apart, rounded off at both ends.
export function trunkField(Y, bw = 1, T = TRUNK, stretch = 0) {
  const top = profile(T.stations, 1), bot = profile(T.stations, 2), wid = profile(T.stations, 3), z0 = T.stations[0][0], z1 = T.stations[T.stations.length - 1][0];
  const unstretch = unstretchZ(stretch);
  return (x, y, z) => {
    z = unstretch(z);
    let f = 1, zc = z;
    if (z < z0) { const s = (z0 - z) / (z0 - T.rear); f = Math.sqrt(Math.max(0, 1 - s * s)); zc = z0; } else if (z > z1) { const s = (z - z1) / (T.front - z1); f = Math.sqrt(Math.max(0, 1 - s * s)); zc = z1; }
    const t = top(zc), b = bot(zc), cy = Y + (t + b) / 2, ry = (t - b) / 2 * f, rx = wid(zc) * bw * f;
    if (f <= 0) { const ez = z < z0 ? T.rear : T.front; return Math.hypot(x, y - cy, z - ez); }
    const qx = x / rx, qy = (y - cy) / ry, k0 = Math.hypot(qx, qy), k1 = Math.hypot(qx / rx, qy / ry);
    return k1 < 1e-9 ? -Math.min(rx, ry) : k0 * (k0 - 1) / k1;
  };
}

// ---- the pieces ----
// A piece of the field, in the form feline-hull.js reads: a distance function in its part's frame,
// where it sits and how far it reaches, its paint, the fillet it joins with, and `cut` to carve
// it away instead.
const piece = (field, centre, reach, colour, blend, cut = false) => ({type: 'sdf', field, centre, reach, thin: 1, colour, blend, cut});

// The coat, plain for now: darker along the back, cream underneath, on the chest, the chin and the
// muzzle. `C`: rgb colours {coat, stripe, belly, back}.
function trunkPaint(L, C) {
  return (x, y, z) => {
    let c = mix(C.coat, C.back, smooth((y - L.Y - .02) / .08) * .55);
    const belly = smooth((L.Y - .05 - y) / .05), chest = smooth((z - L.shoulder[2] - .02) / .1) * smooth((L.Y + .03 - y) / .1);
    return mix(c, C.belly, Math.max(belly, chest) * .85);
  };
}
function legPaint(L, C, root) {
  return (x, y, z) => {
    let c = mix(C.coat, C.back, smooth((y - L.Y) / .06) * .4);
    // the inside of the leg and the paw paler
    if (Math.abs(x) < Math.abs(root[0]) - .01 && y < L.Y - .06) c = mix(c, C.belly, .35);
    return mix(c, mix(C.coat, C.belly, .3), smooth((.04 - y) / .03));
  };
}
function headPaint(C) {
  return (x, y, z) => {
    let c = mix(C.coat, C.back, smooth((y - .03) / .05) * .45);
    // the bridge of the nose, warm tan down to the nose leather
    c = mix(c, rgb('#b08455'), smooth((.014 - Math.abs(x)) / .006) * smooth((z - .1) / .015) * smooth((.035 - y) / .01) * smooth((y + .002) / .01) * .8);
    const muzzle = smooth((-.02 - y) / .02) * smooth((z - .07) / .03) + smooth((z - .12) / .015) * smooth((-.005 - y) / .015);
    return mix(c, C.belly, clamp01(muzzle) * .9);
  };
}

// The rig's joints for one leg, in body space (feline-skin.js builds the bones from the same).
export function legJoints(L, fore, side) {
  const bw = L.heavy || 1, [rx, ry, rz] = fore ? L.shoulder : L.hip, fy = -ry, x = side * rx;
  const rel = fore ? [[0, 0, 0], [0, -.11, -.045], [0, fy + .035, .01], [0, fy, .03]] : [[0, 0, 0], [0, -.12, .045], [0, fy + .1, -.04], [0, fy + .03, -.015], [0, fy, .0]];
  return {x, bw, pts: rel.map(([, y, z]) => [x, ry + y, rz + z])};
}

function hindLeg(L, C, side, k) {
  const {x, pts} = legJoints(L, false, side), [hip, knee, hock, foot] = pts, Y = L.Y, paint = legPaint(L, C, [x]), out = [];
  const xo = x + side * .004, P = (y, z, dx = 0) => [xo + side * dx, y, z];
  // thigh and hamstring: the haunch, flattened side to side, rounding off the rear of the body
  out.push(piece(squash(roundCone(P(Y - .005, hip[2] - .015), P(knee[1] + .01, knee[2] - .005), .066 * k, .034 * k), xo, .66), P(Y - .06, hip[2] + .01), .13, paint, JOIN.thigh));
  out.push(piece(squash(roundCone(P(Y + .01, hip[2] - .07), P(knee[1] - .01, hip[2]), .054 * k, .027 * k), xo, .72), P(Y - .05, hip[2] - .03), .12, paint, JOIN.thigh));
  // shin, with the calf swelling behind it down to the hock
  out.push(piece(roundCone(knee, hock, .032 * k, .02 * k), P((knee[1] + hock[1]) / 2, (knee[2] + hock[2]) / 2), .09, paint, JOIN.leg));
  out.push(piece(roundCone(P(knee[1] - .015, knee[2] - .03), P(hock[1] + .012, hock[2] - .012), .029 * k, .013 * k), P(knee[1] - .03, hip[2] - .02), .08, paint, JOIN.leg));
  out.push(piece(ellipsoid(P(hock[1] + .004, hock[2] - .014), [.012 * k, .014 * k, .012 * k]), P(hock[1], hock[2]), .03, paint, JOIN.leg));
  // the long foot and the paw
  out.push(piece(roundCone(hock, foot, .02 * k, .018 * k), P((hock[1] + foot[1]) / 2, (hock[2] + foot[2]) / 2), .06, paint, JOIN.leg));
  const pz = foot[2] + .014;
  out.push(piece(ellipsoid(P(.017, pz), [.027 * k, .017 * k, .034 * k]), P(.016, pz), .05, paint, JOIN.paw));
  for (const [tx, tz] of [[-.019, .026], [-.007, .032], [.007, .032], [.019, .026]]) out.push(piece(ellipsoid([xo + tx * k, .011, pz + tz * k - .006], [.0105 * k, .01 * k, .012 * k]), [xo + tx * k, .011, pz + tz * k], .02, paint, JOIN.toe));
  return out;
}

function foreLeg(L, C, side, k) {
  const {x, pts} = legJoints(L, true, side), [shoulder, elbow, wrist, toe] = pts, Y = L.Y, paint = legPaint(L, C, [x]), out = [];
  const xi = x - side * .008, P = (y, z, xx = xi) => [xx, y, z];
  // the upper arm against the chest, the elbow point behind
  out.push(piece(squash(roundCone(P(shoulder[1] + .005, shoulder[2] + .008), P(elbow[1] + .008, elbow[2] + .004), .048 * k, .034 * k), xi, .8), P(Y - .08, .13), .1, paint, JOIN.arm));
  out.push(piece(ellipsoid(P(elbow[1] - .002, elbow[2] - .012, x), [.02 * k, .022 * k, .02 * k]), P(elbow[1], elbow[2], x), .03, paint, JOIN.leg));
  // the forearm, straight, to the wrist
  out.push(piece(roundCone(P(elbow[1], elbow[2], x), P(wrist[1] + .006, wrist[2], x), .032 * k, .022 * k), P((elbow[1] + wrist[1]) / 2, (elbow[2] + wrist[2]) / 2, x), .09, paint, JOIN.leg));
  // the paw
  const pz = toe[2] - .002;
  out.push(piece(roundCone(P(wrist[1] + .006, wrist[2], x), P(.018, pz, x), .022 * k, .023 * k), P(.03, (wrist[2] + pz) / 2, x), .04, paint, JOIN.paw));
  out.push(piece(ellipsoid([x, .017, pz], [.029 * k, .017 * k, .032 * k]), [x, .016, pz], .05, paint, JOIN.paw));
  for (const [tx, tz] of [[-.02, .021], [-.007, .027], [.007, .027], [.02, .021]]) out.push(piece(ellipsoid([x + tx * k, .011, pz + tz * k - .004], [.0105 * k, .01 * k, .012 * k]), [x + tx * k, .011, pz + tz * k], .02, paint, JOIN.toe));
  return out;
}

// Head space: the origin is the neck pivot (L.neck), before the look's head size.
// The eyes (head space): centre, radii, outward turn, and `open`, how much of the eyeball's width
// shows past the face round it (the coat draws the lid line there; a test checks it against the face).
export const EYE = {x: .031, y: .027, z: .1015, r: [.0155, .014, .011], tilt: .2, open: .69};
function headPieces(C, nose) {
  const paint = headPaint(C), out = [], H = (f, c, reach, blend = JOIN.head, colour = paint) => out.push(piece(f, c, reach, colour, blend));
  // the braincase, and the brow over the eyes, so the forehead slopes from the crown to the nose
  H(ellipsoid([0, .036, .03], [.062, .062, .07]), [0, .036, .03], .075);
  H(ellipsoid([0, .03, .078], [.066, .034, .036]), [0, .03, .078], .065, JOIN.face);
  // the cheekbones, widest a little below the eyes, so the face narrows to the muzzle
  for (const s of [-1, 1]) H(ellipsoid([s * .033, -.004, .056], [.028, .029, .038]), [s * .033, -.004, .056], .05, .03);
  // the muzzle: a short bridge, a compact block under the whisker pads, the nose leather and a small chin
  H(roundCone([0, .04, .1], [0, .006, .134], .016, .01), [0, .02, .118], .035, JOIN.face);
  H(ellipsoid([0, -.021, .109], [.027, .022, .03]), [0, -.021, .109], .045, JOIN.face);
  for (const s of [-1, 1]) H(ellipsoid([s * .013, -.024, .124], [.015, .014, .014]), [s * .013, -.024, .124], .025, JOIN.face);
  H(ellipsoid([0, -.002, .14], [.0125, .0085, .006]), [0, -.002, .14], .015, .004, nose);
  H(roundCone([0, -.028, .045], [0, -.04, .1], .02, .012), [0, -.035, .07], .045, JOIN.face);
  H(ellipsoid([0, -.044, .107], [.012, .009, .012]), [0, -.044, .107], .02, JOIN.face);
  // the fur mound each ear grows from, so its base sits in the skull and not on its edge
  for (const s of [-1, 1]) { const {base, up, fwd, across} = earFrame(s), c = base.clone().addScaledVector(up, .002).addScaledVector(fwd, -.004); H(framedEllipsoid(c, [across, up, fwd], EAR.mound), c.toArray(), .04, .014); }
  return out;
}

// The ears: where each base sits on the skull (head space, the right ear; the left mirrors it), how
// far they lean out and turn out, their size, the cup of the opening, how thick they are at the base and
// the tip, how round the rim, and the fur mound each grows from.
export const EAR = {base: [.036, .072, .014], lean: .3, yaw: .25, height: .085, width: .071, cup: .013, thick: [.013, .007], round: .004, mound: [.019, .011, .009]};
// The ear's frame: base point, up its length, across its width (outward), forward out of its opening.
export function earFrame(side) {
  const base = new THREE.Vector3(side * EAR.base[0], EAR.base[1], EAR.base[2]), up = new THREE.Vector3(side * Math.sin(EAR.lean), Math.cos(EAR.lean), -.08).normalize();
  const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), side * EAR.yaw); fwd.addScaledVector(up, -fwd.dot(up)).normalize();
  const across = new THREE.Vector3().crossVectors(up, fwd).multiplyScalar(side).normalize();
  return {base, up, fwd, across};
}
// An ellipsoid along the given axes.
function framedEllipsoid(c, axes, r) {
  return (x, y, z) => {
    const vx = x - c.x, vy = y - c.y, vz = z - c.z, l = axes.map(a => a.x * vx + a.y * vy + a.z * vz);
    const k0 = Math.hypot(l[0] / r[0], l[1] / r[1], l[2] / r[2]), k1 = Math.hypot(l[0] / (r[0] * r[0]), l[1] / (r[1] * r[1]), l[2] / (r[2] * r[2]));
    return k1 < 1e-9 ? -Math.min(...r) : k0 * (k0 - 1) / k1;
  };
}
// An ear as part of the sculpted body (head space): a cupped slab in the ear's frame, its outline
// bowing out a little and rounding off at the tip, thick at the base and thinning toward the tip,
// its rim rounded. Returns the piece and `side(x, y, z)`: +1 on the inside of the cup (the opening),
// -1 on the back, 0 off the ear, for the paint and the fur.
const smaxS = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * .25; };
function earPiece(side, C, inner) {
  const {base, up, fwd, across} = earFrame(side), H = EAR.height, W = EAR.width;
  const local = (x, y, z) => { const vx = x - base.x, vy = y - base.y, vz = z - base.z; return [across.x * vx + across.y * vy + across.z * vz, up.x * vx + up.y * vy + up.z * vz, fwd.x * vx + fwd.y * vy + fwd.z * vz]; };
  const shape = b => { const u = clamp01(b / H); return {u, w: Math.max(1e-4, W / 2 * Math.pow(Math.max(0, 1 - Math.pow(u, 1.7)), .6) * (1 - u * .2)), t: EAR.thick[0] + (EAR.thick[1] - EAR.thick[0]) * u}; };
  // the middle of the slab: the cup's hollow, deepest along the ear's middle, shallowing to the tip
  const mid = (a, u, w) => { const v = Math.max(-1, Math.min(1, a / w)); return -(1 - v * v) * EAR.cup * (1 - u * .7); };
  const field = (x, y, z) => {
    const [a, b, f] = local(x, y, z), {u, w, t} = shape(b);
    return smaxS(smaxS(Math.abs(a) - w, Math.abs(f - mid(a, u, w)) - t / 2, EAR.round), Math.max(-b - .01, b - H), EAR.round);
  };
  const sideOf = (x, y, z) => { const [a, b, f] = local(x, y, z), {u, w, t} = shape(b); if (b < -.004 || Math.abs(a) > w + t || Math.abs(f - mid(a, u, w)) > t) return 0; return f > mid(a, u, w) ? 1 : -1; };
  const outC = mix(C.coat, C.back, .5);
  const paint = (x, y, z) => {
    const [a, b, f] = local(x, y, z), {u, w} = shape(b);
    if (f <= mid(a, u, w)) return outC;
    // inside: a coat-coloured rim, pale fur, pink skin down in the hollow
    const v = Math.abs(a) / w, rimK = smooth((v - .72) / .2) + smooth((u - .86) / .1);
    return mix(mix(inner, rgb('#c9837a'), smooth((.55 - v) / .4) * smooth((.75 - u) / .4) * .55), outC, clamp01(rimK));
  };
  const c = base.clone().addScaledVector(up, H / 2);
  return {piece: piece(field, c.toArray(), H * .75, paint, JOIN.ear), side: sideOf};
}
// The whiskers, as ready geometry in head space: on each side four offset rows of three on the
// whisker pad (WHISKER.rows), each a tapering hair that bows forward and droops, its length, angle and
// curve its own; the top rows sweep forward and up, the bottom ones down and back. Above each eye a
// few eyebrow whiskers, and a couple on the cheek.
export const WHISKER = {
  rows: [{y: -.017, z: .124, n: 3, len: .1, up: .2, fwd: .2}, {y: -.023, z: .126, n: 3, len: .115, up: .05, fwd: .05},
    {y: -.029, z: .125, n: 3, len: .11, up: -.12, fwd: -.1}, {y: -.035, z: .121, n: 3, len: .09, up: -.28, fwd: -.25}],
  root: .0008, tip: .0001, segments: 8, sides: 4, droop: .32, bow: .14, spread: .16,
};
// Where each pad whisker grows (head space, the right side), for the whisker spots on the coat.
export function follicles() { const out = []; WHISKER.rows.forEach((row, r) => { for (let k = 0; k < row.n; k++) out.push([.014 + k * .007 + (r % 2) * .0035, row.y, row.z - k * .004 - (r % 2) * .002]); }); return out; }
function whiskerGeometry(colour) {
  const pos = [], col = [], hairs = [];
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const s of [-1, 1]) {
    WHISKER.rows.forEach((row, r) => { for (let k = 0; k < row.n; k++) {
      // follicles in offset rows across the pad, from near the nose outward
      const x = s * (.014 + k * .007 + (r % 2) * .0035), z = row.z - k * .004 - (r % 2) * .002;
      const out = new THREE.Vector3(s, row.up + (rnd() - .5) * WHISKER.spread, row.fwd + (rnd() - .5) * WHISKER.spread).normalize();
      hairs.push({root: new THREE.Vector3(x, row.y + (rnd() - .5) * .002, z), out, len: row.len * (.75 + .5 * rnd()), droop: WHISKER.droop * (.6 + .8 * rnd()), bow: WHISKER.bow * (.5 + rnd()), thick: 1});
    } });
    // eyebrows, over the inner corner of the eye, up and out
    for (let k = 0; k < 3; k++) hairs.push({root: new THREE.Vector3(s * (.026 + k * .007), EYE.y + .02 + k * .002, EYE.z - .004 - k * .004), out: new THREE.Vector3(s * .55, .8, .25 - k * .1).normalize(), len: .045 + .012 * rnd(), droop: .1, bow: .25, thick: .75});
    // the cheek, behind the corner of the mouth
    for (let k = 0; k < 2; k++) hairs.push({root: new THREE.Vector3(s * (.058 + k * .004), -.012 - k * .006, .07 - k * .01), out: new THREE.Vector3(s, .1, -.35).normalize(), len: .04 + .015 * rnd(), droop: .15, bow: .1, thick: .7});
  }
  const ring = (c, t, n, b, r, out) => { const v = []; for (let j = 0; j < WHISKER.sides; j++) { const a = j / WHISKER.sides * Math.PI * 2; v.push(c.clone().addScaledVector(n, Math.cos(a) * r).addScaledVector(b, Math.sin(a) * r)); } return v; };
  for (const h of hairs) {
    // a quadratic curve: out from the follicle, bowing forward, the tip drooping
    const tip = h.root.clone().addScaledVector(h.out, h.len).add(new THREE.Vector3(0, -h.droop * h.len, 0));
    const mid = h.root.clone().addScaledVector(h.out, h.len * .5).add(new THREE.Vector3(0, h.bow * h.len * .3, h.bow * h.len * .4));
    const P = t => new THREE.Vector3().addScaledVector(h.root, (1 - t) ** 2).addScaledVector(mid, 2 * (1 - t) * t).addScaledVector(tip, t * t);
    let prev = null;
    for (let i = 0; i <= WHISKER.segments; i++) {
      const t = i / WHISKER.segments, c = P(t), d = P(Math.min(1, t + .01)).sub(P(Math.max(0, t - .01))).normalize();
      const n = new THREE.Vector3(0, 1, 0).cross(d).normalize(), b = d.clone().cross(n).normalize(), r = (WHISKER.root + (WHISKER.tip - WHISKER.root) * t) * h.thick;
      const cur = ring(c, t, n, b, r);
      if (prev) for (let j = 0; j < WHISKER.sides; j++) { const j2 = (j + 1) % WHISKER.sides; for (const v of [prev[j], cur[j], cur[j2], prev[j], cur[j2], prev[j2]]) { pos.push(v.x, v.y, v.z); col.push(...colour); } }
      prev = cur;
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  return g;
}
// The eyes, drawn per pixel on each eyeball in its own frame: a clean oval iris filling the
// opening (a cat shows almost no white), streaked from the pupil out and darker at its rim, a
// vertical oval pupil, under a glossy cornea that catches the light. They glow only a little, so
// they read in a dark room without looking like lamps. IRIS: the iris and pupil half-sizes (of the
// eyeball's own radius), the colours from the pupil out, the glow.
export const IRIS = {size: [.97, .97], pupil: [.34, .48], inner: '#c98a2e', outer: '#a3a144', rim: '#2b1f0e', glow: .12};
const eyeMaterials = new Map();
export function sculptEyeMaterial(look) {
  if (eyeMaterials.has('iris')) return eyeMaterials.get('iris');
  const m = new THREE.MeshPhysicalMaterial({color: '#ffffff', roughness: .05, clearcoat: 1, clearcoatRoughness: .04, emissive: '#ffffff', emissiveIntensity: IRIS.glow});
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, {uInner: {value: new THREE.Color(IRIS.inner)}, uOuter: {value: new THREE.Color(IRIS.outer)}, uRim: {value: new THREE.Color(IRIS.rim)}, uIris: {value: new THREE.Vector2(...IRIS.size)}, uPupil: {value: new THREE.Vector2(...IRIS.pupil)}});
    sh.vertexShader = 'attribute vec3 aEye; varying vec3 vEye;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvEye = aEye;');
    const iris = `
      vec2 e = vEye.xy; float front = smoothstep(0., .25, vEye.z);
      float ir = length(e / uIris), pr = length(e / uPupil), aa = fwidth(ir) * 1.5 + .01;
      float ang = atan(e.y, e.x);
      float streak = .85 + .15 * sin(ang * 37. + sin(ang * 11.) * 2.) * sin(ang * 23. + 1.3);
      vec3 c = mix(uInner, uOuter, smoothstep(.25, .95, ir)) * streak;
      c = mix(c, uRim, smoothstep(.78, 1., ir));
      c = mix(c, uRim * .6, smoothstep(1. - aa, 1. + aa, ir)); // beyond the iris, only the dark lid line
      c = mix(c, vec3(.01), (1. - smoothstep(1. - fwidth(pr) * 1.5 - .02, 1. + fwidth(pr) * 1.5, pr)) * front);
      diffuseColor.rgb = c;`;
    sh.fragmentShader = 'uniform vec3 uInner, uOuter, uRim; uniform vec2 uIris, uPupil; varying vec3 vEye;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>' + iris)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= diffuseColor.rgb;');
  };
  m.customProgramCacheKey = () => 'feline-iris';
  eyeMaterials.set('iris', m);
  return m;
}
// The eyeballs, larger and rounder than feline.js's, turned a little outward, in head space; each
// vertex keeps where it sits on its own unit ball (aEye: z out of the front) for the iris.
export function sculptEyes() {
  const parts = [];
  for (const s of [-1, 1]) {
    const g = new THREE.SphereGeometry(1, 20, 14); g.rotateX(Math.PI / 2); // poles at front and back, so the iris has no seam
    const local = g.attributes.position.clone();
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(s * EYE.x, EYE.y, EYE.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s * EYE.tilt, 0)), new THREE.Vector3(...EYE.r)));
    g.setAttribute('aEye', local); const flat = g.toNonIndexed(); g.dispose(); parts.push(flat);
  }
  const g = new THREE.BufferGeometry(), n = parts.reduce((a, p) => a + p.attributes.position.count, 0), pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), eye = new Float32Array(n * 3);
  let o = 0; for (const p of parts) { pos.set(p.attributes.position.array, o * 3); nrm.set(p.attributes.normal.array, o * 3); eye.set(p.attributes.aEye.array, o * 3); o += p.attributes.position.count; p.dispose(); }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); g.setAttribute('aEye', new THREE.BufferAttribute(eye, 3));
  return g;
}

// The whole cat as hull parts ({group, M, pieces}) for growHull, the whiskers as ready geometry in
// head space (`extras`), and `earSide` (see earPiece). `L` is feline.js's layout, `tail` the tail's
// points in body space, `headM` places head space in the body.
export function sculptFeline(L, {tail, headM}) {
  const C = {coat: rgb(L.coat), stripe: rgb(L.stripe), belly: rgb(L.belly), nose: rgb(L.nose)}; C.back = mix(C.coat, C.stripe, .2);
  const Y = L.Y, bw = L.heavy || 1, k = bw, paint = trunkPaint(L, C);
  const body = [piece(trunkField(Y, bw, TRUNK, L.stretch || 0), [0, Y - .01, -.01], .34 + (L.stretch || 0) / 2, paint, JOIN.trunk)];
  // the neck from the withers into the back of the skull, the throat under it
  const [, ny, nz] = L.neck, sz = L.shoulder[2], neck = [
    piece(roundCone([0, Y + .02, sz + .02], [0, ny - .01, nz - .005], .085 * bw, .07 * bw), [0, Y + .07, sz + .08], .14, paint, JOIN.neck),
    piece(roundCone([0, Y - .04, sz + .06], [0, ny - .06, nz + .03], .052 * bw, .044 * bw), [0, Y + .02, nz], .12, paint, JOIN.neck),
  ];
  // the shoulder blades, flat under the skin, their tops back toward the withers (with the body:
  // the step slides the shoulder joint, not the blade)
  for (const side of [-1, 1]) { const x = side * (L.shoulder[0] * bw - .026); body.push(piece(squash(ellipsoid([x, Y + .03, L.shoulder[2] - .03], [.03, .062, .04], [.35, 0, 0]), x, .6), [x, Y + .03, .12], .08, paint, JOIN.arm)); }
  const parts = [{group: 'body', M: null, pieces: body}, {group: 'neck', M: null, pieces: neck}];
  for (const side of [-1, 1]) {
    parts.push({group: (side < 0 ? 'l' : 'r') + 'hind', M: null, pieces: hindLeg(L, C, side, k)});
    parts.push({group: (side < 0 ? 'l' : 'r') + 'fore', M: null, pieces: foreLeg(L, C, side, k)});
  }
  // the tail: round cones along its curve, tapering to a rounded tip
  const n = tail.length - 1, tp = [];
  for (let i = 0; i < n; i++) { const r0 = TAIL_SCULPT.root + (TAIL_SCULPT.tip - TAIL_SCULPT.root) * i / n, r1 = TAIL_SCULPT.root + (TAIL_SCULPT.tip - TAIL_SCULPT.root) * (i + 1) / n; tp.push(piece(roundCone(tail[i], tail[i + 1], r0 * bw, r1 * bw), tail[i].map((v, j) => (v + tail[i + 1][j]) / 2), .06, mix(C.coat, C.back, .3), i === 0 ? JOIN.tail : .006)); }
  parts.push({group: 'tail', M: null, pieces: tp});
  parts.push({group: 'head', M: headM, pieces: headPieces(C, C.nose)});
  // the ears, grown with the head (after it, so they join it with their own fillet)
  const inner = mix(C.belly, rgb('#ffffff'), .3), ears = [-1, 1].map(s => earPiece(s, C, inner));
  parts.push({group: 'ear', M: headM, pieces: ears.map(e => e.piece)});
  // which side of an ear a point (head space) is on: +1 inside the cup, -1 on the back, 0 off it
  const earSide = (x, y, z) => { for (const e of ears) { const k = e.side(x, y, z); if (k) return k; } return 0; };
  return {parts, earSide, extras: [whiskerGeometry(rgb(L.whisker || '#f0ece0'))]};
}
