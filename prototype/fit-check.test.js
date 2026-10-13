import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {surfaceGap} from './fit-check.js';

// A neck: a cylinder of radius .05. A fitted collar hugs it; the old pet-cat collar was a hoop
// tilted and set off the neck, gaping out on one side.
const neck = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .1, 24, 6));
const ring = (r, {x = 0, tilt = 0} = {}) => {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, .006, 6, 24));
  m.rotation.x = Math.PI / 2 + tilt; m.position.x = x; return m;
};

test('a collar fitted to the neck passes; a floating, tilted hoop fails', () => {
  assert(surfaceGap(ring(.054), neck) < .012, 'fitted');
  assert(surfaceGap(ring(.066, {x: .02, tilt: .5}), neck) > .02, 'floating hoop');
});
