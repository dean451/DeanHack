import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const meshes = a => { const l = []; a.g.traverse(o => { if (o.isMesh) l.push(o); }); return l; };
const box = a => { a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g, true); };

test('the red naga is a hooded serpent with a face and a mane of flame, in few draws', () => {
  const a = createCreature({name: 'red naga', symbol: 78, color: 1});
  assert.equal(a.quirk, 'snake'); assert(a.tail?.isObject3D, 'the raised neck sways');
  const parts = meshes(a), names = parts.map(m => m.userData.part);
  assert(parts.length <= 12, `${parts.length} meshes`);
  for (const n of ['coil', 'neck', 'head', 'eyes', 'hood', 'mane']) assert(names.includes(n), n);
  for (const m of parts) for (const v of m.geometry.attributes.position.array) assert(Number.isFinite(v));
  assert(!parts.some(m => m.geometry.type === 'TorusGeometry'), 'no torus coil');
  assert(a.g.userData.scarred);
});

test('the red naga rises above its coil, leaning forward, and stays on its tile', () => {
  const a = createCreature({name: 'red naga', symbol: 78, color: 1}), b = box(a);
  assert(b.min.y > -.02 && b.min.y < .02, `on the floor at ${b.min.y}`);
  assert(b.max.y > .55 && b.max.y < 1.1, `top ${b.max.y}`);
  assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < .6, 'fits its tile');
  const neck = meshes(a).find(m => m.userData.part === 'neck'), head = meshes(a).find(m => m.userData.part === 'head');
  head.geometry.computeBoundingBox(); neck.geometry.computeBoundingBox();
  assert(head.geometry.boundingBox.max.z > neck.geometry.boundingBox.min.z + .1, 'the head is carried forward');
});

test('the red naga hatchling is the same creature smaller, hood folded, no mane', () => {
  const a = createCreature({name: 'red naga hatchling', symbol: 78, color: 1}), big = createCreature({name: 'red naga', symbol: 78, color: 1});
  const names = meshes(a).map(m => m.userData.part);
  assert(!names.includes('hood') && !names.includes('mane'));
  assert(names.includes('coil') && names.includes('head'));
  assert(box(a).max.y < box(big).max.y * .7);
});

test('the red naga mane is self-lit and the scales are vertex colour', () => {
  const a = createCreature({name: 'red naga', symbol: 78, color: 1}), mane = meshes(a).find(m => m.userData.part === 'mane'), coil = meshes(a).find(m => m.userData.part === 'coil');
  assert.equal(mane.material.type, 'MeshBasicMaterial');
  assert(coil.material.vertexColors && coil.geometry.attributes.color);
});
