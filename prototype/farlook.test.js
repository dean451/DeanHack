import test from 'node:test';
import assert from 'node:assert/strict';
import {squareAt, farlookText, createFarlook} from './farlook.js';

test('a ground point maps to the nearest map square', () => {
  assert.deepEqual(squareAt({x: 2.4, z: -1.6}, {x: 10, z: 5}), {x: 12, z: 3});
});

test('monsters say hostile or peaceful, pets say pet', () => {
  assert.equal(farlookText({visible: true, kind: 'monster', name: 'jackal'}), 'jackal (hostile)');
  assert.equal(farlookText({visible: true, kind: 'monster', name: 'watchman', peaceful: true}), 'watchman (peaceful)');
  assert.equal(farlookText({visible: true, kind: 'pet', name: 'kitten'}), 'kitten (pet)');
});

test('items are named, bare floor and unseen squares say nothing', () => {
  assert.equal(farlookText({visible: true, object: {name: 'rusty dagger'}}), 'rusty dagger');
  assert.equal(farlookText({visible: true, terrain: 'floor'}), '');
  assert.equal(farlookText({visible: false, kind: 'monster', name: 'jackal'}), '');
  assert.equal(farlookText(undefined), '');
});

test('the tooltip shows, moves and hides', () => {
  const style = {};
  const el = {style, hidden: true, setAttribute() {}};
  const farlook = createFarlook({createElement: () => el});
  farlook.show('jackal (hostile)', 100, 50);
  assert.equal(el.hidden, false);
  assert.equal(el.textContent, 'jackal (hostile)');
  assert.equal(style.left, '114px');
  farlook.show('', 0, 0);
  assert.equal(el.hidden, true);
});
