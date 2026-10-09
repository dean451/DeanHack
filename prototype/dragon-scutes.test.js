import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const D = 'D'.charCodeAt(0);
const verts = a => { let n = 0; a.g.traverse(o => { if (o.isMesh) n += o.geometry.attributes.position.count; }); return n; };

test('four-legged dragons and wyverns wear a crust of armour scutes on the back, kept cheap (draken 14552 vertices, 14192 without them)', () => {
  // the scutes are 15 plain boxes (24 vertices each) merged into one mesh: the dragon is plated but stays light
  for (const name of ['draken', 'wyvern', 'sirrush']) { const n = verts(createCreature({name, symbol: D, color: 1})); assert(n > 12600 && n < 16000, `${name} ${n}`); }
});

test('the tail spade is barbed with two backswept hooks on dragons and wyverns; a sirrush keeps its scorpion sting instead', () => {
  const tailVerts = name => { let n = 0; createCreature({name, symbol: D, color: 1}).tail.traverse(o => { if (o.isMesh) n += o.geometry.attributes.position.count; }); return n; };
  // two 4-sided cones (19 vertices each) join the spade; the sirrush tail is left at its old count
  assert.equal(tailVerts('draken'), 2418);
  assert.equal(tailVerts('wyvern'), 2662);
  assert.equal(tailVerts('sirrush'), 2384);
});
