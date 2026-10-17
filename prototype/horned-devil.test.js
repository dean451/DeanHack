import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const devil = () => createCreature({name: 'horned devil', symbol: 38, color: 1});
const named = (a, name) => { const out = []; a.g.traverse(o => { if (o.isMesh && o.material.name === name) out.push(o); }); return out; };
const verts = (a, name) => named(a, name).reduce((n, m) => n + m.geometry.attributes.position.count, 0);
const box = a => { a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g, true); };

test('the horned devil has a ram-horned goat skull: bone, ridged horns, ember eyes, fangs and a beard', () => {
  const a = devil();
  for (const part of ['devil-skull', 'devil-skull-dark', 'devil-horn', 'devil-horn-ridge', 'devil-eye', 'devil-beard']) assert.ok(verts(a, part) > 0, part);
  assert.equal(named(a, 'devil-horn').length, 1, 'both horns bake to one mesh');
});

test('the horns are not a pair: the left is snapped short, the right sweeps on forward', () => {
  const pos = named(devil(), 'devil-horn')[0].geometry.attributes.position, reach = side => { let m = 0; for (let i = 0; i < pos.count; i++) if (side * pos.getX(i) > 0) m = Math.max(m, side * pos.getX(i)); return m; };
  const forward = side => { let m = -9; for (let i = 0; i < pos.count; i++) if (side * pos.getX(i) > 0) m = Math.max(m, pos.getZ(i)); return m; };
  assert.ok(reach(1) > .25 && reach(-1) > .25, 'both spread wider than the skull');
  assert.ok(forward(1) > forward(-1) + .05, 'only the whole horn turns forward again');
});

test('the trident burns: translucent flame over the tines, one mesh, no shadow', () => {
  const a = devil(), fire = named(a, 'devil-fire');
  assert.equal(fire.length, 1);
  assert.ok(fire[0].material.transparent && !fire[0].castShadow);
  assert.ok(fire[0].material.emissiveIntensity > 1);
  const f = new THREE.Box3().setFromObject(fire[0], true);
  assert.ok(f.min.y > .8, 'the flame sits up on the tines');
});

test('it is not the stock demon: other devils keep their own heads and carry no fire', () => {
  for (const n of ['barbed devil', 'bone devil']) assert.equal(named(createCreature({name: n, symbol: 38, color: 1}), 'devil-fire').length, 0, n);
});

test('it stands on the floor, inside its tile, within 40 meshes', () => {
  const a = devil(), b = box(a);
  assert.ok(b.min.y > -.05);
  assert.ok(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.6);
  let n = 0; a.g.traverse(o => { if (o.isMesh) n++; });
  assert.ok(n <= 40, `meshes: ${n}`);
});
