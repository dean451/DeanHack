import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('the wumpus looms over a rothe', () => {
  const size = name => { const a = createCreature({name, symbol: 113, color: 3}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g).max.y; };
  assert(size('wumpus') > size('rothe') * 0.7);
  assert(size('wumpus') > .6);
});

test('the wumpus has its left horn snapped short and adds no draws', () => {
  const w = createCreature({name: 'wumpus', symbol: 68, color: 1});
  let head = null, meshes = 0;
  w.g.traverse(o => { if (o.isMesh) meshes++; if (o.userData.part === 'eyes') head = o.parent; });
  // the horns are the only thing out past the ears and above the brow
  let left = -Infinity, right = -Infinity;
  for (const c of head.children) if (c.isMesh && c.userData.part !== 'eyes') {
    const p = c.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) < 0.2 || Math.abs(p.getX(i)) < 0.12) continue;
      if (p.getX(i) < 0) left = Math.max(left, p.getY(i)); else right = Math.max(right, p.getY(i));
    }
  }
  assert(right > 0.2, 'the right horn rises');
  assert(left < right - 0.03, 'the left horn is shorter');
  assert(meshes <= 12, 'still few draws: ' + meshes);
});
