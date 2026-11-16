import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createGoblin} from './goblin.js';
import {MUMMIES} from './mummy.js';
import {lurchPose, lurchPoser, lurches, kneeBend, LURCH} from './mummy-lurch.js';
import {restPose} from './mummy-rest.js';
import {lineTip} from './gnome-waddle.js';
import {birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';
import {MUMMY} from './creature-measures.js';

// Stage 4 of the creature plan for the mummies (family M), step 2: the signature, the shamble's stiff-knee stride
// caught at its swing and thrown at the hero, solved by role on every mummy.
const NAMES = [...Object.keys(MUMMIES), 'unknown M'];
const DEG = 180 / Math.PI;
const make = name => { const a = createCreature({name, symbol: 77, color: 7}); a.g.updateMatrixWorld(true); return a; };
const solved = new Map(), lurch = name => { if (!solved.has(name)) solved.set(name, lurchPose(make(name))); return solved.get(name); };
// the role map is built standing, before the pose goes on
const posed = name => { const a = make(name), P = rolesOf(a), r = lurch(name), feet = {l: P['paw:lh']().clone(), r: P['paw:rh']().clone()};
  lurchPoser(a).apply(r.pose); return {a, P, r, feet}; };
const lowest = a => { let y = Infinity; const v = new THREE.Vector3(); a.g.updateMatrixWorld(true);
  a.g.traverse(m => { if (!m.isMesh) return; if (m.isSkinnedMesh) m.skeleton.update(); const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { (m.isSkinnedMesh ? m.getVertexPosition(i, v) : v.fromBufferAttribute(p, i)).applyMatrix4(m.matrixWorld); y = Math.min(y, v.y); } });
  return y; };

test('every mummy lurches (the measured hip hike); a goblin and nothing do not', () => {
  assert(MUMMY.hipHike);
  for (const name of NAMES) assert(lurches(make(name)), name);
  assert(!lurches(createGoblin('goblin')) && !lurches(null));
});

test('the lurch meets every goal under 2 cm on every mummy', () => {
  for (const name of NAMES) { const r = lurch(name), worst = Math.max(...r.residuals.flat().map(v => Math.abs(v) * 100));
    assert(worst < 2, `${name}: worst goal ${worst.toFixed(2)} cm`); }
});

test('the knees stay stiff: no more than the badly stiff swing, well under the stiff-knee cut-off', () => {
  assert(MUMMY.swingKnee < MUMMY.stiffKnee && MUMMY.kneeShare < .5);
  for (const name of NAMES) { const {pose} = lurch(name);
    for (const side of ['l', 'r']) { const k = kneeBend(pose, side);
      assert(k <= MUMMY.swingKnee + 1e-9, `${name} ${side}: knee bent ${(k * DEG).toFixed(1)} degrees`);
      assert(k < MUMMY.liveKnee * MUMMY.kneeShare + 1e-9, `${name} ${side}: more than a stiff knee keeps`); } }
});

test('the swinging leg clears the floor by a hike of the hip: the left hip up, the shoulders carried level', () => {
  for (const name of NAMES) { const {P} = posed(name), l = P['hip:l'](), r = P['hip:r']();
    assert(l.y > r.y, `${name}: the left hip is not hiked`);
    const tip = lineTip(l, r);
    assert(Math.abs(tip - LURCH.hike) <= LURCH.slack + .3, `${name}: the hip line tips ${tip.toFixed(1)} degrees`);
    assert(lineTip(P['shoulder:l'](), P['shoulder:r']()) <= LURCH.level + .3, `${name}: the shoulders tip`); }
});

test('the right foot stays planted; the stiff left swings out ahead, dragged just clear of the floor', () => {
  for (const name of NAMES) { const {a, P, r, feet} = posed(name), floor = a.g.position.y, s = a.g.scale.x, l = P['paw:lh']();
    assert(P['paw:rh']().distanceTo(feet.r) < .01 * s, `${name}: the right foot moved ${(P['paw:rh']().distanceTo(feet.r) * 100).toFixed(1)} cm`);
    assert(l.z - P.rump().z > (LURCH.step - .05) * r.stand, `${name}: the left foot only ${(l.z - P.rump().z).toFixed(3)} ahead`);
    assert(l.z - feet.l.z > .1 * r.stand, `${name}: the left foot did not swing forward`);
    const off = (l.y - floor) / r.stand;
    assert(off > LURCH.lift - .01 && off < LURCH.drag + .01, `${name}: the left foot ${off.toFixed(3)} of the hip height off the floor`);
    assert(l.x < P.rump().x, `${name}: the left foot crossed under the body`); }
});

test('the one silhouette change: from the folded rest the arms fling out ahead, as high as the face, the trunk pitched on', () => {
  for (const name of NAMES) { const a = make(name), P = rolesOf(a), floor = a.g.position.y, r = lurch(name), s = a.g.scale.z;
    const reach = () => Math.max(...['l', 'r'].map(side => P[`paw:${side}f`]().z - a.g.position.z)) / s;
    birdPoser(a).apply(restPose(a).pose);
    const folded = reach();
    lurchPoser(a).apply(r.pose);
    const flung = Math.min(...['l', 'r'].map(side => P[`paw:${side}f`]().z - a.g.position.z)) / s;
    assert(folded < .35 && flung > .55, `${name}: hands ${folded.toFixed(2)} ahead at rest, ${flung.toFixed(2)} in the lurch`);
    for (const side of ['l', 'r']) { const h = P[`paw:${side}f`]();
      assert(h.z - P.withers().z > (LURCH.reach - .06) * r.stand, `${name} ${side}: the hand not flung ahead`);
      assert(h.y - floor > (LURCH.hands - .01) * r.mouth, `${name} ${side}: the hand hangs low`); }
    assert(P.withers().z - P.rump().z > (LURCH.pitch - .05) * r.stand, `${name}: the trunk not pitched on`); }
});

test('nothing goes through the floor (every vertex)', () => {
  for (const name of NAMES) { const {a} = posed(name), low = lowest(a) - a.g.position.y;
    assert(low > -.01 * a.g.scale.y, `${name}: lowest ${(low * 100).toFixed(1)} cm`); }
});

// a fresh solve each, so the smallest, the human and the two-headed build stand in for the eleven
test('posing nothing returns every joint and the body exactly to the built values', () => {
  for (const name of ['kobold mummy', 'human mummy', 'ettin mummy']) { const a = make(name), built = {};
    for (const [n, o] of Object.entries(a.joints)) built[n] = o.rotation.toArray().slice(0, 3);
    const pos = a.body.position.toArray(), rot = a.body.rotation.toArray().slice(0, 3);
    lurchPose(a);
    // compared by value: a built -0 comes back as 0
    for (const [n, o] of Object.entries(a.joints)) o.rotation.toArray().slice(0, 3).forEach((v, i) => assert(v === built[n][i], `${name} ${n}`));
    assert.deepEqual(a.body.position.toArray(), pos);
    a.body.rotation.toArray().slice(0, 3).forEach((v, i) => assert(v === rot[i], `${name} body rotation`)); }
});
