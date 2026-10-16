import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const venomVerts = name => {
  let n = 0;
  createCreature({ name, symbol: 83, color: 3 }).g.traverse(o => {
    if (o.isMesh && o.userData.part === 'skull') {
      const c = o.geometry.attributes.color;
      for (let i = 0; i < c.count; i++) if (Math.abs(c.getX(i) - 0.32) < 0.03 && Math.abs(c.getY(i) - 0.64) < 0.03 && c.getZ(i) < 0.08) n++;
    }
  });
  return n;
};
const meshes = name => { let n = 0; createCreature({ name, symbol: 83, color: 3 }).g.traverse(o => { if (o.isMesh) n++; }); return n; };

test('the vipers and the cobra hang a bead of venom from the right fang; plain snakes do not', () => {
  for (const n of ['water moccasin', 'pit viper', 'cobra']) assert(venomVerts(n) > 0, n);
  for (const n of ['snake', 'python', 'garter snake']) assert.equal(venomVerts(n), 0, n);
});

test('the venom bead adds no meshes', () => {
  assert.equal(meshes('pit viper'), meshes('snake'));
});
