import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const draws = a => { let n = 0; a.g.traverse(o => { if (o.isMesh) n++; }); return n; };

test('the rock mole has a scarred snout and two ember eyes', () => {
  const a = createCreature({name: 'rock mole', symbol: 114, color: 7});
  assert(a.g.userData.scarred, 'snout scar');
  let glow = 0;
  a.g.traverse(o => { if (o.isMesh && o.material.name === 'mole-eyes') glow++; });
  assert.equal(glow, 2);
  assert(draws(a) <= 40, `${draws(a)} draws`);
  a.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(a.g);
  assert(Math.abs(b.min.y) < .05, `on the floor (${b.min.y})`);
});
