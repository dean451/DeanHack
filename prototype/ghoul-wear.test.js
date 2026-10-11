import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('the ghoul has a chewed left ear: its head reaches farther right than left', () => {
  const c = createCreature({name: 'ghoul', symbol: 90, color: 1});
  c.g.updateMatrixWorld(true);
  let head = null;
  c.g.traverse(o => { if (o.isMesh && o.userData.part === 'head') head = o; });
  head.geometry.computeBoundingBox();
  const b = head.geometry.boundingBox;
  assert(b.max.x > -b.min.x + 0.01, 'the right ear is whole, the left a stub');
});
