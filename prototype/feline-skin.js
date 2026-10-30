// The pet cat as one skinned mesh (a trial of three's skinning for the bestiary). The parts the
// feline model already paints (feline.js) are merged into a single SkinnedMesh over a small
// skeleton: hips, spine, chest, neck, head; five tail bones; three bones per foreleg (shoulder,
// elbow, paw) and four per hind leg (thigh, knee, hock, paw). Vertices are weighted along each
// chain with a soft blend across the joints, so the spine flexes, the tail curls bone by bone
// and the legs bend at the joints instead of swinging as rods. Every bone rests at zero
// rotation, so an animation writes plain offsets and the head bone takes the same glance code
// the rigid head took.
//
// Walking, trotting and galloping are stepped, not played: feline-gait.js plants each paw and solves
// the legs from where the paws are, after the measurements in cat-motion/README.md. Everything else
// is clips on a THREE.AnimationMixer, the way three's skinning examples do it: the idle (a breathing
// chest, a slow weight shift), the sit (haunches down, hind legs folded, chest up, tail wrapped
// round, taken after SIT_AFTER seconds of standing still) and the tail (a curl and flick that touches only the tail bones, so it plays under the others)
// are sampled from pose functions into keyframe tracks once per actor; the pounce is a one-shot
// clip (crouch, launch with the forelegs reaching, land) played when the pet's attack action
// starts, and fades back to whatever it interrupted. The step lays the legs on top of the idle,
// and fades in and out over it as the pet starts and stops. The head is left to the glance code
// (fidget.js) and a lean into turns is laid on top after the mixer. live.js drives it through
// actor.asset.update so the rigid-part animations leave it alone, and a rigged GLB cat (the fox)
// plays through the same calls.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {felineBuild} from './feline.js';
import {growHull} from './feline-hull.js';
import {FELINE_GLIDE} from './slide.js';
import {createStepper} from './feline-gait.js';
import {sculptFeline, sculptEyes, sculptEyeMaterial, HEAD_SCALE, TAIL_SCULPT, EYE, earFrame, MOUTH, jawShare, lipY} from './feline-sculpt.js';
import {coatAttributes, coatMaterial, FUR} from './feline-coat.js';
import {solveRest, restClips, SIT_TAIL, STRETCH, YAWN, GROOM, SCRATCHING, EATING, LIE} from './feline-rest.js';
import {createFelineMind} from './feline-mind.js';

export const BLEND = {spine: .06, leg: .022, tail: .03};
// The back bones' lengths (hips to spine, spine to chest) before a sculpted pet's stretch.
export const BACK = {spine: .1, chest: .12};
// The sculpted skin's grid (fine enough for the toes and the forearm), and how far each part's
// weights reach into its neighbours' skin.
export const SCULPT = {res: 150, soft: .045};
// Where an ear's skin hands over from the head to the ear's bone: from `from` up the ear (head units)
// over `span`.
export const EAR_BEND = {from: .004, span: .014};
// The sculpted back's bone weights along z: the hips, spine and chest bones hand over at the joints
// they turn about (the spine bone at z -.02, the chest at .1), each over 2 x blend.
export const SPINE = {joints: [-.31, -.02, .1, .28], blend: .045};
// The neck's vertebrae, as fractions of the way from the withers (the chest bone) to the head's pivot,
// and how far each hands its skin over to the next (of the neck's length).
export const NECK = {at: [.3, .65], blend: .12};
// How far above the floor a resting tail's joints keep their skin (body units): its radius plus this,
// which also covers the skin bowing a little below the straight line between two joints.
export const TAIL_REST = {clear: .008};
// The animator's measured speed is smoothed at `smooth` per second; clips cross-fade over `fade` s.
export const GAIT = {smooth: 6, fade: .3};
// Secondary motion, laid on after the mixer (none of it accumulates: each is a fresh offset
// on what the clips wrote this frame, or a decaying state of its own):
// - a turn: the heading arrives in a step, so the body counter-rotates by the step and eases
//   round over ~1/ease s, the spine leans in, and the neck leads a little into the new heading;
// - the tail trails: it lags the turn and dips or lifts as the cat speeds up or brakes, through
//   two low-pass stages so it swings late and settles, more at the tip than the root;
// - the eyes blink: every BLINK.gap..gap+span seconds for BLINK.shut seconds, now and then twice;
//   a content cat watching the hero now and then slow-blinks at them (BLINK.slow seconds, feline-mind.js).
export const TURN = {ease: 9, max: 1.3, lead: .35, level: .8};
export const TAIL_SPRING = {follow: 9, settle: 5, lag: .09, dip: .05, max: .6};
export const BLINK = {gap: 2.5, span: 4, shut: .11, double: .22, slow: .55};
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

