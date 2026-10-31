// Idle animation only where it can be seen. Every monster on the level ran its whole stack of idle animators each
// frame (gait, fidgets, breathing, the creature's signature behaviours: dozens of calls per monster), on screen or
// not. A monster outside the camera's view that is not walking, acting or dying now skips them for the frame: its
// slide toward its square still runs (so it is in the right place when it comes into view), and its queued
// actions still play. Its layered poses were already taken back at the top of the loop, so it simply rests at its
// base pose until the camera reaches it.
import * as THREE from 'three';

// How far past a monster's position its body can reach (the big ones: dragons, the balrog), so nothing pops.
export const REACH = 2.5;

export function createViewCull({reach = REACH} = {}) {
  const frustum = new THREE.Frustum(), m = new THREE.Matrix4(), sphere = new THREE.Sphere();
  return {
    update(camera) { camera.updateMatrixWorld(); m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(m); },
    sees(object) { object.getWorldPosition(sphere.center); sphere.radius = reach * Math.max(object.scale.x, object.scale.y, object.scale.z, 1); return frustum.intersectsSphere(sphere); },
  };
}

// Whether an actor may skip its idle animators this frame.
export const restsUnseen = (a, walking, cull) => !walking && !a.actions?.current && !a.actions?.queue?.length && !a.actions?.dead && !a.petCat && !cull.sees(a.g);
