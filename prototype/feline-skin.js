// The pet cat as one skinned mesh (a trial of three's skinning for the bestiary). The parts the
// feline model already paints (feline.js) are merged into a single SkinnedMesh over a small
// skeleton: hips, spine, chest, neck, head; five tail bones; three bones per foreleg (shoulder,
// elbow, paw) and four per hind leg (thigh, knee, hock, paw). Vertices are weighted along each
// chain with a soft blend across the joints, so the spine flexes, the tail curls bone by bone
// and the legs bend at the joints instead of swinging as rods. Every bone rests at zero
// rotation, so an animation writes plain offsets and the head bone takes the same glance code
// the rigid head took.
//
// The animation is clips on a THREE.AnimationMixer, the way three's skinning examples do it:
// the walk cycle (diagonal pairs, bending elbows, knees and hocks, an undulating spine, bobbing
// hips), the idle (a breathing chest, a slow weight shift), the sit (haunches down, hind legs
// folded, chest up, tail wrapped round, taken after SIT_AFTER seconds of standing still) and
// the tail (a curl and flick that touches only the tail bones, so it plays under the others)
// are sampled from pose functions into keyframe tracks once per actor; the pounce is a one-shot
// clip (crouch, launch with the forelegs reaching, land) played when the pet's attack action
// starts, and fades back to whatever it interrupted. Walk, idle and sit cross-fade on the mixer
// as the pet stops and starts, with three tricks from three's skinning-blending example: a stop
// waits for the walk's loop boundary so the feet are planted when it fades out; the walk's time
// scale follows how fast the pet actually moves, so a hop and a dash don't share a stride rate;
// and past RUN_AT the walk cross-fades into a faster run with warping, so the cadence slides
// between them. The head is left to the glance code (fidget.js) and a lean into turns is laid
// on top after the mixer. live.js drives it through actor.asset.update so the rigid-part animations
// leave it alone, and a rigged GLB cat would play through the same mixer calls.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {felineBuild} from './feline.js';
import {growHull} from './feline-hull.js';

export const BLEND = {spine: .06, leg: .022, tail: .02};
export const WALK = {hz: 2.1, swing: .5, bend: .55, bob: .012, sway: .08};
// The run: a faster cycle with a longer reach and more bob, in phase with the walk so the fade
// between them can warp. GAIT maps the pet's measured speed (tiles per second, smoothed) to the
// walk's time scale and to the run.
export const RUN = {hz: 3.3, swing: .75, bend: .8, bob: .03, sway: .05};
// The clips' phase follows distance, not time: a cycle covers `stride` body units (times the
// cat's scale), twice what a foot sweeps through its stance, so the body travels as far as the
// planted foot sweeps back and the stride rate is speed / (stride x scale x hz), clamped;
// `nominal` is the speed at which a scale-1 cat's walk plays at 1x.
export const GAIT = {stride: {walk: .36, run: .52}, minScale: .5, maxScale: 3.5, runAt: 4.2, walkAt: 3.2, smooth: 6, fade: .3};
GAIT.nominal = GAIT.stride.walk * WALK.hz;
// Foot planting: while a gait plays, a foot in its stance phase is pinned where it came down and
// the leg is solved (two-bone IK about the leg's hinge) to keep it there as the body moves on, so
// the feet no longer skate. `blend` is the slice of the stance over which the pin fades in and
// out; `reach` the share of the leg's full length past which the pin fades (the foot peels).
export const PLANT = {blend: .5, reach: .9, peel: 1.05};
// Secondary motion, laid on after the mixer (none of it accumulates: each is a fresh offset
// on what the clips wrote this frame, or a decaying state of its own):
// - a turn: the heading arrives in a step, so the body counter-rotates by the step and eases
//   round over ~1/ease s, the spine leans in, and the neck leads a little into the new heading;
// - the tail trails: it lags the turn and dips or lifts as the cat speeds up or brakes, through
//   two low-pass stages so it swings late and settles, more at the tip than the root;
// - the eyes blink: every BLINK.gap..gap+span seconds for BLINK.shut seconds, now and then twice.
export const TURN = {ease: 9, max: 1.3, lead: .35, level: .8};
export const TAIL_SPRING = {follow: 9, settle: 5, lag: .09, dip: .05, max: .6};
export const BLINK = {gap: 2.5, span: 4, shut: .11, double: .22};
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

