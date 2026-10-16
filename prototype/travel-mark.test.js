import test from 'node:test';
import assert from 'node:assert/strict';
import {createTravelState, createTravelMark} from './travel-mark.js';
import {clickMove} from './click-move.js';

test('a travel click marks its square through the position prompt and ends at the next command prompt', () => {
  const st = createTravelState();
  const hero = {x: 10, z: 5};
  const move = clickMove(hero, {x: 13, z: 5}, {terrain: 'floor', visible: true});
  st.begin(move.to);
  assert.deepEqual(st.target, {x: 13, z: 5});
  assert.deepEqual(st.request('position', hero), {x: 13, z: 5});
  assert.equal(st.request('command', {x: 12, z: 5}), null);   // interrupted short of the square
  assert.equal(st.target, null);
});

test('standing on the square ends the mark, and a step click marks nothing', () => {
  const st = createTravelState();
  st.begin({x: 3, z: 3});
  assert.equal(st.request('menu', {x: 3, z: 3}), null);
  st.begin(clickMove({x: 1, z: 1}, {x: 2, z: 1}, {terrain: 'floor', visible: true}).to);
  assert.equal(st.target, null);
});

test('the mark sits on the square, hides, and its pulse stays in bounds', () => {
  const m = createTravelMark();
  assert.equal(m.g.visible, false);
  m.show(4, 7);
  assert.deepEqual([m.g.position.x, m.g.position.z], [4, 7]);
  const ring = m.g.children[0];
  for (let t = 0; t < 4; t += 0.05) {
    m.update(t);
    assert.ok(ring.scale.x >= 1 && ring.scale.x <= 1.5, `scale ${ring.scale.x}`);
  }
  m.hide();
  assert.equal(m.g.visible, false);
  m.dispose();
});
