import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {aimKeys, walkCursor, aimLine, createAimCursor} from './aim-cursor.js';

test('the keys walk the cursor exactly to the square and then select it', () => {
  const from = {x: 20, z: 10};
  for (const to of [{x: 20, z: 10}, {x: 21, z: 10}, {x: 3, z: 10}, {x: 20, z: 2}, {x: 27, z: 5}, {x: 45, z: 18}, {x: 1, z: 0}, {x: 33, z: 14}, {x: 8, z: 19}]) {
    const keys = aimKeys(from, to);
    assert.equal(keys.at(-1), 46, 'ends with "."');
    assert.deepEqual(walkCursor(from, keys), to, JSON.stringify(to));
  }
});

test('long moves use the eight-square keys, so they are short', () => {
  assert.ok(aimKeys({x: 1, z: 10}, {x: 41, z: 10}).length <= 7);
  const keys = aimKeys({x: 1, z: 1}, {x: 41, z: 1}).map(c => String.fromCharCode(c));
  assert.deepEqual(keys, ['L', 'L', 'L', 'L', 'L', '.']);
});

test('the aim cursor starts hidden, sits on the square it is given, and cleans up', () => {
  const aim = createAimCursor();
  assert.equal(aim.g.visible, false);
  aim.show(4, -3);
  assert.equal(aim.g.visible, true);
  assert.deepEqual([aim.g.position.x, aim.g.position.z], [4, -3]);
  aim.update(1.3);
  aim.hide();
  assert.equal(aim.g.visible, false);
  const box = new THREE.Box3().setFromObject(aim.g);
  assert.ok(box.max.y < 0.2, 'flat on the floor');
  let n = 0; aim.g.traverse(o => { if (o.geometry) { const d = o.geometry.dispose.bind(o.geometry); o.geometry.dispose = () => { n++; d(); }; } });
  aim.dispose();
  assert.equal(n, 2);
});

test('the aim line crosses the squares between hero and cursor, ends left out and capped', () => {
  assert.deepEqual(aimLine({x: 0, z: 0}, {x: 4, z: 0}), [{x: 1, z: 0}, {x: 2, z: 0}, {x: 3, z: 0}]);
  assert.deepEqual(aimLine({x: 0, z: 0}, {x: 3, z: 3}), [{x: 1, z: 1}, {x: 2, z: 2}]);
  assert.deepEqual(aimLine({x: 2, z: 2}, {x: 2, z: 2}), []);
  assert.deepEqual(aimLine({x: 2, z: 2}, {x: 3, z: 2}), []);
  assert.equal(aimLine({x: 0, z: 0}, {x: 90, z: 7}).length, 24);
  for (const p of aimLine({x: 0, z: 0}, {x: -9, z: 4}, 99)) assert.ok(Math.abs(p.z - (p.x * -4 / 9)) <= .6);
});

test('the cursor draws a dotted trail from the hero and hides it with the cursor', () => {
  const root = new THREE.Group(), aim = createAimCursor();
  root.add(aim.g);
  aim.show(5, 0, {x: 0, z: 0});
  const shown = () => root.children.filter(c => c !== aim.g && c.visible).length;
  assert.equal(shown(), 4);
  aim.show(2, 0, {x: 0, z: 0});
  assert.equal(shown(), 1);
  aim.show(2, 0);
  assert.equal(shown(), 0);
  aim.show(5, 0, {x: 0, z: 0});
  aim.hide();
  assert.equal(shown(), 0);
  aim.dispose();
});