// The skin: one surface grown over the parts (feline-hull.js), built once per look and shared.
// `hull: false` keeps the parts as they are, for comparison in the tool pages.
const hulls = new Map();
// Grows a look's hull ahead of its first cat (live.js does this in idle time on the splash, for the
// kitten most classes start with), so the first level does not pay the ~0.7 s on the main thread.
export function growFelineHull(name, colour) { if (!hulls.has(name + '|' + (colour || ''))) createSkinnedFeline(name, colour); return hulls.get(name + '|' + (colour || '')); }
export function createSkinnedFeline(name, colour, {hull = true} = {}) {
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

  // Bone weights per part, as a function of a point in the body frame: the body along its
  // spine, the head whole, the tail by arc length along its joints, a leg down its chain.
  const headM = new THREE.Matrix4().compose(new THREE.Vector3(...L.neck), new THREE.Quaternion(), new THREE.Vector3().setScalar(L.headSize || 1));
  const tailM = new THREE.Matrix4().makeTranslation(...tailRoot);
  const tj = tailJoints.map(([x, y, z]) => [x + tailRoot[0], y + tailRoot[1], z + tailRoot[2]]), arcs = [0]; for (let i = 1; i < tj.length; i++) arcs.push(arcs[i - 1] + Math.hypot(tj[i][0] - tj[i - 1][0], tj[i][1] - tj[i - 1][1], tj[i][2] - tj[i - 1][2]));
  const weighFor = {
    body: (x, y, z) => chainWeights(z, [-.31, -.1, .08, .28], BLEND.spine).map(([k, w]) => [names[['hips', 'spine', 'chest'][k]], w]),
    head: () => [[names.head, 1]],
    tail: (x, y, z) => { let best = 0, bd = Infinity, bs = 0; for (let i = 0; i < tj.length - 1; i++) { const ax = tj[i], bx = tj[i + 1], dx = bx[0] - ax[0], dy = bx[1] - ax[1], dz = bx[2] - ax[2], L2 = dx * dx + dy * dy + dz * dz || 1; const t = clamp01(((x - ax[0]) * dx + (y - ax[1]) * dy + (z - ax[2]) * dz) / L2); const px = ax[0] + dx * t, py = ax[1] + dy * t, pz = ax[2] + dz * t, d = (x - px) ** 2 + (y - py) ** 2 + (z - pz) ** 2; if (d < bd) { bd = d; best = i; bs = arcs[i] + Math.sqrt(L2) * t; } } return chainWeights(bs, arcs, BLEND.tail).map(([k, w]) => [names['tail' + k], w]); },
  };
  for (const [key, leg] of Object.entries(legs)) weighFor[key] = (x, y) => chainWeights(y, leg.joints, BLEND.leg).map(([k, w]) => [names[key + Math.min(k, leg.bones.length - 1)], w]);
  const weigh = (group, x, y, z) => weighFor[group](x, y, z);
  let fur, details = null;
  if (hull && S.body.userData.pieces) {
    // one skin over everything, grown once per look
    const key = name + '|' + (colour || '');
    if (!hulls.has(key)) {
      // the rump: a ball between the haunches and the tail root, so the tail grows out of the body
      // instead of starting a gap behind it (painted like the haunch beside it)
      const haunch = S.body.userData.pieces.find(r => r.type === 'SphereGeometry' && r.matrix && r.matrix.elements[14] < -.1);
      const rump = {type: 'SphereGeometry', parameters: {radius: .048}, matrix: new THREE.Matrix4().makeTranslation(0, L.Y + .025, -.245), colour: haunch ? haunch.colour : coat};
      const parts = [{group: 'body', M: null, pieces: [...S.body.userData.pieces, rump]}, {group: 'head', M: headM, pieces: S.head.userData.pieces}, {group: 'tail', M: tailM, pieces: S.tail.userData.pieces}];
      for (const [k, leg] of Object.entries(legs)) { const fore = k.endsWith('fore'), side = k[0] === 'l' ? -1 : 1; parts.push({group: k, M: new THREE.Matrix4().makeTranslation(...leg.root).multiply(new THREE.Matrix4().makeScale(side, 1, 1)), pieces: (fore ? S.fore : S.hind).userData.pieces}); }
      hulls.set(key, growHull(parts, {weigh}));
    }
    const grown = hulls.get(key);
    fur = new THREE.SkinnedMesh(grown.geometry, S.fur);
    if (grown.details) { details = new THREE.SkinnedMesh(grown.details, S.fur); details.castShadow = details.receiveShadow = true; details.frustumCulled = false; details.userData.part = 'details'; }
  } else {
    // the parts as they are, each weighted to its own chain
    const parts = [];
    const bodyGeo = S.body.clone(); skin(bodyGeo, weighFor.body); parts.push(bodyGeo);
    const headGeo = S.head.clone().applyMatrix4(headM); skin(headGeo, weighFor.head); parts.push(headGeo);
    const tailGeo = S.tail.clone().applyMatrix4(tailM); skin(tailGeo, weighFor.tail); parts.push(tailGeo);
    for (const [key, leg] of Object.entries(legs)) {
      const fore = key.endsWith('fore'), side = key[0] === 'l' ? -1 : 1, src = fore ? S.fore : S.hind;
      const geo = (side < 0 ? mirrorX(src) : src.clone()).applyMatrix4(new THREE.Matrix4().makeTranslation(...leg.root));
      skin(geo, weighFor[key]); parts.push(geo);
    }
    fur = new THREE.SkinnedMesh(mergeGeometries(parts), S.fur);
  }
  fur.castShadow = fur.receiveShadow = true; fur.frustumCulled = false; fur.userData.part = 'fur'; fur.userData.color = [...coat];
  const eyesGeo = S.eyes.clone().applyMatrix4(headM); skin(eyesGeo, () => [[names.head, 1]]);
  const eyes = new THREE.SkinnedMesh(eyesGeo, S.eye); eyes.frustumCulled = false; eyes.userData.part = 'eyes';
  // the bones' rest (the inverse bind matrices) must come from settled world matrices
  body.add(hips); body.add(fur); if (details) body.add(details); body.add(eyes); g.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  fur.bind(skeleton, fur.matrixWorld); eyes.bind(skeleton, eyes.matrixWorld); if (details) details.bind(skeleton, details.matrixWorld);
  const rig = {hips, spine, chest, neck, head, tail: tailBones, legs, yaw: g.rotation.y, lean: 0};
  const actor = {g, body, legs: [], tail: null, wings: [], quirk: 'feline', head, species: name, skinned: true, rig, fur, eyes, details};
  actor.animator = createFelineAnimator(body, rig, actor);
  actor.asset = {update: (dt, walking) => updateSkinnedFeline(actor, dt, null, walking), skinned: true, mixer: actor.animator.mixer};
  return actor;
}

