import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('the titan wears a war-crown of tarnished spikes and iron shoulder spikes, and still fits its tile', () => {
  const titan = createCreature({name: 'titan', symbol: 72, color: 5}), giant = createCreature({name: 'giant', symbol: 72, color: 5});
  assert(titan.g.userData.warCrowned, 'spiked crown');
  assert(!giant.g.userData.warCrowned, 'plain giants stay plain');
  titan.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(titan.g, true);
  assert(b.min.y > -0.05 && Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.6);
});
