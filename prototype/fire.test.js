import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFire} from './fire.js';
import {instanceable} from './tile-instances.js';

test('a fire is a shader card and one instanced draw of drifting embers, nothing the tile instancer would take', () => {
  const fire = createFire(3);
  const meshes = []; fire.traverse(o => { if (o.isMesh) meshes.push(o); });
  assert.equal(meshes.length, 2, 'the flame card and the embers');
  const embers = fire.getObjectByName('embers');
  assert.ok(embers?.isInstancedMesh && embers.count === 8);
  assert.ok(meshes.every(m => !instanceable(m)), 'a plain mesh here would be swept into the level instances and freeze between engine frames');
  const before = Array.from(embers.instanceMatrix.array);
  fire.userData.updateFire(.4);
  const mid = Array.from(embers.instanceMatrix.array);
  fire.userData.updateFire(.9);
  const after = Array.from(embers.instanceMatrix.array);
  assert.notDeepEqual(mid, before); assert.notDeepEqual(after, mid);
  assert.ok(embers.instanceMatrix.needsUpdate || embers.instanceMatrix.version > 0);
  for (let i = 0; i < 8; i++) { const m = new THREE.Matrix4(); embers.getMatrixAt(i, m); const p = new THREE.Vector3().setFromMatrixPosition(m); assert.ok(p.y >= .14 && p.y <= .8 && Math.hypot(p.x, p.z) < .2, `ember ${i} rises from the flame`); }
  fire.userData.dispose();
});