// ---- clips ----
// A pose is a map bone name -> {x, y, z} Euler offsets from rest (radians), plus optional
// `hipsY` (hips lift) and `chestScale`. Each is a function of the cycle phase u in [0, 1).
const TAU = Math.PI * 2;
export function gaitPose(u, G) {
  const ph = u * TAU, pose = {};
  // A leg lifts (and bends) while it swings forward (a positive x rotation points a leg back, so
  // the swing is -sin while lift, cos, is up), then stands and sweeps back under the body.
  const leg = (key, offset, fore, four) => { const a = -Math.sin(ph + offset), lift = Math.max(0, Math.cos(ph + offset));
    pose[key + '0'] = {x: a * G.swing}; pose[key + '1'] = {x: lift * G.bend * (fore ? 1 : -.9)}; pose[key + '2'] = {x: lift * G.bend * (fore ? .4 : .8)}; if (four) pose[key + '3'] = {x: -lift * .3}; };
  leg('lfore', 0, true, false); leg('rhind', 0, false, true); leg('rfore', Math.PI, true, false); leg('lhind', Math.PI, false, true);
  pose.spine = {y: Math.sin(ph) * G.sway, x: G === RUN ? -.08 + Math.sin(ph * 2) * .06 : 0}; pose.chest = {y: Math.sin(ph) * G.sway * .6}; pose.hips = {x: Math.sin(ph * 2) * .03};
  pose.hipsY = Math.abs(Math.sin(ph)) * G.bob;
  return pose;
}
export const walkPose = u => gaitPose(u, WALK), runPose = u => gaitPose(u, RUN);
export function idlePose(u) {
  const ph = u * TAU, breath = Math.sin(ph) * .5 + .5;
  // a slow shift of weight from one side to the other rides under the breath
  // (spine and chest are always written, so the lean laid on afterwards never accumulates)
  return {chestScale: 1 + .025 * breath, spine: {z: Math.sin(ph * .5) * .02}, chest: {z: Math.sin(ph * .5) * .01}, hips: {z: -Math.sin(ph * .5) * .015}};
}
export function tailPose(u) {
  const pose = {}, n = 5;
  for (let i = 0; i < n; i++) { const k = i / (n - 1); pose['tail' + i] = {x: (i ? Math.sin(u * TAU) * TAIL.curl * k : 0) + Math.sin(u * TAU * 3 + i * .9) * .03, y: Math.sin(u * TAU * 2 + .4) * TAIL.sway * k + Math.sin(u * TAU * 7 + i) * TAIL.flick * k, z: Math.sin(u * TAU + i) * .03}; }
  return pose;
}
// Sitting: the rump on the floor (the hips drop `drop`), the back rising steeply so the shoulders
// stay at standing height and the forelegs stand straight (`fore` counters the pitch), the hind
// legs folded with the knees up at the belly and the hocks and feet forward on the floor, the tail
// laid round the hip. The breath still runs. The numbers come from a forward-kinematics search
// over the kitten's rig (the rump within a centimetre of the floor, the hock and paw on it).
export const SIT = {drop: .17, hips: -.25, spine: -.6, chest: -.15, thigh: -1.2, knee: .9, hock: -.9, paw: .1, fore: 1.0};
export function sitPose(u) {
  const ph = u * TAU, breath = Math.sin(ph) * .5 + .5, pose = {hipsY: -SIT.drop, chestScale: 1 + .02 * breath};
  pose.spine = {x: SIT.spine}; pose.chest = {x: SIT.chest}; pose.hips = {x: SIT.hips};
  for (const key of ['lhind', 'rhind']) { pose[key + '0'] = {x: SIT.thigh}; pose[key + '1'] = {x: SIT.knee}; pose[key + '2'] = {x: SIT.hock}; pose[key + '3'] = {x: SIT.paw}; }
  for (const key of ['lfore', 'rfore']) { pose[key + '0'] = {x: SIT.fore, z: key[0] === 'l' ? -.06 : .06}; pose[key + '1'] = {x: 0}; pose[key + '2'] = {x: 0}; }
  // the tail lies down and wraps round the right hip on the floor, its tip stirring
  for (let i = 0; i < 5; i++) { const k = i / 4; pose['tail' + i] = {x: .75 * k, y: .6 * k, z: Math.sin(ph * 2 + i) * .04 * k}; }
  return pose;
}
// The pounce, over its whole duration: a crouch (u to .3), the launch with the forelegs reaching
// and the hind legs driving (to .65), the landing and a settle to rest (to 1).
export const POUNCE = {time: .75, crouch: .07, leap: .09, reach: -1.1, drive: .9};
export function pouncePose(u) {
  const crouch = smooth(u / .22) * (1 - smooth((u - .22) / .1)), leap = smooth((u - .28) / .14) * (1 - smooth((u - .6) / .2)), land = smooth((u - .6) / .12) * (1 - smooth((u - .78) / .22));
  const pose = {hipsY: -POUNCE.crouch * crouch + POUNCE.leap * leap - .03 * land, chestScale: 1};
  pose.spine = {x: .25 * crouch - .3 * leap + .1 * land}; pose.chest = {x: .15 * crouch - .25 * leap + .12 * land}; pose.hips = {x: -.1 * crouch + .2 * leap};
  for (const key of ['lhind', 'rhind']) { pose[key + '0'] = {x: -.6 * crouch + POUNCE.drive * leap + .2 * land}; pose[key + '1'] = {x: 1.1 * crouch - .3 * leap + .4 * land}; pose[key + '2'] = {x: -.5 * crouch + .4 * leap - .3 * land}; pose[key + '3'] = {x: .2 * crouch}; }
  for (const key of ['lfore', 'rfore']) { pose[key + '0'] = {x: .35 * crouch + POUNCE.reach * leap - .25 * land}; pose[key + '1'] = {x: .6 * crouch + .3 * leap + .5 * land}; pose[key + '2'] = {x: .2 * crouch - .4 * leap}; }
  return pose;
}
export const CLIPS = {walk: {pose: walkPose, period: 1 / WALK.hz, frames: 24}, run: {pose: runPose, period: 1 / RUN.hz, frames: 24}, idle: {pose: idlePose, period: 4, frames: 32}, sit: {pose: sitPose, period: 4, frames: 32}, tail: {pose: tailPose, period: 6, frames: 48}, pounce: {pose: pouncePose, period: POUNCE.time, frames: 30, once: true}};
// A pet that has stood still this long sits down.
export const SIT_AFTER = 6;

