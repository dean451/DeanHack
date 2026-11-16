import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createGoblin} from './goblin.js';
import {restPose, rests, REST} from './lich-rest.js';
import {birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';
import {LICH} from './creature-measures.js';

// Stage 4 of the creature plan for the liches (family L), step 1: standing in the stoop, solved by role on every lich.
const FAMILY = [['lich', 2], ['demilich', 1], ['master lich', 5], ['arch-lich', 6], ['unknown L', 3]];
const make = ([name, color]) => { const a = createCreature({name, symbol: 76, color}); a.g.updateMatrixWorld(true); return a; };
const solved = new Map(), stoop = f => { if (!solved.has(f[0])) solved.set(f[0], restPose(make(f))); return solved.get(f[0]); };
const vertices = a => { const out = [], v = new THREE.Vector3(); a.g.updateMatrixWorld(true);
  a.g.traverse(m => { if (!m.isMesh) return; if (m.isSkinnedMesh) m.skeleton.update(); const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) out.push((m.isSkinnedMesh ? m.getVertexPosition(i, v) : v.fromBufferAttribute(p, i)).applyMatrix4(m.matrixWorld).clone()); });
  return out; };
const posed = f => { const a = make(f), P = rolesOf(a), r = stoop(f); birdPoser(a).apply(r.pose); return {a, P, r}; };
const find = (a, test) => { let hit = null; a.g.traverse(m => { if (!hit && m.isMesh && test(m)) hit = m; }); return hit; };
const hoodOf = a => find(a, m => m.name === 'hood');
const staffOf = a => find(a, m => m.parent === a.body && m.geometry.type !== 'SphereGeometry' && new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3()).y > 1);

test('every lich stoops; a goblin does not', () => {
  for (const f of FAMILY) assert(rests(make(f)), f[0]);
  assert(!rests(createGoblin('goblin')) && !rests(null));
});

test('the stoop meets every goal under 2 cm on every lich', () => {
  for (const f of FAMILY) { const worst = Math.max(...stoop(f).residuals.flat().map(v => Math.abs(v) * 100));
    assert(worst < 2, `${f[0]}: worst goal ${worst.toFixed(2)} cm`); }
});

test('the trunk leans forward by the measured stoop, bent low at the waist more than at the chest', () => {
  assert.equal(REST.stoop, LICH.stoop);
  assert(REST.stoop >= 30 * Math.PI / 180 - 1e-9 && REST.stoop < LICH.stoopUpper);
  for (const f of FAMILY) { const {P, r} = posed(f), d = P.withers().sub(P.rump()), lean = Math.atan2(d.z, d.y);
    assert(Math.abs(lean - REST.stoop) < 2 * Math.PI / 180, `${f[0]}: leans ${(lean * 180 / Math.PI).toFixed(1)} degrees`);
    assert(P.rump().distanceTo(r.rump) < 1e-6, `${f[0]}: the waist stays where it stood`);
    assert(r.pose.spine0.x > r.pose.spine1.x && r.pose.spine1.x <= REST.chest + 1e-9, `${f[0]}: the bend is low, at the waist`); }
});

test('the free hand hangs straight under its shoulder, clear of the robe; the staff hand keeps its grip', () => {
  for (const f of FAMILY) { const {a, P, r} = posed(f), s = a.g.scale.x, h = P['paw:lf'](), sh = P['shoulder:l']();
    assert(Math.hypot(h.x - sh.x, h.z - sh.z) < .02, `${f[0]}: the hand ${(Math.hypot(h.x - sh.x, h.z - sh.z) * 100).toFixed(1)} cm off plumb`);
    assert(sh.y - h.y > .9 * r.arm, `${f[0]}: the hand hangs below the shoulder`);
    // the robe is a cone, .32 across at the floor and .17 at .7 up (creatures.js), in the body's space
    const y = (h.y - a.g.position.y) / s, robe = (.32 - .15 * Math.min(1, y / .7)) * s;
    assert(Math.hypot(h.x - a.g.position.x, h.z - a.g.position.z) > robe, `${f[0]}: the hand outside the robe`);
    assert(P['paw:rf']().distanceTo(r.grip) < .01, `${f[0]}: the staff hand at its grip`); }
});

test('the staff stays planted and the face keeps its place in the hood', () => {
  for (const f of FAMILY) { const a = make(f), staff = staffOf(a), at = staff.getWorldPosition(new THREE.Vector3());
    // both eyes (the glow deep in each socket, creatures.js: .13 over the skull's pivot and .18 ahead) in the hood's
    // space: the face peers out of the hood only just, so lifting the skull back in it would bury the face
    const hood = hoodOf(a), head = a.joints.head, eyes = () => [-.06, .06].map(x => hood.worldToLocal(head.localToWorld(new THREE.Vector3(x, .13, .18))));
    const before = eyes();
    birdPoser(a).apply(stoop(f).pose);
    assert(staff.getWorldPosition(new THREE.Vector3()).distanceTo(at) < 1e-6, `${f[0]}: the staff moved`);
    eyes().forEach((e, i) => assert(e.distanceTo(before[i]) < .002, `${f[0]}: an eye moved ${(e.distanceTo(before[i]) * 100).toFixed(1)} cm in the hood`)); }
});

test('nothing goes through the floor and the hem stays down', () => {
  for (const f of FAMILY) { const a = make(f), floor = a.g.position.y, standing = Math.min(...vertices(a).map(v => v.y));
    birdPoser(a).apply(stoop(f).pose);
    const low = Math.min(...vertices(a).map(v => v.y));
    assert(low > Math.min(standing, floor) - .005, `${f[0]}: lowest ${((low - floor) * 100).toFixed(1)} cm`);
    assert(Math.abs(low - standing) < .005, `${f[0]}: the hem lifted`); }
});

test('posing nothing returns every joint and the body exactly to the built values', () => {
  for (const f of FAMILY) { const a = make(f), built = {};
    for (const [n, o] of Object.entries(a.joints)) built[n] = o.rotation.toArray().slice(0, 3);
    const body = a.body.position.toArray();
    restPose(a);
    for (const [n, o] of Object.entries(a.joints)) assert.deepEqual(o.rotation.toArray().slice(0, 3), built[n], `${f[0]} ${n}`);
    assert.deepEqual(a.body.position.toArray(), body); }
});
