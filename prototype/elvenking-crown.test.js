import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const head = name => {
  const c = createCreature({name, symbol: 64, color: 5});
  const m = []; c.head.traverse(o => { if (o.isMesh) m.push(o); });
  const b = new THREE.Box3();
  for (const x of m) { x.geometry.computeBoundingBox(); b.union(x.geometry.boundingBox); }
  return b;
};

test('the Elvenking wears a crown of barbed thorns that rises above the elf-lord circlet', () => {
  const king = head('Elvenking'), lord = head('elf-lord');
  assert(king.max.y > lord.max.y + .02, `king ${king.max.y} lord ${lord.max.y}`);
  assert(king.max.y < .32, 'the thorns stay in bounds');
});

test('the Elvenking\'s tunic carries dried blood the elf-lord lacks', () => {
  const want = new THREE.Color('#3a0e10');
  const blood = name => {
    let n = 0;
    createCreature({name, symbol: 64, color: 5}).body.traverse(o => {
      const c = o.geometry?.attributes.color;
      if (c) for (let i = 0; i < c.count; i++) if (Math.abs(c.getX(i) - want.r) < .005 && Math.abs(c.getY(i) - want.g) < .005 && Math.abs(c.getZ(i) - want.b) < .005) n++;
    });
    return n;
  };
  assert(blood('Elvenking') > 50);
  assert.equal(blood('elf-lord'), 0);
});
