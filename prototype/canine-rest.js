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
// lies to the muzzle, and how high the muzzle lies above the floor.
export const REST = {reach: .4, hind: .15, nose: .7, tail: 1, chin: .3};

const worst = r => Math.max(...r.residuals.flat().map(Math.abs));

export const rests = a => !!(a && (a.quirk === 'dog' || a.quirk === 'canine') && a.joints?.spine0 && !a.joints.head_0 && !a.rig);

// Solves the curled sleep (the built pose is left as it was found).
export function restPose(a) {
  const P = rolesOf(a), s = a.g.scale.x, floor = a.g.position.y, j = a.joints, {apply} = birdPoser(a);
  const high = P['shoulder:l']().y - floor, v = new THREE.Vector3();
  let hide = null;
  a.g.traverse(o => { if (o.isSkinnedMesh && o.userData.part === 'body') hide = o; });
  // world points of the hide (every `step`th vertex, posed as it now stands); the torso's are the ones that ride spine0
  const idx = hide.geometry.attributes.skinIndex, wt = hide.geometry.attributes.skinWeight;
  const torso = [], every = [], trunk = [];
  for (let i = 0; i < idx.count; i += 16) { if (i % 32 === 0) { every.push(i); if (idx.getX(i) === 0 || idx.getX(i) > 10) trunk.push(i); } if (idx.getX(i) === 0 && wt.getX(i) > .9) torso.push(i); }
  const samples = list => () => { const out = []; hide.updateMatrixWorld(true); hide.skeleton.update(); for (const i of list) out.push(hide.getVertexPosition(i, v).clone().applyMatrix4(hide.matrixWorld)); return out; };
  const body = samples(torso), all = samples(every), legged = samples(trunk);
  // the belly goes down by how far the torso's lowest point stands above the floor, then the legs fold to meet it
  apply({});
  const drop = Math.min(...body().map(p => p.y)) - floor + .004, lie = {hipsY: [-1.2, 0]}, curl = {};
  for (const n of ['neck0', 'neck1', 'neck2', 'neck3']) { curl[`${n}.x`] = [-.5, .7]; curl[`${n}.y`] = [-1.2, 1.2]; }
  for (const n of ['tail0', 'tail1', 'tail2', 'tail3']) { curl[`${n}.x`] = [-1.2, .8]; curl[`${n}.y`] = [-1.2, 1.2]; }
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
    goal.reach('mouth', 'hip:l', {within: REST.nose * high, weight: 2}), goal.reach('tailtip', 'mouth', {within: REST.tail * high, weight: 1.5})];
  const goals = [...down, goal.clear(all, {y: floor, weight: 2}), ...round];
  // Two stages, as the dragons': lie down first (tried from the legs as built and folded either way, the first
  // to meet every goal kept), then swing the neck and tail round with the body held (from either side).
  const fold = k => { const b = {...base}; for (const side of ['l', 'r']) { b[`${side}leg0`] = {x: 1.2 * k}; b[`${side}leg0_1`] = {x: -1 * k}; b[`${side}leg1`] = {x: -1 * k}; b[`${side}leg1_1`] = {x: 1 * k}; } return b; };
  const best = (starts, joints, goalsOf) => {
    let out = null;
    for (const base of starts) {
      const t = solvePose({joints, base, goals: goalsOf, apply, points: P, iterations: 250, rest: .01});
      if (!out || worst(t) < worst(out)) out = t;
      if (worst(out) < .015) break;
    }
    return out;
  };
  const lying = best([base, fold(1), fold(-1)], lie, down);
  const side = (k, t) => ({...lying.pose, neck1: {y: .5 * k}, neck2: {y: .5 * k}, neck3: {y: .5 * k}, tail0: {y: .5 * t}, tail1: {y: .5 * t}});
  const curled = best([side(1, -1), side(-1, 1), side(1, 1), side(-1, -1)], curl, goals);
  apply(curled.pose);
  const out = {pose: curled.pose, residuals: goals.map(g => g(P))};
  apply({});
  return {pose: out.pose, residuals: out.residuals, goals, high};
}
