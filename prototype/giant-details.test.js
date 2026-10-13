import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const make = n => createCreature({name: n, symbol: 72, color: 1});
const fits = c => {
  c.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(c.g, true);
  return b.min.y > -0.05 && Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.8;
};

test('frost giants have blackened frostbitten fingertips; other giants do not', () => {
  const c = make('frost giant');
  assert.equal(c.g.userData.frostbitten, true);
  for (const n of ['giant', 'fire giant', 'stone giant', 'storm giant']) assert(!make(n).g.userData.frostbitten, n);
  assert(fits(c));
});

test('fire giants wear a black iron belt with a glowing buckle; other giants do not', () => {
  const c = make('fire giant');
  assert.equal(c.g.userData.buckled, true);
  for (const n of ['giant', 'frost giant', 'lord surtur', 'hill giant']) assert(!make(n).g.userData.buckled, n);
  assert(fits(c));
});
