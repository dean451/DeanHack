import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const make = name => createCreature({name, kind: 'monster'});
const draws = a => { let n = 0; a.g.traverse(o => { if (o.isMesh) n++; }); return n; };

test('the energy vortex throws forks of lightning out of its spiral; the others do not', () => {
  assert.equal(make('energy vortex').g.userData.arcs, 5);
  for (const name of ['dust vortex', 'ice vortex', 'steam vortex', 'fire vortex']) assert.equal(make(name).g.userData.arcs, undefined, name);
});

test('the fire vortex scatters embers on the scorched ground; the others do not', () => {
  assert.equal(make('fire vortex').g.userData.embers, 6);
  for (const name of ['dust vortex', 'ice vortex', 'steam vortex', 'energy vortex']) assert.equal(make(name).g.userData.embers, undefined, name);
});

test('the extra detail stays within a small draw budget', () => {
  assert(draws(make('energy vortex')) <= 40, `${draws(make('energy vortex'))}`);
  assert(draws(make('fire vortex')) <= 30, `${draws(make('fire vortex'))}`);
});
