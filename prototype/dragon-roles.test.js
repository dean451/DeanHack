import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {rolesOf} from './body-roles.js';
import {solvePose, goal} from './feline-pose.js';

const make = name => createCreature({name, symbol: 68});
const FORMS = ['draken', 'wyvern', 'sirrush', 'leviathan', 'lindworm', 'tatzelworm', 'amphitere', 'guivre', 'sarkany', 'baby draken', 'shimmering dragon'];
const COMMON = ['head', 'mouth', 'chin', 'withers', 'rump', 'tailtip'];

test('every role a form has resolves to a finite world point', () => {
  for (const name of FORMS) {
    const a = make(name); a.g.updateMatrixWorld(true);
    const P = rolesOf(a), want = [...COMMON];
    for (const l of a.legs) { const s = l.name[0], f = /fore/.test(l.name); want.push(`paw:${s}${f ? 'f' : 'h'}`, `${f ? 'shoulder' : 'hip'}:${s}`); }
    for (const w of a.wings) { const s = w.userData.side < 0 ? 'l' : 'r'; want.push(`wingtip:${s}`, `wingwrist:${s}`); }
    for (const r of want) assert(P[r]().toArray().every(Number.isFinite), `${name}: ${r}`);
    for (const r of ['paw:lf', 'paw:rf', 'paw:lh', 'paw:rh', 'wingtip:l']) if (!want.includes(r)) assert.throws(() => P[r], /no role/, `${name}: no ${r}`);
  }
});

test('the roles sit where their names say, left on -x', () => {
  const a = make('draken'); a.g.updateMatrixWorld(true);
  const P = rolesOf(a), at = r => P[r]();
  assert(at('paw:lf').x < 0 && at('paw:rf').x > 0 && at('wingtip:l').x < 0 && at('wingtip:r').x > 0);
  assert(at('paw:lf').z > at('paw:lh').z, 'fore paws ahead of the hind');
  assert(at('mouth').z > at('rump').z && at('tailtip').z < at('rump').z, 'mouth forward of the rump, tail tip behind it');
  assert(at('mouth').y < at('head').y + .2 && at('chin').y < at('mouth').y, 'the chin is under the mouth');
  assert(at('wingtip:l').distanceTo(at('withers')) > at('wingwrist:l').distanceTo(at('withers')), 'the tip is past the wrist');
});

test('the paws stand on the floor within 1 cm at rest', () => {
  for (const name of ['draken', 'wyvern', 'sirrush', 'lindworm', 'sarkany', 'baby draken']) {
    const a = make(name); a.g.updateMatrixWorld(true);
    const P = rolesOf(a), floor = a.g.position.y;
    for (const r of ['paw:lf', 'paw:rf', 'paw:lh', 'paw:rh']) { let p; try { p = P[r](); } catch { continue; } assert(Math.abs(p.y - floor) < .01, `${name} ${r} at ${p.y - floor}`); }
  }
});

test('a goal written on roles solves on a draken through its neck joints: mouth to the right forepaw under 2 cm', () => {
  const a = make('draken'), j = a.joints, P = rolesOf(a), keys = ['neck0', 'neck1', 'neck2', 'neck3', 'neck4', 'neck5'];
  const apply = pose => { for (const k of keys) { for (const ax of 'xyz') j[k].rotation[ax] = pose[k]?.[ax] || 0; } a.g.updateMatrixWorld(true); };
  const joints = {}; for (const k of keys) { joints[k + '.x'] = [-1.4, 1.4]; joints[k + '.y'] = [-1.4, 1.4]; joints[k + '.z'] = [-1.4, 1.4]; }
  a.g.updateMatrixWorld(true);
  const r = solvePose({joints, goals: [goal.reach('mouth', 'paw:rf', {within: 0})], apply, points: P, rest: 0, iterations: 200});
  const cm = P.mouth().distanceTo(P['paw:rf']()) * 100;
  assert(cm < 2, `mouth ${cm.toFixed(2)} cm from the paw (cost ${r.cost})`);
});

test('the mouth sits at the front of the face on a long-jawed dragon and on the tatzelworm\'s short cat face', () => {
  for (const name of ['draken', 'tatzelworm']) {
    const a = make(name); a.g.updateMatrixWorld(true);
    const P = rolesOf(a), head = a.joints.head, local = head.worldToLocal(P.mouth());
    // the face's front at the mouth's height, from the head's own meshes
    let front = -Infinity; head.traverse(o => { if (!o.isMesh) return; o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().copy(head.matrixWorld).invert().multiply(o.matrixWorld)); if (local.y > b.min.y && local.y < b.max.y && Math.abs(b.getCenter(new THREE.Vector3()).x) < .03) front = Math.max(front, b.max.z); });
    assert(Math.abs(front - local.z) < .04, `${name}: mouth ${local.z.toFixed(3)} against the face's front ${front.toFixed(3)}`);
  }
});
