// The pet cat's resting, grooming and eating poses, as goals (feline-pose.js) solved on its own rig,
// and the clips that play them. Each pose says what the body does (what touches the floor, what
// reaches what, how the back rises) and which joints may move to do it; solveRest finds the angles
// once per look and caches them, so the same goals fit every body the sculpt grows. The clip functions
// below blend the solved poses and lay the small motions on top (breathing, licks, strokes, chewing).
// Timings are in cat-motion/research/behaviours.md.
import * as THREE from 'three';
import {solvePose, goal, points, skinSamples, blend, expand} from './feline-pose.js';
import {MOUTH} from './feline-sculpt.js';

const TAU = Math.PI * 2;
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

// The tail's rest when sitting, per bone (root first): down from the rump (x) and curling to the side
// (y); lying in a loaf, round along the right side. (The floor keeps it out of the floor at run time.)
export const SIT_TAIL = {x: [-1.05, -.3, -.4, -.25, -.1], y: [0, .05, .15, .3, .4]};
export const LOAF_TAIL = {x: [-1.87, .15, .15, .15, .15], y: [0, .09, .18, .26, .35]};
const tailOf = T => Object.fromEntries(T.x.map((x, i) => ['tail' + i, {x, y: T.y[i]}]));

// Joint ranges (radians; hipsY, hipsZ in body units).
const LEGS = {'hind0.x': [-2.6, 1], 'hind1.x': [-.3, 2.8], 'hind2.x': [-2.8, .6], 'hind3.x': [-.6, 2.2], 'fore0.x': [-1.2, 1.6], 'fore1.x': [-2.2, 1.2], 'fore2.x': [-1.2, 1.9]};
const BACK = {'hips.x': [-1.3, .8], 'spine.x': [-.9, 1.2], 'chest.x': [-.7, 1.2]};

