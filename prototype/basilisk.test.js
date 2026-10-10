import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const make = name => createCreature({name, symbol: 58, color: 2});

test('the basilisk is a larger, spined lizard with a burning gaze', () => {
  const b = make('basilisk'), l = make('lizard');
  assert(b.g.scale.x >= l.g.scale.x * 1.4);
  const lit = [], names = [];
  b.g.traverse(o => { if (o.isMesh) { names.push(o.userData.part); if (o.material.emissiveIntensity > 1) lit.push(o); } });
  assert(lit.length >= 2, 'both eyes burn');
  assert(names.includes('crest'), 'a ridge of black spines down the back');
  const plain = []; l.g.traverse(o => { if (o.isMesh) plain.push(o.userData.part); });
  assert(!plain.includes('crest'), 'an ordinary lizard has no spines');
});
