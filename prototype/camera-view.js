// The camera's orbit and zoom belong to the player, not to the level. Walking onto a new
// level re-centres the map on the hero, but the angle and distance they chose stay.
import * as THREE from 'three';

// How far the camera sits from its target, as an offset; null before there is a level to keep.
export function captureView(camera, controls) {
  return camera.position.clone().sub(controls.target);
}

// Put the camera at `view` from the (already re-centred) target, or at `fallback` when there
// was nothing to keep (the first level of a session).
export function restoreView(camera, controls, view, fallback) {
  const offset = view ?? new THREE.Vector3(...fallback);
  camera.position.copy(controls.target).add(offset);
}
