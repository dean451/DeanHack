import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {rolesOf} from './body-roles.js';
import {solvePose, goal} from './feline-pose.js';

const FAMILY = [['imp', 1], ['uranium imp', 2], ['homunculus', 2], ['quasit', 9], ['tengu', 6], ['lemure', 3]];
const WINGED = new Set(['imp', 'uranium imp', 'homunculus', 'tengu']), TAILLESS = new Set(['tengu', 'lemure']);
const make = ([name, color]) => { const a = createCreature({name, symbol: 'i'.charCodeAt(0), color}); a.g.updateMatrixWorld(true); return a; };
const BODY = ['head', 'mouth', 'chin', 'withers', 'rump', 'paw:lf', 'paw:rf', 'paw:lh', 'paw:rh', 'hip:l', 'hip:r', 'shoulder:l', 'shoulder:r'];
const WINGS = ['wingtip:l', 'wingtip:r', 'wingwrist:l', 'wingwrist:r'];

test('every role resolves to a finite world point on every imp; wings and tail only where the body has them', () => {
  for (const f of FAMILY) {
    const P = rolesOf(make(f)), name = f[0];
    for (const r of BODY) assert(P[r]().toArray().every(Number.isFinite), `${name}: ${r}`);
    for (const r of WINGS) {
      if (WINGED.has(name)) assert(P[r]().toArray().every(Number.isFinite), `${name}: ${r}`);
      else assert.throws(() => P[r], /no role/, `${name}: ${r}`);
    }
    if (TAILLESS.has(name)) assert.throws(() => P.tailtip, /no role/, `${name}: tailtip`);
    else assert(P.tailtip().toArray().every(Number.isFinite), `${name}: tailtip`);
  }
});

test('the roles sit where their names say: left on -x, the face forward, the tail behind, wing tips outside the wrists', () => {
  for (const f of FAMILY) {
    const P = rolesOf(make(f)), at = r => P[r](), name = f[0];
    assert(at('paw:lf').x < 0 && at('paw:rf').x > 0 && at('paw:lh').x < 0 && at('paw:rh').x > 0, `${name}: sides`);
    assert(at('shoulder:l').x < 0 && at('hip:r').x > 0, `${name}: shoulders and hips`);
    assert(at('mouth').z > at('head').z, `${name}: mouth forward of the head pivot`);
    assert(at('chin').y < at('mouth').y, `${name}: chin under the mouth`);
    assert(at('withers').y > at('rump').y, `${name}: withers above the rump`);
    if (!TAILLESS.has(name)) assert(at('tailtip').z < at('rump').z, `${name}: tail behind`);
    if (WINGED.has(name)) {
      assert(at('wingtip:l').x < at('wingwrist:l').x && at('wingtip:r').x > at('wingwrist:r').x, `${name}: tips outside the wrists`);
      assert(at('wingtip:l').x < 0 && at('wingtip:r').x > 0, `${name}: wing sides`);
    }
  }
});

test('the feet stand on the floor within 1 cm at rest', () => {
  for (const f of FAMILY) {
    const a = make(f), P = rolesOf(a), floor = a.g.position.y;
    for (const r of ['paw:lh', 'paw:rh']) assert(Math.abs(P[r]().y - floor) < .01, `${f[0]} ${r} at ${P[r]().y - floor}`);
  }
});

test('a paw follows its bent leg and arm; another stays', () => {
  for (const f of FAMILY) {
    const a = make(f), P = rolesOf(a), hind = P['paw:lh'](), fore = P['paw:rf'](), other = P['paw:rh']();
    a.joints.lleg1_0.rotation.x = .8; a.joints.rfore_0.rotation.x = -.6; a.g.updateMatrixWorld(true);
    assert(P['paw:lh']().distanceTo(hind) > .02, `${f[0]}: the hind paw swung`);
    assert(P['paw:rf']().distanceTo(fore) > .02, `${f[0]}: the forepaw swung`);
    assert(P['paw:rh']().distanceTo(other) < 1e-9, `${f[0]}: another paw stayed`);
  }
});

test('a goal written on roles solves through the neck: the mouth reaches a point it can swing to, under 2 cm', () => {
  for (const f of FAMILY) {
    const a = make(f), j = a.joints, P = rolesOf(a), keys = ['x', 'y', 'z'];
    const apply = pose => { for (const n of ['neck1', 'neck2']) for (const ax of keys) j[n].rotation[ax] = pose[n]?.[ax] || 0; a.g.updateMatrixWorld(true); };
    const joints = {}; for (const n of ['neck1', 'neck2']) for (const ax of keys) joints[`${n}.${ax}`] = [-1, 1];
    const pivot = new THREE.Vector3().setFromMatrixPosition(j.neck1.matrixWorld), target = P.mouth().sub(pivot).applyEuler(new THREE.Euler(.4, -.3, 0)).add(pivot);
    solvePose({joints, goals: [goal.reach('mouth', target, {within: 0})], apply, points: P, rest: 0, iterations: 200});
    const cm = P.mouth().distanceTo(target) * 100;
    assert(cm < 2, `${f[0]}: mouth ${cm.toFixed(2)} cm from the point`);
  }
});
