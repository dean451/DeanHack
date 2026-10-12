import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const scale = name => createCreature({name, symbol: 'E'.charCodeAt(0), color: 7}).g.scale.y;

test('elementals loom over a man, the earth elemental most of all', () => {
  for (const name of ['air elemental', 'fire elemental', 'water elemental']) assert(scale(name) >= 1.3, name);
  assert(scale('earth elemental') >= 1.5);
  assert(scale('stalker') >= 1.2);
});

test('gargoyles are hulking, the winged one larger still', () => {
  const g = createCreature({name: 'gargoyle', symbol: 'g'.charCodeAt(0), color: 7}).g.scale.y;
  const w = createCreature({name: 'winged gargoyle', symbol: 'g'.charCodeAt(0), color: 7}).g.scale.y;
  assert(g >= 1.1 && w >= 1.3 && w > g);
});

test('the earth elemental has a glowing fissure split across its chest and still fits its tile', async () => {
  const THREE = await import('three');
  const e = createCreature({name: 'earth elemental', symbol: 'E'.charCodeAt(0), color: 3});
  assert(e.g.userData.cracked);
  e.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(e.g, true);
  assert(b.min.y > -0.05, 'stands on the floor');
  assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.5, 'fits its tile');
});

test('the water elemental carries a drowned skull in its chest and still fits its tile', async () => {
  const THREE = await import('three');
  const e = createCreature({name: 'water elemental', symbol: 'E'.charCodeAt(0), color: 4});
  assert(e.g.userData.drowned);
  e.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(e.g, true);
  assert(b.min.y > -0.05, 'stands on the floor');
  assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.5, 'fits its tile');
});

test('the fire elemental is crusted with black clinker and still fits its tile', async () => {
  const THREE = await import('three');
  const e = createCreature({name: 'fire elemental', symbol: 'E'.charCodeAt(0), color: 1});
  assert(e.g.userData.clinkered);
  e.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(e.g, true);
  assert(b.min.y > -0.05, 'stands on the floor');
  assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.5, 'fits its tile');
});
