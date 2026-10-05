import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const T = 'T'.charCodeAt(0);
const make = name => createCreature({name, symbol: T, color: 1});
const meshCount = a => { let n = 0; a.g.updateMatrixWorld(true); a.g.traverse(p => { if (p.isMesh) { n++; for (const v of p.geometry.attributes.position.array) assert(Number.isFinite(v), name(a)); } }); return n; };
const name = a => a.g.name;

test('olog-hai wear a horned black iron helm; other trolls go bare-headed', () => {
  assert.equal(make('olog-hai').g.userData.helmed, true);
  for (const n of ['troll', 'ice troll', 'rock troll', 'water troll']) assert(!make(n).g.userData.helmed, n);
  assert(meshCount(make('olog-hai')) <= 30);
});
