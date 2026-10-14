import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createGauntletHand, gauntletGeometries} from './hero-hand.js';

const mats = () => ({glove: new THREE.MeshStandardMaterial(), plate: new THREE.MeshStandardMaterial()});

test('a gauntlet hand is two draws and shares its geometry between hands', () => {
  const a = createGauntletHand(mats()), b = createGauntletHand(mats());
  let n = 0; a.traverse(o => { if (o.isMesh) n++; });
  assert.equal(n, 2);
  assert.equal(a.getObjectByName('GauntletGlove').geometry, b.getObjectByName('GauntletGlove').geometry);
});

test('the fist stays small and wraps the grip: fingers in front of the palm, cuff behind it', () => {
  const {glove, plate} = gauntletGeometries();
  for (const geo of [glove, plate]) geo.computeBoundingBox();
  const box = new THREE.Box3().union(glove.boundingBox).union(plate.boundingBox), size = box.getSize(new THREE.Vector3());
  assert(size.x < .2 && size.y < .14 && size.z < .24, JSON.stringify(size));
  assert(box.max.z > .04, 'fingers and thumb reach round the front of the grip');
  assert(box.min.z < -.1, 'the cuff sits behind the palm where the forearm arrives');
  assert(box.min.y > -.075 && box.max.y < .075, 'the hand stays within the grip height, cuff included');
});

test('four fingers and a thumb: the glove has finger segments, not a block', () => {
  const {glove} = gauntletGeometries();
  assert(glove.attributes.position.count > 1200, 'jointed finger geometry');
});

test('the fingers curl into a fist, tips tucked back toward the palm, with one flush lame each rather than stacked plates', () => {
  const {glove, plate} = gauntletGeometries();
  glove.computeBoundingBox(); plate.computeBoundingBox();
  assert(glove.boundingBox.max.z < .06, 'no finger sticks out straight: ' + glove.boundingBox.max.z.toFixed(3));
  assert(plate.boundingBox.max.z < .045, 'the plates stop at the first finger joints: ' + plate.boundingBox.max.z.toFixed(3));
  assert(plate.attributes.position.count < 1100, 'one lame per finger, not three: ' + plate.attributes.position.count);
});

test('the empty shield hand hangs like the weapon hand instead of gripping an invisible shield', () => {
  const src = readFileSync(new URL('./main.js', import.meta.url), 'utf8');
  assert.match(src, /function showShield\(\)\{shieldRoot\.visible=shieldWorn&&!offhandWeapon;if\(shieldRoot\.visible\|\|offhandWeapon\)shieldHand\.rotation\.set\(\.35,-\.2,-\.12\);else shieldHand\.rotation\.set\(Math\.PI\/4\+\.65,\.2,\.12\);\}/);
});
