import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('the newt is a sculpted salamander: a head, four jointed legs with fingers and a tail, in a few meshes', () => {
  const n = createCreature({name: 'newt', symbol: 90, color: 11});
  assert.equal(n.quirk, 'lizard');
  assert.equal(n.legs.length, 4);
  assert.ok(n.head && n.tail);
  let meshes = 0; n.g.traverse(o => { if (o.isMesh) meshes++; });
  assert(meshes >= 7 && meshes <= 12, `${meshes} meshes`);
  const box = new THREE.Box3().setFromObject(n.g), size = box.getSize(new THREE.Vector3());
  assert(box.min.y > -.005, 'lies on the floor');
  assert(size.z > .45 && size.z < .9 && size.y < .22 && size.x < .45, JSON.stringify(size));
  // the legs are finger-fine: each leg mesh has more than a plank's worth of triangles
  const leg = n.legs[0].children[0];
  assert(leg.geometry.attributes.position.count > 400, 'jointed leg with splayed fingers');
});

test('plain rats are the enormous rat\'s sculpt at smaller sizes, each a different size', () => {
  const size = name => new THREE.Box3().setFromObject(createCreature({name, symbol: 114, color: 3}).g).getSize(new THREE.Vector3()).z;
  const [sewer, rabid, giant, enormous] = ['sewer rat', 'rabid rat', 'giant rat', 'enormous rat'].map(size);
  assert(sewer < rabid && rabid <= giant && giant < enormous, [sewer, rabid, giant, enormous].join());
});

test('every lizard kind is sculpted, grounded, finite, and distinct from the others', () => {
  const sigs = new Set();
  for (const name of ['newt', 'gecko', 'lizard', 'iguana', 'chameleon', 'salamander', 'basilisk']) {
    const c = createCreature({name, symbol: 58, color: 2});
    assert.equal(c.quirk, 'lizard', name);
    assert.equal(c.legs.length, 4, name);
    assert(c.head && c.tail, name);
    const box = new THREE.Box3().setFromObject(c.g);
    for (const v of [...box.min.toArray(), ...box.max.toArray()]) assert(Number.isFinite(v), name);
    assert(box.min.y > -.01 && box.max.y < 1.2, `${name} height ${box.max.y}`);
    let tris = 0, meshes = 0; c.g.traverse(o => { if (o.isMesh) { meshes++; tris += o.geometry.attributes.position.count; } });
    assert(meshes <= 20, `${name} ${meshes} meshes`);
    sigs.add(`${tris}`);
  }
  assert(sigs.size >= 6, 'each kind has its own build');
});
