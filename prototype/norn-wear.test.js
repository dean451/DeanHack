import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const norn = () => createCreature({name: 'Norn', symbol: 64, color: 1});
const part = (m, name) => { let f = null; m.g.traverse(o => { if (o.userData.part === name) f = o; }); return f; };

test('the Norn keeps seven draws and fits her tile with the cut hem and thread', () => {
  const m = norn();
  let meshes = 0;
  m.g.traverse(o => { if (o.isMesh) meshes++; });
  assert.equal(meshes, 7);
  m.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(m.g, true);
  assert(b.min.y > -0.1, 'stands on the floor');
  assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.2, 'fits its tile');
});

test('one thread of fate hangs cut down the staff, red against the wood', () => {
  const g = part(norn(), 'staff').geometry, pos = g.attributes.position, col = g.attributes.color;
  let red = 0;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0.5 && pos.getX(i) > 0.03 && col.getX(i) > col.getZ(i) * 2.5) red++;
  assert(red > 0, 'red cord below the crown on the right of the staff');
});

test('the hem is cut away on the left only', () => {
  const g = part(norn(), 'body').geometry, pos = g.attributes.position;
  let low = 1;
  for (let i = 0; i < pos.count; i++) if (pos.getX(i) < -0.12) low = Math.min(low, pos.getY(i));
  let lowR = 1;
  for (let i = 0; i < pos.count; i++) if (pos.getX(i) > 0.12) lowR = Math.min(lowR, pos.getY(i));
  assert(low < lowR - 0.012, 'a rag trails lower on the left than the right');
});
