import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {mergeStatic, heldObjects, mergeable} from './static-merge.js';
import {liveSource} from './live-source.js';

const mat = new THREE.MeshStandardMaterial(), other = new THREE.MeshStandardMaterial();
const piece = (m = mat, x = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(.1, .1, .1), m); o.position.x = x; return o; };

test('pieces sharing a parent and a material become one mesh in the same place', () => {
  const arm = new THREE.Group(); for (let i = 0; i < 5; i++) arm.add(piece(mat, i)); arm.add(piece(other, 9));
  const box = new THREE.Box3().setFromObject(arm);
  assert.equal(mergeStatic(arm), 4);
  assert.equal(arm.children.length, 2, 'one merged mesh and the lone piece of the other material');
  const merged = arm.children.find(c => c.userData.merged);
  assert.equal(merged.userData.merged, 5); assert.equal(merged.material, mat);
  assert.deepEqual(new THREE.Box3().setFromObject(arm).max.toArray(), box.max.toArray(), 'nothing moved');
  assert.equal(mergeStatic(arm), 0, 'idempotent');
});

test('named, held, tagged and differently-shown pieces are left alone', () => {
  const g = new THREE.Group(); const named = piece(); named.name = 'ValkyriePlate'; const held = piece(); const tagged = piece(); tagged.userData.part = 'eye'; const hidden = piece(); hidden.visible = false; const a = piece(), b = piece();
  g.add(named, held, tagged, hidden, a, b);
  const keep = heldObjects({parts: {plate: held}});
  assert.ok(!mergeable(named) && !mergeable(held, keep) && !mergeable(tagged));
  assert.equal(mergeStatic(g, {keep}), 1, 'only the two plain shown pieces merge');
  for (const o of [named, held, tagged, hidden]) assert.equal(o.parent, g);
});

test('live.js merges the hero before outlining it, keeping what hero.parts and the kit hold', () => {
  const live = liveSource();
  const at = live.indexOf("mergeStatic(hero.g,{keep:heldObjects(hero.parts,(hero.kitAdded||[]).map(k=>k.obj)"); assert.ok(at > 0 && live.indexOf("addOutlines(hero.g)", at) > at, "merged, then outlined");
});
