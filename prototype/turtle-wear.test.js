import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {rgb} from './homunculus.js';

test('the giant turtle\'s carapace is split by an old black fracture', () => {
  const crack = rgb('#0a0806');
  const t = createCreature({name: 'giant turtle', symbol: 58, color: 2});
  let n = 0;
  t.g.traverse(o => { const c = o.isMesh && o.geometry.attributes.color; if (c) for (let i = 0; i < c.count; i++) if (Math.abs(c.getX(i) - crack[0]) + Math.abs(c.getY(i) - crack[1]) + Math.abs(c.getZ(i) - crack[2]) < 1e-4) n++; });
  assert(n > 5, `${n} fracture vertices`);
});
