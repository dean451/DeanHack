import test from 'node:test';
import assert from 'node:assert/strict';
import {clickMove, TRAVEL_KEY} from './click-move.js';
import {aimKeys, walkCursor} from './aim-cursor.js';

const hero = {x: 10, z: 5};
const floor = {terrain: 'floor', visible: true};

test('an adjacent square is one step in its direction, all eight ways', () => {
  const want = {'-1,0': 'h', '1,0': 'l', '0,-1': 'k', '0,1': 'j', '-1,-1': 'y', '1,-1': 'u', '-1,1': 'b', '1,1': 'n'};
  for (const [d, k] of Object.entries(want)) {
    const [dx, dz] = d.split(',').map(Number);
    assert.deepEqual(clickMove(hero, {x: 10 + dx, z: 5 + dz}, floor), {kind: 'step', code: k.charCodeAt(0)});
  }
});

test('a square three away travels, and the cursor keys reach it', () => {
  const sq = {x: 13, z: 5};
  const m = clickMove(hero, sq, floor);
  assert.equal(m.kind, 'travel');
  assert.equal(m.code, TRAVEL_KEY);
  assert.deepEqual(m.to, sq);
  assert.deepEqual(walkCursor(hero, aimKeys(hero, m.to)), sq);
});

test('nothing happens on the hero, an unseen square, a wall or a missing cell', () => {
  assert.equal(clickMove(hero, hero, floor), null);
  assert.equal(clickMove(hero, {x: 13, z: 5}, {terrain: 'floor', visible: false}), null);
  assert.equal(clickMove(hero, {x: 13, z: 5}, {terrain: 'wall', visible: true}), null);
  assert.equal(clickMove(hero, {x: 13, z: 5}, undefined), null);
  assert.equal(clickMove(null, {x: 13, z: 5}, floor), null);
});

test('stairs are walkable targets', () => {
  assert.equal(clickMove(hero, {x: 14, z: 9}, {terrain: 'down', visible: true}).kind, 'travel');
});
