import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const height = name => { const a = createCreature({name, symbol: 68, color: 3}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g).max.y; };

test('the draken and the sarkany loom larger than a fresh dragon body plan', () => {
  const adultScale = name => createCreature({name, symbol: 68, color: 3}).g.scale.x;
  assert(adultScale('draken') >= 1.1 * 1.05 - 1e-6);
  assert(adultScale('sarkany') >= 1.1 * 1.05 - 1e-6);
  for (const name of ['draken', 'sarkany']) assert(height(name) > height('baby ' + name) * 1.4, name);
});

test('the mail daemon stands larger than an imp-sized demon', () => {
  const size = name => { const a = createCreature({name, symbol: 105, color: 4}); a.g.updateMatrixWorld(true); return a.g.scale.x; };
  assert(size('mail daemon') >= 1.2);
});

test('the wyvern and the sirrush stand larger than a fresh dragon body plan', () => {
  const adultScale = name => createCreature({name, symbol: 68, color: 3}).g.scale.x;
  assert(adultScale('wyvern') >= 1.1 - 1e-6);
  assert(adultScale('sirrush') >= 1.1 - 1e-6);
  for (const name of ['wyvern', 'sirrush']) assert(height(name) > height('baby ' + name) * 1.4, name);
});
