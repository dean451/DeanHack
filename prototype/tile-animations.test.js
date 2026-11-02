import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createAnimatedRegistry} from './tile-animations.js';
import {liveSource} from './live-source.js';

const tile = (...hooks) => {
  const t = new THREE.Group(), inner = new THREE.Group(); t.add(inner);
  for (let i = 0; i < 3; i++) inner.add(new THREE.Mesh());
  for (const h of hooks) { const o = new THREE.Mesh(); o.userData[h.kind] = h.fn; (i => i % 2 ? inner : t)(hooks.indexOf(h)).add(o); }
  return t;
};

test('a tile is walked once and only its hooks are kept, nested or not', () => {
  const r = createAnimatedRegistry(), calls = [];
  const a = tile({kind: 'updateFire', fn: t => calls.push(['fire', t])}, {kind: 'animate', fn: t => calls.push(['sigil', t])});
  const plain = tile();
  assert.equal(r.add(a), 2); assert.equal(r.add(plain), 0);
  assert.equal(r.tiles, 1); assert.equal(r.hooks, 2);
  assert.equal(r.update(7), 2);
  assert.deepEqual(calls.sort(), [['fire', 7], ['sigil', 7]]);
});

test('a hidden tile is skipped, a removed one is gone, and clear empties it', () => {
  const r = createAnimatedRegistry(); let n = 0;
  const a = tile({kind: 'updateFire', fn: () => n++}), b = tile({kind: 'animate', fn: () => n++});
  r.add(a); r.add(b);
  a.visible = false; assert.equal(r.update(1), 1); assert.equal(n, 1);
  a.visible = true; r.remove(b); assert.equal(r.update(2), 1); assert.equal(n, 2);
  r.remove(new THREE.Group()); r.clear(); assert.equal(r.update(3), 0); assert.equal(r.tiles, 0);
  assert.equal(r.add(null), 0);
});

test('the registry runs the same hooks a full traverse would', () => {
  const r = createAnimatedRegistry(), tiles = [];
  for (let i = 0; i < 40; i++) { const hooks = []; if (i % 5 === 0) hooks.push({kind: 'updateFire', fn: () => {}}); if (i % 7 === 0) hooks.push({kind: 'animate', fn: () => {}}); const t = tile(...hooks); t.visible = i % 3 !== 0; tiles.push(t); r.add(t); }
  let walked = 0; for (const t of tiles) if (t.visible) t.traverse(o => { if (o.userData.updateFire || o.userData.animate) walked++; });
  assert.equal(r.update(0), walked);
  assert.ok(walked > 0);
});

test('live.js registers a tile when it is built and again when a feature is dressed, releases it, and runs the registry each frame', () => {
  const src = liveSource();
  assert.match(src, /tiles\.set\(id,tile\);animated\.add\(tile\);/, 'registered when built');
  assert.match(src, /tile\.userData\.featureKey=key;[^\n]*\n\s*animated\.add\(tile\);/, 're-walked when a feature is dressed');
  assert.match(src, /function release\(object\)\{animated\.remove\(object\);/, 'dropped on release');
  assert.match(src, /animated\.update\(t\);updateDoorSwings\(dt\);/, 'run once a frame');
  assert.doesNotMatch(src, /tile\.traverse\(o=>\{o\.userData\.updateFire/, 'no per-frame walk of every tile');
});
