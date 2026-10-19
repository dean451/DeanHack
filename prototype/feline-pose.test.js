import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {solvePose, goal, blend} from './feline-pose.js';
import {createSkinnedFeline} from './feline-skin.js';

// feline-pose.js: poses from goals.
test('the solver meets reachable goals and stays within the joints\' limits', () => {
  // a two-link arm in the plane: reach a point it can, then one it cannot (it gets as near as it can)
  const root = new THREE.Object3D(), a = new THREE.Object3D(), b = new THREE.Object3D(), tip = new THREE.Object3D();
  root.add(a); a.add(b); b.position.set(0, 1, 0); b.add(tip); tip.position.set(0, 1, 0);
  const bones = {a, b}, apply = p => { for (const [n, o] of Object.entries(bones)) o.rotation.set(p[n]?.x || 0, 0, 0); root.updateMatrixWorld(true); };
  const P = {tip: () => tip.getWorldPosition(new THREE.Vector3())};
  const r = solvePose({joints: {'a.x': [-3, 3], 'b.x': [-3, 3]}, goals: [goal.reach('tip', new THREE.Vector3(0, 1, 1))], apply, points: P, rest: 0});
  assert.ok(P.tip().distanceTo(new THREE.Vector3(0, 1, 1)) < 1e-3, `reached: ${P.tip().toArray()}`);
  const far = solvePose({joints: {'a.x': [-.2, .2], 'b.x': [-.2, .2]}, goals: [goal.reach('tip', new THREE.Vector3(0, 0, 2))], apply, points: P});
  assert.ok(Math.abs(far.pose.a.x) <= .2 + 1e-9 && Math.abs(far.pose.b.x) <= .2 + 1e-9, 'held to its limits');
  const m = blend({a: {x: 0}, hipsY: 0}, {a: {x: 1}, hipsY: -1}, .25); assert.ok(Math.abs(m.a.x - .25) < 1e-9 && Math.abs(m.hipsY + .25) < 1e-9);
});

test('every pet look solves its resting, grooming and eating poses from their goals', () => {
  for (const name of ['kitten', 'housecat', 'large cat']) {
    const a = createSkinnedFeline(name), report = a.animator.solved?.report;
    assert.ok(report, `${name} solved its poses`);
    for (const pose of ['sit', 'loaf', 'curl', 'bow', 'lick', 'wash', 'scratch', 'eat']) assert.ok(report[pose].worst < .06, `${name} ${pose}: worst residual ${report[pose].worst.toFixed(3)}`);
    // the shoulder lick is the hardest reach (a short neck): near, not exact
    assert.ok(report.flank.worst < .6, `${name} flank: ${report.flank.worst.toFixed(3)}`);
  }
});
