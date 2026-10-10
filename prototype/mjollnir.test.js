import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildMjollnir, mjollnirFloorParts, mjollnirFloorRunes, HEAD_Y} from './mjollnir.js';
import {createCrackle, updateHeldMjollnir, createLightningStrikes, strikeVictim, strikeAlpha, boltSegments, makeRng, STRIKE} from './mjollnir-storm.js';

const finite = arr => { for (const v of arr) if (!Number.isFinite(v)) return false; return true; };

test('Mjollnir is a broad double-faced head over a braided haft, every vertex finite', () => {
  const g = buildMjollnir(new THREE.Group());
  assert(g.userData.mjollnir);
  assert.equal(g.children.length, 4, 'one merged mesh per material');
  g.traverse(o => { if (o.isMesh) assert(finite(o.geometry.attributes.position.array), o.name); });
  const b = new THREE.Box3().setFromObject(g);
  assert(b.max.x - b.min.x > .4, 'a wide head');
  assert(Math.abs((b.max.x + b.min.x) / 2) < 1e-6, 'both faces alike');
  assert(b.max.y > HEAD_Y && b.min.y < -.15, 'head on top of the haft');
});

test('on the floor Mjollnir stands on its head with the haft up, and its runes sit on it', () => {
  const box = new THREE.Box3();
  for (const [geo] of mjollnirFloorParts()) { geo.computeBoundingBox(); box.union(geo.boundingBox); }
  assert(box.min.y > -.01 && box.max.y > .55, `${box.min.y}..${box.max.y}`);
  const runes = new THREE.Box3();
  for (const geo of mjollnirFloorRunes()) { geo.computeBoundingBox(); runes.union(geo.boundingBox); }
  assert(runes.min.y > box.min.y - .01 && runes.max.y < box.max.y + .01, 'runes within the hammer');
});

test('the crackle keeps jagged arcs alive, all finite, and a strike surges it', () => {
  const g = buildMjollnir(new THREE.Group()), c = createCrackle(g, {seed: 3});
  let drawn = 0;
  for (let i = 0; i < 120; i++) drawn = Math.max(drawn, c.update(1 / 60, i / 60));
  assert(drawn > 0 && c.arcs >= 2);
  const line = g.children.find(o => o.isLineSegments);
  assert(finite(line.geometry.attributes.position.array));
  const before = g.userData.runes.emissiveIntensity;
  c.surge(); c.update(1 / 60, 2.5);
  assert(c.surgeLevel > .9 && c.arcs >= 4, 'more arcs after a strike');
  assert(g.userData.runes.emissiveIntensity > before, 'runes blaze');
  for (let i = 0; i < 180; i++) c.update(1 / 60, 3 + i / 60);
  assert(c.surgeLevel === 0, 'and ease back');
  c.dispose();
  assert(!g.children.some(o => o.isLineSegments), 'disposed');
});

test('a wielded Mjollnir gets its crackle from the hero update; other weapons get none', () => {
  const socket = new THREE.Group(), hero = {weaponSocket: socket};
  assert.equal(updateHeldMjollnir(hero, .016, 0), null);
  socket.add(buildMjollnir(new THREE.Group()));
  const c = updateHeldMjollnir(hero, .016, 0);
  assert(c && updateHeldMjollnir(hero, .016, .02) === c, 'made once, then run');
});

test('"Lightning strikes the jackal!" names the victim; other lines do not', () => {
  assert.equal(strikeVictim('The massive hammer hits!  Lightning strikes the jackal!'), 'jackal');
  assert.equal(strikeVictim('The massive hammer hits!  Lightning strikes an orc zombie!'), 'orc zombie');
  assert.equal(strikeVictim('Lightning strikes Croesus!'), 'Croesus');
  assert.equal(strikeVictim('The massive hammer hits the jackal.'), null);
  assert.equal(strikeVictim(undefined), null);
});

test('the bolt flashes, stutters twice and is gone; its channel ends on the target', () => {
  assert.equal(strikeAlpha(0), 1);
  assert(strikeAlpha(.09) < .2 && strikeAlpha(.14) > .7, 'a dark gap, then a re-strike');
  assert.equal(strikeAlpha(STRIKE.total), 0);
  for (let t = 0; t < STRIKE.total; t += .01) assert(strikeAlpha(t) >= 0 && strikeAlpha(t) <= 1);
  const segs = boltSegments(3, .45, -2, makeRng(5));
  const main = segs.filter(s => s[2] === 1);
  assert.deepEqual(main.at(-1)[1], [3, .45, -2], 'lands on the target');
  assert(main[0][0][1] > 5, 'from high above');
  assert(segs.length > main.length, 'with forks');
  for (const [a, b] of segs) assert(finite([...a, ...b]));
});

test('strikes clean up after themselves', () => {
  const parent = new THREE.Group(), strikes = createLightningStrikes(parent);
  assert(strikes.strike(1, 2));
  assert.equal(strikes.strike(NaN, 0), null);
  assert.equal(strikes.count, 1);
  for (let i = 0; i < 60; i++) strikes.update(1 / 60);
  assert.equal(strikes.count, 0);
  assert.equal(parent.children.length, 0);
});

test('the crackle survives strike after strike without overflowing its buffer', () => {
  const g = buildMjollnir(new THREE.Group()), c = createCrackle(g, {seed: 9});
  for (let k = 0; k < 40; k++) {
    c.surge();
    for (let i = 0; i < 6; i++) assert.doesNotThrow(() => c.update(1 / 60, k + i / 60));
    assert(c.arcs <= 6, `at most six arcs (${c.arcs})`);
  }
  c.dispose();
});