// Shares a bend along each chain of vertebrae: the chain's whole turn (the product of its bones' turns,
// however it was laid on: a clip, the gaze, the step) is given out equally, each bone taking the same
// fraction of it, so the back and the neck curve smoothly. Running it again changes nothing.
const _dq = new THREE.Quaternion(), _di = new THREE.Quaternion();
export function distribute(chains) {
  for (const chain of chains) {
    _dq.identity(); for (const b of chain) _dq.multiply(b.quaternion);
    const k = 1 / chain.length; for (const b of chain) b.quaternion.copy(_di.identity()).slerp(_dq, k);
  }
}
// Opens the lips in a grown skin: drops the triangles that cross the lip line (feline-sculpt.js lipY)
// across the front of the muzzle. `toHead(v)` takes a body-space point to head space (in place).
function cutLips(geometry, toHead) {
  const pos = geometry.attributes.position, idx = geometry.index.array, keep = [], v = new THREE.Vector3();
  const below = new Int8Array(pos.count), front = new Uint8Array(pos.count);
  const share = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) { toHead(v.fromBufferAttribute(pos, i)); below[i] = v.y < lipY(v.x) ? 1 : 0; front[i] = v.z > MOUTH.front - .004 && Math.abs(v.x) < MOUTH.half + .008 ? 1 : 0; share[i] = jawShare(v.x, v.y, v.z); }
  // (a triangle goes where it crosses the lips, or where its corners split sharply between the head and
  // the jaw, so the skin left whole never tears)
  for (let t = 0; t < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2], n = below[a] + below[b] + below[c], split = Math.max(share[a], share[b], share[c]) - Math.min(share[a], share[b], share[c]); if (front[a] && front[b] && front[c] && ((n > 0 && n < 3) || split > .55)) continue; keep.push(a, b, c); }
  geometry.setIndex(keep);
}
// The skin: one surface grown over the parts (feline-hull.js), built once per look and shared.
// `hull: false` keeps the parts as they are, for comparison in the tool pages.
const hulls = new Map();
// Grows a look's hull ahead of its first cat (live.js does this in idle time on the splash, for the
// kitten most classes start with), so the first level does not pay the ~0.7 s on the main thread.
// The hull grown for a look, with the key it is kept under (the sculpted skin's or the parts' one), or null.
export function grownFelineHull(name, colour) { const key = name + '|' + (colour || ''); for (const k of [key + '|sculpt', key]) if (hulls.has(k)) return {key: k, hull: hulls.get(k)}; return null; }
// A hull grown elsewhere (feline-hull-worker.js, off the main thread) joins the cache, unless one is already there.
export function adoptFelineHull(key, hull) { if (key && hull?.geometry && !hulls.has(key)) hulls.set(key, hull); }
export function growFelineHull(name, colour) { const key = name + '|' + (colour || ''), grown = () => hulls.get(key + '|sculpt') || hulls.get(key); if (!grown()) createSkinnedFeline(name, colour); return grown(); }
// `sculpt`: grow the skin from the sculpted anatomy (feline-sculpt.js) and paint it with the
// per-pixel coat (feline-coat.js) instead of building it from the parts; the pets' looks do.
export function createSkinnedFeline(name, colour, {hull = true, sculpt} = {}) {
  const built = felineBuild(name, colour), {S, tailJoints, tailCurve, coat} = built;
  sculpt = hull && (sculpt ?? !!built.L.sculpt);
  // a sculpted pet's longer back (feline-sculpt.js stretchZ): the rear half moved back by D and the
  // front half forward by D, the skeleton with it
  const D = sculpt ? (built.L.stretch || 0) / 2 : 0, L = D ? {...built.L, hip: [built.L.hip[0], built.L.hip[1], built.L.hip[2] - D], shoulder: [built.L.shoulder[0], built.L.shoulder[1], built.L.shoulder[2] + D], neck: [built.L.neck[0], built.L.neck[1], built.L.neck[2] + D]} : built.L;
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body); g.scale.setScalar(L.scale);
  const bones = [], names = {};
  const bone = (key, parent, pos) => { const b = new THREE.Bone(); b.name = key; b.position.set(...pos); if (parent) parent.add(b); bones.push(b); names[key] = bones.length - 1; b.userData.world = parent ? parent.userData.world.map((v, i) => v + pos[i]) : [...pos]; return b; };
  // spine, in body space: hips at the haunch, chest at the shoulders, neck at the model's neck pivot
  // (sculpted pets: a vertebra between each pair of these, and two more up the neck, so a bend spreads
  // along the back and the neck instead of folding at one joint; see `distribute`)
  const Y = L.Y, hips = bone('hips', null, [0, Y, -.12 - D]);
  const link = (key, parent, len, fold) => { const b = bone(key, parent, [0, 0, len]); b.userData.fold = fold; return b; };
  const back1 = sculpt ? link('back1', hips, (BACK.spine + D) / 2, BACK.spine / 2) : null;
  const spine = sculpt ? link('spine', back1, (BACK.spine + D) / 2, BACK.spine / 2) : link('spine', hips, BACK.spine + D, BACK.spine);
  const back3 = sculpt ? link('back3', spine, (BACK.chest + D) / 2, BACK.chest / 2) : null;
  const chest = sculpt ? link('chest', back3, (BACK.chest + D) / 2, BACK.chest / 2) : link('chest', spine, BACK.chest + D, BACK.chest);
  const toNeck = [L.neck[0], L.neck[1] - Y, L.neck[2] - (.1 + D)];
  const neck0 = sculpt ? bone('neck0', chest, toNeck.map(v => v * NECK.at[0])) : null, neck1 = sculpt ? bone('neck1', neck0, toNeck.map(v => v * (NECK.at[1] - NECK.at[0]))) : null;
  const neck = bone('neck', sculpt ? neck1 : chest, sculpt ? toNeck.map(v => v * (1 - NECK.at[1])) : toNeck), head = bone('head', neck, [0, .04, .04]);
  // the ears (sculpted pets): a bone at each ear's base, under the head, turned in the ear's own frame
  const headScale = (L.headSize || 1) * (sculpt ? HEAD_SCALE : 1), ears = {};
  if (sculpt) for (const side of [-1, 1]) {
    const frame = earFrame(side), at = frame.base.clone().multiplyScalar(headScale).add(new THREE.Vector3(...L.neck)), key = side < 0 ? 'l' : 'r';
    ears[key] = {bone: bone(key + 'ear', head, at.toArray().map((v, i) => v - head.userData.world[i])), side, frame};
  }
  // the lower jaw, hinged below and in front of the ears, and the tongue on it (sculpted pets)
  const fromHead = p => p.map((v, i) => v * headScale + L.neck[i]);
  const jaw = sculpt ? bone('jaw', head, fromHead(MOUTH.hinge).map((v, i) => v - head.userData.world[i])) : null;
  const tongue = sculpt ? bone('tongue', jaw, fromHead(MOUTH.tongue.root).map((v, i) => v - jaw.userData.world[i])) : null;
  // tail: the root sits where the tail group did, four bones along the curve
  const tailRoot = [0, Y + .05, -.29 - D], tailBones = [];
  let parent = hips, prev = [0, 0, 0];
  for (let i = 0; i < 5; i++) { const pt = i === 0 ? [0, 0, 0] : tailJoints[i]; const b = bone('tail' + i, parent, i === 0 ? [tailRoot[0], tailRoot[1] - Y, tailRoot[2] + .12 + D] : [pt[0] - prev[0], pt[1] - prev[1], pt[2] - prev[2]]); tailBones.push(b); parent = b; prev = pt; }
  // legs: joints from feline.js's buildLeg, as offsets from the leg root
  const legs = {};
  for (const side of [-1, 1]) for (const fore of [false, true]) {
    const [rx, ry, rz] = fore ? L.shoulder : L.hip, root = [side * rx, ry, rz], fy = -ry, key = (side < 0 ? 'l' : 'r') + (fore ? 'fore' : 'hind');
    const joints = fore ? [[0, 0, 0], [0, -.11, -.045], [0, fy + .035, .01], [0, fy, .03]] : [[0, 0, 0], [0, -.12, .045], [0, fy + .1, -.04], [0, fy + .03, -.015], [0, fy, .0]];
    const attach = fore ? chest : hips, base = attach.userData.world;
    let p = attach, acc = [0, 0, 0]; const list = [];
    joints.slice(0, -1).forEach((j, i) => { const abs = [root[0] + j[0], root[1] + j[1], root[2] + j[2]]; const from = i === 0 ? base : [root[0] + joints[i - 1][0], root[1] + joints[i - 1][1], root[2] + joints[i - 1][2]]; const b = bone(key + i, p, [abs[0] - from[0], abs[1] - from[1], abs[2] - from[2]]); list.push(b); p = b; });
    const [ta, tb] = joints.slice(-2); // the toe tip below the last bone (it has no bone of its own)
    legs[key] = {bones: list, joints: joints.map(j => root[1] + j[1]), root, tip: new THREE.Vector3(tb[0] - ta[0], tb[1] - ta[1], tb[2] - ta[2])};
  }

  // Bone weights per part, as a function of a point in the body frame: the body along its
  // spine, the head whole, the tail by arc length along its joints, a leg down its chain.
  const headM = new THREE.Matrix4().compose(new THREE.Vector3(...L.neck), new THREE.Quaternion(), new THREE.Vector3().setScalar((L.headSize || 1) * (sculpt ? HEAD_SCALE : 1)));
  const tailM = new THREE.Matrix4().makeTranslation(...tailRoot);
  const tj = tailJoints.map(([x, y, z]) => [x + tailRoot[0], y + tailRoot[1], z + tailRoot[2]]), arcs = [0]; for (let i = 1; i < tj.length; i++) arcs.push(arcs[i - 1] + Math.hypot(tj[i][0] - tj[i - 1][0], tj[i][1] - tj[i - 1][1], tj[i][2] - tj[i - 1][2]));
  // the neck: from the chest at the withers to the neck bone at the back of the skull
  const nA = [0, Y + .02, .19 + D], nB = L.neck, nD = [nB[0] - nA[0], nB[1] - nA[1], nB[2] - nA[2]], nL2 = nD[0] ** 2 + nD[1] ** 2 + nD[2] ** 2;
  const _ew = new THREE.Vector3(), _en = new THREE.Vector3(...L.neck);
  const weighFor = {
    // an ear's skin goes with its bone from a little above where it leaves the head
    ear: (x, y, z) => { const e = ears[x < 0 ? 'l' : 'r']; if (!e) return [[names.head, 1]]; const up = _ew.set(x, y, z).sub(_en).divideScalar(headScale).sub(e.frame.base).dot(e.frame.up), w = smooth((up - EAR_BEND.from) / EAR_BEND.span); return [[names.head, 1 - w], [names[e.bone.name], w]]; },
    neck: (x, y, z) => { const s = clamp01(((x - nA[0]) * nD[0] + (y - nA[1]) * nD[1] + (z - nA[2]) * nD[2]) / nL2); if (sculpt) return chainWeights(s, [-1, NECK.at[0], NECK.at[1], 1, 2], NECK.blend).map(([k, w]) => [names[['chest', 'neck0', 'neck1', 'neck'][k]], w]); const w = smooth((s - .15) / .85); return [[names.chest, 1 - w], [names.neck, w]]; },
    // sculpted: each handover at the joint the bone turns about, spread wide, so a bent back is one curve
    body: (x, y, z) => (sculpt ? chainWeights(z, [SPINE.joints[0] - D, ...[back1, spine, back3, chest].map(b => b.userData.world[2]), SPINE.joints[3] + D], SPINE.blend).map(([k, w]) => [names[['hips', 'back1', 'spine', 'back3', 'chest'][k]], w]) : chainWeights(z, [-.31, -.1, .08, .28], BLEND.spine).map(([k, w]) => [names[['hips', 'spine', 'chest'][k]], w])),
    // the head, its lower jaw going with the jaw bone
    head: (x, y, z) => { if (!jaw) return [[names.head, 1]]; _ew.set(x, y, z).sub(_en).divideScalar(headScale); const k = jawShare(_ew.x, _ew.y, _ew.z); return k < 1e-3 ? [[names.head, 1]] : [[names.head, 1 - k], [names.jaw, k]]; },
    tail: (x, y, z) => { let best = 0, bd = Infinity, bs = 0; for (let i = 0; i < tj.length - 1; i++) { const ax = tj[i], bx = tj[i + 1], dx = bx[0] - ax[0], dy = bx[1] - ax[1], dz = bx[2] - ax[2], L2 = dx * dx + dy * dy + dz * dz || 1; const t = clamp01(((x - ax[0]) * dx + (y - ax[1]) * dy + (z - ax[2]) * dz) / L2); const px = ax[0] + dx * t, py = ax[1] + dy * t, pz = ax[2] + dz * t, d = (x - px) ** 2 + (y - py) ** 2 + (z - pz) ** 2; if (d < bd) { bd = d; best = i; bs = arcs[i] + Math.sqrt(L2) * t; } } return chainWeights(bs, arcs, BLEND.tail).map(([k, w]) => [names['tail' + k], w]); },
  };
  for (const [key, leg] of Object.entries(legs)) weighFor[key] = (x, y) => chainWeights(y, leg.joints, BLEND.leg).map(([k, w]) => [names[key + Math.min(k, leg.bones.length - 1)], w]);
  const weigh = (group, x, y, z) => weighFor[group](x, y, z);
  let fur, details = null; const shells = [];
  if (hull && sculpt) {
    const key = name + '|' + (colour || '') + '|sculpt';
    if (!hulls.has(key)) {
      const tail = tailCurve.map(([x, y, z]) => [x + tailRoot[0], y + tailRoot[1], z + tailRoot[2]]), sc = sculptFeline(L, {tail, headM});
      const grown = growHull(sc.parts, {weigh, res: SCULPT.res, soft: SCULPT.soft});
      const toHead = headM.clone().invert(), _h = new THREE.Vector3();
      coatAttributes(grown.geometry, bones.map(b => b.name), tail, {Y, front: L.shoulder[2] + .02, neckY: L.neck[1], ear: (x, y, z) => sc.earSide(...(_h.set(x, y, z).applyMatrix4(toHead)).toArray())});
      // the whiskers, ready-made in head space, ride the head with the other details
      // the lips part: the skin's triangles across the lip line at the front of the muzzle go, so the jaw
      // opens a mouth rather than stretching a membrane (closed, the slit reads as the mouth line)
      cutLips(grown.geometry, p => p.sub(_en).divideScalar(headScale));
      // the whiskers and the inside of the mouth, ready-made in head space, each on its bone
      const ride = {head: () => [[names.head, 1]], jaw: () => [[names.jaw, 1]], tongue: () => [[names.tongue, 1]], split: (x, y) => { const k = smooth(((MOUTH.lip[0] - .002) - (y - L.neck[1]) / headScale) / .004 + .5); return [[names.head, 1 - k], [names.jaw, k]]; }};
      const extras = sc.extras.map(e => { const by = ride[e.bone] || ride.head; e.applyMatrix4(headM); skin(e, by); return e; });
      grown.details = grown.details ? mergeGeometries([grown.details, ...extras]) : mergeGeometries(extras);
      hulls.set(key, grown);
    }
    const grown = hulls.get(key);
    const paint = {neck: L.neck, scale: (L.headSize || 1) * HEAD_SCALE, eye: [EYE.x, EYE.y, EYE.z], eyeR: [EYE.r[0] * EYE.open, EYE.r[1] * EYE.open], front: L.shoulder[2] + .02};
    fur = new THREE.SkinnedMesh(grown.geometry, coatMaterial(L, paint));
    // the fur's layers, each the skin again a little further out (feline-coat.js)
    for (let k = 1; k <= FUR.shells; k++) { const m = new THREE.SkinnedMesh(grown.geometry, coatMaterial(L, paint, k / FUR.shells)); m.frustumCulled = false; m.receiveShadow = true; m.userData.part = 'fur-shell'; shells.push(m); }
    details = new THREE.SkinnedMesh(grown.details, S.fur); details.castShadow = details.receiveShadow = true; details.frustumCulled = false; details.userData.part = 'details';
  } else if (hull && S.body.userData.pieces) {
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
  const eyesGeo = (sculpt ? sculptEyes() : S.eyes.clone()).applyMatrix4(headM); skin(eyesGeo, () => [[names.head, 1]]);
  const eyes = new THREE.SkinnedMesh(eyesGeo, sculpt ? sculptEyeMaterial(L) : S.eye); eyes.frustumCulled = false; eyes.userData.part = 'eyes';
  // the bones' rest (the inverse bind matrices) must come from settled world matrices
  body.add(hips); body.add(fur); if (details) body.add(details); body.add(eyes); g.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  for (const m of shells) body.add(m); body.updateMatrixWorld(true);
  fur.bind(skeleton, fur.matrixWorld); eyes.bind(skeleton, eyes.matrixWorld); if (details) details.bind(skeleton, details.matrixWorld);
  for (const m of shells) m.bind(skeleton, m.matrixWorld);
  // (the jaw rests a little past shut, so the lips meet over the cut between them)
  if (jaw) jaw.rotation.x = MOUTH.closed;
  // a head-space point (feline-sculpt.js) as a point riding the head bone, for poses that reach the face
  const headLocal = p => new THREE.Vector3(...p.map((v, i) => v * headScale + L.neck[i] - head.userData.world[i]));
  // the extra vertebrae share out the bend their control bone (spine, chest, neck) was given
  const chains = sculpt ? [[back1, spine], [back3, chest], [neck0, neck1, neck]] : [];
  const rig = {hips, spine, chest, neck, head, jaw, tongue, chains, distribute: chains.length ? () => distribute(chains) : null, tail: tailBones, legs, ears: sculpt ? ears : null, headLocal, yaw: g.rotation.y, lean: 0};
  const actor = {g, body, legs: [], tail: null, wings: [], quirk: 'feline', head, species: name, skinned: true, rig, fur, eyes, details, glide: FELINE_GLIDE};
  actor.animator = createFelineAnimator(body, rig, actor);
  actor.asset = {update: (dt, walking) => updateSkinnedFeline(actor, dt, null, walking), skinned: true, mixer: actor.animator.mixer};
  return actor;
}

