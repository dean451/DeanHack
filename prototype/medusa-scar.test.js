import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

test('Medusa wears a pale scar across the left of her face', () => {
  const c = createCreature({name: 'Medusa', symbol: 64, color: 2});
  let head = null;
  c.g.traverse(o => { if (o.isMesh && o.userData.part === 'head') head = o; });
  const pos = head.geometry.attributes.position, col = head.geometry.attributes.color;
  let scarred = 0;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getX(i) < -0.025 && pos.getZ(i) > 0.05 && col.getX(i) > 0.65 && col.getY(i) > 0.62) scarred++;
  }
  assert(scarred > 0, 'a pale scar sits on the left side of the face');
});
