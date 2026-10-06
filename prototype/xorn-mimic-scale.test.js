import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const size = (name, symbol) => { const a = createCreature({name, symbol, color: 0}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g, true).getSize(new THREE.Vector3()); };

test('the giant mimic is a hulking mass beside the large mimic', () => {
  const giant = size('giant mimic', 109), large = size('large mimic', 109);
  assert(giant.x > large.x * 1.15 && giant.y > large.y * 1.15);
});

test('the xorn stands larger than its plain build', () => {
  const a = createCreature({name: 'xorn', symbol: 88, color: 0});
  assert.equal(a.g.scale.x, 1.25);
});

test('the large mimic stands larger than a plain build, below the giant mimic', () => {
  const scale = name => createCreature({name, symbol: 109, color: 0}).g.scale.x;
  assert(scale('large mimic') >= 1.25 - 1e-6);
  assert(scale('large mimic') > scale('small mimic') * 1.4);
  assert(scale('large mimic') < scale('giant mimic'));
});