// ---- clips ----
// A pose is a map bone name -> {x, y, z} Euler offsets from rest (radians), plus optional
// `hipsY` (hips lift) and `chestScale`. Each is a function of the cycle phase u in [0, 1).
const TAU = Math.PI * 2;
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
// The sit for a rig without goals (the fox): angles found once on the old kitten, the rump dropped
// and the haunches slid forward under the body, the hind legs folded, the back rising to the
// withers, the tail along the floor. A sculpted cat solves its sit from goals instead (feline-rest.js).
export const SIT = {drop: .123, hz: .013, hips: -.708, spine: .023, chest: .361, thigh: -.459, knee: .682, hock: -.847, paw: 1.622, fore: .122, elbow: .634, wrist: -.44};
export function plainSitPose(u) {
  const ph = u * TAU, breath = Math.sin(ph) * .5 + .5, pose = {hipsY: -SIT.drop, hipsZ: SIT.hz, chestScale: 1 + .02 * breath, fold: 1};
  pose.spine = {x: SIT.spine}; pose.chest = {x: SIT.chest}; pose.hips = {x: SIT.hips};
  for (const key of ['lhind', 'rhind']) { pose[key + '0'] = {x: SIT.thigh}; pose[key + '1'] = {x: SIT.knee}; pose[key + '2'] = {x: SIT.hock}; pose[key + '3'] = {x: SIT.paw}; }
  for (const key of ['lfore', 'rfore']) { pose[key + '0'] = {x: SIT.fore}; pose[key + '1'] = {x: SIT.elbow}; pose[key + '2'] = {x: SIT.wrist}; }
  // the tail lies back along the floor behind the rump, curling a little at the tip, which stirs
  for (let i = 0; i < 5; i++) { const k = i / 4; pose['tail' + i] = {x: SIT_TAIL.x[i], y: SIT_TAIL.y[i], z: Math.sin(ph * 2 + i) * .04 * k}; }
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
  // (the crouch keeps the forepaws planted ahead of the shoulders: the upper arm swings back, tucking the elbow, and the
  // forearm angles forward, so the chest sinks over the paws instead of the paws sliding back under the belly)
  for (const key of ['lfore', 'rfore']) { pose[key + '0'] = {x: .45 * crouch + POUNCE.reach * leap - .25 * land}; pose[key + '1'] = {x: -1.5 * crouch + .3 * leap + .5 * land}; pose[key + '2'] = {x: .8 * crouch - .4 * leap}; }
  return pose;
}
// Poses the bones directly from a pose (the shape sampleClip reads), for tools and tests: rotations
// from rest, the hips moved by hipsY/hipsZ, a longer back folded by `fold`. `rest`: the bones' rest
// positions by name.
export function applyPose(pose, bonesByName, rest) {
  const e = new THREE.Euler();
  for (const [name, b] of Object.entries(bonesByName)) { b.quaternion.identity(); if (rest[name]) b.position.copy(rest[name]); }
  for (const [key, o] of Object.entries(pose)) { const b = bonesByName[key]; if (b && o && typeof o === 'object') b.quaternion.setFromEuler(e.set(o.x || 0, o.y || 0, o.z || 0)); }
  const h = bonesByName.hips; if (h) { h.position.y += pose.hipsY || 0; h.position.z += pose.hipsZ || 0; }
  for (const b of Object.values(bonesByName)) if (b.userData.fold !== undefined) b.position.z -= Math.max(0, b.position.z - b.userData.fold) * (pose.fold || 0);
}
export const CLIPS = {idle: {pose: idlePose, period: 4, frames: 32}, sit: {pose: plainSitPose, period: 4, frames: 32}, tail: {pose: tailPose, period: 6, frames: 48}, pounce: {pose: pouncePose, period: POUNCE.time, frames: 30, once: true}};
// A pet that has stood still this long sits down.
export const SIT_AFTER = 6;
// The one-shots a sitting cat plays and goes back to the sit after.
export const ONE_SHOT = {groom: GROOM, scratch: SCRATCHING, eat: EATING};
// Settling down (the animator's `settle`): how long it stays in each pose (seconds, a range; `settle`:
// a loaf on its way to sleep), the
// odds at each choice (sitting: groom (and of that, scratch an ear instead), lie down at all, and if so go to sleep; a loaf: go to sleep rather
// than sit back up), the circle it turns before lying down to sleep, and the fades into each pose and back up.
// A dream twitch while asleep: every `gap` seconds a forepaw jerks for `time` seconds, `size` radians.
export const DREAM = {gap: [6, 18], time: .35, size: .25};
export const REST = {
  hold: {sit: [8, 20], loaf: [10, 25], settle: [3, 6], curl: [25, 60]},
  odds: {lie: .6, sleep: .55, curl: .4, groom: .45, scratch: .35},
  circle: 2 * Math.PI,
  fade: {sit: .6, loaf: 1, curl: .3, lie: .3},
  up: {sit: .4, loaf: .5, curl: .7, scramble: 3},
};

