import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {rearPose, rearsUp, REAR, neckLength} from './naga-rear.js';
import {coilRings, coilDepth, samplesOf} from './naga-rest.js';
import {birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';
import {NAGA} from './creature-measures.js';

// Stage 4 of the creature plan for the nagas (family N), step 2: the signature, a threatened cobra's rear: the neck
// drawn up into a straight post over the coil, the head hooked forward at the top (CREATURE-MEASURES.md, Nagas).
const FAMILY = ['red', 'black', 'golden', 'guardian', 'white'].flatMap(k => [`${k} naga`, `${k} naga hatchling`]);
const make = name => { const a = createCreature({name, symbol: 78}); a.g.updateMatrixWorld(true); return a; };
const poses = new Map();
const solved = name => { if (!poses.has(name)) poses.set(name, rearPose(make(name))); return poses.get(name); };
const lowest = a => {
  let y = Infinity; const b = new THREE.Box3(), v = new THREE.Vector3(); a.g.updateMatrixWorld(true);
  a.g.traverse(o => {
    if (!o.isMesh || o.material.transparent) return;
    if (o.isSkinnedMesh) { o.skeleton.update(); for (let i = 0; i < o.geometry.attributes.position.count; i += 2) y = Math.min(y, o.getVertexPosition(i, v).applyMatrix4(o.matrixWorld).y); }
    else { b.setFromObject(o, true); y = Math.min(y, b.min.y); }
  });
  return y;
};
const at = o => o.getWorldPosition(new THREE.Vector3());

test('the nagas and their hatchlings rear this way; the snakes and others do not', () => {
  for (const n of FAMILY) assert(rearsUp(make(n)), n);
  assert(!rearsUp(createCreature({name: 'cobra', symbol: 83})), 'cobra');
  assert(!rearsUp(createCreature({name: 'giant rat', symbol: 114})), 'rat');
});

test('the rear meets every goal under 2 cm on all ten', () => {
  for (const n of FAMILY) {
    const worst = Math.max(...solved(n).residuals.flat().map(v => Math.abs(v) * 100));
    assert(worst < 2, `${n}: worst goal ${worst.toFixed(2)} cm`);
  }
});

test('reared: the neck a straight post over the coil, taller than awake, the head hooked forward and level', () => {
  for (const n of FAMILY) {
    const a = make(n), j = a.joints, floor = a.g.position.y, {apply} = birdPoser(a), P = rolesOf(a), r = solved(n), L = neckLength(a);
    const withers = P.withers().clone(), awakeTop = at(j.neck4), awakeMouth = P.mouth().clone();
    const lean = t => Math.hypot(t.x - withers.x, t.z - withers.z);
    // awake the neck leans well out ahead of where it leaves the coil
    assert(lean(awakeTop) > REAR.lean * L + .04 * a.g.scale.x, `${n}: awake, the neck leans out`);
    apply(r.pose);
    const top = at(j.neck4), mouth = P.mouth();
    assert(lean(top) <= REAR.lean * L + .02, `${n}: the post's top ${(lean(top) * 100).toFixed(1)} cm off the withers`);
    assert(mouth.y >= withers.y + REAR.rise * L - .02, `${n}: the mouth drawn up over the withers`);
    assert(mouth.y > awakeMouth.y + .1 * L, `${n}: the mouth ${((mouth.y - awakeMouth.y) * 100).toFixed(1)} cm higher than awake`);
    assert(top.y > awakeTop.y, `${n}: the neck's top higher than awake`);
    assert(mouth.z - top.z >= REAR.hook * L - .02 && Math.abs(mouth.x - top.x) < .02, `${n}: the head hooked forward, square to the front`);
    const face = Math.atan2(mouth.y - at(j.head).y, Math.hypot(mouth.x - at(j.head).x, mouth.z - at(j.head).z)) * 180 / Math.PI;
    assert(Math.abs(face - REAR.slope) <= REAR.slack + 3, `${n}: the face at ${face.toFixed(0)} degrees`);
    assert(lowest(a) > floor - .02, `${n}: lowest point ${((lowest(a) - floor) * 100).toFixed(1)} cm`);
    const rings = coilRings(a), deep = Math.max(...samplesOf(a, {step: 2}).all().map(p => coilDepth(rings, p)));
    assert(deep < .02, `${n}: the head or neck ${(deep * 100).toFixed(1)} cm into the coil`);
    apply({});
  }
});

test('only the neck lifts: no coil joint is posed, and the share lifted falls short of the cobra\'s third', () => {
  for (const n of FAMILY) {
    const r = solved(n);
    for (const k of Object.keys(r.pose)) assert(!/^tail/.test(k), `${n}: ${k}`);
    // the naga's neck is about a sixth of its length; a threatened cobra lifts a third (NAGA.rearShare)
    assert(r.share > .12 && r.share < .2 && r.share < NAGA.rearShare, `${n}: lifts ${r.share.toFixed(3)} of its length`);
  }
});

test('the rear is easy to leave: posing nothing returns every joint and the body exactly to the built values', () => {
  for (const n of FAMILY) {
    const a = make(n), built = {};
    for (const [k, o] of Object.entries(a.joints)) built[k] = o.rotation.toArray().slice(0, 3);
    const body = a.body.position.toArray();
    rearPose(a);
    for (const [k, o] of Object.entries(a.joints)) assert.deepEqual(o.rotation.toArray().slice(0, 3), built[k], `${n} ${k}`);
    const {apply} = birdPoser(a); apply(solved(n).pose); apply({});
    for (const [k, o] of Object.entries(a.joints)) assert.deepEqual(o.rotation.toArray().slice(0, 3), built[k], `${n} ${k} after a pose`);
    assert.deepEqual(a.body.position.toArray(), body);
  }
});
