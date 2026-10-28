// The curled sleep of a dog, jackal, wolf and the rest of the canines (not Cerberus): written by body role and
// solved on the joints `createCanine` exposes. 71% of owners report a curled sleeper (CREATURE-MEASURES.md,
// Canines); no source gave the curl as an angle, so its proportions are set by eye against photographs. The dog
// lies on its belly with the legs folded in under it, the neck swung round so the muzzle rests on the flank by
// the hind leg, and the tail laid round to the nose. A pose is {joint: {x, y, z}} (radians, added to the joint's
// built rotation) and hipsY, the body's drop in body units, as the wild cats' (wildcat-rest.js).
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';

// Shares of the dog's standing shoulder height: how far each forepaw lies ahead of its shoulder, how far the
// hind foot lies ahead of its hip, how near the muzzle lies to the left haunch, and how near the tail's tip
// lies to the muzzle, how high the muzzle lies above the floor, and how near the tail's middle lies to the left
// haunch (the tail laid along the flank, not stuck out past the rump), and how far the rump swings round to the
// left of the spine's line (the body's C).
export const REST = {reach: .4, hind: .15, nose: .55, tail: .7, chin: .3, wrap: .6, swing: .35};

const worst = r => Math.max(...r.residuals.flat().map(Math.abs));
// The head's length, nose to the back of the skull, in the world (its mesh's extent along the head's own z).
export function headLength(a) {
  const m = a.head.children.find(o => o.isMesh && o.userData.part === 'head'), p = m.geometry.attributes.position;
  let lo = Infinity, hi = -Infinity; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); lo = Math.min(lo, z); hi = Math.max(hi, z); }
  return (hi - lo) * a.head.getWorldScale(new THREE.Vector3()).z;
}

export const rests = a => !!(a && (a.quirk === 'dog' || a.quirk === 'canine') && a.joints?.spine0 && !a.joints.head_0 && !a.rig);

