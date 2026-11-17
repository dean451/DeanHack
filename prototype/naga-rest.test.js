import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {restPose, rests, REST, coilRings, coilTop, coilDepth, samplesOf} from './naga-rest.js';
import {birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';

// Stage 4 of the creature plan for the nagas (family N), step 1: the brooding rest, the neck laid down over the coil
// and the chin on its scales, as a python lies in its coil (CREATURE-MEASURES.md, Nagas).
const FAMILY = ['red', 'black', 'golden', 'guardian', 'white'].flatMap(k => [`${k} naga`, `${k} naga hatchling`]);
const make = name => { const a = createCreature({name, symbol: 78}); a.g.updateMatrixWorld(true); return a; };
const poses = new Map();
const solved = name => { if (!poses.has(name)) poses.set(name, restPose(make(name))); return poses.get(name); };
// the lowest point of everything the naga is made of, as posed
const lowest = a => {
  let y = Infinity; const b = new THREE.Box3(), v = new THREE.Vector3(); a.g.updateMatrixWorld(true);
  a.g.traverse(o => {
    if (!o.isMesh || o.material.transparent) return;
    if (o.isSkinnedMesh) { o.skeleton.update(); for (let i = 0; i < o.geometry.attributes.position.count; i += 2) y = Math.min(y, o.getVertexPosition(i, v).applyMatrix4(o.matrixWorld).y); }
    else { b.setFromObject(o, true); y = Math.min(y, b.min.y); }
  });
  return y;
};

test('the nagas and their hatchlings rest this way; the snakes and others do not', () => {
  for (const n of FAMILY) assert(rests(make(n)), n);
  assert(!rests(createCreature({name: 'cobra', symbol: 83})), 'cobra');
  assert(!rests(createCreature({name: 'python', symbol: 83})), 'python');
  assert(!rests(createCreature({name: 'giant rat', symbol: 114})), 'rat');
  assert(!rests(null) && !rests({joints: {}}));
});

test('the brooding rest meets every goal under 2 cm on all ten', () => {
  for (const n of FAMILY) {
    const worst = Math.max(...solved(n).residuals.flat().map(v => Math.abs(v) * 100));
    assert(worst < 2, `${n}: worst goal ${worst.toFixed(2)} cm`);
  }
});

test('laid down: the chin on the coil, the face over it, the neck no longer reared, nothing through the floor or the coil', () => {
  for (const n of FAMILY) {
    const a = make(n), s = a.g.scale.x, floor = a.g.position.y, {apply} = birdPoser(a), P = rolesOf(a), r = solved(n);
    const rings = coilRings(a), top = Math.max(...rings.map(q => q.c.y + q.max)), awake = P.mouth().y;
    const S = samplesOf(a, {step: 2}), neckHigh = () => Math.max(...S.neck().map(p => p.y));
    assert(neckHigh() > top + .15 * s, `${n}: awake, the neck stands reared over the coil`);
    apply(r.pose);
    const chin = P.chin(), under = coilTop(rings, chin);
    assert(under !== null, `${n}: the chin lies over the coil`);
    assert(chin.y >= under - .02 && chin.y <= under + REST.chin * s + .02, `${n}: the chin ${((chin.y - under) * 100).toFixed(1)} cm off the coil's scales`);
    assert(coilTop(rings, P.mouth()) !== null, `${n}: the mouth over the coil, not past its rim`);
    assert(P.mouth().y < awake - .2 * s, `${n}: the face down from its reared height`);
    assert(neckHigh() <= top + REST.ride * s + .02, `${n}: the neck laid on the coil, ${((neckHigh() - top) * 100).toFixed(1)} cm over its top`);
    assert(lowest(a) > floor - .02, `${n}: lowest point ${((lowest(a) - floor) * 100).toFixed(1)} cm`);
    const deep = Math.max(...S.all().map(p => coilDepth(rings, p)));
    assert(deep < .02, `${n}: the head or neck ${(deep * 100).toFixed(1)} cm into the coil`);
    apply({});
  }
});

test('the coil itself is left as it lies: no coil joint is posed', () => {
  for (const n of FAMILY) for (const k of Object.keys(solved(n).pose)) assert(!/^tail/.test(k), `${n}: ${k}`);
});

test('the pose is easy to leave: posing nothing returns every joint and the body exactly to the built values', () => {
  for (const n of FAMILY) {
    const a = make(n), built = {};
    for (const [k, o] of Object.entries(a.joints)) built[k] = o.rotation.toArray().slice(0, 3);
    const body = a.body.position.toArray();
    restPose(a);
    for (const [k, o] of Object.entries(a.joints)) assert.deepEqual(o.rotation.toArray().slice(0, 3), built[k], `${n} ${k}`);
    assert.deepEqual(a.body.position.toArray(), body);
    const {apply} = birdPoser(a); apply(solved(n).pose); apply({});
    for (const [k, o] of Object.entries(a.joints)) assert.deepEqual(o.rotation.toArray().slice(0, 3), built[k], `${n} ${k} after a pose`);
    assert.deepEqual(a.body.position.toArray(), body);
  }
});
