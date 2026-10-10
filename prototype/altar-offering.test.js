import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {layOnSlab, altarFlash, blessedPose, cursedPose, createAltarFlashes, SLAB, FLASH} from './altar-offering.js';
import {createCorpse} from './corpse.js';
import {createCreature} from './creatures.js';

const factory = o => createCreature(o);

test('a corpse on an altar lies along the slab, inside its edges, centred and on the top', () => {
  for (const name of ['jackal', 'troll', 'black dragon', 'newt', 'human zombie', 'giant']) {
    const icon = new THREE.Group(), corpse = createCorpse(name, 7, 3, {creatureFactory: factory});
    icon.add(corpse);
    layOnSlab(corpse);
    icon.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(icon), size = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    assert(size.x <= SLAB.x + 1e-6 && size.z <= SLAB.z + 1e-6, `${name} fits ${size.x.toFixed(2)} x ${size.z.toFixed(2)}`);
    assert(size.x >= size.z - 1e-6, `${name} lies along the slab`);
    assert(Math.abs(c.x) < 1e-6 && Math.abs(c.z) < 1e-6, `${name} centred`);
    assert(Math.abs(b.min.y) < 1e-6, `${name} on the top`);
    corpse.userData.dispose?.();
  }
});

test('the flash message says blessed (amber), cursed (black) or a hallucinated colour', () => {
  assert.equal(altarFlash('There is an amber flash as a +0 long sword hits the altar.').kind, 'blessed');
  assert.equal(altarFlash('There is a black flash as 2 cursed daggers hit the altar.').kind, 'cursed');
  const h = altarFlash('There is a puce flash as a ring hits the altar.');
  assert(h.hallucinated && h.kind === 'blessed');
  assert.equal(altarFlash('There is an altar to Tyr (lawful) here.'), null);
  assert.equal(altarFlash('A lawful altar.'), null);
});

test('the flashes start and end dark, and stay in range', () => {
  for (let t = 0; t <= FLASH.blessed; t += .02) for (const v of Object.values(blessedPose(t))) assert(v >= 0 && v <= 1);
  for (let t = 0; t <= FLASH.cursed; t += .02) for (const v of Object.values(cursedPose(t))) assert(v >= 0 && v <= 1);
  assert(blessedPose(.08).flare > .95, 'a hard flare');
  assert(blessedPose(FLASH.blessed).column < .01 && cursedPose(FLASH.cursed).dark < .01, 'gone at the end');
  assert(cursedPose(.6).spread > .9, 'the dark spreads across the slab');
});

test('flashes play a beat apart and clean up after themselves', () => {
  const parent = new THREE.Group(), flashes = createAltarFlashes(parent);
  flashes.message('There is an amber flash as a dagger hits the altar.', 1, 1);
  flashes.message('There is a black flash as a dagger hits the altar.', 1, 1);
  assert.equal(flashes.message('You drop a dagger.', 1, 1), null);
  assert.equal(flashes.count, 2);
  flashes.update(.05);
  assert(parent.children[0].visible && !parent.children[1].visible, 'the second waits its turn');
  for (let i = 0; i < 120; i++) flashes.update(1 / 60);
  assert.equal(flashes.count, 0);
  assert.equal(parent.children.length, 0);
});
