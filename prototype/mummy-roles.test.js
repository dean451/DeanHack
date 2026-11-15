import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {MUMMIES} from './mummy.js';
import {rolesOf} from './body-roles.js';
import {solvePose, goal} from './feline-pose.js';

// Stage 3 of the creature plan for the mummies (family M): `createMummy` rigs them on the humanoids' joints (three-bone
// limbs, `spine0`, `spine1`, `neck0`..`neck3`, no tail), so `rolesOf` maps them through `humanoidRoles`, with the face
// named by the builder (`actor.face`: the bared tooth row under the eye slit); this checks the map holds on every mummy.
const NAMES = [...Object.keys(MUMMIES), 'unknown M'];
const make = name => { const a = createCreature({name, symbol: 77, color: 7}); a.g.updateMatrixWorld(true); return a; };
const BODY = ['head', 'mouth', 'chin', 'withers', 'rump', 'paw:lf', 'paw:rf', 'paw:lh', 'paw:rh', 'hip:l', 'hip:r', 'shoulder:l', 'shoulder:r'];
const hideOf = a => { let h; a.g.traverse(o => { if (o.isSkinnedMesh) h = o; }); return h; };
// the world box of the hide's vertices carried mostly by one bone
const boxOn = (a, bone) => {
  const h = hideOf(a), k = h.skeleton.bones.indexOf(bone), si = h.geometry.attributes.skinIndex, sw = h.geometry.attributes.skinWeight;
  const box = new THREE.Box3(), v = new THREE.Vector3();
  for (let i = 0; i < si.count; i++) {
    let w = 0; for (let c = 0; c < 4; c++) if (si.getComponent(i, c) === k) w += sw.getComponent(i, c);
    if (w > .5) box.expandByPoint(h.getVertexPosition(i, v).applyMatrix4(h.matrixWorld));
  }
  return box;
};

test('every role resolves to a finite world point on every mummy; there is no tail', () => {
  for (const name of NAMES) {
    const P = rolesOf(make(name));
    for (const r of BODY) assert(P[r]().toArray().every(Number.isFinite), `${name}: ${r}`);
    assert.throws(() => P.tailtip, /no role/, `${name}: no tail`);
  }
});

test('the roles sit where their names say: left on -x, the face forward, the head above the rump', () => {
  for (const name of NAMES) {
    const P = rolesOf(make(name)), at = r => P[r]();
    assert(at('paw:lh').x < 0 && at('paw:rh').x > 0 && at('paw:lf').x < 0 && at('paw:rf').x > 0, `${name}: sides`);
    assert(at('shoulder:l').x < 0 && at('hip:r').x > 0, `${name}: shoulders and hips`);
    assert(at('mouth').z > at('head').z, `${name}: mouth forward of the head pivot`);
    assert(at('chin').y < at('mouth').y && at('mouth').y < at('head').y, `${name}: mouth under the pivot, chin under the mouth`);
    assert(at('chin').y > at('shoulder:l').y, `${name}: chin above the shoulders`);
    assert(at('withers').y > at('rump').y && at('shoulder:l').y > at('hip:l').y, `${name}: neck above the pelvis`);
  }
});

test('the feet stand on the floor within 1 cm at rest, and the hands are on the reaching wrapped hands', () => {
  for (const name of NAMES) {
    const a = make(name), P = rolesOf(a), floor = a.g.position.y, j = a.joints;
    for (const side of ['l', 'r']) {
      const sole = P[`paw:${side}h`](), foot = boxOn(a, j[`${side}leg1_2`]);
      assert(Math.abs(sole.y - floor) < .01, `${name} ${side} sole at ${sole.y - floor}`);
      assert(Math.abs(foot.min.y - floor) < .01, `${name} ${side} foot's underside ${(foot.min.y - floor).toFixed(3)} off the floor`);
      assert(foot.distanceToPoint(sole) < .01, `${name} ${side} sole under the bound foot`);
      const hand = P[`paw:${side}f`]();
      assert(boxOn(a, j[`${side}fore_2`]).containsPoint(hand), `${name} ${side} hand inside the wrapped hand`);
      assert(hand.z > P[`shoulder:${side}`]().z + .2 * a.g.scale.y, `${name} ${side} hand reaching out ahead`);
    }
  }
});

test('the mouth is at the bared tooth row under the eye slit, crowned or not; the chin on the jaw under it', () => {
  for (const name of NAMES) {
    const a = make(name), P = rolesOf(a), s = a.g.scale.y;
    for (const head of a.heads) assert(head.parent === a.joints.neck3, `${name}: every head on the neck`);
    const head = a.joints.head, local = p => head.worldToLocal(p.clone());
    const m = local(P.mouth()), c = local(P.chin());
    // the eyes sit at the head's y 0, the tooth row (three bared teeth over the left jaw) at y -.098, z .1
    assert(m.y < -.06 && m.y > -.11, `${name}: mouth ${m.y.toFixed(3)} at the tooth row, not up at the eye slit`);
    assert(Math.abs(m.z - .1) < .02, `${name}: mouth on the face's front (${m.z.toFixed(3)})`);
    assert(c.y < m.y - .02 && c.y > -.13 && c.z > .06, `${name}: chin on the jaw's front under the mouth`);
    assert(new THREE.Box3().setFromObject(head).containsPoint(P.mouth()), `${name}: mouth inside the head`);
    assert(P.mouth().distanceTo(P.head()) < .15 * s, `${name}: mouth near the head pivot`);
  }
});

test('a paw follows its bent limb; another stays', () => {
  for (const name of NAMES) {
    const a = make(name), P = rolesOf(a), foot = P['paw:lh'](), hand = P['paw:rf'](), other = P['paw:rh']();
    a.joints.lleg1_1.rotation.x = .8; a.joints.rfore_1.rotation.x = -.8; a.g.updateMatrixWorld(true);
    assert(P['paw:lh']().distanceTo(foot) > .05, `${name}: the foot swung`);
    assert(P['paw:rf']().distanceTo(hand) > .05, `${name}: the hand swung`);
    assert(P['paw:rh']().distanceTo(other) < 1e-9, `${name}: another foot stayed`);
  }
});

test('a goal written on roles solves: a hand reaches a point lifted and forward, and the mouth to a point the neck can swing it to, under 2 cm', () => {
  for (const name of NAMES) {
    const a = make(name), j = a.joints, P = rolesOf(a), keys = ['x', 'y', 'z'];
    const run = (names, role, euler, pivotJoint) => {
      const apply = pose => { for (const n of names) for (const ax of keys) j[n].rotation[ax] = pose[n]?.[ax] || 0; a.g.updateMatrixWorld(true); };
      const joints = {}; for (const n of names) for (const ax of keys) joints[`${n}.${ax}`] = [-1.4, 1.4];
      const pivot = new THREE.Vector3().setFromMatrixPosition(pivotJoint.matrixWorld), target = P[role]().sub(pivot).applyEuler(euler).add(pivot);
      solvePose({joints, goals: [goal.reach(role, target, {within: 0})], apply, points: P, rest: 0, iterations: 300});
      const cm = P[role]().distanceTo(target) * 100; assert(cm < 2, `${name}: ${role} ${cm.toFixed(2)} cm from the point`);
      apply({});
    };
    run(['rfore_0', 'rfore_1', 'rfore_2'], 'paw:rf', new THREE.Euler(-.7, 0, .2), j.rfore_0);
    run(['neck1', 'neck2'], 'mouth', new THREE.Euler(.4, -.3, 0), j.neck1);
  }
});
