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

test('the black naga has black spines instead of flame, green eyes, and its hatchling is smaller and bare', () => {
  const a = createCreature({name: 'black naga', symbol: 78, color: 1}), parts = meshes(a), names = parts.map(m => m.userData.part);
  assert(parts.length <= 12, `${parts.length} meshes`);
  for (const n of ['coil', 'neck', 'head', 'eyes', 'hood', 'mane']) assert(names.includes(n), n);
  assert.notEqual(parts.find(m => m.userData.part === 'mane').material.type, 'MeshBasicMaterial', 'spines are not self-lit');
  assert(parts.find(m => m.userData.part === 'eyes').geometry.attributes.color.getY(0) > .8, 'green eyes');
  assert(!parts.some(m => m.geometry.type === 'TorusGeometry'));
  const b = box(a); assert(b.min.y > -.02 && b.min.y < .02 && Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < .6);
  const h = createCreature({name: 'black naga hatchling', symbol: 78, color: 1}), hn = meshes(h).map(m => m.userData.part);
  assert(!hn.includes('hood') && !hn.includes('mane') && box(h).max.y < b.max.y * .7);
});

test('the golden naga wears a circlet with a lit gem and a glow on the floor, no mane, red eyes, and its hatchling is bare', () => {
  const a = createCreature({name: 'golden naga', symbol: 78, color: 1}), parts = meshes(a), names = parts.map(m => m.userData.part);
  assert(parts.length <= 12, `${parts.length} meshes`);
  for (const n of ['coil', 'neck', 'head', 'eyes', 'hood', 'circlet', 'gems', 'glow']) assert(names.includes(n), n);
  assert(!names.includes('mane'), 'no flame or spines');
  assert.equal(parts.find(m => m.userData.part === 'gems').material.type, 'MeshBasicMaterial', 'the gems are lit from within');
  assert(parts.find(m => m.userData.part === 'eyes').geometry.attributes.color.getX(0) > .8, 'red eyes');
  assert(parts.find(m => m.userData.part === 'glow').material.transparent);
  assert(!parts.some(m => m.geometry.type === 'TorusGeometry'));
  for (const m of parts) for (const v of m.geometry.attributes.position.array) assert(Number.isFinite(v));
  const b = box(a); assert(b.min.y > -.02 && b.min.y < .02 && Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < .6, 'on its tile');
  const circlet = parts.find(m => m.userData.part === 'circlet'), head = parts.find(m => m.userData.part === 'head');
  circlet.geometry.computeBoundingBox(); head.geometry.computeBoundingBox();
  assert(Math.abs(circlet.geometry.boundingBox.min.y - head.geometry.boundingBox.max.y) < .06, 'the band sits on the head');
  const h = createCreature({name: 'golden naga hatchling', symbol: 78, color: 1}), hn = meshes(h).map(m => m.userData.part);
  assert(!['hood', 'mane', 'circlet', 'gems'].some(n => hn.includes(n)) && box(h).max.y < b.max.y * .7);
});

test('the guardian naga spreads a wide green hood with eye spots on its back, no mane, and its hatchling is smaller and bare', () => {
  const a = createCreature({name: 'guardian naga', symbol: 83}), parts = meshes(a), names = parts.map(m => m.userData.part);
  assert(parts.length <= 12, `${parts.length} meshes`);
  for (const n of ['coil', 'neck', 'head', 'eyes', 'hood', 'spots']) assert(names.includes(n), n);
  assert(!names.includes('mane'), 'no mane');
  assert(!parts.some(m => m.geometry.type === 'TorusGeometry'));
  const coil = parts.find(m => m.userData.part === 'coil').geometry.attributes.color;
  assert(coil.getY(40) > coil.getX(40) && coil.getY(40) > coil.getZ(40), 'green scales');
  // the spots face back, behind the hood
  const spots = parts.find(m => m.userData.part === 'spots').geometry, hood = parts.find(m => m.userData.part === 'hood').geometry;
  spots.computeBoundingBox(); hood.computeBoundingBox();
  assert(spots.boundingBox.max.z <= hood.boundingBox.max.z, 'on the back of the hood');
  const b = box(a); assert(b.min.y > -.02 && b.min.y < .02 && Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < .6);
  assert(b.max.y > box(createCreature({name: 'red naga', symbol: 83})).max.y, 'bigger than the red naga');
  const h = createCreature({name: 'guardian naga hatchling', symbol: 83}), hn = meshes(h).map(m => m.userData.part);
  assert(!hn.includes('hood') && !hn.includes('spots') && box(h).max.y < b.max.y * .7);
});

test('the white naga is bone-pale with a crown of ice, frost fangs, ice-blue eyes and rime on its coil instead of scars, and its hatchling is smaller and bare', () => {
  const a = createCreature({name: 'white naga', symbol: 83}), parts = meshes(a), names = parts.map(m => m.userData.part);
  assert(parts.length <= 12, `${parts.length} meshes`);
  for (const n of ['coil', 'neck', 'head', 'eyes', 'hood', 'mane', 'rime']) assert(names.includes(n), n);
  assert(!a.g.userData.scarred, 'rime, not scars');
  const ice = parts.find(m => m.userData.part === 'mane').material;
  assert(ice.type !== 'MeshBasicMaterial' && ice.emissiveIntensity > 0, 'the ice is lit faintly cold, not flame');
  const eye = parts.find(m => m.userData.part === 'eyes').geometry.attributes.color;
  assert(eye.getZ(0) > .9 && eye.getX(0) < .5, 'ice-blue eyes');
  const coil = parts.find(m => m.userData.part === 'coil').geometry.attributes.color;
  let r = 0, gg = 0, bl = 0; for (let i = 0; i < coil.count; i++) { r += coil.getX(i); gg += coil.getY(i); bl += coil.getZ(i); } r /= coil.count; gg /= coil.count; bl /= coil.count;
  assert(Math.min(r, gg, bl) > .25 && Math.max(r, gg, bl) - Math.min(r, gg, bl) < .08, `pale, grey scales (${r.toFixed(2)} ${gg.toFixed(2)} ${bl.toFixed(2)})`);
  assert(!parts.some(m => m.geometry.type === 'TorusGeometry'));
  const b = box(a); assert(b.min.y > -.02 && b.min.y < .02 && Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < .6);
  const h = createCreature({name: 'white naga hatchling', symbol: 83}), hn = meshes(h).map(m => m.userData.part);
  assert(!hn.includes('hood') && !hn.includes('mane') && !hn.includes('rime') && box(h).max.y < b.max.y * .7);
});
