import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {softGlowMaterial, beamGeometry} from './soft-glow.js';
import {createRays} from './rays.js';
import {createBreath} from './breath.js';

test('beams are open round shafts, a unit long and a unit across, not boxes', () => {
  const g = beamGeometry(THREE);
  g.computeBoundingBox();
  const s = g.boundingBox.getSize(new THREE.Vector3());
  assert(Math.abs(s.x - 1) < 1e-6 && Math.abs(s.y - 1) < 1e-6 && Math.abs(s.z - 1) < 1e-6);
  assert.equal(g.parameters.openEnded, true, 'no caps to stack bright at every tile boundary');
});

test('the soft glow fades at its edges, additive for glows and alpha-blended for a dark core', () => {
  const glow = softGlowMaterial(THREE, {power: 2.6}), core = softGlowMaterial(THREE, {additive: false, floor: .2});
  assert.equal(glow.blending, THREE.AdditiveBlending);
  assert.equal(core.blending, THREE.NormalBlending);
  for (const m of [glow, core]) { assert(m.transparent && !m.depthWrite); assert(/pow\(clamp\(vFacing/.test(m.fragmentShader)); }
});

test('rays and breath draw with it: round beams and smooth puffs', () => {
  const parent = new THREE.Group(), rays = createRays(THREE, parent), breath = createBreath(THREE, parent);
  assert.equal(rays.core.geometry.type, 'CylinderGeometry');
  assert.equal(rays.glow.material.type, 'ShaderMaterial');
  assert.equal(breath.mesh.geometry.type, 'SphereGeometry', 'smooth puffs, not faceted icosahedra');
  assert.equal(breath.mesh.material.type, 'ShaderMaterial');
  rays.dispose(); breath.dispose();
});
