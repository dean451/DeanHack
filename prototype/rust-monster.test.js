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

test('the rust monster\'s left mandible is snapped short beside the whole right one', async () => {
  const {createRustMonster} = await import('./rust-monster.js');
  const m = createRustMonster('rust monster');
  let head = null;
  m.g.traverse(o => { if (o.isMesh && o.userData.part === 'head') head = o; });
  const p = head.geometry.attributes.position;
  let left = -Infinity, right = -Infinity;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) > -0.03 || Math.abs(p.getX(i)) < 0.03) continue;
    if (p.getX(i) < 0) left = Math.max(left, p.getZ(i));
    else right = Math.max(right, p.getZ(i));
  }
  assert(right - left > 0.04, `right reaches ${right}, left ${left}`);
});

test('the disenchanter\'s left feeler orb has burst: a dark husk with no light, beside a whole glowing right orb', async () => {
  const {createRustMonster} = await import('./rust-monster.js');
  const d = createRustMonster('disenchanter');
  const orbs = [];
  d.g.traverse(o => { if (o.isMesh && o.userData.part === 'orb') orbs.push(o); });
  assert.equal(orbs.length, 1, 'only the right orb still glows');
  d.feelers[1].updateMatrixWorld(true);
  assert(orbs[0].parent === d.feelers[1], 'the glowing orb is on the right feeler');
  const r = createRustMonster('rust monster');
  const n = a => { let c = 0; a.feelers[0].traverse(o => { if (o.isMesh) c++; }); return c; };
  assert.equal(n(d), n(r), 'the husk adds no draw calls');
});
