import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GHOST, RIPPLE, ghostOpacity, updateGhosting, clearGhosting} from './ghosting.js';

function hero() {
  const g = new THREE.Group(), shared = new THREE.MeshStandardMaterial({color: 0x886644});
  const body = new THREE.Mesh(new THREE.BoxGeometry(.4, .8, .3), shared);body.position.y = .6;
  const head = new THREE.Mesh(new THREE.SphereGeometry(.15), new THREE.MeshStandardMaterial({opacity: .9, transparent: true}));head.position.y = 1.2;
  g.add(body, head);g.updateMatrixWorld(true);
  return {g, body, head, shared, originals: [body.material, head.material]};
}

test('ghost opacity stays within its bounds and is exactly 1 at rest', () => {
  assert.equal(ghostOpacity(0, 3, 1), 1);
  for (let t = 0; t < 20; t += .037) for (const y of [0, .5, 1.3]) {
    const o = ghostOpacity(1, t, y);
    assert.ok(Number.isFinite(o) && o >= GHOST - 1e-9 && o <= GHOST + RIPPLE + 1e-9, `${t} ${y} ${o}`);
  }
});

test('the invisible hero fades to a shimmering ghost and back to the exact original materials', () => {
  const h = hero(), dt = 1 / 60;
  let t = 0, prev = 1, maxStep = 0;
  for (let i = 0; i < 90; i++, t += dt) {
    updateGhosting(h, dt, t, true);
    const o = h.body.material.opacity;
    assert.ok(Number.isFinite(o));
    maxStep = Math.max(maxStep, Math.abs(o - prev));prev = o;
  }
  assert.notEqual(h.body.material, h.shared, 'shared material is cloned, not changed');
  assert.equal(h.shared.opacity, 1);assert.equal(h.shared.transparent, false);
  assert.ok(h.body.material.transparent);
  assert.ok(h.body.material.opacity <= GHOST + RIPPLE + 1e-6, 'ghostly after 1.5 s');
  assert.ok(h.head.material.opacity <= .9 * (GHOST + RIPPLE) + 1e-6, 'keeps the original opacity as a ceiling');
  assert.ok(maxStep < .12, `smooth fade (${maxStep})`);
  // The ripple actually moves over time.
  const seen = [];
  for (let i = 0; i < 120; i++, t += dt) {updateGhosting(h, dt, t, true);seen.push(h.body.material.opacity);}
  assert.ok(Math.max(...seen) - Math.min(...seen) > RIPPLE * .3);
  // A helmet put on while invisible is picked up.
  const helm = new THREE.Mesh(new THREE.BoxGeometry(.2, .1, .2), new THREE.MeshStandardMaterial());
  h.g.add(helm);updateGhosting(h, dt, t, true);
  assert.ok(helm.material.opacity < .5);
  // Visible again: fades in, then restores exactly.
  for (let i = 0; i < 120; i++, t += dt) updateGhosting(h, dt, t, false);
  assert.equal(h.body.material, h.originals[0]);
  assert.equal(h.head.material, h.originals[1]);
  assert.equal(h.head.material.opacity, .9);
  assert.equal(helm.material.transparent, false);
  assert.equal(h.ghosted, false);
  assert.equal(h.body.userData.ghostSaved, undefined);
});

test('a visible hero is never touched, and clearing mid-fade restores at once', () => {
  const h = hero();
  for (let i = 0; i < 30; i++) updateGhosting(h, 1 / 60, i / 60, false);
  assert.equal(h.body.material, h.originals[0]);assert.ok(!h.ghosted);
  updateGhosting(h, 1 / 60, 0, true);
  assert.ok(h.ghosted);
  clearGhosting(h);
  assert.equal(h.body.material, h.originals[0]);assert.equal(h.head.material, h.originals[1]);
  assert.equal(updateGhosting(null, .1, 0, true), 0);
});
