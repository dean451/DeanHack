// The pet cat as one skinned mesh (a trial of three's skinning for the bestiary). The parts the
// feline model already paints (feline.js) are merged into a single SkinnedMesh over a small
// skeleton: hips, spine, chest, neck, head; five tail bones; three bones per foreleg (shoulder,
// elbow, paw) and four per hind leg (thigh, knee, hock, paw). Vertices are weighted along each
// chain with a soft blend across the joints, so the spine flexes, the tail curls bone by bone
// and the legs bend at the joints instead of swinging as rods. Every bone rests at zero
// rotation, so an animation writes plain offsets and the head bone takes the same glance code
// the rigid head took.
//
// updateSkinnedFeline(actor, dt, t, walking) is the animation: a breathing chest, a tail that
// curls and flicks, a walk cycle (diagonal pairs, bending knees and elbows, a spine that
// undulates and leans into a turn) and a settle back to rest. live.js drives it through
// actor.asset.update so the rigid-part animations leave it alone.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {felineBuild} from './feline.js';

export const BLEND = {spine: .06, leg: .022, tail: .02};
export const WALK = {hz: 2.1, swing: .5, bend: .55, bob: .012, sway: .08};
// The idle tail: the model's own J-curve is the rest; these are small swings about it.
export const TAIL = {curl: .1, sway: .14, flick: .05};

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const lerp = (a, b, k) => a + (b - a) * k;

// Weights for a scalar position `s` along a chain whose bones span joints[k]..joints[k+1]
// (monotone in either direction): soft across each joint over 2b. Returns [[bone, w], ...].
export function chainWeights(s, joints, b) {
  const n = joints.length - 1, dir = joints[n] >= joints[0] ? 1 : -1, out = [];
  const u = s * dir, J = joints.map(j => j * dir);
  for (let k = 0; k < n; k++) {
    const lo = k === 0 ? 1 : smooth((u - J[k] + b) / (2 * b)), hi = k === n - 1 ? 1 : 1 - smooth((u - J[k + 1] + b) / (2 * b));
    const w = lo * hi;
    if (w > 1e-4) out.push([k, w]);
  }
  if (!out.length) out.push([u < J[0] ? 0 : n - 1, 1]);
  const sum = out.reduce((a, [, w]) => a + w, 0);
  return out.map(([k, w]) => [k, w / sum]);
}

// Flips a non-indexed geometry across x, keeping its faces facing out.
function mirrorX(geo) {
  const g = geo.clone(), p = g.attributes.position, nrm = g.attributes.normal;
  for (let i = 0; i < p.count; i++) { p.setX(i, -p.getX(i)); if (nrm) nrm.setX(i, -nrm.getX(i)); }
  for (const name of Object.keys(g.attributes)) {
    const a = g.attributes[name], size = a.itemSize, arr = a.array;
    for (let i = 0; i + 2 < a.count; i += 3) for (let c = 0; c < size; c++) { const t = arr[(i + 1) * size + c]; arr[(i + 1) * size + c] = arr[(i + 2) * size + c]; arr[(i + 2) * size + c] = t; }
  }
  return g;
}

// Adds skinIndex and skinWeight to a non-indexed geometry: `weigh(x, y, z)` -> [[boneIndex, w]...]
function skin(geo, weigh) {
  const p = geo.attributes.position, n = p.count, idx = new Uint16Array(n * 4), wt = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const list = weigh(p.getX(i), p.getY(i), p.getZ(i)).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const sum = list.reduce((a, [, w]) => a + w, 0) || 1;
    list.forEach(([bone, w], k) => { idx[i * 4 + k] = bone; wt[i * 4 + k] = w / sum; });
  }
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(idx, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(wt, 4));
  return geo;
}

