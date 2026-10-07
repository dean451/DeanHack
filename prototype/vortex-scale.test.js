import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const width = name => {
  const a = createCreature({name, kind: 'monster'});
  a.g.updateMatrixWorld(true);
  const box = new THREE.Box3();
  a.body.traverse(o => { if (o.isMesh && !o.userData.outline) box.expandByObject(o); });
  return box.max.y;
};

test('energy, steam and fire vortices are taller than the dust vortex', () => {
  const dust = width('dust vortex');
  for (const name of ['energy vortex', 'steam vortex', 'fire vortex']) assert.ok(width(name) > dust * 1.1, `${name} is taller`);
});
