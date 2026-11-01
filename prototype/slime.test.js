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

test('green slime: 12 to 14 meshes, glows, taller than the blue one, on its tile, with a victim in it', () => {
  const {g} = createSlime({kind: 'green'}), blue = createSlime({kind: 'blue'}).g;
  const ms = meshes(g), parts = ms.map(m => m.userData.part);
  assert.ok(ms.length >= 12 && ms.length <= 14, `${ms.length} meshes`);
  for (const p of ['skin', 'core', 'skull', 'hand', 'tendrils', 'hooks', 'drips', 'runners', 'slick']) assert.ok(parts.includes(p), p);
  const box = new THREE.Box3().setFromObject(g);
  assert.ok(box.min.y >= -1e-3 && box.min.y < .05, 'sits on the floor');
  assert.ok(box.max.x <= .5 && box.min.x >= -.5 && box.max.z <= .5 && box.min.z >= -.5, 'stays on its tile');
  assert.ok(box.max.y > new THREE.Box3().setFromObject(blue).max.y * 1.2, 'a tall mass, taller than the blue slime');
  assert.ok(ms.find(m => m.userData.part === 'core').material.emissiveIntensity > .5, 'lit from within');
  // the skull and hand are inside or on the skin, not floating away from the body
  const sk = new THREE.Box3().setFromObject(ms.find(m => m.userData.part === 'skull')), hd = new THREE.Box3().setFromObject(ms.find(m => m.userData.part === 'hand'));
  assert.ok(sk.min.y > 0 && sk.max.y < box.max.y && hd.max.y < box.max.y);
  assert.ok(Math.hypot(hd.max.x, hd.max.z) < .45);
});

test('green slime in the game keeps its scale and handles', () => {
  const a = createCreature({name: 'green slime'});
  assert.equal(a.g.scale.x, 1.25);
  assert.ok(a.body && meshes(a.g).some(m => m.userData.part === 'hand'));
});
