import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {aimKeys, walkCursor, createAimCursor} from './aim-cursor.js';

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