// Samples a pose function into an AnimationClip of quaternion (and position, scale) tracks on
// the bones it names. The last frame repeats the first, so the loop is seamless (`ends`: a clip that
// goes from one pose to another runs on to its own end instead).
export function sampleClip(name, {pose, period, frames, ends}, bonesByName) {
  const times = Array.from({length: frames + 1}, (_, i) => i / frames * period), per = new Map(), e = new THREE.Euler(), q = new THREE.Quaternion();
  const folding = Object.values(bonesByName).filter(b => b.userData.fold !== undefined), foldAt = folding.map(() => []);
  const hipsY = [], chestScale = [], tongueAt = []; let anyHipsY = false, anyScale = false, anyFold = false, anyTongue = false;
  for (let i = 0; i <= frames; i++) {
    const p = pose(ends ? i / frames : (i % frames) / frames);
    for (const [key, o] of Object.entries(p)) {
      if (key === 'hipsY' || key === 'hipsZ' || key === 'chestScale' || key === 'fold' || key === 'yawn' || key === 'tonguePos' || key === 'reach' || key === 'stroke') continue;
      if (!bonesByName[key]) continue;
      if (!per.has(key)) per.set(key, []);
      e.set(o.x || 0, o.y || 0, o.z || 0); q.setFromEuler(e); per.get(key).push(q.x, q.y, q.z, q.w);
    }
    const hy = bonesByName.hips ? bonesByName.hips.position : null;
    hipsY.push(hy ? hy.x : 0, (hy ? hy.y : 0) + (p.hipsY || 0), (hy ? hy.z : 0) + (p.hipsZ || 0)); if (p.hipsY || p.hipsZ) anyHipsY = true;
    chestScale.push(p.chestScale || 1, p.chestScale || 1, p.chestScale || 1); if (p.chestScale) anyScale = true;
    // `fold`: how much of a longer back's extra length (the sculpted pets') folds away
    for (const [i, bone] of folding.entries()) { const r = bone.position; foldAt[i].push(r.x, r.y, r.z - Math.max(0, r.z - bone.userData.fold) * (p.fold || 0)); }
    if (p.fold) anyFold = true;
    // `tonguePos`: the tongue pushed forward out of the mouth by this much
    { const r = bonesByName.tongue?.position; tongueAt.push(r ? r.x : 0, r ? r.y : 0, (r ? r.z : 0) + (p.tonguePos || 0)); if (p.tonguePos && r) anyTongue = true; }
  }
  const tracks = [...per].map(([key, values]) => new THREE.QuaternionKeyframeTrack(key + '.quaternion', times, values));
  if (anyHipsY) tracks.push(new THREE.VectorKeyframeTrack('hips.position', times, hipsY));
  if (anyScale) tracks.push(new THREE.VectorKeyframeTrack('chest.scale', times, chestScale));
  if (anyTongue) tracks.push(new THREE.VectorKeyframeTrack('tongue.position', times, tongueAt));
  if (anyFold) folding.forEach((b, i) => tracks.push(new THREE.VectorKeyframeTrack(b.name + '.position', times, foldAt[i])));
  return new THREE.AnimationClip(name, period, tracks);
}

