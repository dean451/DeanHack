import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('the warhorse carries a broken arrow in its right flank only, and still fits', () => {
  const w = createCreature({name: 'warhorse', symbol: 117, color: 3});
  w.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(w.body.children.find(o => o.userData.part === 'body'));
  const s = w.g.scale.x;
  assert(b.max.x > 0.36 * s, `arrow juts out on the right (${b.max.x})`);
  assert(-b.min.x < 0.3 * s, 'left flank is clear');
  let draws = 0; w.g.traverse(o => { if (o.isMesh) draws++; });
  assert(draws <= 16);
});
