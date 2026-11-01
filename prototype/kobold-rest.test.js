import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {KOBOLDS, createKobold} from './kobold.js';
import {restPose, rests, REST} from './kobold-rest.js';
import {rests as impRests} from './imp-rest.js';
import {KOBOLD} from './creature-measures.js';
import {birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';

// the shaman's solve takes seconds, so each kobold is solved once
const make = name => { const a = createKobold(name); a.g.updateMatrixWorld(true); return a; };
const solved = new Map();
const solve = name => { if (!solved.has(name)) { const a = make(name); solved.set(name, {a, r: restPose(a)}); } return solved.get(name); };
const lowest = a => { let y = Infinity; const v = new THREE.Vector3();
  a.g.traverse(m => { if (!m.isSkinnedMesh) return; m.updateMatrixWorld(true); m.skeleton.update(); const n = m.geometry.attributes.position.count;
    for (let i = 0; i < n; i += 3) { m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld); y = Math.min(y, v.y); } }); return y; };

test('every kobold crouches; nothing else does', () => {
  for (const n of KOBOLDS) assert(rests(make(n)), n);
  assert(!rests(null) && !rests({joints: {}}));
  assert(!rests({...make('kobold'), quirk: 'imp'}));
  assert(impRests(make('kobold')));
});

test('the crouch meets every goal under 2 cm on every kobold', () => {
  for (const n of KOBOLDS) {
    const worst = Math.max(...solve(n).r.residuals.flat().map(v => Math.abs(v) * 100));
    assert(worst < 2, `${n}: worst goal ${worst.toFixed(2)} cm`);
  }
});

test('crouching: pelvis sunk, feet flat under it, hands low, knees bent past the measured crouch, nothing through the floor', () => {
  for (const n of KOBOLDS) {
    const {a, r} = solve(n), floor = a.g.position.y, P = rolesOf(a);
    birdPoser(a).apply(r.pose);
    assert(P.rump().y - floor <= REST.seat * r.stand + .02, `${n}: pelvis ${(P.rump().y - floor).toFixed(2)} of ${r.stand.toFixed(2)}`);
    for (const s of ['l', 'r']) {
      assert(P[`paw:${s}h`]().y - floor < .02, `${n}: foot on the floor`);
      assert(Math.abs(P[`paw:${s}h`]().z - P.rump().z) <= REST.feet * r.stand + .02, `${n}: foot under the pelvis`);
      assert(P[`paw:${s}f`]().y - floor < r.stand * .9, `${n}: hand low`);
    }
    const knee = Math.abs(r.pose.lleg1_1?.x ?? 0);
    assert(knee > KOBOLD.crouchKnee, `${n}: knee ${knee.toFixed(2)} rad against ${KOBOLD.crouchKnee.toFixed(2)}`);
    assert(lowest(a) > floor - .02, `${n}: lowest point ${((lowest(a) - floor) * 100).toFixed(1)} cm`);
    birdPoser(a).apply({});
  }
});

test('posing nothing returns every joint and the body exactly to the built values', () => {
  const a = make('kobold'), built = {};
  for (const [n, o] of Object.entries(a.joints)) built[n] = o.rotation.toArray().slice(0, 3);
  const body = a.body.position.toArray();
  restPose(a);
  for (const [n, o] of Object.entries(a.joints)) assert.deepEqual(o.rotation.toArray().slice(0, 3), built[n], n);
  assert.deepEqual(a.body.position.toArray(), body);
});