// Solves the curled sleep (the built pose is left as it was found). `opts.pose`: score that pose against the
// goals instead of solving (the baked poses, canine-rest-poses.js).
export function restPose(a, opts = {}) {
  const P = rolesOf(a), s = a.g.scale.x, floor = a.g.position.y, j = a.joints, {apply} = birdPoser(a);
  const high = P['shoulder:l']().y - floor, v = new THREE.Vector3();
  // a world point in the dog's own frame, its group's (x left-right, -x its left; z nose-ward), in world units
  const inBody = p => a.g.worldToLocal(p.clone()).multiplyScalar(s);
  let hide = null;
  a.g.traverse(o => { if (o.isSkinnedMesh && o.userData.part === 'body') hide = o; });
  // world points of the hide (every `step`th vertex, posed as it now stands); the torso's are the ones that ride spine0
  const idx = hide.geometry.attributes.skinIndex, wt = hide.geometry.attributes.skinWeight;
  // (by the bone a vertex mostly rides: the back's vertebrae, a leg's, or the neck's and the tail's)
  const torso = [], every = [], trunk = [], name = i => hide.skeleton.bones[idx.getX(i)].name;
  for (let i = 0; i < idx.count; i += 16) { const n = name(i), back = /^spine/.test(n); if (i % 32 === 0) { every.push(i); if (back || /leg/.test(n)) trunk.push(i); } if (back && wt.getX(i) > .9) torso.push(i); }
  const samples = list => () => { const out = []; hide.updateMatrixWorld(true); hide.skeleton.update(); for (const i of list) out.push(hide.getVertexPosition(i, v).clone().applyMatrix4(hide.matrixWorld)); return out; };
  const body = samples(torso), all = samples(every), legged = samples(trunk);
  // the belly goes down by how far the torso's lowest point stands above the floor, then the legs fold to meet it
  apply({});
  const drop = Math.min(...body().map(p => p.y)) - floor + .004, lie = {hipsY: [-1.2, 0]}, curl = {};
  for (const n of ['neck0', 'neck1', 'neck2', 'neck3']) { curl[`${n}.x`] = [-.5, .7]; curl[`${n}.y`] = [-1.2, 1.2]; }
  // (the tail root drops further, so a tail carried up over the back, a pet's, can come down to wrap round)
  for (const n of ['tail0', 'tail1', 'tail2', 'tail3']) { curl[`${n}.x`] = [-1.2, n === 'tail0' ? 1.8 : .8]; curl[`${n}.y`] = [-1.2, 1.2]; }
  // (the back bends round on its two rear vertebrae, so the body curves into the curl instead of lying straight)
  for (const n of ['spine1', 'spine2']) curl[`${n}.y`] = [-1, 1];
  for (const side of ['l', 'r']) for (const i of [0, 1]) for (const b of ['', '_1', '_2']) lie[`${side}leg${i}${b}.x`] = [-2.6, 2.6];
  // (the neck and tail are left out of the first stage's floor check: the second lays them)
  const down = [goal.rests(body, {y: floor, weight: 3}), goal.clear(legged, {y: floor, weight: 2})];
  const base = {hipsY: -drop};
  for (const side of ['l', 'r']) {
    down.push(goal.floor(`paw:${side}f`, {y: floor, weight: 2}), goal.floor(`paw:${side}h`, {y: floor, weight: 2}),
      goal.ahead(`shoulder:${side}`, `paw:${side}f`, REST.reach * high, {within: .06 * s}),
      goal.ahead(`hip:${side}`, `paw:${side}h`, REST.hind * high, {within: .06 * s}));
  }
  const round = [goal.floor('mouth', {y: floor + REST.chin * high, weight: 2}), goal.floor('tailtip', {y: floor + .1 * high, weight: 1.5}),
    goal.reach('mouth', 'hip:l', {within: REST.nose * high, weight: 2}), goal.reach('tailtip', 'mouth', {within: REST.tail * high, weight: 1.5}),
    goal.reach(() => j.tail2.getWorldPosition(new THREE.Vector3()), 'hip:l', {within: REST.wrap * high, weight: 1.5}),
    // the tail's tip laid round to the nose: within one head length of the muzzle
    goal.reach('tailtip', 'mouth', {within: headLength(a), weight: 2}),
    // a C open to the left, in the dog's own frame: the rump swung round to the left of the spine's line, and the
    // tail's tip on that same side and forward of the rump (wrapped along the flank, not stuck out behind)
    P => [2 * Math.max(0, inBody(P.rump()).x + REST.swing * high)],
    P => [2 * Math.max(0, inBody(P.tailtip()).x + .5 * REST.swing * high), 2 * Math.max(0, inBody(P.rump()).z - inBody(P.tailtip()).z)]];
  const goals = [...down, goal.clear(all, {y: floor, weight: 2}), ...round];
  if (opts.pose) { apply(opts.pose); const residuals = goals.map(g => g(P)); apply({}); return {pose: opts.pose, residuals, goals, high}; }
  // Two stages, as the dragons': lie down first (tried from the legs as built and folded either way, the first
  // to meet every goal kept), then swing the neck and tail round with the body held (from either side).
  const fold = k => { const b = {...base}; for (const side of ['l', 'r']) { b[`${side}leg0`] = {x: 1.2 * k}; b[`${side}leg0_1`] = {x: -1 * k}; b[`${side}leg1`] = {x: -1 * k}; b[`${side}leg1_1`] = {x: 1 * k}; } return b; };
  const best = (starts, joints, goalsOf, iterations = 250) => {
    let out = null;
    for (const base of starts) {
      const t = solvePose({joints, base, goals: goalsOf, apply, points: P, iterations, rest: .01});
      if (!out || worst(t) < worst(out)) out = t;
      if (worst(out) < .015) break;
    }
    return out;
  };
  const lying = best([base, fold(1), fold(-1)], lie, down);
  const side = (k, t, bend = .9) => ({...lying.pose, spine1: {y: bend * k}, spine2: {y: bend * k}, neck1: {y: .5 * k}, neck2: {y: .5 * k}, neck3: {y: .5 * k}, tail0: {y: .5 * t}, tail1: {y: .5 * t}});
  // (the back curves one way, both vertebrae bent to the left, the way the rump swings: a C, not an S; the tail
  // started either way, the first to meet every goal kept)
  const curled = best([side(1, -1), side(1, 1), side(1, -1, .5), side(1, 1, 1.25), side(1, -1, 1.25)], {...curl, 'spine1.y': [0, 1.4], 'spine2.y': [0, 1.4]}, goals, 400);
  apply(curled.pose);
  const out = {pose: curled.pose, residuals: goals.map(g => g(P))};
  apply({});
  return {pose: out.pose, residuals: out.residuals, goals, high};
}
