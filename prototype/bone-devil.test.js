import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const devil = name => createCreature({name: name || 'bone devil', symbol: 38, color: 1});
const named = (a, name) => { const out = []; a.g.traverse(o => { if (o.isMesh && o.material.name === name) out.push(o); }); return out; };
const verts = (a, name) => named(a, name).reduce((n, m) => n + m.geometry.attributes.position.count, 0);
const box = a => { a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g, true); };

test('the bone devil has an insect skull and a scorpion tail, both in bone and chitin', () => {
  const a = devil();
  for (const part of ['bone-devil-bone', 'bone-devil-sting', 'bone-devil-void']) assert.ok(verts(a, part) > 0, part);
  assert.ok(verts(a, 'bone-devil-bone') > 600, 'armoured segments and plates, not a few cones');
});

test('its tail rises behind the back and curls over it, so the stinger hangs above the shoulders', () => {
  const a = devil(); a.g.updateMatrixWorld(true);
  const b = new THREE.Box3();
  for (const m of named(a, 'bone-devil-sting')) { m.geometry.computeBoundingBox(); b.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld)); }
  const s = a.g.scale.y;
  assert.ok(b.max.y > .78 * s, 'the tail arches high');
  assert.ok(b.min.z < -.1 && b.max.z > b.min.z + .1, 'it reaches back and curls forward');
});

test('no other devil shares its parts, and it no longer wears the stock spade tail', () => {
  for (const n of ['horned devil', 'barbed devil', 'ice devil']) assert.equal(named(devil(n), 'bone-devil-bone').length, 0, n);
});

test('it stands on the floor, inside its tile, within 40 meshes', () => {
  const a = devil(), b = box(a);
  assert.ok(b.min.y > -.05);
  assert.ok(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.6);
  let n = 0; a.g.traverse(o => { if (o.isMesh) n++; });
  assert.ok(n <= 40, `meshes: ${n}`);
});
