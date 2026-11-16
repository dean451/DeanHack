import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createGoblin} from './goblin.js';
import {MUMMIES} from './mummy.js';
import {restPose, rests, REST, segments, chestFront} from './mummy-rest.js';
import {birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';
import {MUMMY} from './creature-measures.js';

// Stage 4 of the creature plan for the mummies (family M), step 1: standing as it was laid out, the forearms crossed
// over the chest, solved by role on every mummy.
const NAMES = [...Object.keys(MUMMIES), 'unknown M'];
const make = name => { const a = createCreature({name, symbol: 77, color: 7}); a.g.updateMatrixWorld(true); return a; };
const solved = new Map(), rest = name => { if (!solved.has(name)) solved.set(name, restPose(make(name))); return solved.get(name); };
// the role map measures the hands in the standing pose, so it is built before the pose goes on
const posed = name => { const a = make(name), P = rolesOf(a), r = rest(name); birdPoser(a).apply(r.pose); return {a, P, r}; };
const inBody = (a, p) => a.body.worldToLocal(p.clone());
const elbow = (a, side) => inBody(a, a.joints[`${side}fore_1`].getWorldPosition(new THREE.Vector3()));
const vertices = a => { const out = [], v = new THREE.Vector3(); a.g.updateMatrixWorld(true);
  a.g.traverse(m => { if (!m.isMesh) return; if (m.isSkinnedMesh) m.skeleton.update(); const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) out.push((m.isSkinnedMesh ? m.getVertexPosition(i, v) : v.fromBufferAttribute(p, i)).applyMatrix4(m.matrixWorld).clone()); });
  return out; };

test('every mummy rests with its arms crossed (the measured laying-out); a goblin and nothing do not', () => {
  assert(MUMMY.armsCrossed);
  for (const name of NAMES) assert(rests(make(name)), name);
  assert(!rests(createGoblin('goblin')) && !rests(null));
});

test('the rest meets every goal under 2 cm on every mummy, and moves only the arms', () => {
  for (const name of NAMES) { const r = rest(name), worst = Math.max(...r.residuals.flat().map(v => Math.abs(v) * 100));
    assert(worst < 2, `${name}: worst goal ${worst.toFixed(2)} cm`);
    for (const n of Object.keys(r.pose)) assert(/^[lr]fore_[012]$/.test(n), `${name}: ${n} moved`); }
});

test('each bound hand lies on the far side of the chest, the forearms crossed, the right over the left', () => {
  for (const name of NAMES) { const {a, P, r} = posed(name), s = a.g.scale.y;
    const l = inBody(a, P['paw:lf']()), rt = inBody(a, P['paw:rf']());
    assert(P['paw:lf']().distanceTo(r.target.l) < .02 && P['paw:rf']().distanceTo(r.target.r) < .02, `${name}: hands at their places`);
    assert(l.x > 0 && rt.x < 0, `${name}: each hand across the midline (${l.x.toFixed(3)}, ${rt.x.toFixed(3)})`);
    assert(elbow(a, 'l').x < 0 && elbow(a, 'r').x > 0, `${name}: each elbow on its own side`);
    // the hands up on the chest, over the waist and under the collar
    for (const h of [l, rt]) assert(h.y > .6 && h.y < .86, `${name}: a hand at ${h.y.toFixed(3)} up the body`);
    const gap = segments(elbow(a, 'l'), l, elbow(a, 'r'), rt);
    assert(gap > REST.over - .005, `${name}: the forearms ${(gap * 100 * s).toFixed(1)} cm apart at their nearest`);
    assert(rt.z > l.z, `${name}: the right hand lies over the left forearm`); }
});

test('the forearms lie on the chest, out of the wrappings, and the elbows hang below the shoulders', () => {
  for (const name of NAMES) { const {a, P} = posed(name);
    for (const side of ['l', 'r']) { const e = elbow(a, side), h = inBody(a, P[`paw:${side}f`]()), m = e.clone().lerp(h, .5);
      assert(m.z > chestFront(m.y) + REST.clear - .005, `${name} ${side}: the forearm ${m.z.toFixed(3)} through the chest`);
      assert(h.z > chestFront(h.y), `${name} ${side}: the hand inside the chest`);
      assert(e.y < inBody(a, P[`shoulder:${side}`]()).y - .09, `${name} ${side}: the elbow under the shoulder`); } }
});

test('from above, the reaching arms fold away: the hands come in from far ahead of the chest to on it', () => {
  for (const name of NAMES) { const a = make(name), P = rolesOf(a), s = a.g.scale.z;
    const reach = () => Math.max(...['l', 'r'].map(side => P[`paw:${side}f`]().z - a.g.position.z)) / s;
    const standing = reach();
    birdPoser(a).apply(rest(name).pose);
    assert(standing > .45 && reach() < .35, `${name}: hands ${standing.toFixed(2)} ahead standing, ${reach().toFixed(2)} at rest`); }
});

test('nothing goes through the floor and the feet stay planted', () => {
  for (const name of NAMES) { const a = make(name), floor = a.g.position.y, P = rolesOf(a), feet = ['l', 'r'].map(s => P[`paw:${s}h`]().clone());
    birdPoser(a).apply(rest(name).pose);
    const low = Math.min(...vertices(a).map(v => v.y));
    assert(low > floor - .01, `${name}: lowest ${((low - floor) * 100).toFixed(1)} cm`);
    ['l', 'r'].forEach((s, i) => assert(P[`paw:${s}h`]().distanceTo(feet[i]) < 1e-9, `${name}: the ${s} foot moved`)); }
});

test('posing nothing returns every joint and the body exactly to the built values', () => {
  for (const name of NAMES) { const a = make(name), built = {};
    for (const [n, o] of Object.entries(a.joints)) built[n] = o.rotation.toArray().slice(0, 3);
    const body = a.body.position.toArray();
    restPose(a);
    // compared by value: a built -0 comes back as 0
    for (const [n, o] of Object.entries(a.joints)) o.rotation.toArray().slice(0, 3).forEach((v, i) => assert(v === built[n][i], `${name} ${n}`));
    assert.deepEqual(a.body.position.toArray(), body); }
});
