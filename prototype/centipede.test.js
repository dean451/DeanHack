import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

test('the centipede has a head with hooked venom claws and glowing eyes, and stiff tail spines', () => {
  const a = createCreature({name: 'centipede'});
  let glowing = 0, tubes = 0;
  a.g.traverse(o => {
    if (o.geometry?.type === 'TubeGeometry') tubes++;
    if (o.material?.emissiveIntensity > 1) glowing++;
  });
  assert.equal(glowing, 2, 'two red eyes');
  assert.ok(tubes >= 2 + 2 + 2 + 16, 'antennae, forcipules, tail spines and legs');
  assert.equal(a.legs.length, 16);
});
