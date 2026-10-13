import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const make = () => createCreature({name: 'Croesus', symbol: 64, color: 11});

test('Croesus keeps his draw count and fits his tile with a snapped crown spike and a cut breastplate', () => {
  const c = make();
  let n = 0;
  c.g.traverse(o => { if (o.isMesh) n++; });
  assert.equal(n, 8, 'meshes');
  c.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(c.g, true);
  assert(b.min.y > -0.05, 'stands on the floor');
});

test('one crown spike is snapped to a stump', () => {
  const c = make();
  const head = c.head.children.find(m => m.userData.part === 'head');
  const pos = head.geometry.attributes.position;
  // the tall spikes reach about .29, the snapped one stops near .22: count distinct spike tips
  let tall = 0, stump = 0;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y > 0.28) tall++;
    else if (y > 0.2 && y < 0.235) stump++;
  }
  assert(tall > 0 && stump > 0, `tall ${tall} stump ${stump}`);
});
