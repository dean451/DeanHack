import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildHelm} from './hero-helm.js';

const mats = () => ({iron: new THREE.MeshStandardMaterial(), steel: new THREE.MeshStandardMaterial(), trim: new THREE.MeshStandardMaterial()});
const build = () => { const h = new THREE.Group(); buildHelm(h, mats()); h.updateMatrixWorld(true); return h; };

test('the helm is faceted, cheap and has a crest, brow band, nasal guard, cheek plates and temple blades', () => {
  const h = build();
  let meshes = 0; h.traverse(o => { if (o.isMesh) meshes++; });
  assert(meshes <= 32, `${meshes} meshes`);
  for (const n of ['HelmCap', 'HelmBrow', 'HelmCrest', 'HelmNasal', 'HelmNasalTip']) assert(h.getObjectByName(n), n);
  assert.equal(h.children.filter(o => o.name === 'HelmCheek').length, 2);
  assert.equal(h.children.filter(o => o.name === 'HelmWing').length, 8);
  assert(h.getObjectByName('HelmCap').geometry.attributes.position.count < 400, 'coarse cap reads as facets');
});

test('the crest rises above the cap and the nasal guard stops above the eyes', () => {
  const h = build();
  const cap = new THREE.Box3().setFromObject(h.getObjectByName('HelmCap'));
  const crest = new THREE.Box3().setFromObject(h.getObjectByName('HelmCrest'));
  assert(crest.max.y > cap.max.y + .03, 'crest stands proud of the cap');
  const nasal = new THREE.Box3().setFromObject(h.getObjectByName('HelmNasal')).union(new THREE.Box3().setFromObject(h.getObjectByName('HelmNasalTip')));
  assert(nasal.min.y > .04, `nasal guard ends at y=${nasal.min.y}, eyes are at y .016`);
});

test('the cheek plates hang to the jaw and leave the eyes clear', () => {
  const h = build();
  for (const c of h.children.filter(o => o.name === 'HelmCheek')) {
    const b = new THREE.Box3().setFromObject(c);
    assert(b.min.y < -.08 && b.max.y < .06, JSON.stringify(b));
  }
});