// What each pose asks for. `ctx` gives the points table P, the rest positions R (P's points with the
// cat standing), skin samples, the scale u() (body units to world) and the poses solved before it.
const POSES = {
  // Sitting the way a cat does (side-on photos of sitting cats): the rump on the floor and nothing
  // through it, the back rising about 42 degrees from rump to withers, each hind leg folded in a Z with
  // the foot flat on the floor and its toes just behind the front paws, the front legs upright under
  // the shoulders on paws that stayed about where they stood.
  sit: ({P, R, skin, u}) => ({
    base: {fold: 1, ...tailOf(SIT_TAIL), hipsY: -.12, hips: {x: -.7}, chest: {x: .36}, ...legs({hind0: -.46, hind1: .68, hind2: -.85, hind3: 1.6, fore0: .12, fore1: .63, fore2: -.44})},
    joints: {hipsY: [-.25, 0], hipsZ: [-.1, .15], ...BACK, ...LEGS},
    goals: [
      goal.rests(skin.rump, {weight: 3}), goal.clear(skin.body, {weight: 3}),
      ...['paw:lf', 'paw:rf', 'paw:lh', 'paw:rh'].map(p => goal.floor(p, {y: R[p].y, weight: 2})),
      goal.reach('paw:lf', R['paw:lf'], {within: u(.04), weight: 2}), goal.reach('paw:rf', R['paw:rf'], {within: u(.04), weight: 2}),
      goal.over('shoulder:l', 'paw:lf', {weight: 1.5}), goal.below('hock:l', R['paw:lh'].y + u(.02)),
      goal.ahead('paw:lh', 'paw:lf', u(.045), {within: u(.02)}), goal.slope('rump', 'withers', 42, {slack: 5, weight: 2}),
      goal.above('shoulder:l', R['shoulder:l'].y),
      // (each hind leg folded in a Z under the haunch: the hip joint low, near half its standing height)
      goal.below('hip:l', R['hip:l'].y * .55, {weight: 2}), goal.below('hip:r', R['hip:r'].y * .55, {weight: 2}),
    ],
  }),
  // The loaf: on its chest with the belly on the floor its whole length, the back level, the front paws
  // tucked under the chest, the hind feet folded beside the flank.
  loaf: ({P, R, skin, u}) => ({
    base: {fold: 1, ...tailOf(LOAF_TAIL), hipsY: -.13, chest: {x: .07}, ...legs({hind0: .46, hind1: 2.7, hind2: -1.3, hind3: .9, fore0: .59, fore1: -1.7, fore2: 1.34})},
    joints: {hipsY: [-.25, 0], hipsZ: [-.1, .1], ...BACK, ...LEGS},
    goals: [
      ...skin.belly.map(s => goal.rests(s, {weight: 2})), goal.clear(skin.all, {weight: 3}), goal.slope('rump', 'withers', 0, {slack: 4, weight: 2}),
      ...['paw:lf', 'paw:lh'].map(p => goal.floor(p, {y: R[p].y})),
      goal.ahead('shoulder:l', 'paw:lf', -u(.04), {within: u(.05)}), goal.ahead('hip:l', 'paw:lh', u(.065), {within: u(.065)}),
    ],
  }),
  // Curled up asleep: rolled onto its side, low and round, the nose down by the hind feet, nothing
  // through the floor, the face on the outside of the curl; then the tail laid along the floor round the
  // body's outline, past the paws, to the nose (layTail).
  curl: ({P, R, skin, u, spineLine, bones}) => ({
    base: {fold: 1, hipsY: -.14, hipsZ: .19, hips: {z: 1.48}, spine: {x: 1.1}, chest: {x: 1.1}, neck: {x: 1.4}, head: {x: 1.2, y: -.3},
      ...legs({hind0: -.1, hind1: 1.2, hind2: -1.3, hind3: 1.2, fore0: 0, fore1: -1.9, fore2: 1.86})},
    joints: {hipsY: [-.3, .05], hipsZ: [-.1, .3], 'hips.z': [0, 1.8], 'spine.x': [-.3, 1.3], 'chest.x': [-.3, 1.3], 'spine.y': [-.9, .9], 'chest.y': [-.9, .9], 'neck.y': [-1, 1], 'neck.x': [-.5, 1.6], 'head.x': [-1, 1.6], 'head.y': [-1, 1], ...LEGS},
    // (the tail is laid afterwards, round the outline of the curled body: see layTail)
    tail: 'wrap',
    goals: [
      goal.clear(skin.dense, {weight: 3}), goal.clear(skin.tail, {weight: 2}), goal.rests(skin.all, {weight: 2}), goal.below('withers', u(.17)),
      goal.reach('nose', 'paw:rh', {within: u(.07)}), goal.above('mouth', u(.035)),
      // (the face out on the rim of the curl, not tucked into it)
      goal.apart('mouth', () => P.rump().add(P.withers()).multiplyScalar(.5), u(.13), {weight: 2}), goal.above('crown', u(.06)),
    ],
  }),
  // The bow, the front stretch on waking: the fore paws reached well forward along the floor, the hind
  // paws where they stood, the chest sunk, the rump kept up, the head up off the chest.
  bow: ({R, skin, u}) => ({
    base: {},
    joints: {hipsY: [-.1, .05], hipsZ: [-.1, .1], ...BACK, ...LEGS, 'neck.x': [-.8, .6], 'head.x': [-.6, .6]},
    goals: [
      goal.reach('paw:lf', R['paw:lf'].clone().add(new THREE.Vector3(0, 0, u(.09))), {within: u(.01), weight: 2}),
      goal.reach('paw:lh', R['paw:lh'], {within: u(.01), weight: 2}), goal.below('withers', R.withers.y - u(.06)), goal.above('rump', R.rump.y - u(.015)),
      goal.above('head', R.withers.y), goal.clear(skin.all, {weight: 2}),
    ],
  }),
  // Grooming, from the sit. lick: the right forepaw brought up to the mouth and the head bent to it;
  // wash: the paw behind the right ear, the head turned and tipped into it, the paw passing down the
  // cheek; flank: the head turned right round to the front of the right flank, behind the shoulder, the
  // back twisting with it.
  lick: ({S, u, at}) => ({
    base: S.sit,
    joints: {'rfore0.x': [-2.6, 1.2], 'rfore0.z': [-.8, .8], 'rfore1.x': [-2.5, .6], 'rfore2.x': [-1.5, 1.9], 'neck.x': [-.6, 1.4], 'head.x': [-.6, 1]},
    goals: [goal.reach('paw:rf', 'mouth', {within: u(.012), weight: 4}), goal.apart('paw:rf', 'crown', u(.05), {weight: 3}), ...at(['paw:lf', 'paw:lh', 'paw:rh'])],
  }),
  wash: ({S, u, at}) => ({
    base: S.lick,
    joints: {'rfore0.x': [-2.8, 1.2], 'rfore0.z': [-.9, .9], 'rfore1.x': [-2.6, .6], 'rfore2.x': [-1.5, 1.9], 'neck.x': [-.6, 1.5], 'head.x': [-.6, 1], 'head.y': [-.8, .8], 'head.z': [-.9, .9]},
    seeds: [{'rfore0.x': -2.2, 'rfore1.x': -1.6, 'rfore2.x': 1, 'head.z': -.5, 'neck.x': .9}],
    goals: [goal.reach('paw:rf', 'ear:r', {within: u(.012), weight: 4}), goal.reach('paw:rf', 'cheek', {within: u(.035), weight: .5}), goal.apart('paw:rf', 'crown', u(.045), {weight: 3}), ...at(['paw:lf', 'paw:lh', 'paw:rh'])],
  }),
  flank: ({S, R, u, at, body}) => ({
    base: S.sit,
    joints: {'spine.y': [-1, 1], 'chest.y': [-1, 1], 'neck.y': [-1.4, 1.4], 'neck.x': [0, 1.4], 'head.y': [-1.2, 1.2], 'head.x': [0, 1]},
    seeds: [{'spine.y': .5, 'chest.y': .6, 'neck.y': 1, 'neck.x': .6, 'head.y': .7, 'head.x': .4}, {'spine.y': .8, 'chest.y': .8, 'neck.y': 1.3, 'neck.x': .9, 'head.y': 1, 'head.x': .6}],
    goals: [goal.reach('mouth', body('chest', [.085, .03, .07]), {within: u(.015), weight: 4}), ...at(['paw:lf', 'paw:rf', 'paw:lh', 'paw:rh']),
      // (the head comes round over the right shoulder, the face toward it, and stays up off the floor)
      goal.facing('nose', 'mouth', body('chest', [.085, .03, .07]), {weight: 2}), goal.above('head', R.withers.y * .8)],
  }),
  // The ear scratch, from the sit: the right hind foot up behind the right ear, the body curled round and
  // the head brought down and over to meet it, the other three paws where they sat.
  scratch: ({S, R, u, at, skin}) => ({
    base: S.sit,
    joints: {...LEGS, 'spine.y': [-.45, .45], 'chest.y': [-.45, .45], 'chest.x': [-.2, .6], 'neck.x': [0, 1.2], 'neck.y': [-.8, .8], 'head.x': [-.4, .8], 'head.z': [-.9, .9], 'hips.z': [-.35, .35],
      'rhind0.x': [-3, 1], 'rhind0.z': [-1.2, 1.2], 'rhind1.x': [-.3, 2.8], 'rhind2.x': [-2.8, .6], 'rhind3.x': [-1, 2.2]},
    iterations: 80,
    seeds: [{'rhind0.x': -2.4, 'rhind0.z': .8, 'rhind1.x': .8, 'rhind2.x': -.4, 'spine.y': .3, 'chest.y': .3, 'neck.x': .6, 'neck.y': .5, 'head.z': .6, 'hips.z': -.2},
      {'rhind0.x': -2.8, 'rhind0.z': 1, 'rhind1.x': 1.4, 'rhind2.x': -1, 'spine.y': .4, 'chest.y': .4, 'chest.x': .4, 'neck.x': 1, 'neck.y': .7, 'head.z': .9, 'head.x': .4, 'hips.z': -.3},
      {'rhind0.x': -2, 'rhind0.z': 1.1, 'rhind1.x': 2, 'rhind2.x': -1.6, 'spine.y': .45, 'chest.y': .45, 'neck.x': .9, 'neck.y': .8, 'head.z': .8, 'hips.z': -.35}],
    goals: [goal.reach('paw:rh', 'ear:r', {within: u(.035), weight: 4}), // (anywhere round behind the ear) goal.above('head', R.withers.y * .8, {weight: 3}), goal.above('withers', R.withers.y * .8, {weight: 3}),
      // (the supporting hind foot stays; the front paws may shift as the cat leans into it, on the floor)
      ...at(['paw:lh']), goal.floor('paw:lf', {y: R['paw:lf'].y}), goal.floor('paw:rf', {y: R['paw:rf'].y}), goal.rests(skin.rump, {weight: 2}), goal.clear(skin.body, {weight: 2})],
  }),
  // Eating: the front end crouched over the food on the floor just ahead of the fore paws, the head down
  // to it, all four paws where they stood.
  eat: ({R, u, skin}) => ({
    base: {},
    joints: {hipsY: [-.15, 0], 'fore0.x': [-1.2, 1.4], 'fore1.x': [-2.2, 1], 'fore2.x': [-1, 1.9], 'hind0.x': [-1, 1], 'hind1.x': [-.3, 2], 'hind2.x': [-2, .6], 'spine.x': [-.5, .8], 'chest.x': [-.5, .9], 'neck.x': [0, 1.7], 'head.x': [-1, 1]},
    goals: [goal.reach('mouth', new THREE.Vector3(0, u(.012), R['paw:lf'].z + u(.045)), {within: u(.008), weight: 4}),
      ...['paw:lf', 'paw:rf', 'paw:lh', 'paw:rh'].map(p => goal.reach(p, R[p], {within: u(.005), weight: 2})), goal.clear(skin.body, {weight: 2})],
  }),
};
// side-less leg angles, both legs alike
function legs(v) { const o = {}; for (const [k, x] of Object.entries(v)) for (const s of ['l', 'r']) o[s + k] = {x}; return o; }

