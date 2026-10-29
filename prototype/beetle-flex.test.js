import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import * as F from './beetle-flex.js';
import {updateBeetleGnash} from './beetle-gnash.js';

const dt = 1 / 60;
const beetle = () => createCreature({name: 'giant beetle', symbol: 'a'.charCodeAt(0), color: 0});
const rest = a => [...a.elytra, ...a.hindwings].map(o => o.rotation.toArray().slice(0, 3));

test('the wing cases are hinged at the shoulders and the flying wings lie folded and hidden under them', () => {
  const a = beetle();
  assert.ok(F.flexes(a));
  assert.equal(a.wings.length, 0, 'not `wings`: the idle flap would swing them');
  for (const n of ['lelytron', 'relytron', 'lhindwing', 'rhindwing']) assert.ok(a.joints[n], n);
  assert.ok(a.hindwings.every(w => !w.visible), 'hidden while folded');
  assert.ok(a.elytra.every(c => c.children.some(m => m.isMesh && m.userData.part === 'elytron')));
});

test('a still beetle now and then lifts and parts its cases, spreads and buzzes its wings, then folds them back exactly', () => {
  const a = beetle(), r = rest(a);
  let t = 0, maxLift = 0, maxSpread = 0, buzzes = new Set(), shown = false, flexed = 0, was = false;
  for (let i = 0; i < 60 * 90; i++) {
    t += dt; const p = F.updateBeetleFlex(a, dt, t, false);
    if (p) { maxLift = Math.max(maxLift, p.lift); maxSpread = Math.max(maxSpread, p.spread); if (Math.abs(p.buzz) > .1) buzzes.add(Math.sign(p.buzz)); }
    if (a.hindwings.some(w => w.visible)) shown = true;
    if (p && !was) flexed++; was = !!p;
    for (const o of [...a.elytra, ...a.hindwings]) assert.ok(o.rotation.toArray().slice(0, 3).every(Number.isFinite));
  }
  assert.ok(flexed >= 2, `flexed ${flexed} times in 90 s`);
  assert.ok(maxLift > F.LIFT * .9 && maxSpread > F.SPREAD * .9, `lift ${maxLift} spread ${maxSpread}`);
  assert.equal(buzzes.size, 2, 'the wings buzz both ways');
  assert.ok(shown, 'the wings show while out');
  // walking folds it away and puts every part back exactly
  for (let i = 0; i < 60; i++) { t += dt; F.updateBeetleFlex(a, dt, t, true); }
  rest(a).forEach((v, k) => v.forEach((x, j) => assert.ok(Math.abs(x - r[k][j]) < 1e-9, `part ${k} axis ${j}: ${x} vs ${r[k][j]}`)));
  assert.ok(a.hindwings.every(w => !w.visible));
});

test('it never starts while the beetle gnashes, and the open cases stay on the tile', () => {
  const a = beetle();
  let t = 0, both = 0;
  for (let i = 0; i < 60 * 120; i++) {
    t += dt; const g = updateBeetleGnash(a, dt, t, false), f = F.updateBeetleFlex(a, dt, t, false);
    if (g && f && a.beetleFlex.cur?.u < .02) both++;
  }
  assert.equal(both, 0);
  const b = beetle(); b.elytra.forEach(c => { c.rotation.x += F.LIFT; c.rotation.y -= c.userData.side * F.PART; });
  b.hindwings.forEach(w => { w.visible = true; w.rotation.y -= w.userData.side * F.SPREAD * Math.PI / 2; });
  b.g.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(b.g);
  assert.ok(Math.max(-box.min.x, box.max.x, -box.min.z, box.max.z) < .6, `open, it still fits: ${JSON.stringify(box)}`);
});
