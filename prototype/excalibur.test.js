import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildExcalibur, createExcaliburGlow, updateHeldExcalibur} from './excalibur.js';

test('Excalibur: blade, guard, grip, pommel and its lit parts, every vertex finite', () => {
  const g = buildExcalibur(new THREE.Group());
  assert.deepEqual(g.children.map(m => m.name.split(' ')[1]), ['steel', 'gold', 'leather', 'light', 'gems', 'ruby']);
  g.traverse(o => { if (o.isMesh) for (const v of o.geometry.attributes.position.array) assert(Number.isFinite(v), o.name); });
  const b = new THREE.Box3().setFromObject(g);
  assert(b.max.y > 1 && b.min.y < -.15, 'a long blade over a grip and pommel');
  assert(b.max.x - b.min.x > .4, 'a broad cross-guard');
});

test('wielded, the fuller breathes and sparks lift off the edge', () => {
  const g = buildExcalibur(new THREE.Group()), glow = createExcaliburGlow(g);
  const seen = new Set();
  for (let i = 0; i < 240; i++) { glow.update(1 / 60, i / 60); seen.add(g.userData.fuller.emissiveIntensity.toFixed(2)); }
  assert(seen.size > 20, 'the light moves');
  const pts = g.children.find(o => o.isPoints).geometry.attributes.position.array;
  assert([...pts].every(Number.isFinite));
  assert([...pts].some((v, i) => i % 3 === 1 && v > 0), 'sparks in the air');
  glow.dispose();
  const socket = new THREE.Group(); socket.add(buildExcalibur(new THREE.Group()));
  assert(updateHeldExcalibur({weaponSocket: socket}, .016, 0));
  assert.equal(updateHeldExcalibur({weaponSocket: new THREE.Group()}, .016, 0), null);
});