// Lays the tail along the floor round the outside of a lying body: the outline of the body seen from
// above (the convex hull of its skin, held out by the tail's thickness), followed from where the tail
// leaves the rump round the belly side (the paws' side) toward the face, each tail joint placed at its
// own distance along it, then the tail's bones solved to those places.
export const WRAP = {gap: .028, bend: [-2.6, 2.6]};
function layTail({pose, apply, P, bones, skin, u}) {
  apply(pose);
  const tail = Object.keys(bones).filter(k => /^tail\d$/.test(k)).sort().map(k => bones[k]), root = tail[0].getWorldPosition(new THREE.Vector3());
  // the outline: the convex hull of the body's skin in the floor's plane, pushed out by the gap
  const pts = skin.dense().map(p => new THREE.Vector2(p.x, p.z)), hull = convexHull(pts), c = hull.reduce((a, p) => a.add(p), new THREE.Vector2()).divideScalar(hull.length);
  const ring = hull.map(p => p.clone().add(p.clone().sub(c).normalize().multiplyScalar(u(WRAP.gap))));
  // start at the ring point nearest the root; go the way that passes the paws first
  const r2 = new THREE.Vector2(root.x, root.z); let i0 = 0; ring.forEach((p, i) => { if (p.distanceTo(r2) < ring[i0].distanceTo(r2)) i0 = i; });
  const paws = ['paw:lf', 'paw:rf', 'paw:lh', 'paw:rh'].reduce((a, k) => { const v = P[k](); return a.add(new THREE.Vector2(v.x, v.z)); }, new THREE.Vector2()).divideScalar(4);
  const n = ring.length, walk = dir => { const out = [r2.clone()]; for (let k = 0; k <= n; k++) out.push(ring[(i0 + dir * k + n * 2) % n]); return out; };
  const firstHalf = path => { let d = 0, near = Infinity, len = 0; for (let k = 1; k < path.length; k++) len += path[k].distanceTo(path[k - 1]); for (let k = 1; k < path.length && d < len / 3; k++) { d += path[k].distanceTo(path[k - 1]); near = Math.min(near, path[k].distanceTo(paws)); } return near; };
  const path = firstHalf(walk(1)) < firstHalf(walk(-1)) ? walk(1) : walk(-1);
  const at = s => { let d = 0; for (let k = 1; k < path.length; k++) { const l = path[k].distanceTo(path[k - 1]); if (d + l >= s) return path[k - 1].clone().lerp(path[k], (s - d) / l); d += l; } return path[path.length - 1].clone(); };
  // each joint at its own distance along the path, lying on the floor
  const lens = [0]; for (let k = 1; k < tail.length; k++) lens.push(lens[k - 1] + tail[k].position.length() * u(1));
  const lie = u(.02), targets = lens.map(s => { const q = at(s); return new THREE.Vector3(q.x, lie, q.y); });
  const goals = tail.slice(1).map((b, k) => goal.reach(() => b.getWorldPosition(new THREE.Vector3()), targets[k + 1], {weight: 1 + k * .3}));
  // (all three axes: the body's roll leaves each bone's own axes tipped)
  const joints = Object.fromEntries(tail.slice(0, -1).flatMap(b => ['x', 'y', 'z'].map(ax => [b.name + '.' + ax, WRAP.bend])));
  const r = solvePose({joints, base: pose, goals, apply, points: P, rest: .005, iterations: 120});
  return {pose: r.pose, report: {cost: r.cost, worst: Math.max(0, ...r.residuals.flat().map(Math.abs))}};
}
// Andrew's monotone chain.
function convexHull(points) {
  const p = [...points].sort((a, b) => a.x - b.x || a.y - b.y), cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x), lo = [], hi = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
