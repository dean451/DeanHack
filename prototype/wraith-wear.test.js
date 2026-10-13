import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const meshes = name => {
  let n = 0;
  createCreature({name, symbol: 87, color: 1}).g.traverse(o => { if (o.isMesh) n++; });
  return n;
};

test('a barrow wight blade is chipped bright where the rust flaked off', () => {
  let bright = 0;
  createCreature({name: 'barrow wight', symbol: 87, color: 1}).g.traverse(o => {
    if (o.isMesh && o.material.color && o.material.color.getHexString() === 'b8b4a4') bright++;
  });
  assert(bright >= 1);
});

test('a plain wraith hangs three torn shreds from its cowl', () => {
  const kids = name => createCreature({name, symbol: 87, color: 1}).head.children.length;
  // hood shell, rim, void and eyes make four children; the shreds are the extra three
  assert.equal(kids('wraith'), 7);
});

test('barrow wights wear grave earth and a burial rag; wraiths and Nazgul do not', () => {
  const make = n => createCreature({name: n, symbol: 87, color: 1});
  assert.equal(make('barrow wight').g.userData.graveEarth, true);
  for (const n of ['wraith', 'Nazgul']) assert(!make(n).g.userData.graveEarth, n);
  assert(meshes('barrow wight') - meshes('wraith') < 60);
});
