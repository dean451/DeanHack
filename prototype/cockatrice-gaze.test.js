import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const eyes = name => {
  const c = createCreature({name, symbol: 99, color: 11});
  const found = [];
  c.g.traverse(o => { if (o.isMesh && o.material.emissive && o.material.emissive.getHex() === 0xa8c820) found.push(o); });
  return found;
};

test('cockatrice and chickatrice stare with two self-lit sickly eyes', () => {
  for (const name of ['cockatrice', 'chickatrice']) assert.equal(eyes(name).length, 2, `${name} eyes`);
});

test('the pyrolisk keeps its coal eyes, not the stone gaze', () => {
  assert.equal(eyes('pyrolisk').length, 0);
});
