import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const draws = a => { let n = 0; a.g.traverse(o => { if (o.isMesh) n++; }); return n; };

test('long worm tail segments carry a ridge of spines and stay a low hump', () => {
  const a = createCreature({name: 'long worm tail', symbol: 126, color: 3});
  assert(a.g.userData.spined);
  assert(draws(a) <= 30, `${draws(a)} draws`);
  a.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(a.g);
  assert(b.max.y < .55, `low (${b.max.y})`);
  assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < .85, 'fits its tile');
});
