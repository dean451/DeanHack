import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {airFor, rockTint, rockRoughness, createBranchAir, PARTICLES, HALF, TOP} from './branch-air.js';

test('Gehennom lifts embers and ash, within the particle cap', () => {
  const a = airFor('Gehennom');
  assert(a.ember.count + a.ash.count <= PARTICLES);
  assert(a.ember.fall < 0 && a.ash.fall < 0);
  const group = new THREE.Group(), air = createBranchAir({group});
  air.setBranch('Gehennom', new THREE.Vector3());
  const hero = new THREE.Vector3();
  for (let f = 0; f < 600; f++) {
    air.update(f / 60, 1 / 60, hero);
    const p = air.points.geometry.attributes.position;
    for (let i = 0; i < PARTICLES; i++) if (p.getY(i) > -1) assert(p.getY(i) >= 0 && p.getY(i) <= TOP, 'y');
  }
  air.dispose();
});

test('only the Gnomish Mines, Sokoban and Gehennom have air of their own so far', () => {
  assert(airFor('The Gnomish Mines'));
  assert.equal(airFor('The Dungeons of Doom'), null);
  assert.equal(airFor(undefined), null);
});

test('mine air sifts grit and drips water, within the particle cap', () => {
  const a = airFor('The Gnomish Mines');
  assert(a.grit.count + a.drip.count <= PARTICLES);
  assert(a.drip.fall > a.grit.fall * 10);
});

test('the cloud shows only in the Mines, stays in its box around the hero and never leaks below the floor', () => {
  const group = new THREE.Group(), air = createBranchAir({group});
  assert.equal(air.points.visible, false);
  air.setBranch('The Gnomish Mines', new THREE.Vector3(3, 0, 4));
  assert.equal(air.points.visible, true);
  const hero = new THREE.Vector3(3, 0, 4);
  for (let f = 0; f < 600; f++) {
    hero.x += .05;
    air.update(f / 60, 1 / 60, hero);
    const p = air.points.geometry.attributes.position;
    for (let i = 0; i < PARTICLES; i++) {
      if (p.getY(i) < -1) continue; // unused slot parked out of sight
      assert(p.getY(i) >= 0 && p.getY(i) <= TOP, 'y');
      assert(Math.abs(p.getX(i) - hero.x) <= HALF + 1e-6 && Math.abs(p.getZ(i) - hero.z) <= HALF + 1e-6, 'box');
    }
  }
  air.setBranch('The Dungeons of Doom');
  assert.equal(air.points.visible, false);
  air.dispose();
});

test('Sokoban holds a few still flecks of cold dust, far calmer than the Mines', () => {
  const a = airFor('Sokoban');
  assert(a.dust.count <= PARTICLES && a.dust.count < airFor('The Gnomish Mines').grit.count);
  assert(a.dust.fall <= .05 && a.dust.sway <= .05);
  assert.equal(Object.keys(a).length, 1);
});

test('the Mines rock is tinted grimy warm and Sokoban cold, other branches plain', () => {
  const [mr, , mb] = rockTint('The Gnomish Mines'), [sr, , sb] = rockTint('Sokoban');
  assert(mr > mb, 'Mines lean warm');
  assert(sb > sr, 'Sokoban leans cold');
  assert.deepEqual(rockTint('The Dungeons of Doom'), [1, 1, 1]);
  assert.deepEqual(rockTint(), [1, 1, 1]);
  for (const t of [rockTint('Sokoban'), rockTint('The Gnomish Mines')]) for (const c of t) assert(c > .7 && c < 1.3);
});

test('the Mines rock is wet and glossy, Sokoban smoother, other branches fully rough', () => {
  assert(rockRoughness('The Gnomish Mines') < rockRoughness('Sokoban'));
  assert(rockRoughness('Sokoban') < 1);
  assert.equal(rockRoughness('The Dungeons of Doom'), 1);
  assert.equal(rockRoughness(), 1);
});
