import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSlime} from './slime.js';
import {createCreature} from './creatures.js';

const meshes = g => { const out = []; g.traverse(o => { if (o.isMesh) out.push(o); }); return out; };

test('blue slime: at most 6 meshes, low, on its tile, no glow', () => {
  const {g} = createSlime({kind: 'blue'});
  assert.ok(meshes(g).length <= 6);
  const box = new THREE.Box3().setFromObject(g);
  assert.ok(box.min.y >= -1e-3 && box.min.y < .05, 'sits on the floor');
  assert.ok(box.max.x <= .5 && box.min.x >= -.5 && box.max.z <= .5 && box.min.z >= -.5, 'stays on its tile');
  assert.ok(box.max.y < .45);
  for (const m of meshes(g)) assert.ok(!m.material.emissive || m.material.emissive.getHex() === 0, 'cold, not luminous');
});

test('blue slime is taller than the blue jelly and has its own parts', () => {
  const slime = createCreature({name: 'blue slime'}), jelly = createCreature({name: 'blue jelly'});
  const parts = meshes(slime.g).map(m => m.userData.part);
  for (const p of ['skin', 'inside', 'crust', 'runners', 'mist']) assert.ok(parts.includes(p), p);
  const h = a => { a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g).max.y / a.g.scale.y; };
  assert.ok(h(slime) > h(jelly) * 1.1);
  assert.equal(slime.g.scale.x, 1.25);
});
