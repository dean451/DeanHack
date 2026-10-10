import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createBrowse} from './baluchitherium.js';

test('the baluchitherium towers: its own model, taller than the titanothere, sloping back, on the floor', () => {
  const b = createCreature({name: 'baluchitherium', symbol: 113, color: 7}), t = createCreature({name: 'titanothere', symbol: 113, color: 7});
  assert.equal(b.g.name, 'baluchitherium');
  for (const k of ['head', 'neck', 'lip', 'jaw', 'tail']) assert(b[k], k);
  assert.equal(b.legs.length, 4);
  let draws = 0;
  b.g.traverse(o => { if (o.isMesh) { draws++; for (const v of o.geometry.attributes.position.array) assert(Number.isFinite(v)); } });
  assert(draws <= 14, `${draws} draws`);
  const box = g => { g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(g); };
  const bb = box(b.g), tb = box(t.g);
  assert(Math.abs(bb.min.y) < .01, `on the floor (${bb.min.y})`);
  assert(bb.max.y > tb.max.y * 1.4, 'towers over the titanothere');
  const [frontL, hindL] = b.legs;
  assert(frontL.position.y > hindL.position.y, 'front legs longer: the back slopes down');
});

test('it browses: the neck stretches up, the lip grasps and the jaw chews, then it settles', () => {
  const g = () => new THREE.Group(), parts = {neck: g(), lip: g(), jaw: g(), ears: [g(), g()]}, br = createBrowse(parts, {seed: 2});
  let up = 0, curl = 0, chew = 0;
  for (let i = 0; i < 60 * 40; i++) { const p = br.update(1 / 60); up = Math.max(up, p.up); curl = Math.max(curl, p.curl); chew = Math.max(chew, p.chew); }
  assert(up > .3 && curl > .4 && chew > .1);
  assert(Number.isFinite(parts.neck.rotation.x) && Number.isFinite(parts.ears[0].rotation.y));
});
