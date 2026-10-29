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

const makeFire = () => { const a = createCreature({name: 'fire vortex', kind: 'monster'}); a.species = 'fire vortex'; return a; };

test('the fire vortex is a self-lit twisted column with coals, a core and six embers, not rings', () => {
  const a = makeFire(), ms = meshes(a);
  assert.equal(ms.filter(m => m.geometry.type === 'TorusGeometry').length, 0);
  const funnel = ms.find(m => m.userData.part === 'funnel');
  assert.ok(funnel && funnel.material.transparent && funnel.material.isMeshBasicMaterial && funnel.geometry.attributes.color);
  // a column, not a spring: still narrow near the top compared with the dust funnel's flare
  const p = funnel.geometry.attributes.position, r = y0 => { let m = 0; for (let i = 0; i < p.count; i++) if (Math.abs(p.getY(i) - y0) < .08) m = Math.max(m, Math.hypot(p.getX(i), p.getZ(i))); return m; };
  assert.ok(r(.8) > r(.1) && r(.8) < .5);
  assert.equal(a.g.userData.embers, 6);
  assert.ok(a.core && a.core === a.g.userData.core);
  assert.equal(ms.filter(m => m.userData.part === 'grit').length, 4);
  assert.ok(ms.length <= 10, `${ms.length}`);
});

test('the fire vortex stays on its tile and spins down to rest', () => {
  const a = makeFire();
  a.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(a.g, true);
  assert.ok(b.min.y > -.05 && Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < .6);
  const funnel = meshes(a).find(m => m.userData.part === 'funnel'), q0 = funnel.quaternion.clone();
  for (let i = 0; i < 20; i++) updateVortexSpin(a, .05, false);
  assert.ok(a.vortexSpin.funnels.length === 1 && a.vortexSpin.core);
  a.actions = {dead: true};
  for (let i = 0; i < 400; i++) updateVortexSpin(a, .05, false);
  assert.ok(funnel.quaternion.angleTo(q0) < 1e-3);
});

const makeSteam = () => { const a = createCreature({name: 'steam vortex', kind: 'monster'}); a.species = 'steam vortex'; return a; };

test('the steam vortex is a pale plume that billows out at the head, with beads on the floor, not rings', () => {
  const a = makeSteam(), ms = meshes(a);
  assert.equal(ms.filter(m => m.geometry.type === 'TorusGeometry').length, 0);
  const funnel = ms.find(m => m.userData.part === 'funnel');
  assert.ok(funnel && funnel.material.transparent && funnel.geometry.attributes.color);
  const p = funnel.geometry.attributes.position, r = y0 => { let m = 0; for (let i = 0; i < p.count; i++) if (Math.abs(p.getY(i) - y0) < .08) m = Math.max(m, Math.hypot(p.getX(i), p.getZ(i))); return m; };
  assert.ok(r(.9) > r(.3) * 2 && r(.1) < .2);
  assert.ok(ms.some(m => m.userData.part === 'beads'));
  assert.equal(ms.filter(m => m.userData.part === 'grit' || m.userData.part === 'rag').length, 0);
  assert.ok(ms.length <= 10, `${ms.length}`);
});

test('the steam vortex stays on its tile and spins down to rest', () => {
  const a = makeSteam();
  a.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(a.g, true);
  assert.ok(b.min.y > -.05 && Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < .6);
  const funnel = meshes(a).find(m => m.userData.part === 'funnel'), q0 = funnel.quaternion.clone();
  for (let i = 0; i < 20; i++) updateVortexSpin(a, .05, false);
  a.actions = {dead: true};
  for (let i = 0; i < 400; i++) updateVortexSpin(a, .05, false);
  assert.ok(funnel.quaternion.angleTo(q0) < 1e-3);
});

test('the ice vortex is a glassy funnel with ice shards in its spiral and a rime ring on the floor, not rings', () => {
  const a = createCreature({name: 'ice vortex', kind: 'monster'}), ms = meshes(a);
  assert.equal(ms.filter(m => m.geometry.type === 'TorusGeometry').length, 0);
  assert.ok(ms.length <= 10, `${ms.length}`);
  const funnel = ms.find(m => m.userData.part === 'funnel');
  assert.ok(funnel && funnel.material.transparent);
  assert.ok(ms.filter(m => m.userData.part === 'shard').length >= 4, 'shards');
  const rime = ms.find(m => m.userData.part === 'rime');
  assert.ok(rime && rime.parent === a.g, 'the rime stays on the floor while the body spins');
  a.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(a.g, true);
  assert.ok(b.min.y > -.05 && Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < .6);
});
