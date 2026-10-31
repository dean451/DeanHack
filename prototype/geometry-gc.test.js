import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createGeometryGC} from './geometry-gc.js';

const counted = g => { let n = 0; g.addEventListener('dispose', () => n++); return () => n; };

test('a released object\'s geometry is freed, a shape still drawn elsewhere is kept until its last user goes', () => {
  const root = new THREE.Group(), gc = createGeometryGC(), shared = new THREE.BoxGeometry(), own = new THREE.SphereGeometry();
  const sharedFreed = counted(shared), ownFreed = counted(own);
  const a = new THREE.Group(); a.add(new THREE.Mesh(own), new THREE.Mesh(shared));
  const b = new THREE.Mesh(shared);
  root.add(a, b);
  root.remove(a); gc.queue(a);
  assert.equal(gc.flush(root), 1);
  assert.equal(ownFreed(), 1, 'its own sphere goes'); assert.equal(sharedFreed(), 0, 'the box is still drawn by b');
  root.remove(b); gc.queue(b); gc.flush(root);
  assert.equal(sharedFreed(), 1, 'the last user gone, the box goes too');
  assert.equal(gc.flush(root), 0, 'nothing pending');
});

test('an object put back before the flush keeps its geometry', () => {
  const root = new THREE.Group(), gc = createGeometryGC(), g = new THREE.BoxGeometry(), freed = counted(g), m = new THREE.Mesh(g);
  root.add(m); root.remove(m); gc.queue(m); root.add(m);
  gc.flush(root); assert.equal(freed(), 0);
});

test('live.js queues every release and flushes once a frame', () => {
  const live = readFileSync(new URL('./live.js', import.meta.url), 'utf8');
  assert.match(live, /function release\(object\)\{[^}]*group\.remove\(object\);geometryGC\.queue\(object\);/);
  assert.match(live, /update\(t,dt\)\{geometryGC\.flush\(group\);/);
});
