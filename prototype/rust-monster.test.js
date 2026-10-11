import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {feels} from './rust-feel.js';

const glowing = a => { const out = []; a.g.traverse(o => { if (o.isMesh && o.material.emissiveIntensity > 1) out.push(o.userData.part); }); return out; };

test('rust monsters and disenchanters have their own models, on the floor, driven by the feeler animation', () => {
  for (const name of ['rust monster', 'disenchanter']) {
    const a = createCreature({name, symbol: 82, color: 3});
    assert.equal(a.g.name, name);
    assert(feels(a), `${name}: rust-feel.js drives its feelers and vane`);
    assert.equal(a.legs.length, 4); assert.equal(a.feelers.length, 2);
    let draws = 0;
    a.g.traverse(o => { if (o.isMesh) { draws++; for (const v of o.geometry.attributes.position.array) assert(Number.isFinite(v)); } });
    assert(draws <= 16, `${name}: ${draws} draws`);
    a.g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(a.g);
    assert(Math.abs(b.min.y) < .01, `${name} on the floor (${b.min.y})`);
    assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < .85, `${name} fits its tile`);
  }
});

test('the disenchanter is the bigger one and glows with drained magic; the rust monster only has its eyes lit', () => {
  const rust = createCreature({name: 'rust monster', symbol: 82, color: 3}), dis = createCreature({name: 'disenchanter', symbol: 82, color: 4});
  const size = a => { a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g).getSize(new THREE.Vector3()); };
  assert(size(dis).y > size(rust).y);
  assert.deepEqual(glowing(rust), ['eyes']);
  for (const part of ['seams', 'eyes', 'orb']) assert(glowing(dis).includes(part), part);
});