// Solves every pose for a cat (once per look). `rig` and `fur` are the skinned cat's; `apply(pose)`
// poses its bones (feline-skin.js applyPose, then the vertebrae's share-out); `key` names the look.
const solved = new Map();
export function solveRest({rig, fur, bones, apply, key}) {
  if (key && solved.has(key)) return solved.get(key);
  const g = fur.parent?.parent ?? fur.parent, u = v => v * (g?.getWorldScale(new THREE.Vector3()).x || 1);
  const pose = p => { apply(p); g?.updateMatrixWorld(true); fur.skeleton.update(); };
  const P = points(rig, bones);
  pose({}); const R = Object.fromEntries(Object.entries(P).map(([k, f]) => [k, f()]));
  const hipZ = rig.hips.userData.world[2], Y = rig.hips.userData.world[1];
  const skin = {
    body: skinSamples(fur, {groups: ['body', 'neck'], count: 50}),
    rump: skinSamples(fur, {groups: ['body'], filter: (x, y, z) => z < hipZ + .06 && y < Y, count: 30}),
    all: skinSamples(fur, {groups: ['body', 'neck', 'head', 'lfore', 'rfore', 'lhind', 'rhind'], count: 80}),
    // (dense, for keeping the tail out from under the body and the body out of the floor when lying)
    dense: skinSamples(fur, {groups: ['body', 'neck', 'head', 'lfore', 'rfore', 'lhind', 'rhind'], count: 400}),
    tail: skinSamples(fur, {groups: ['tail'], count: 24}),
    belly: [[-1, -.33], [-.33, .33], [.33, 1]].map(([a, b]) => skinSamples(fur, {groups: ['body'], filter: (x, y, z) => y < Y - .02 && z >= hipZ + (a + 1) * .2 && z < hipZ + (b + 1) * .2, count: 15})),
  };
  // the spine as a line of points, hips to head (for keeping things out of the body)
  const spineLine = () => ['hips', 'back1', 'spine', 'back3', 'chest', 'neck0', 'neck1', 'neck', 'head'].filter(n => bones[n]).map(n => bones[n].getWorldPosition(new THREE.Vector3()));
  // a body-space point riding a bone
  const body = (bone, [x, y, z]) => () => new THREE.Vector3(x, Y + y, z).sub(new THREE.Vector3(...bones[bone].userData.world)).applyMatrix4(bones[bone].matrixWorld);
  const S = {}, report = {};
  for (const name of Object.keys(POSES)) {
    // (`at`: these paws stay where the base pose put them)
    let fixed = null;
    const at = names => names.map(n => P => { fixed ??= {}; fixed[n] ??= P[n]().clone(); return [P[n]().distanceTo(fixed[n]) * 2]; });
    const spec = POSES[name]({P, R, skin, u, S, at, body, spineLine, bones});
    // (from the base, and from each of the pose's seeds laid on it: the best answer wins)
    let best = null;
    for (const seed of [{}, ...(spec.seeds || [])]) {
      const base = {...spec.base}; for (const [k, v] of Object.entries(seed)) for (const [b, ax] of expand(k)) base[b] = {...(base[b] || {}), [ax]: v};
      pose(base); fixed = null;
      const r = solvePose({...spec, base, apply: pose, points: P});
      if (!best || r.cost < best.cost) best = r;
    }
    if (spec.tail === 'wrap') { const t = layTail({pose: best.pose, apply: pose, P, bones, skin, u}); best = {...best, pose: t.pose}; report[name + 'Tail'] = t.report; }
    S[name] = best.pose; report[name] = {cost: best.cost, worst: Math.max(0, ...best.residuals.flat().map(Math.abs)), each: best.residuals.map(r => Math.max(0, ...r.map(Math.abs)))};
  }
  pose({});
  Object.defineProperty(S, 'report', {value: report}); // how near each pose came to its goals (for tests and tools)
  if (key) solved.set(key, S);
  return S;
}

