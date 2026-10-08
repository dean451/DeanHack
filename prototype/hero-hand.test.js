import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
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
