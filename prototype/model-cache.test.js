import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {cachedModel, cacheStats} from './model-cache.js';
import {createDoor} from './door.js';
import {createGrave} from './grave.js';
import {createAltar} from './altar.js';
import {liveSource} from './live-source.js';

const meshes = g => { const out = [];g.traverse(o => { if (o.isMesh) out.push(o); });return out; };

test('a door is built once; copies share its geometry, own their materials, and their leaf points at their own leaf', () => {
  let builds = 0;const build = () => { builds++;return createDoor(41); };
  const a = cachedModel('test-door|41', build), b = cachedModel('test-door|41', build);
  assert.equal(builds, 1);
  const ma = meshes(a), mb = meshes(b);
  assert.equal(ma.length, mb.length);
  ma.forEach((m, i) => { assert.equal(m.geometry, mb[i].geometry, 'geometry shared');assert.notEqual(m.material, mb[i].material, 'materials per copy');assert.equal(m.userData.part, mb[i].userData.part); });
  let inside = false;b.traverse(o => { if (o === b.userData.leaf) inside = true; });
  assert.ok(inside, 'the copy\'s leaf is its own child, so it swings alone');
  assert.deepEqual(b.userData.hinge, a.userData.hinge);assert.notEqual(b.userData.hinge, a.userData.hinge, 'plain data copied, not shared');
  b.userData.dispose();assert.ok(meshes(a)[0].geometry.attributes.position, 'disposing a copy leaves the shared geometry');
});

test('a grave\'s rest poses are cloned per copy and its hand is the copy\'s own', () => {
  const a = cachedModel('test-grave|7', () => createGrave(7)), b = cachedModel('test-grave|7', () => assert.fail('rebuilt'));
  let ra = null, rb = null;a.traverse(o => { if (!ra && o.userData.rest) ra = o.userData.rest; });b.traverse(o => { if (!rb && o.userData.rest) rb = o.userData.rest; });
  assert.ok(ra && rb && ra !== rb, 'a copy has its own rest pose');
  assert.equal(JSON.stringify(ra), JSON.stringify(rb), 'with the same values');
  for (const k of Object.keys(ra)) if (ra[k]?.isVector3) assert.notEqual(ra[k], rb[k], `${k} is cloned, not shared`);
});

test('a model a copy cannot reproduce (the altar\'s animated fire) is built fresh every time', () => {
  let builds = 0;
  const a = cachedModel('test-altar', () => { builds++;return createAltar(); }), b = cachedModel('test-altar', () => { builds++;return createAltar(); });
  assert.equal(builds, 2);assert.notEqual(a, b);
  assert.equal(typeof a.userData.dispose, 'function', 'its own dispose is kept');
  assert.ok(cacheStats().size >= 3);
});

test('live-apply.js and live-tile-dress.js take their features from the cache', () => {
  const src = liveSource();
  for (const re of [/cachedModel\('altar',createAltar\)/, /cachedModel\(`grave\|\$\{seed\}`/, /cachedModel\(`bars\|\$\{seed\}`/, /cachedModel\(`\$\{kind\}\|\$\{seed\}`/, /cachedModel\(`\$\{ladder\?'ladder':'stairs'\}\|/]) assert.match(src, re);
});
