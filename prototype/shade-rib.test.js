import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

test('the shade has a snapped rib thrust out of its lower right side', () => {
  const c = createCreature({name: 'shade', symbol: 32, color: 0});
  let bones = null;
  c.g.traverse(o => { if (o.isMesh && o.userData.part === 'bones') bones = o; });
  assert(bones, 'bones mesh');
  const p = bones.geometry.attributes.position;
  let shard = 0;
  for (let i = 0; i < p.count; i++) if (p.getX(i) < -0.06 && p.getY(i) > 0.55 && p.getY(i) < 0.66 && p.getZ(i) > 0.15) shard++;
  assert(shard > 0, 'a splintered rib end juts forward on the right');
});
