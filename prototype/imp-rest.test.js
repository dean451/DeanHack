import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {restPose, rests, REST} from './imp-rest.js';
import {birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';

const FAMILY = [['imp', 1], ['uranium imp', 2], ['homunculus', 2], ['quasit', 9], ['tengu', 6]];
const make = ([name, color]) => { const a = createCreature({name, symbol: 'i'.charCodeAt(0), color}); a.g.updateMatrixWorld(true); return a; };
const lowest = a => { let y = Infinity; const v = new THREE.Vector3();
  a.g.traverse(m => { if (!m.isSkinnedMesh) return; m.updateMatrixWorld(true); m.skeleton.update(); const n = m.geometry.attributes.position.count;
    for (let i = 0; i < n; i += 3) { m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld); y = Math.min(y, v.y); } }); return y; };

test('the imps squat; the lemure keeps its own slump; nothing else does', () => {
  for (const f of FAMILY) assert(rests(make(f)), f[0]);
  assert(!rests(make(['lemure', 3])));
  assert(!rests(null) && !rests({joints: {}}));
});

test('the squat meets every goal under 2 cm on every member', () => {
  for (const f of FAMILY) {
    const r = restPose(make(f)), worst = Math.max(...r.residuals.flat().map(v => Math.abs(v) * 100));
    assert(worst < 2, `${f[0]}: worst goal ${worst.toFixed(2)} cm`);
  }
});

test('squatting: pelvis dropped, feet flat under it, hands over the knees, nothing through the floor', () => {
  for (const f of FAMILY) {
    const a = make(f), floor = a.g.position.y, P = rolesOf(a), r = restPose(a);
    birdPoser(a).apply(r.pose);
    assert(P.rump().y - floor <= REST.seat * r.stand + .02, `${f[0]}: pelvis ${(P.rump().y - floor).toFixed(2)} of ${r.stand.toFixed(2)}`);
    for (const s of ['l', 'r']) {
      assert(P[`paw:${s}h`]().y - floor < .02, `${f[0]}: foot on the floor`);
      assert(Math.abs(P[`paw:${s}h`]().z - P.rump().z) <= REST.feet * r.stand + .02, `${f[0]}: foot under the pelvis`);
      assert(P[`paw:${s}f`]().y - floor < r.stand * .9, `${f[0]}: hand low`);
    }
    assert(lowest(a) > floor - .02, `${f[0]}: lowest point ${((lowest(a) - floor) * 100).toFixed(1)} cm`);
  }
});

test('the pose is easy to leave: posing nothing returns every joint and the body exactly to the built values', () => {
  for (const f of FAMILY) {
    const a = make(f), built = {};
    for (const [n, o] of Object.entries(a.joints)) built[n] = o.rotation.toArray().slice(0, 3);
    const body = a.body.position.toArray();
    restPose(a);
    for (const [n, o] of Object.entries(a.joints)) assert.deepEqual(o.rotation.toArray().slice(0, 3), built[n], `${f[0]} ${n}`);
    assert.deepEqual(a.body.position.toArray(), body);
  }
});
