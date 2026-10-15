import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const demon = () => createCreature({name: 'water demon', symbol: 38, color: 1});
const named = (a, name) => { const out = []; a.g.traverse(o => { if (o.isMesh && o.material.name === name) out.push(o); }); return out; };
const verts = (a, name) => named(a, name).reduce((n, m) => n + m.geometry.attributes.position.count, 0);

test('the water demon wears its drowning: gills, fins, a bloated belly, weed, barnacles, running water and a wet pool', () => {
  const a = demon();
  for (const part of ['demon-gill', 'demon-fin', 'demon-belly', 'demon-weed', 'demon-barnacle', 'demon-drip', 'demon-wet']) assert.ok(verts(a, part) > 0, part);
  assert.equal(named(a, 'demon-fin').length, 2, 'the crest and the frills with the dorsal ridge, baked to one mesh each');
  assert.equal(named(a, 'demon-drip').length, 1, 'the water is one mesh');
  const pool = named(a, 'demon-wet')[0];
  assert.ok(pool.material.transparent && !pool.castShadow && pool.userData.ring, 'the pool is a flat translucent ring on the floor');
  for (const m of named(a, 'demon-drip')) assert.ok(m.material.transparent && m.material.opacity < .7, 'the water is see-through');
});

test('the head is a drowned toad skull: open jaw, needle teeth, dead pupil-less eyes in bruised lids, a throat sac', () => {
  const a = demon();
  assert.equal(named(a, 'demon-dead-eye').length, 1, 'two eyes, baked together');
  assert.equal(verts(a, 'demon-dead-eye'), 2 * 15 * 11, 'two 14x10 spheres');
  const eye = named(a, 'demon-dead-eye')[0];
  assert.ok(eye.material.emissiveIntensity > .8 && eye.material.emissiveIntensity < 2, 'lit like a dead thing, not a lamp');
  assert.ok(verts(a, 'demon-lid') > 0 && verts(a, 'demon-throat') > 0);
  // the old toad head had two small glow eyes at intensity 3; none of those are left
  let hot = 0; a.g.traverse(o => { if (o.isMesh && o.material.emissiveIntensity === 3) hot++; });
  assert.equal(hot, 0);
});

test('it stands bigger than a horned devil, on the floor, inside its tile, within the mesh budget', () => {
  const a = demon(), h = x => { x.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(x.g, true); };
  const b = h(a), d = h(createCreature({name: 'horned devil', symbol: 38, color: 1}));
  assert.ok(b.max.y > d.max.y, 'taller than a horned devil');
  assert.ok(b.min.y > -.05, 'on the floor');
  assert.ok(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.6, 'fits its tile');
  let n = 0; a.g.traverse(o => { if (o.isMesh) n++; });
  assert.ok(n <= 40, `meshes: ${n}`);
});
