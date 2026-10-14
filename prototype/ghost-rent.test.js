import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

test('the ghost shroud is cut open over the left breast, a black rent with bone showing', () => {
  const c = createCreature({name: 'ghost', symbol: 32, color: 7});
  let body = null;
  c.g.traverse(o => { if (o.isMesh && o.userData.part === 'body') body = o; });
  const p = body.geometry.attributes.position, col = body.geometry.attributes.color;
  let dark = 0, bone = 0;
  for (let i = 0; i < p.count; i++) {
    if (p.getX(i) < -0.03 && p.getX(i) > -0.12 && Math.abs(p.getY(i) - 0.69) < 0.06 && p.getZ(i) > 0.15) {
      const lum = col.getX(i) + col.getY(i) + col.getZ(i);
      if (lum < 0.1) dark++;
      if (col.getX(i) > 0.4) bone++;
    }
  }
  assert(dark > 0, 'a black rent');
  assert(bone > 0, 'ribs showing through it');
});