// Samples a pose function into an AnimationClip of quaternion (and position, scale) tracks on
// the bones it names. The last frame repeats the first, so the loop is seamless.
export function sampleClip(name, {pose, period, frames}, bonesByName) {
  const times = Array.from({length: frames + 1}, (_, i) => i / frames * period), per = new Map(), e = new THREE.Euler(), q = new THREE.Quaternion();
  const hipsY = [], chestScale = []; let anyHipsY = false, anyScale = false;
  for (let i = 0; i <= frames; i++) {
    const p = pose((i % frames) / frames);
    for (const [key, o] of Object.entries(p)) {
      if (key === 'hipsY' || key === 'chestScale') continue;
      if (!bonesByName[key]) continue;
      if (!per.has(key)) per.set(key, []);
      e.set(o.x || 0, o.y || 0, o.z || 0); q.setFromEuler(e); per.get(key).push(q.x, q.y, q.z, q.w);
    }
    const hy = bonesByName.hips ? bonesByName.hips.position : null;
    hipsY.push(hy ? hy.x : 0, (hy ? hy.y : 0) + (p.hipsY || 0), hy ? hy.z : 0); if (p.hipsY) anyHipsY = true;
    chestScale.push(p.chestScale || 1, p.chestScale || 1, p.chestScale || 1); if (p.chestScale) anyScale = true;
  }
  const tracks = [...per].map(([key, values]) => new THREE.QuaternionKeyframeTrack(key + '.quaternion', times, values));
  if (anyHipsY) tracks.push(new THREE.VectorKeyframeTrack('hips.position', times, hipsY));
  if (anyScale) tracks.push(new THREE.VectorKeyframeTrack('chest.scale', times, chestScale));
  return new THREE.AnimationClip(name, period, tracks);
}