// ---- the clips: functions of the cycle u (0..1) and the solved poses S ----
const breathe = (pose, u, depth) => ({...pose, chestScale: 1 + depth * (Math.sin(u * TAU) * .5 + .5)});
const stir = (pose, u, size) => { const p = {...pose}; for (let i = 0; i < 5; i++) { const k = i / 4; p['tail' + i] = {...p['tail' + i], z: (p['tail' + i]?.z || 0) + Math.sin(u * TAU * 2 + i) * size * k}; } return p; };
export const sitPose = (u, S) => stir(breathe(S.sit, u, .02), u, .04);
export const loafPose = (u, S) => stir(breathe(S.loaf, u, .015), u, .02);
// (CLIPS.curl's period is one slow breath)
export const curlPose = (u, S) => stir(breathe(S.curl, u, .03), u / 2, .01);

// Waking: the stretch and the yawn, one clip of STRETCH.time seconds: the bow, the yawn at its deepest
// (YAWN.time: 1.97 s, Gallup et al. 2016; eyes shut and ears back, in the animator), then a hind leg
// stretched out behind, then standing.
export const YAWN = {time: 1.97, jaw: .9, ears: .6};
export const STRETCH = {time: 4.6, bowIn: .12, bowOut: .58, hindIn: .66, hindOut: .9, hind: {hz: .03, thigh: .8, knee: -.7, hock: 1, paw: .8}};
export function stretchPose(u, S) {
  const T = STRETCH, bow = smooth(u / T.bowIn) * (1 - smooth((u - T.bowOut) / .08)), hind = smooth((u - T.hindIn) / .06) * (1 - smooth((u - T.hindOut) / .08));
  const pose = blend({}, S.bow, bow);
  const mid = (T.bowIn + T.bowOut) / 2, half = YAWN.time / T.time / 2, yawn = Math.max(0, Math.sin(Math.PI * clamp01((u - mid + half) / (2 * half))));
  pose.jaw = {x: MOUTH.closed + YAWN.jaw * yawn}; pose.tongue = {x: -.3 * yawn}; pose.yawn = yawn;
  // the hind stretch: forward over the fore paws, the right hind leg out behind
  pose.hipsZ = (pose.hipsZ || 0) + T.hind.hz * hind;
  for (const [i, k] of [[0, 'thigh'], [1, 'knee'], [2, 'hock'], [3, 'paw']]) pose['rhind' + i] = {x: (pose['rhind' + i]?.x || 0) + T.hind[k] * hind};
  return pose;
}
// Grooming: licks near one a second while the paw or the flank is licked, the wash in strokes a little
// slower.
export const GROOM = {time: 11, lick: 1.1, stroke: .75, licks: [.08, .4], wash: [.42, .62], flank: [.68, .92], jaw: .25, tongue: .02};
export function groomPose(u, S) {
  const G = GROOM, t = u * G.time, win = ([a, b]) => smooth((u - a) / .05) * (1 - smooth((u - b) / .05));
  const lickW = win(G.licks), washW = win(G.wash), flankW = win(G.flank), stroke = .5 - .5 * Math.cos(t / G.stroke * TAU);
  let pose = blend(sitPose(t / 4, S), S.lick, Math.max(lickW, washW));
  pose = blend(pose, S.wash, washW * stroke);
  pose = blend(pose, S.flank, flankW);
  const lap = Math.max(0, Math.sin(t / G.lick * TAU)), licking = Math.max(lickW, flankW);
  pose.jaw = {x: MOUTH.closed + G.jaw * lap * licking}; pose.tonguePos = G.tongue * lap * licking;
  return pose;
}
// The ear scratch: up, fast short strokes (about six a second, an estimate), down.
export const SCRATCHING = {time: 4, up: [.08, .22], down: [.78, .92], hz: 6, stroke: {rhind1: .22, rhind2: -.18}};
export function scratchPose(u, S) {
  const T = SCRATCHING, t = u * T.time, up = smooth((u - T.up[0]) / (T.up[1] - T.up[0])) * (1 - smooth((u - T.down[0]) / (T.down[1] - T.down[0])));
  const pose = blend(sitPose(t / 4, S), S.scratch, up), on = smooth((u - T.up[1]) / .04) * (1 - smooth((u - T.down[0] + .04) / .04)), w = Math.sin(t * T.hz * TAU) * on;
  for (const [b, a] of Object.entries(T.stroke)) pose[b] = {...pose[b], x: (pose[b]?.x || 0) + a * w};
  return pose;
}
// Eating: chewing about 2.5 times a second (an estimate), the head tipped to one side and now and then
// jerked sideways to shift the food (Gorniak & Gans 1980).
export const EATING = {time: 7, down: [0, .1], up: [.9, 1], hz: 2.5, jaw: .22, tilt: .35, jerkHz: .6, jerk: .25};
export function eatPose(u, S) {
  const E = EATING, t = u * E.time, k = smooth((u - E.down[0]) / (E.down[1] - E.down[0])) * (1 - smooth((u - E.up[0]) / (E.up[1] - E.up[0])));
  const pose = blend({}, S.eat, k), chew = (.5 - .5 * Math.cos(t * E.hz * TAU)) * k, jerk = Math.sin(t * E.jerkHz * TAU) ** 9 * k;
  pose.head = {...pose.head, z: (pose.head?.z || 0) + E.tilt * k, y: (pose.head?.y || 0) + E.jerk * jerk};
  pose.jaw = {x: MOUTH.closed + E.jaw * chew};
  return pose;
}
// The clips for a cat with solved poses (feline-skin.js sampleClip reads them).
export function restClips(S) {
  return {
    sit: {pose: u => sitPose(u, S), period: 4, frames: 32}, loaf: {pose: u => loafPose(u, S), period: 4, frames: 32}, curl: {pose: u => curlPose(u, S), period: 2.5, frames: 32},
    stretch: {pose: u => stretchPose(u, S), period: STRETCH.time, frames: 92, once: true}, groom: {pose: u => groomPose(u, S), period: GROOM.time, frames: 330, once: true},
    eat: {pose: u => eatPose(u, S), period: EATING.time, frames: 210, once: true}, scratch: {pose: u => scratchPose(u, S), period: SCRATCHING.time, frames: 240, once: true},
  };
}