// The mixer and its actions for one cat. `update(dt, walking)` runs the gaits: walk, run, idle
// and sit cross-fade as the pet starts, stops, speeds up and settles (three's skinning-blending
// example, in code: a stop waits for the loop boundary, walk and run fade with warping, the
// walk's time scale follows the measured speed), plays the pounce as a one-shot when the
// actor's attack action begins, keeps the tail playing, and lays the turn lean on top after the
// mixer has posed the bones. `actor` is read for its actions and its position.
// `opts.rest: false` keeps a rig to sitting (the lying poses are the cat's; a rig without a head to
// solve them on keeps to sitting anyway).
// `opts.yaw()` and `opts.scale()` override where the heading and the body-unit size come from, for a
// rig that does not sit straight under the actor's group (the fox, inside its model holder).
export function createFelineAnimator(root, rig, actor = null, opts = {}) {
  const bonesByName = {}; root.traverse(o => { if (o.isBone) bonesByName[o.name] = o; });
  // The mixer writes a bone only when its clip's value changes, so a held pose (the sit) is not
  // rewritten each frame. Everything laid on after the mixer (the lean, the gaze, the tail's mood,
  // the step) is therefore taken back at the start of the next frame: each bone returns to what the
  // mixer last left it as, and the layers start again from the mixer's own pose.
  const layered = Object.values(bonesByName), mixed = layered.map(b => ({q: b.quaternion.clone(), p: b.position.clone()}));
  const keepMixed = () => layered.forEach((b, i) => { mixed[i].q.copy(b.quaternion); mixed[i].p.copy(b.position); });
  const takeBack = () => layered.forEach((b, i) => { b.quaternion.copy(mixed[i].q); b.position.copy(mixed[i].p); });
  // a cat with goals (feline-rest.js) solves its resting poses on its own rig (once per look) and plays
  // them; any other rig keeps the plain clips
  const restAt = Object.fromEntries(Object.entries(bonesByName).map(([k, b]) => [k, b.position.clone()]));
  const solved = rig.headLocal && actor?.fur && opts.rest !== false ? solveRest({rig, fur: actor.fur, bones: bonesByName, key: actor.fur.geometry.uuid, apply: p => { applyPose(p, bonesByName, restAt); rig.distribute?.(); }}) : null;
  if (solved) { for (const b of Object.values(bonesByName)) { b.quaternion.identity(); b.position.copy(restAt[b.name]); } }
  const mixer = new THREE.AnimationMixer(root), actions = {};
  const weightOf = name => actions[name]?.getEffectiveWeight() ?? 0, lyingWeight = () => weightOf('loaf') + weightOf('curl') + weightOf('lie') + weightOf('rise'), restPose = (name, u) => restClips(solved)[name].pose(u);
  for (const [name, spec] of Object.entries({...CLIPS, ...(solved ? restClips(solved) : {})})) {
    const a = mixer.clipAction(sampleClip(name, spec, bonesByName));
    if (spec.once) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; } else a.play(); // (a one-shot holds its last frame while it fades out)
    a.setEffectiveWeight(0); actions[name] = a;
  }
  actions.idle.setEffectiveWeight(1); actions.tail.setEffectiveWeight(1);
  let walking = false, base = actions.idle, still = 0, pouncing = false, lastAttack = null, speed = 0, stepped = {stepping: false, weight: 0};
  const stepper = createStepper(rig, actor, opts);
  let mood = {mood: 'content', crouch: 0, hold: false, turn: false};
  const spring = {turn: 0, rate1: 0, rate2: 0, acc1: 0, acc2: 0, lastSpeed: 0};
  let seed = 0; for (const c of String(actor?.species || 'cat')) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  const blink = {until: BLINK.gap + rnd() * BLINK.span, shut: 0, again: false};
  const mind = createFelineMind(rig, actor, {seed});
  const _lq = new THREE.Quaternion(), _le = new THREE.Euler();
  // The tail rests on the floor rather than through it, whatever laid it there (the sit, its sway,
  // the mind's hook, the trailing spring): root to tip, a joint that would sink below the floor
  // (less its radius), or the middle of a segment that would, lifts that segment about the joint
  // before it, just enough to lie on it.
  const _fa = new THREE.Vector3(), _fb = new THREE.Vector3(), _fn = new THREE.Vector3(), _fq = new THREE.Quaternion(), _fs = new THREE.Vector3();
  function restTail() {
    const g = root.parent; if (!g || !rig.tail?.length) return;
    g.updateMatrixWorld(true);
    const floor = g.getWorldPosition(_fa).y, scale = g.getWorldScale(_fs).y, n = rig.tail.length - 1;
    for (let k = 1; k <= n; k++) for (const t of [.5, 1]) {
      const pivot = rig.tail[k - 1], r = (TAIL_SCULPT.root + (TAIL_SCULPT.tip - TAIL_SCULPT.root) * (k - 1 + t) / n) * scale + TAIL_REST.clear;
      pivot.getWorldPosition(_fa); rig.tail[k].getWorldPosition(_fb);
      // the point t of the way along the segment
      const seg = _fb.sub(_fa).multiplyScalar(t), len = seg.length(), flat = Math.hypot(seg.x, seg.z);
      if (_fa.y + seg.y - r >= floor || flat < 1e-5) continue;
      const lift = Math.asin(Math.max(-1, Math.min(1, (floor + r - _fa.y) / len))) - Math.asin(seg.y / len);
      if (!(lift > 0)) continue;
      // about the horizontal axis across the segment, in the pivot's parent's frame
      _fn.crossVectors(seg, _fs.set(0, 1, 0)).normalize().applyQuaternion(pivot.parent.getWorldQuaternion(_fq).invert());
      pivot.quaternion.premultiply(_fq.setFromAxisAngle(_fn, lift)); pivot.updateMatrixWorld(true);
    }
  }
  // The pounce lands on its paws, not through the floor: while it plays, the whole body rises by however far
  // the lowest paw would sink below its standing height (each paw's height at rest, in the group's frame).
  const _pw = new THREE.Vector3(), pawRest = {};
  if (root.parent && rig.legs) { root.parent.updateMatrixWorld(true); for (const [k, l] of Object.entries(rig.legs)) pawRest[k] = root.parent.worldToLocal(l.bones.at(-1).getWorldPosition(_pw)).y; }
  function landPaws() {
    const g = root.parent; if (!g || !Object.keys(pawRest).length) return;
    g.updateMatrixWorld(true);
    let sink = 0; for (const [k, l] of Object.entries(rig.legs)) sink = Math.min(sink, g.worldToLocal(l.bones.at(-1).getWorldPosition(_pw)).y - pawRest[k]);
    if (sink < 0) { rig.hips.position.y -= sink / (rig.hips.parent.getWorldScale(_pw).y / g.getWorldScale(_fs).y); rig.hips.updateMatrixWorld(true); }
  }
  const last = new THREE.Vector3();
  if (actor?.g) last.copy(actor.g.position);
  // Fades `to` in and every other clip but the tail's sway out, each from the weight it has now, over
  // `time`: the weights always sum to one, however a new clip cuts into a fade still under way. (The
  // mixer's own crossFadeTo starts a fade-in at 0 and a fade-out at 1 whatever the weights were, so a clip
  // cut short could jump, or stay on at full weight under the next one: a pounce over the eating crouch
  // sank the forelegs through the floor.)
  const fading = new Map();
  const fade = (to, time) => {
    const was = to.isScheduled() && to.enabled ? to.getEffectiveWeight() : 0; // (a clip stopped, or never started, comes in from nothing)
    to.enabled = true; to.setEffectiveTimeScale(1); if (to.loop !== THREE.LoopOnce) to.time = 0; to.play(); to.setEffectiveWeight(was);
    for (const [k, x] of Object.entries(actions)) if (k !== 'tail') { const aim = x === to ? 1 : 0, w = x.getEffectiveWeight(); if (w !== aim) fading.set(x, {from: w, aim, t: 0, time}); else fading.delete(x); }
  };
  const stepFades = dt => {
    for (const [x, f] of fading) {
      f.t += dt; const k = f.time > 0 ? Math.min(1, f.t / f.time) : 1;
      x.setEffectiveWeight(f.from + (f.aim - f.from) * k);
      if (k >= 1) { fading.delete(x); if (!f.aim && x.loop === THREE.LoopOnce) x.stop(); }
    }
  };
  // (while the pounce plays it keeps the whole body; the base it lands back into is the latest asked for)
  const setBase = (to, time) => { if (to === base) return; base = to; if (!pouncing) fade(to, time); };
  mixer.addEventListener('finished', e => { if (e.action === actions.pounce) { pouncing = false; fade(base, .25); } });
  // Left alone, a content cat settles: standing still SIT_AFTER seconds it sits; after a while
  // sitting it lies down in a loaf, or gets up, turns a circle on the spot and lies down to sleep,
  // curling up after a few moments; from a loaf it sits back up or goes off to sleep the same way;
  // asleep for a while, it wakes and stands. Walking, a pounce or anything to hunt or fear gets it up at once (and
  // quicker than it settled).
  const rest = {state: 'stand', t: 0, next: 0, plan: null, speed: 1}, dream = {in: 8, t: 0, leg: 'lfore'};
  const range = ([a, b]) => a + (b - a) * rnd();
  const enter = (state, plan = null) => { rest.state = state; rest.t = 0; rest.plan = plan; rest.next = range((plan === 'sleep' && REST.hold.settle) || REST.hold[state] || [0, 0]); if (actions[state]) setBase(actions[state], REST.fade[state]); };
  // a one-shot from the sit (grooming, the scratch): played through, then back to the sit
  const stretch = () => { rest.state = 'stretch'; rest.t = 0; rest.next = 0; actions.stretch.reset(); base = actions.stretch; fade(base, REST.up.loaf); };
  const play = name => { rest.state = name; rest.t = 0; rest.next = 0; actions[name].reset(); base = actions[name]; if (!pouncing) fade(base, REST.fade.sit); };
  // lying down to sleep from the loaf, and getting up out of the curl: the staged clips (feline-rest.js LIE),
  // `speed` times as fast (a cat startled awake scrambles up)
  const lie = () => { rest.state = 'lie'; rest.t = 0; rest.next = 0; actions.lie.reset(); base = actions.lie; if (!pouncing) fade(base, REST.fade.lie); };
  const rise = (speed = 1) => { rest.state = 'rise'; rest.t = 0; rest.next = 0; rest.speed = speed; actions.rise.reset(); base = actions.rise; if (!pouncing) fade(base, REST.fade.lie / speed); actions.rise.setEffectiveTimeScale(speed); };
  const risen = () => rest.t >= LIE.time / rest.speed - REST.up.loaf / rest.speed;
  function settle(dt) {
    if (walking || pouncing || mood.mood !== 'content') {
      // curled up (or lying down), it gets up the way it lay down, quickly, before it goes
      if (rest.state === 'curl' || rest.state === 'lie') { rise(REST.up.scramble); return; }
      if (rest.state === 'rise') { rest.t += dt; if (risen()) { setBase(actions.idle, REST.up.loaf / rest.speed); rest.state = 'stand'; rest.plan = null; } return; }
      if (rest.state !== 'stand') { setBase(actions.idle, REST.up[rest.state] ?? REST.up.sit); rest.state = 'stand'; rest.plan = null; }
      return;
    }
    rest.t += dt;
    if (rest.state === 'lie') { if (rest.t >= LIE.time - REST.fade.curl) enter('curl'); return; }
    if (rest.state === 'rise') { if (risen()) stretch(); return; }
    if (rest.state === 'stand') { if (still >= SIT_AFTER) enter('sit'); return; }
    if (!solved) return; // (a rig without the resting poses only sits)
    if (rest.state === 'circle') { if (!mind.state.turning) enter('loaf', 'sleep'); return; }
    if (rest.t < rest.next) return;
    const toSleep = () => { setBase(actions.idle, REST.up[rest.state] ?? REST.up.sit); rest.state = 'circle'; rest.t = 0; mind.circle(REST.circle * (rnd() < .5 ? -1 : 1)); };
    if (rest.state === 'sit' && rnd() < REST.odds.groom) { play(rnd() < REST.odds.scratch ? 'scratch' : 'groom'); return; }
    if (rest.state === 'sit') {
      if (rnd() < REST.odds.lie) { if (rnd() < REST.odds.sleep) toSleep(); else enter('loaf'); }
      else enter('sit');
    } else if (rest.state === 'loaf') {
      if (rest.plan === 'sleep') lie(); else if (rnd() < REST.odds.curl) toSleep(); else enter('sit');
    } else if (rest.state === 'curl') {
      // waking: it rolls back up onto its chest, then the stretch and the yawn (a one-shot), then up
      rise();
    } else if (rest.state === 'stretch' && rest.t >= STRETCH.time - REST.up.sit) { setBase(actions.idle, REST.up.sit); rest.state = 'stand'; still = 0; }
    else if (rest.state === 'eat' && rest.t >= EATING.time - REST.fade.sit) { setBase(actions.idle, REST.up.sit); rest.state = 'stand'; still = 0; }
    else if (ONE_SHOT[rest.state] && rest.t >= ONE_SHOT[rest.state].time - REST.fade.sit) enter('sit');
  }
  function update(dt, nowWalking) {
    dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
    still = nowWalking || mood.mood !== 'content' ? 0 : still + dt; // a cat that is stalking or wary is not settling down
    // measured speed (tiles per second), smoothed
    if (actor?.g && dt > 0) { const v = last.distanceTo(actor.g.position) / dt; last.copy(actor.g.position); speed += (Math.min(v, 12) - speed) * (1 - Math.exp(-dt * GAIT.smooth)); }
    // the pounce: once per attack action, the moment it starts
    const atk = actor?.actions?.current?.kind === 'attack' ? actor.actions.current : null;
    if (atk && atk !== lastAttack) { lastAttack = atk; pouncing = true; still = 0; actions.pounce.reset(); fade(actions.pounce, .08); }
    walking = nowWalking;
    // the pace in hip heights per second: the glide's own speed has no lag (actor.slideSpeed); the
    // measured speed stands in for other slides
    const actual = actor?.slideSpeed > 0 ? actor.slideSpeed : speed, pace = actual / stepper.hip();
    // walking, the idle plays under the step (and a resting cat gets up); left alone, it settles (rest)
    if (walking && !pouncing && rest.state !== 'rise' && rest.state !== 'curl' && rest.state !== 'lie') setBase(actions.idle, GAIT.fade); // (curled up, it gets up first: settle)
    settle(dt);
    // the tail's own sway gives way to a pose that lays the tail somewhere (sitting, lying)
    actions.tail.setEffectiveWeight(1 - Math.min(1, weightOf('sit') + lyingWeight()));
    stepFades(dt); takeBack(); mixer.update(dt); keepMixed();
    // the lean into a turn: the heading arrives in steps, so it snaps toward a turn and eases out
    const yaw = opts.yaw ? opts.yaw() : (rig.hips.parent?.parent?.rotation.y ?? 0), d = Math.atan2(Math.sin(yaw - rig.yaw), Math.cos(yaw - rig.yaw)); rig.yaw = yaw;
    const target = dt > 0 ? Math.max(-.5, Math.min(.5, d / dt * .12)) : 0;
    rig.lean += (target - rig.lean) * (1 - Math.exp(-dt * (Math.abs(target) > Math.abs(rig.lean) ? 14 : 3)));
    if (Math.abs(rig.lean) > 1e-4) { const l = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rig.lean * .5, -rig.lean * .25)); rig.spine.quaternion.multiply(l); rig.chest.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rig.lean * .5, 0))); }
    secondary(dt, d);
    // its attention and mood (the gaze, the tail, the crouch, turning to face), then the legs last,
    // once the body they hang from has its pose for the frame
    const sitting = base === actions.sit || actions.sit.getEffectiveWeight() > .01; // (until it has got up)
    const lying = lyingWeight(), asleep = weightOf('curl');
    const busy = Object.keys(ONE_SHOT).reduce((m, k) => Math.max(m, weightOf(k)), base === actions.stretch ? weightOf('stretch') : 0);
    const resting = sitting || lying > .01 || busy > .01 || (solved && (base === actions.loaf || base === actions.curl || base === actions.stretch || base === actions.lie || base === actions.rise));
    mood = mind.update(dt, {walking, pouncing, sitting, resting, asleep, busy});
    // asleep, the eyes are shut, and now and then a forepaw twitches in a dream; yawning, the eyes shut
    // and the ears lie back
    const yawn = solved && base === actions.stretch ? restPose('stretch', actions.stretch.time / STRETCH.time).yawn * weightOf('stretch') : 0;
    if (actor?.eyes && (asleep > .5 || yawn > .3)) actor.eyes.visible = false;
    if (yawn > 0 && rig.ears) for (const e of Object.values(rig.ears)) e.bone.quaternion.multiply(_lq.setFromAxisAngle(e.frame.across, -e.side * YAWN.ears * yawn));
    if (asleep > .9) {
      if ((dream.in -= dt) <= 0) { dream.in = range(DREAM.gap); dream.t = DREAM.time; dream.leg = rnd() < .5 ? 'lfore' : 'rfore'; }
      if (dream.t > 0) { dream.t -= dt; const k = Math.sin(Math.PI * (1 - dream.t / DREAM.time)) * Math.sin(dream.t * 60); rig.legs[dream.leg]?.bones[1]?.quaternion.multiply(_lq.setFromEuler(_le.set(k * DREAM.size, 0, 0))); }
    }
    if (mood.slowBlink && actor?.eyes && blink.shut <= 0) { blink.shut = BLINK.slow; blink.again = false; }
    // every layer is on: share each bend out along its vertebrae (the step does it again for its own)
    rig.distribute?.();
    // (a sitting cat's legs belong to the sit clip)
    stepped = stepper.update(dt, walking && !pouncing, actual, pouncing || resting, resting ? {} : {hold: mood.hold, turn: mood.turn, crouch: mood.crouch});
    if (weightOf('pounce') > 0) landPaws();
    restTail();
    const gait = stepped.stepping ? stepped.gait : Object.keys(actions).find(k => actions[k] === base);
    return {walking, pouncing, speed, pace, sitting: base === actions.sit, rest: rest.state, lying, asleep, gait, mood, step: stepped, stepWeight: stepped.weight, idleWeight: actions.idle.getEffectiveWeight(), sitWeight: actions.sit.getEffectiveWeight(), pounceWeight: actions.pounce.getEffectiveWeight()};
  }
  // ---- secondary motion: eased turns, the trailing tail, blinks ----
  function secondary(dt, yawStep) {
    // the turn: counter the heading step on the mixer root and ease it away, so the body swings round
    spring.turn = Math.max(-TURN.max, Math.min(TURN.max, spring.turn - yawStep)) * Math.exp(-dt * TURN.ease);
    if (Math.abs(spring.turn) < 1e-4) spring.turn = 0;
    root.rotation.y = spring.turn;
    // the neck leads into the new heading, and levels the head against the body's pitch (a sitting
    // cat's back rises steeply, a running one's dips): the head bone itself is left to the glance code
    // (lying down, the pose holds the head itself)
    const pitch = (rig.hips.rotation.x + rig.spine.rotation.x + rig.chest.rotation.x) * (1 - Math.min(1, lyingWeight()));
    rig.neck.quaternion.multiply(_lq.setFromEuler(_le.set(-pitch * TURN.level, -spring.turn * TURN.lead, 0)));
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
  // For the tool pages: hold one clip at a moment of its cycle (u in 0..1), everything else off.
  function show(name, u = 0) {
    const ownsTail = name === 'sit' || name === 'loaf' || name === 'curl' || name === 'lie' || name === 'rise';
    fading.clear();
    for (const [key, a] of Object.entries(actions)) { a.enabled = true; a.paused = false; a.setEffectiveWeight(key === name || (key === 'tail' && !ownsTail) ? 1 : 0); }
    const a = actions[name]; a.play(); a.time = u * a.getClip().duration; a.paused = true;
    takeBack(); mixer.update(0); keepMixed(); secondary(0, 0); rig.distribute?.(); restTail(); // the neck's levelling too, so a tool shows the head as the game would
  }
  // The game said it eats: crouch over the food and chew (from standing, sitting or lying: it gets up
  // to eat; a second meal message while eating carries on chewing).
  function eat() { if (!solved) return; if (rest.state === 'eat') { rest.t = Math.min(rest.t, EATING.time * .3); actions.eat.time = Math.min(actions.eat.time, EATING.time * .3); return; } play('eat'); still = 0; }
  return {mixer, actions, update, show, stepper, mind, eat, solved, get walking() { return walking; }, get base() { return Object.keys(actions).find(k => actions[k] === base); }};
}

// Per frame from live.js (through actor.asset.update). `t` is unused: the mixer keeps its own time.
export function updateSkinnedFeline(actor, dt, t, walking) {
  return actor?.animator ? actor.animator.update(dt, !!walking) : null;
}
