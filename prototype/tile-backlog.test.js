import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTileBacklog, cellIndex} from './tile-backlog.js';
import {liveSource} from './live-source.js';

const tileAt = (x, z, parent) => { const t = new THREE.Group();t.position.set(x, 0, z);parent?.add(t);return t; };

test('near the hero a square is built at once; far ones wait once the frame\'s budget is spent', () => {
  let clock = 0;const b = createTileBacklog({near: 3, applyMs: 10, now: () => clock});
  b.beginApply(0, 0);
  assert.equal(b.buildNow(tileAt(20, 0)), true, 'within the budget, even far away');
  clock = 11;
  assert.equal(b.buildNow(tileAt(20, 0)), false, 'budget spent: a far square waits');
  assert.equal(b.buildNow(tileAt(2, 1)), true, 'a square by the hero never waits');
});

test('the backlog fills nearest first, a few milliseconds a frame, and drops squares taken off the map', () => {
  let clock = 0;const root = new THREE.Group(), b = createTileBacklog({frameMs: 3, now: () => clock});
  const far = tileAt(9, 0, root), near = tileAt(1, 0, root), gone = tileAt(2, 0, null), mid = tileAt(5, 0, root);
  for (const t of [far, near, gone, mid]) b.defer(t);
  assert.ok(near.userData.pending);
  const order = [];
  const fill = t => { order.push(t.position.x);clock += 2; };
  assert.equal(b.drain(fill, {x: 0, z: 0}), 2, 'two squares fit in 3 ms (the dropped one costs nothing)');
  assert.deepEqual(order, [1, 5]);assert.equal(near.userData.pending, false);
  assert.equal(b.drain(fill, {x: 0, z: 0}), 1);assert.deepEqual(order, [1, 5, 9]);
  assert.equal(b.size, 0);assert.equal(b.drain(fill, {x: 0, z: 0}), 0);
});

test('a frame\'s squares are looked up by x,z once per frame', () => {
  const frame = {cells: [{x: 3, z: 4, terrain: 'floor'}]};
  assert.equal(cellIndex(frame), cellIndex(frame));assert.equal(cellIndex(frame).get('3,4').terrain, 'floor');
});

test('live.js builds near squares in the frame, defers the rest and drains them each frame', () => {
  const src = liveSource();
  assert.match(src, /if\(tileBacklog\.buildNow\(tile\)\)fillTile\(tile,cell,L\);else tileBacklog\.defer\(tile\);\}/);
  assert.match(src, /if\(!tile\.userData\.pending\)dressTile\(tile,cell,frame,L\);/, 'a waiting square is dressed once it is built');
  assert.match(src, /tileBacklog\.drain\(tile=>\{[^]*?fillTile\(tile,cell,L\);dressTile\(tile,cell,S\.latest,L\);S\.staged=true;\},hero\.g\.position\)\)warmUp\(\);/);
});
