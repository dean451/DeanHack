import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const meshes = g => { let n = 0; g.traverse(o => { if(o.isMesh) n++; }); return n; };
const make = name => createCreature({name, symbol: 64, color: 7});

test('quest leaders without their own model wear a mantle, spiked pauldrons and a circlet', () => {
  const plain = meshes(make('human').g);
  for(const n of ['king arthur', 'lord sato', 'grand master', 'master of thieves', 'orion', 'shaman karnov', 'twoflower', 'schliemann']){
    assert(meshes(make(n).g) >= plain + 14, n);
  }
});

test('the regalia stays under the per-model mesh budget', () => {
  assert(meshes(make('king arthur').g) < 70);
});
