import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {updateVortexSpin} from './vortex-spin.js';

const make = () => { const a = createCreature({name: 'dust vortex', kind: 'monster'}); a.species = 'dust vortex'; return a; };
const meshes = a => { const out = []; a.g.traverse(o => { if (o.isMesh) out.push(o); }); return out; };

test('the dust vortex is a twisted funnel sheet, not a stack of rings', () => {
  const a = make(), ms = meshes(a);
  assert.equal(ms.filter(m => m.geometry.type === 'TorusGeometry').length, 0);
  const funnel = ms.find(m => m.userData.part === 'funnel');
  assert.ok(funnel && funnel.material.transparent);
  // it widens from the foot to the top
  const p = funnel.geometry.attributes.position, r = y0 => { let m = 0; for (let i = 0; i < p.count; i++) if (Math.abs(p.getY(i) - y0) < .08) m = Math.max(m, Math.hypot(p.getX(i), p.getZ(i))); return m; };
  assert.ok(r(.62) > r(.08) * 2.5);
});

test('the dust vortex carries earth and a rag, stays within 10 meshes and on its tile', () => {
  const a = make();
  assert.ok(meshes(a).length <= 10, `${meshes(a).length}`);
  assert.ok(meshes(a).some(m => m.userData.part === 'rag') && meshes(a).filter(m => m.userData.part === 'grit').length >= 3);
  a.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(a.g, true);
  assert.ok(b.min.y > -.05 && Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < .6);
});

test('vortex-spin turns the funnel and returns it to rest when dead', () => {
  const a = make();
  const funnel = meshes(a).find(m => m.userData.part === 'funnel'), q0 = funnel.quaternion.clone();
  for (let i = 0; i < 20; i++) updateVortexSpin(a, .05, false);
  assert.ok(funnel.quaternion.angleTo(q0) > .1 || a.vortexSpin.funnels[0].phi > .1);
  a.actions = {dead: true};
  for (let i = 0; i < 400; i++) updateVortexSpin(a, .05, false);
  assert.ok(funnel.quaternion.angleTo(q0) < 1e-3);
});