export function createSkinnedFeline(name, colour) {
  const {S, L, tailJoints, coat} = felineBuild(name, colour);
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body); g.scale.setScalar(L.scale);
  const bones = [], names = {};
  const bone = (key, parent, pos) => { const b = new THREE.Bone(); b.name = key; b.position.set(...pos); if (parent) parent.add(b); bones.push(b); names[key] = bones.length - 1; b.userData.world = parent ? parent.userData.world.map((v, i) => v + pos[i]) : [...pos]; return b; };
  // spine, in body space: hips at the haunch, chest at the shoulders, neck at the model's neck pivot
  const Y = L.Y, hips = bone('hips', null, [0, Y, -.12]), spine = bone('spine', hips, [0, 0, .1]), chest = bone('chest', spine, [0, 0, .12]);
  const neck = bone('neck', chest, [L.neck[0], L.neck[1] - Y, L.neck[2] - .1]), head = bone('head', neck, [0, .04, .04]);
  // tail: the root sits where the tail group did, four bones along the curve
  const tailRoot = [0, Y + .05, -.29], tailBones = [];
  let parent = hips, prev = [0, 0, 0];
  for (let i = 0; i < 5; i++) { const pt = i === 0 ? [0, 0, 0] : tailJoints[i]; const b = bone('tail' + i, parent, i === 0 ? [tailRoot[0], tailRoot[1] - Y, tailRoot[2] + .12] : [pt[0] - prev[0], pt[1] - prev[1], pt[2] - prev[2]]); tailBones.push(b); parent = b; prev = pt; }
  // legs: joints from feline.js's buildLeg, as offsets from the leg root
  const legs = {};
  for (const side of [-1, 1]) for (const fore of [false, true]) {
    const [rx, ry, rz] = fore ? L.shoulder : L.hip, root = [side * rx, ry, rz], fy = -ry, key = (side < 0 ? 'l' : 'r') + (fore ? 'fore' : 'hind');
    const joints = fore ? [[0, 0, 0], [0, -.11, -.045], [0, fy + .035, .01], [0, fy, .03]] : [[0, 0, 0], [0, -.12, .045], [0, fy + .1, -.04], [0, fy + .03, -.015], [0, fy, .0]];
    const attach = fore ? chest : hips, base = attach.userData.world;
    let p = attach, acc = [0, 0, 0]; const list = [];
    joints.slice(0, -1).forEach((j, i) => { const abs = [root[0] + j[0], root[1] + j[1], root[2] + j[2]]; const from = i === 0 ? base : [root[0] + joints[i - 1][0], root[1] + joints[i - 1][1], root[2] + joints[i - 1][2]]; const b = bone(key + i, p, [abs[0] - from[0], abs[1] - from[1], abs[2] - from[2]]); list.push(b); p = b; });
    legs[key] = {bones: list, joints: joints.map(j => root[1] + j[1]), root};
  }

  // the geometry, part by part, each weighted to its own chain
  const parts = [];
  const bodyGeo = S.body.clone();
  skin(bodyGeo, (x, y, z) => chainWeights(z, [-.31, -.1, .08, .28], BLEND.spine).map(([k, w]) => [names[['hips', 'spine', 'chest'][k]], w]));
  parts.push(bodyGeo);
  const headM = new THREE.Matrix4().compose(new THREE.Vector3(...L.neck), new THREE.Quaternion(), new THREE.Vector3().setScalar(L.headSize || 1));
  const headGeo = S.head.clone().applyMatrix4(headM); skin(headGeo, () => [[names.head, 1]]); parts.push(headGeo);
  const tailM = new THREE.Matrix4().makeTranslation(...tailRoot), tailGeo = S.tail.clone().applyMatrix4(tailM);
  // tail weights by arc length along the joints
  const tj = tailJoints.map(([x, y, z]) => [x + tailRoot[0], y + tailRoot[1], z + tailRoot[2]]), arcs = [0]; for (let i = 1; i < tj.length; i++) arcs.push(arcs[i - 1] + Math.hypot(tj[i][0] - tj[i - 1][0], tj[i][1] - tj[i - 1][1], tj[i][2] - tj[i - 1][2]));
  skin(tailGeo, (x, y, z) => { let best = 0, bd = Infinity, bs = 0; for (let i = 0; i < tj.length - 1; i++) { const ax = tj[i], bx = tj[i + 1], dx = bx[0] - ax[0], dy = bx[1] - ax[1], dz = bx[2] - ax[2], L2 = dx * dx + dy * dy + dz * dz || 1; const t = clamp01(((x - ax[0]) * dx + (y - ax[1]) * dy + (z - ax[2]) * dz) / L2); const px = ax[0] + dx * t, py = ax[1] + dy * t, pz = ax[2] + dz * t, d = (x - px) ** 2 + (y - py) ** 2 + (z - pz) ** 2; if (d < bd) { bd = d; best = i; bs = arcs[i] + Math.sqrt(L2) * t; } } return chainWeights(bs, arcs, BLEND.tail).map(([k, w]) => [names['tail' + k], w]); });
  parts.push(tailGeo);
  for (const [key, leg] of Object.entries(legs)) {
    const fore = key.endsWith('fore'), side = key[0] === 'l' ? -1 : 1, src = fore ? S.fore : S.hind;
    const geo = (side < 0 ? mirrorX(src) : src.clone()).applyMatrix4(new THREE.Matrix4().makeTranslation(...leg.root));
    skin(geo, (x, y) => chainWeights(y, leg.joints, BLEND.leg).map(([k, w]) => [names[key + Math.min(k, leg.bones.length - 1)], w]));
    parts.push(geo);
  }
  const fur = new THREE.SkinnedMesh(mergeGeometries(parts), S.fur);
  fur.castShadow = fur.receiveShadow = true; fur.frustumCulled = false; fur.userData.part = 'fur'; fur.userData.color = [...coat];
  const eyesGeo = S.eyes.clone().applyMatrix4(headM); skin(eyesGeo, () => [[names.head, 1]]);
  const eyes = new THREE.SkinnedMesh(eyesGeo, S.eye); eyes.frustumCulled = false; eyes.userData.part = 'eyes';
  // the bones' rest (the inverse bind matrices) must come from settled world matrices
  body.add(hips); body.add(fur); body.add(eyes); g.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  fur.bind(skeleton, fur.matrixWorld); eyes.bind(skeleton, eyes.matrixWorld);
  const rig = {hips, spine, chest, neck, head, tail: tailBones, legs, yaw: g.rotation.y, lean: 0, phase: 0, breath: 0, flick: 0, stride: 0};
  const actor = {g, body, legs: [], tail: null, wings: [], quirk: 'feline', head, species: name, skinned: true, rig, fur, eyes};
  actor.asset = {update: (dt, walking) => updateSkinnedFeline(actor, dt, performance.now() / 1000, walking), skinned: true};
  return actor;
}

