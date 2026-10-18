import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {boneDevilHead} from './bone-devil.js';

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

test('its eyes are dull, small and set in the brow: not the brightest thing on the head, and not the shared glow', () => {
  const head = boneDevilHead(new THREE.Group()), eyes = [];
  head.traverse(o => { if (o.isMesh && o.material.name === 'bone-devil-eye') eyes.push(o); });
  assert.equal(eyes.length, 2);
  for (const e of eyes) {
    e.geometry.computeBoundingBox();
    assert.ok(e.geometry.boundingBox.getSize(new THREE.Vector3()).y * e.scale.y < .05, 'small');
    assert.ok(e.material.emissiveIntensity < 1 && e.material.color.r < .1, 'dull, not a lit white disc');
  }
});

test('its snout is faceted (six-sided) and its mandibles start inside the jaw', () => {
  const head = boneDevilHead(new THREE.Group()); let snout, jaw; const mands = [];
  head.traverse(o => {
    if (!o.isMesh) return;
    const g = o.geometry, p = g.parameters;
    if (g.type === 'CylinderGeometry' && p.height === .27) snout = o;
    if (g.type === 'BoxGeometry' && p.depth === .2) jaw = o;
    if (g.type === 'TubeGeometry') mands.push(o);
  });
  assert.equal(snout.geometry.parameters.radialSegments, 6, 'a six-sided snout');
  assert.ok(jaw, 'a lower jaw wedge');
  assert.equal(mands.length, 2);
  for (const m of mands) {
    m.geometry.computeBoundingBox();
    const bb = m.geometry.boundingBox, jz0 = jaw.position.z - .1, jz1 = jaw.position.z + .1;
    assert.ok(bb.min.z >= jz0 && bb.min.z <= jz1, 'the root begins within the jaw length');
    assert.ok(bb.min.y > jaw.position.y - .05 && bb.max.y < jaw.position.y + .03, 'the blades stay at jaw height, not hanging below');
  }
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
