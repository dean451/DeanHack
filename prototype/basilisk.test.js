import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const make = name => createCreature({name, symbol: 58, color: 2});

test('the basilisk is a larger, spined lizard with a burning gaze', () => {
  const b = make('basilisk'), l = make('lizard');
  assert(b.g.scale.x >= l.g.scale.x * 1.4);
  let lit = 0, meshes = 0, plain = 0;
  b.g.traverse(o => { if (o.isMesh) { meshes++; if (o.material.emissiveIntensity > 1) lit++; } });
  l.g.traverse(o => { if (o.isMesh) plain++; });
  assert(lit >= 2, 'both eyes burn');
  assert(meshes >= plain + 7, 'spine ridge and eyes add parts');
});
