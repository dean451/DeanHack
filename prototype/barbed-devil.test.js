import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const devil = name => createCreature({name: name || 'barbed devil', symbol: 38, color: 1});
const named = (a, name) => { const out = []; a.g.traverse(o => { if (o.isMesh && o.material.name === name) out.push(o); }); return out; };
const verts = (a, name) => named(a, name).reduce((n, m) => n + m.geometry.attributes.position.count, 0);
const box = a => { a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g, true); };

test('the barbed devil is thorned: hooked thorns with pale tips over its hide, and open wounds', () => {
  const a = devil();
  for (const part of ['devil-thorn', 'devil-thorn-tip', 'devil-wound']) assert.ok(verts(a, part) > 0, part);
  assert.ok(verts(a, 'devil-thorn') > 1000, 'a hide of thorns, not a few spikes');
});

test('both shoulders bristle with thorns that rise high', () => {
  const pos = named(devil(), 'devil-thorn').map(m => m.geometry.attributes.position);
  const high = side => { let m = 0; for (const p of pos) for (let i = 0; i < p.count; i++) if (side * p.getX(i) > .15) m = Math.max(m, p.getY(i)); return m; };
  assert.ok(high(1) > .9 && high(-1) > .9, 'both shoulders bristle');
});

test('some thorns grew into its own flesh: wounds sit on the torso and forearm, with blood running down', () => {
  const wounds = named(devil(), 'devil-wound');
  assert.ok(wounds.length >= 1);
  const b = new THREE.Box3(); for (const m of wounds) { m.geometry.computeBoundingBox(); b.union(m.geometry.boundingBox); }
  assert.ok(b.max.y > .6 && b.min.y < .62, 'blood runs below the wounds');
  assert.ok(b.min.x < -.2 && b.max.x > .1, 'on both sides of the body');
});

test('it has its own head: no stock short horns, no other devil shares its thorns', () => {
  for (const n of ['horned devil', 'bone devil', 'ice devil']) assert.equal(named(devil(n), 'devil-thorn').length, 0, n);
  assert.equal(named(devil(), 'devil-fire').length, 0);
});

test('it stands on the floor, inside its tile, within 40 meshes', () => {
  const a = devil(), b = box(a);
  assert.ok(b.min.y > -.05);
  assert.ok(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.6);
  let n = 0; a.g.traverse(o => { if (o.isMesh) n++; });
  assert.ok(n <= 40, `meshes: ${n}`);
});