// The animation. Writes bone rotations as plain offsets from rest every frame.
export function updateSkinnedFeline(actor, dt, t, walking) {
  const r = actor?.rig; if (!r) return;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  // stride: eases up while walking, down when stopped, and drives the leg phase
  r.stride = lerp(r.stride, walking ? 1 : 0, 1 - Math.exp(-dt * (walking ? 10 : 6)));
  r.phase += dt * WALK.hz * Math.PI * 2 * (walking ? 1 : r.stride);
  const s = r.stride, ph = r.phase;
  // leaning into a turn: the spine bends toward where the heading went
  // (the heading arrives in steps, so the lean snaps toward a turn and eases out of it)
  const yaw = actor.g.rotation.y, d = Math.atan2(Math.sin(yaw - r.yaw), Math.cos(yaw - r.yaw)); r.yaw = yaw;
  const target = dt > 0 ? Math.max(-.5, Math.min(.5, d / dt * .12)) : 0;
  r.lean = lerp(r.lean, target, 1 - Math.exp(-dt * (Math.abs(target) > Math.abs(r.lean) ? 14 : 3)));
  // breathing and the idle tail
  r.breath = Math.sin(t * 1.7) * .5 + .5;
  const curl = Math.sin(t * .9) * TAIL.curl, wag = Math.sin(t * 2.3) * TAIL.sway * (1 - s) + Math.sin(ph) * .1 * s;
  r.tail.forEach((b, i) => { const k = i / (r.tail.length - 1); b.rotation.x = (i ? curl * k : 0) + Math.sin(t * 1.3 + i * .9) * .03; b.rotation.y = wag * k + Math.sin(t * 5.1 + i) * TAIL.flick * k * (1 - s); b.rotation.z = Math.sin(t * .7 + i) * .03; });
  // the head rides the breath a little
  r.head.rotation.x = -.03 * r.breath * (1 - s) + Math.sin(ph * 2) * .02 * s;
  // spine: breath lifts the chest, the walk undulates it, the turn bends it
  r.chest.scale.setScalar(1 + .025 * r.breath * (1 - s));
  r.spine.rotation.y = r.lean * .5 + Math.sin(ph) * WALK.sway * s; r.chest.rotation.y = r.lean * .5 + Math.sin(ph) * WALK.sway * .6 * s;
  r.spine.rotation.z = -r.lean * .25; r.hips.rotation.x = Math.sin(ph * 2) * .03 * s;
  r.hips.position.y = r.hips.userData.world[1] + Math.abs(Math.sin(ph)) * WALK.bob * s;
  // legs: diagonal pairs in phase; the upper bone swings, the next bends on the lift
  // a foreleg folds back at the elbow on the lift and the paw tucks; a hind leg folds at the knee and the hock
  const leg = (key, offset) => { const L = r.legs[key], fore = key.endsWith('fore'), a = Math.sin(ph + offset), lift = Math.max(0, Math.sin(ph + offset + Math.PI / 2)); L.bones[0].rotation.x = a * WALK.swing * s; L.bones[1].rotation.x = lift * WALK.bend * s * (fore ? 1 : -.9); if (L.bones[2]) L.bones[2].rotation.x = lift * WALK.bend * (fore ? .4 : .8) * s; if (L.bones[3]) L.bones[3].rotation.x = -lift * .3 * s; };
  leg('lfore', 0); leg('rhind', 0); leg('rfore', Math.PI); leg('lhind', Math.PI);
  return r;
}
