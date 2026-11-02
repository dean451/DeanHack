import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {headLook, softHat, wearHat} from './hero-headgear.js';
import {HATS} from './hero-kits.js';
import {CLR} from './hero-gear.js';

const H = (name, color = 7, mat = 'iron') => ({name, otyp: 1, mat, color});

test('the helmet slot names the headgear: hats as themselves, every other helmet a war-helm', () => {
  assert.equal(headLook(null), 'none');
  assert.equal(headLook(H('fedora', 3, 'cloth')), 'fedora');
  assert.equal(headLook(H('conical hat', 4, 'cloth')), 'wizard', 'an unidentified cornuthaum or dunce cap');
  assert.equal(headLook(H('cornuthaum', 4, 'cloth')), 'wizard');
  assert.equal(headLook(H('dunce cap', 4, 'cloth')), 'wizard');
  assert.equal(headLook(H('kabuto')), 'kabuto', 'the Samurai\'s name for a helmet');
  assert.equal(headLook(H('dented pot')), 'pot');
  assert.equal(headLook(H('tinfoil hat')), 'tinfoil');
  for (const n of ['plumed helmet', 'etched helmet', 'crested helmet', 'visored helmet', 'hard hat', 'iron skull cap', 'leather hat', 'helm of brilliance']) assert.equal(headLook(H(n)), 'helm', n);
  for (const look of ['fedora', 'wizard', 'kabuto', 'pot', 'tinfoil']) { assert.ok(softHat(look));assert.equal(typeof HATS[look], 'function', look); }
  assert.ok(!softHat('helm') && !softHat('none'));
});

test('a hat is built on the head, swapped for another, and taken off cleanly', () => {
  const parts = {head: new THREE.Group()};
  assert.equal(wearHat(parts, 'wizard', H('conical hat', 4, 'cloth')), true);
  assert.ok(parts.head.children.length >= 1);
  let blue = false;parts.head.traverse(o => { if (o.material?.color?.getHexString() === CLR[4].slice(1)) blue = true; });
  assert.ok(blue, 'the hat takes the item\'s colour');
  assert.equal(wearHat(parts, 'wizard', H('conical hat', 4, 'cloth')), false, 'the same hat twice is no change');
  wearHat(parts, 'pot', H('dented pot'));assert.equal(parts.hatKey.split('|')[0], 'pot');
  wearHat(parts, 'helm', H('plumed helmet'));assert.equal(parts.head.children.length, 0, 'a war-helm is the rig\'s own helmet, not a built hat');
  wearHat(parts, 'none', null);assert.equal(parts.head.children.length, 0);
});

test('no class wears a default hat any more, and the rig\'s head follows the helmet slot', () => {
  const kits = readFileSync(new URL('./hero-kits.js', import.meta.url), 'utf8'), main = readFileSync(new URL('./main.js', import.meta.url), 'utf8');
  assert.doesNotMatch(kits, /HATS\[kit\.hat\]/);
  assert.match(main, /function syncHelmWings\(\)\{const look=headLook\(helmetWorn\)/);
  assert.match(main, /wearHat\(hatParts,look,helmetWorn\)/);
  assert.match(readFileSync(new URL('./engine/bridge.c', import.meta.url), 'utf8'), /"helmet\\":"\);worn_piece\(uarmh\)/);
});
