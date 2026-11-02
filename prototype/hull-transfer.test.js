import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {packHull, unpackHull} from './hull-transfer.js';
import {grownFelineHull, adoptFelineHull} from './feline-skin.js';
import {liveSource} from './live-source.js';

test('a grown hull crosses to the page as transferable arrays and comes back the same', () => {
  const geometry = new THREE.BoxGeometry(1, 2, 3);
  geometry.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint16Array(geometry.attributes.position.count * 4), 4));
  geometry.userData.groups = ['body', 'head'];
  const details = new THREE.SphereGeometry(.5, 6, 4);
  const pos = geometry.attributes.position.array.slice(), idx = geometry.index.array.slice();
  const {data, transfer} = packHull({geometry, details, ms: 12});
  assert.ok(transfer.length >= 6 && transfer.every(b => b instanceof ArrayBuffer), 'every array goes by transfer');
  const back = unpackHull(structuredClone(data, {transfer}));
  assert.deepEqual([...back.geometry.attributes.position.array], [...pos]);
  assert.deepEqual([...back.geometry.index.array], [...idx]);
  assert.equal(back.geometry.attributes.skinIndex.itemSize, 4);
  assert.deepEqual(back.geometry.userData.groups, ['body', 'head']);
  assert.deepEqual(back.geometry.groups, geometry.groups);
  assert.equal(back.details.attributes.position.count, details.attributes.position.count);
  assert.equal(unpackHull({geometry: null, details: null}).details, null);
});

test('an adopted hull is the one a look then uses; one already grown is kept', () => {
  const hull = {geometry: new THREE.BufferGeometry(), details: null};
  adoptFelineHull('test look|', hull);
  assert.equal(grownFelineHull('test look')?.hull, hull);
  adoptFelineHull('test look|', {geometry: new THREE.BufferGeometry(), details: null});
  assert.equal(grownFelineHull('test look').hull, hull, 'the first stays');
  assert.equal(grownFelineHull('never grown'), null);
});

test('live.js grows the pets\' skins in a worker, with the old idle slots only as a fallback', () => {
  const live = liveSource();
  assert.match(live, /new Worker\(new URL\('\.\/feline-hull-worker\.js',import\.meta\.url\),\{type:'module'\}\)/);
  assert.match(live, /adoptFelineHull\(data\.key,unpackHull\(data\.hull\)\)/);
  const worker = readFileSync(new URL('./feline-hull-worker.js', import.meta.url), 'utf8');
  assert.match(worker, /growFelineHull\(name, colour\)/);
});
