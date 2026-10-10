import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('the floating eye is a bloodshot, wet eyeball with lids, an iris and trailing nerves, in few draws', () => {
  const e = createCreature({name: 'floating eye', symbol: 101, color: 4});
  assert.equal(e.quirk, 'hover');
  assert.ok(e.head && e.pupil, 'glance.js rolls `head` and the pupil dilates');
  const parts = []; e.g.traverse(o => { if (o.isMesh) parts.push(o.userData.part); });
  for (const need of ['ball', 'iris', 'pupil', 'flesh']) assert(parts.includes(need), need);
  assert(parts.length <= 6, `${parts.length} draws`);
  const ball = e.g.getObjectByName ? null : null; void ball;
  let verts = 0; e.g.traverse(o => { if (o.isMesh) verts += o.geometry.attributes.position.count; });
  assert(verts > 3000, 'veins and nerves are real geometry');
  const b = new THREE.Box3().setFromObject(e.g), size = b.getSize(new THREE.Vector3());
  assert(Number.isFinite(size.x) && size.x < 1 && size.y < 1.1 && size.z < 1, JSON.stringify(size));
});
