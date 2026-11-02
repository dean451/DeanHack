import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHeroAffliction, progress} from './hero-affliction.js';
import {STONE} from './petrify.js';
import {liveSource} from './live-source.js';

function hero() {
  const g = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group();g.add(body);body.add(head);head.position.y = 1.6;
  const leg = new THREE.Mesh(new THREE.BoxGeometry(.2, .8, .2), new THREE.MeshStandardMaterial({color: 0xaa3322}));leg.position.y = .4;body.add(leg);
  const face = new THREE.Mesh(new THREE.BoxGeometry(.2, .2, .2), new THREE.MeshStandardMaterial({color: 0xd6a88c}));head.add(face);
  return {g, body, head, leg, face, mats: [leg.material, face.material]};
}

test('a countdown\'s progress runs from its first turn to its last', () => {
  assert.equal(progress(5, 5), 0);assert.equal(progress(3, 5), .5);assert.equal(progress(1, 5), 1);assert.equal(progress(1, 1), 1);
});

test('stoning greys the hero from the feet up as the turns run out, and a cure puts the materials back', () => {
  const h = hero(), aff = createHeroAffliction();
  aff.update(h, {stone: 5}, 0);
  assert.ok(aff.stoning);assert.notEqual(h.leg.material, h.mats[0], 'the pieces get their own materials to colour');
  aff.update(h, {stone: 3}, 1);
  const legGrey = h.leg.material.color.clone().sub(STONE), faceGrey = h.face.material.color.clone().sub(STONE);
  const near = c => Math.abs(c.r) + Math.abs(c.g) + Math.abs(c.b);
  assert.ok(near(legGrey) < near(faceGrey), 'the feet go grey before the face');
  aff.update(h, {stone: 1}, 2);
  assert.ok(near(h.face.material.color.clone().sub(STONE)) < .05, 'by the last turn the face is stone too');
  aff.update(h, {}, 3);
  assert.equal(h.leg.material, h.mats[0]);assert.equal(h.face.material, h.mats[1]);assert.equal(aff.stoning, false);
});

test('sliming creeps a sick green up the body and clears the same way', () => {
  const h = hero(), aff = createHeroAffliction();
  aff.update(h, {slime: 10}, 0);aff.update(h, {slime: 2}, 1);
  assert.ok(aff.sliming && h.leg.material.color.g > h.mats[0].color.g, 'greener');
  aff.update(h, {}, 2);assert.equal(h.leg.material, h.mats[0]);
});

test('strangling makes the hero gasp, and the pose comes off before the next frame\'s', () => {
  const h = hero(), aff = createHeroAffliction();
  let pulled = false;
  for (let t = 0; t < 1.3; t += .05) { aff.unpose();aff.update(h, {strngl: 2}, t);if (h.head.rotation.x < -.05) pulled = true; }
  assert.ok(pulled, 'the head jerks back');
  aff.unpose();assert.equal(h.head.rotation.x, 0);assert.equal(h.body.rotation.x, 0, 'exactly back');
});

test('live.js runs the countdowns on the hero each frame from the bridge\'s turns left', () => {
  const src = liveSource();
  assert.match(src, /heroAffliction\.unpose\(\);/);
  assert.match(src, /heroAffliction\.update\(hero,S\.frameCountdowns,t\);\n\s*heroBatch\.sync\(\);/);
});