// The mixer and its actions for one cat. `update(dt, walking)` runs the gaits: walk, run, idle
// and sit cross-fade as the pet starts, stops, speeds up and settles (three's skinning-blending
// example, in code: a stop waits for the loop boundary, walk and run fade with warping, the
// walk's time scale follows the measured speed), plays the pounce as a one-shot when the
// actor's attack action begins, keeps the tail playing, and lays the turn lean on top after the
// mixer has posed the bones. `actor` is read for its actions and its position.
export function createFelineAnimator(root, rig, actor = null) {
  const bonesByName = {}; root.traverse(o => { if (o.isBone) bonesByName[o.name] = o; });
  const mixer = new THREE.AnimationMixer(root), actions = {};
  for (const [name, spec] of Object.entries(CLIPS)) {
    const a = mixer.clipAction(sampleClip(name, spec, bonesByName));
    if (spec.once) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = false; } else a.play();
    a.setEffectiveWeight(0); actions[name] = a;
  }
  actions.idle.setEffectiveWeight(1); actions.tail.setEffectiveWeight(1);
  let walking = false, base = actions.idle, still = 0, pouncing = false, lastAttack = null, stopping = false, fading = 0, speed = 0, planting = true;
  const spring = {turn: 0, rate1: 0, rate2: 0, acc1: 0, acc2: 0, lastSpeed: 0};
  let seed = 0; for (const c of String(actor?.species || 'cat')) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  const blink = {until: BLINK.gap + rnd() * BLINK.span, shut: 0, again: false};
  const _lq = new THREE.Quaternion(), _le = new THREE.Euler();
  const last = new THREE.Vector3(), moving = () => base === actions.walk || base === actions.run;
  if (actor?.g) last.copy(actor.g.position);
  // Fades `to` in over `from` (the example's setWeight first: re-enable, un-warp, full weight).
  // `warp` slides the time scales between two cyclic clips so a walk becomes a run mid-stride.
  const fade = (to, from, time, warp = false) => { to.enabled = true; to.setEffectiveTimeScale(1); to.setEffectiveWeight(1); if (to.loop !== THREE.LoopOnce) to.time = warp ? from.time / from.getClip().duration * to.getClip().duration : 0; to.play(); from.crossFadeTo(to, time, warp); fading = Math.max(fading, time); stopping = false; };
  const setBase = (to, time, warp = false) => { if (to === base) return; fade(to, pouncing ? actions.pounce : base, time, warp); base = to; };
  mixer.addEventListener('finished', e => { if (e.action === actions.pounce) { pouncing = false; fade(base, actions.pounce, .25); } });
  // the stop: when the pet halts mid-stride, the fade to idle waits for the gait's loop boundary
  mixer.addEventListener('loop', e => { if (stopping && e.action === base && moving() && !pouncing) setBase(actions.idle, .3); });
  function update(dt, nowWalking) {
    dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
    still = nowWalking ? 0 : still + dt;
    // measured speed (tiles per second), smoothed
    if (actor?.g && dt > 0) { const v = last.distanceTo(actor.g.position) / dt; last.copy(actor.g.position); speed += (Math.min(v, 12) - speed) * (1 - Math.exp(-dt * GAIT.smooth)); }
    // the pounce: once per attack action, the moment it starts
    const atk = actor?.actions?.current?.kind === 'attack' ? actor.actions.current : null;
    if (atk && atk !== lastAttack) { lastAttack = atk; pouncing = true; still = 0; actions.pounce.reset(); fade(actions.pounce, base, .08); }
    if (nowWalking && !walking) { walking = true; stopping = false; if (!pouncing) setBase(actions.walk, .25); else base = actions.walk; }
    else if (!nowWalking && walking) { walking = false; if (pouncing) base = actions.idle; else if (moving()) stopping = true; }
    // the gaits: past RUN_AT the walk warps into the run, below WALK_AT the run warps back
    if (walking && !pouncing && !stopping) {
      if (base === actions.walk && speed > GAIT.runAt) setBase(actions.run, GAIT.fade, true);
      else if (base === actions.run && speed < GAIT.walkAt) setBase(actions.walk, GAIT.fade, true);
    }
    if (!pouncing && !walking && !stopping && still >= SIT_AFTER && base !== actions.sit) setBase(actions.sit, .6);
    // the stride rate follows the measured speed once no fade is warping it: one cycle per `stride` tiles
    fading = Math.max(0, fading - dt);
    if (!fading && moving() && walking) { const run = base === actions.run, perSecond = (run ? GAIT.stride.run : GAIT.stride.walk) * (actor?.g?.scale.x || 1) * (run ? RUN.hz : WALK.hz); base.setEffectiveTimeScale(Math.max(GAIT.minScale, Math.min(GAIT.maxScale, speed / perSecond))); }
    mixer.update(dt);
    if (planting) plantFeet();
    // the lean into a turn: the heading arrives in steps, so it snaps toward a turn and eases out
    const yaw = rig.hips.parent?.parent?.rotation.y ?? 0, d = Math.atan2(Math.sin(yaw - rig.yaw), Math.cos(yaw - rig.yaw)); rig.yaw = yaw;
    const target = dt > 0 ? Math.max(-.5, Math.min(.5, d / dt * .12)) : 0;
    rig.lean += (target - rig.lean) * (1 - Math.exp(-dt * (Math.abs(target) > Math.abs(rig.lean) ? 14 : 3)));
    if (Math.abs(rig.lean) > 1e-4) { const l = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rig.lean * .5, -rig.lean * .25)); rig.spine.quaternion.multiply(l); rig.chest.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rig.lean * .5, 0))); }
    secondary(dt, d);
    return {walking, pouncing, stopping, speed, sitting: base === actions.sit, gait: Object.keys(actions).find(k => actions[k] === base), timeScale: base.getEffectiveTimeScale(), walkWeight: actions.walk.getEffectiveWeight(), runWeight: actions.run.getEffectiveWeight(), idleWeight: actions.idle.getEffectiveWeight(), sitWeight: actions.sit.getEffectiveWeight(), pounceWeight: actions.pounce.getEffectiveWeight()};
  }
  // ---- secondary motion: eased turns, the trailing tail, blinks ----
  function secondary(dt, yawStep) {
    // the turn: counter the heading step on the mixer root and ease it away, so the body swings round
    spring.turn = Math.max(-TURN.max, Math.min(TURN.max, spring.turn - yawStep)) * Math.exp(-dt * TURN.ease);
    if (Math.abs(spring.turn) < 1e-4) spring.turn = 0;
    root.rotation.y = spring.turn;
    // the neck leads into the new heading, and levels the head against the body's pitch (a sitting
    // cat's back rises steeply, a running one's dips): the head bone itself is left to the glance code
    const pitch = rig.hips.rotation.x + rig.spine.rotation.x + rig.chest.rotation.x;
    rig.neck.quaternion.setFromEuler(_le.set(-pitch * TURN.level, -spring.turn * TURN.lead, 0)); // no clip writes the neck, so this is its whole pose
    // the tail trails: late, then settling
    const rate = dt > 0 ? -spring.turn * TURN.ease : 0, acc = dt > 0 ? (speed - spring.lastSpeed) / dt : 0; spring.lastSpeed = speed;
    const k1 = 1 - Math.exp(-dt * TAIL_SPRING.follow), k2 = 1 - Math.exp(-dt * TAIL_SPRING.settle);
    spring.rate1 += (rate - spring.rate1) * k1; spring.rate2 += (spring.rate1 - spring.rate2) * k2;
    spring.acc1 += (acc - spring.acc1) * k1; spring.acc2 += (spring.acc1 - spring.acc2) * k2;
    const swing = Math.max(-TAIL_SPRING.max, Math.min(TAIL_SPRING.max, -spring.rate2 * TAIL_SPRING.lag)), dip = Math.max(-TAIL_SPRING.max, Math.min(TAIL_SPRING.max, -spring.acc2 * TAIL_SPRING.dip));
    if (Math.abs(swing) > 1e-4 || Math.abs(dip) > 1e-4) rig.tail.forEach((b, i) => { const k = (i + 1) / rig.tail.length; b.quaternion.multiply(_lq.setFromEuler(_le.set(dip * k * .5, swing * k * .5, 0))); });
    // blinks
    if (actor?.eyes) {
      if (blink.shut > 0) { blink.shut -= dt; if (blink.shut <= 0) { blink.shut = 0; blink.until = blink.again ? BLINK.double : BLINK.gap + rnd() * BLINK.span; blink.again = false; } }
      else { blink.until -= dt; if (blink.until <= 0) { blink.shut = BLINK.shut; blink.again = !blink.again && rnd() < .25; } }
      actor.eyes.visible = blink.shut <= 0;
    }
  }
  // ---- foot planting ----
  // Which half of the gait cycle each leg stands on (gaitPose: a leg lifts while cos(phase + offset) > 0).
  const STANCE_OFFSET = {lfore: 0, rhind: 0, rfore: Math.PI, lhind: Math.PI}, X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1);
  const _t = new THREE.Vector3(), _s1 = new THREE.Vector3(), _s2 = new THREE.Vector3(), _j = new THREE.Vector3(), _e = new THREE.Vector3(), _m = new THREE.Matrix4(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _qj = new THREE.Quaternion(), _qz = new THREE.Quaternion();
  const cross2 = (u, v) => u.y * v.z - u.z * v.y, ang = v => Math.atan2(v.z, v.y);
  function plantFeet() {
    const gaitW = Math.min(1, actions.walk.getEffectiveWeight() + actions.run.getEffectiveWeight());
    const top = actor?.g || root; top.updateMatrixWorld(true);
    const u = moving() ? base.time / base.getClip().duration : 0;
    for (const [key, leg] of Object.entries(rig.legs)) {
      const stance = -Math.cos(u * TAU + STANCE_OFFSET[key]);
      const w0 = gaitW > 0 && stance > 0 && !pouncing ? smooth(stance / PLANT.blend) * gaitW : 0;
      const R = leg.bones[0], J = leg.bones[1], E = leg.bones[leg.bones.length - 1];
      if (w0 <= 0) { leg.plant = null; continue; }
      if (!leg.plant) leg.plant = E.getWorldPosition(new THREE.Vector3()); // the foot came down here
      // the pin, in the leg root's parent frame, relative to the root; the leg's hinge is that frame's x axis
      _m.copy(R.parent.matrixWorld).invert(); _t.copy(leg.plant).applyMatrix4(_m).sub(R.position);
      _s1.copy(J.position);
      if (leg.bones.length > 3) { const H = leg.bones[2]; _s2.copy(E.position).applyQuaternion(H.quaternion).add(H.position); } else _s2.copy(E.position);
      // the body sways, so the pin can sit a little to the side of the leg's plane: the leg root
      // abducts about z to bring the plane onto the pin, then the hinges solve in that plane
      const psi = Math.atan2(_t.x, -_t.y); _qz.setFromAxisAngle(Z, psi); _t.applyQuaternion(_qz.clone().invert());
      const a = _s1.length(), b = _s2.length(), full = a + b, c = Math.hypot(_t.y, _t.z);
      // past the leg's reach the pin fades and lets go
      const w = w0 * (1 - smooth((c / full - PLANT.reach) / (PLANT.peel - PLANT.reach)));
      leg.ik = {a, b, c, w, t: [_t.y, _t.z]}; // read by the tests and the tool pages
      if (c > full * PLANT.peel) { leg.plant = null; continue; }
      if (w <= 1e-3) continue;
      const cc = Math.min(c, full * .999), phiT = Math.atan2(_t.z, _t.y);
      const alpha = Math.acos(Math.max(-1, Math.min(1, (a * a + cc * cc - b * b) / (2 * a * cc))));
      // keep the knee or elbow bent to the side the clip has it
      _j.copy(_s1).applyQuaternion(R.quaternion); _qj.copy(R.quaternion).multiply(J.quaternion); _e.copy(_s2).applyQuaternion(_qj).add(_j);
      const side = cross2(_e, _j) >= 0 ? 1 : -1;
      const phi1 = phiT + side * alpha, theta1 = phi1 - ang(_s1);
      _j.set(0, a * Math.cos(phi1), a * Math.sin(phi1)); _e.set(0, _t.y, _t.z).sub(_j);
      const theta2 = ang(_e) - theta1 - ang(_s2);
      _q1.setFromAxisAngle(X, theta1).premultiply(_qz); _q2.setFromAxisAngle(X, theta2);
      R.quaternion.slerp(_q1, w); J.quaternion.slerp(_q2, w);
    }
  }
  // For the tool pages: hold one clip at a moment of its cycle (u in 0..1), everything else off.
  function show(name, u = 0) {
    for (const [key, a] of Object.entries(actions)) { a.enabled = true; a.paused = false; a.setEffectiveWeight(key === name || key === 'tail' ? 1 : 0); }
    const a = actions[name]; a.play(); a.time = u * a.getClip().duration; a.paused = true;
    mixer.update(0); secondary(0, 0); // the neck's levelling too, so a tool shows the head as the game would
  }
  return {mixer, actions, update, show, get walking() { return walking; }, get base() { return Object.keys(actions).find(k => actions[k] === base); }, get planting() { return planting; }, set planting(v) { planting = !!v; if (!v) for (const leg of Object.values(rig.legs)) leg.plant = null; }};
}

// Per frame from live.js (through actor.asset.update). `t` is unused: the mixer keeps its own time.
export function updateSkinnedFeline(actor, dt, t, walking) {
  return actor?.animator ? actor.animator.update(dt, !!walking) : null;
}
