import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const size = name => { const a = createCreature({name, symbol: 39, color: 7}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g, true).getSize(new THREE.Vector3()); };

test('iron and stone golems tower over the lesser golems', () => {
  const iron = size('iron golem'), stone = size('stone golem');
  for (const lesser of ['clay golem', 'wax golem', 'rope golem']) assert(iron.y > size(lesser).y && stone.y > size(lesser).y, lesser);
  assert(iron.y >= stone.y);
});

test('the glass, ice and crystal ice golems stand taller than a stone golem, the crystal ice most', () => {
  const stone = size('stone golem').y, glass = size('glass golem').y, ice = size('ice golem').y, crystal = size('crystal ice golem').y;
  assert(glass > stone && ice > glass && crystal > ice);
});

test('the clay and flesh golems loom larger than the wax and rope golems but stay under the stone golem', () => {
  const stone = size('stone golem').y;
  for (const big of ['clay golem', 'flesh golem']) {
    const h = size(big).y;
    assert(h > size('wax golem').y * 1.1 && h > size('rope golem').y * 1.1, big);
    assert(h < stone, big);
  }
});

test('the iron golem vents poison gas through two lit exhaust stacks on its back; the stone golem has none', () => {
  const back = name => {
    const a = createCreature({ name, symbol: 39, color: 7 });
    a.g.updateMatrixWorld(true);
    const lit = a.g.children[0].children.find(m => m.userData.part === 'core');
    const bb = new THREE.Box3().setFromObject(lit, true);
    return { litBack: bb.min.z };
  };
  const iron = back('iron golem'), stone = back('stone golem');
  assert(iron.litBack < stone.litBack - 0.1, 'the stack mouths glow behind the chest');
});

test('ice and crystal ice golems hang icicle fangs from the belly; the stone golem does not', () => {
  const low = name => {
    const a = createCreature({ name, symbol: 39, color: 7 });
    a.body.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(a.body.children.find(m => m.userData.part === 'body'), true).min.y / a.g.scale.y;
  };
  assert(low('ice golem') < low('stone golem') - 0.05);
  assert(low('crystal ice golem') < low('stone golem') - 0.05);
});
