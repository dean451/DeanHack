import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('the hezrou carries old flank scars and still fits its tile and the floor', () => {
  const c = createCreature({name: 'hezrou', symbol: 38, color: 2});
  c.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(c.g, true);
  assert(b.min.y > -0.05, 'stands on the floor');
  assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.6, 'fits its tile');
  let tris = 0;
  c.g.traverse(o => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
  assert(tris > 11570, 'carries the scars and the snapped spine');
});
