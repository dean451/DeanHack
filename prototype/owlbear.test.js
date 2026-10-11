import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createSwivel} from './owlbear.js';

test('the owlbear has its own model: a hulking feathered bear with an owl head, few draws, on the floor', () => {
  const a = createCreature({name: 'owlbear', symbol: 89, color: 3});
  assert.equal(a.g.name, 'owlbear');
  for (const k of ['head', 'face', 'jaw', 'eyes', 'arm']) assert(a[k], k);
  let draws = 0;
  a.g.traverse(o => { if (o.isMesh) { draws++; for (const v of o.geometry.attributes.position.array) assert(Number.isFinite(v)); } });
  assert(draws <= 10, `${draws} draws`);
  a.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(a.g), size = b.getSize(new THREE.Vector3());
  assert(Math.abs(b.min.y) < .02, `stands on the floor (${b.min.y})`);
  assert(size.y > 1.4 && size.y < 1.9, `towers over the hero (${size.y})`);
  assert.notEqual(createCreature({name: 'monkey', symbol: 89, color: 3}).g.name, 'owlbear', 'the other apes keep the ape');
});

test('the owl head turn: snaps far round, holds, snaps back and clicks its beak; sometimes a head cock', () => {
  const face = new THREE.Group(), jaw = new THREE.Group(), sw = createSwivel(face, jaw, {seed: 4});
  let maxYaw = 0, clacked = false, tilted = false;
  for (let i = 0; i < 60 * 90; i++) {
    const p = sw.update(1 / 60);
    maxYaw = Math.max(maxYaw, Math.abs(p.yaw)); clacked ||= p.clack > .1; tilted ||= Math.abs(p.tilt) > .2;
    assert(Number.isFinite(face.rotation.y) && Number.isFinite(jaw.rotation.x));
  }
  assert(maxYaw > 1.5, `further than a bear could (${maxYaw})`);
  assert(clacked && tilted);
});

test('the owlbear carries raked claw scars across its breast and a chipped bill', async () => {
  const {createOwlbear} = await import('./owlbear.js');
  const o = createOwlbear();
  const scarred = geo => {
    const c = geo.attributes.color; let n = 0;
    for (let i = 0; i < c.count; i++) if (c.getX(i) > 0.2 && c.getY(i) < 0.1 && c.getZ(i) < 0.1) n++;
    return n;
  };
  let body = null, head = null;
  o.g.traverse(m => { if (m.isMesh && m.userData.part === 'body') body = m; if (m.isMesh && m.userData.part === 'head') head = m; });
  assert(scarred(body.geometry) >= 24, 'three scar gashes in the breast');
  assert(head.geometry.getAttribute('position').count > 0);
});
