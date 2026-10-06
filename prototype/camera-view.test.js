import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {captureView, restoreView} from './camera-view.js';

const rig = (pos, target) => ({camera: {position: new THREE.Vector3(...pos)}, controls: {target: new THREE.Vector3(...target)}});

test('a new level keeps the zoom and angle the player chose, around the re-centred hero', () => {
  const {camera, controls} = rig([14, 12, 3], [4, 0, 1]);       // zoomed and orbited by the player
  const view = captureView(camera, controls);
  controls.target.set(0, 0, 0);                                  // the new level re-centres on the hero
  restoreView(camera, controls, view, [9, 10.7, 13.1]);
  assert.deepEqual(camera.position.toArray(), [10, 12, 2]);
  assert.equal(camera.position.distanceTo(controls.target), Math.hypot(10, 12, 2));
});

test('with nothing to keep (the first level) the default view is used', () => {
  const {camera, controls} = rig([0, 0, 0], [0, 0, 0]);
  restoreView(camera, controls, null, [9, 10.7, 13.1]);
  assert.deepEqual(camera.position.toArray(), [9, 10.7, 13.1]);
});
