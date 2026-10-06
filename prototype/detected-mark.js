import * as THREE from 'three';

// An object the hero knows of without having seen its square (the potion of object detection,
// a crystal ball) has no lit floor under it, so on its own it would be a dark shape in the dark.
// This pale ring lies flat around it and glows regardless of the light, so every detected item
// can be found across the level. It is removed when the hero sees the square for themselves.
export const RING_INNER = 0.24;
export const RING_OUTER = 0.33;

export function createDetectedMark() {
  const g = new THREE.Group();
  g.name = 'detected-mark';
  const material = new THREE.MeshBasicMaterial({color: 0xd9cfa0, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false, side: THREE.DoubleSide});
  const ring = new THREE.Mesh(new THREE.RingGeometry(RING_INNER, RING_OUTER, 32), material);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  const core = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), material);
  core.rotation.x = -Math.PI / 2;
  core.position.y = 0.031;
  g.add(ring, core);
  g.userData.dispose = () => { ring.geometry.dispose(); core.geometry.dispose(); material.dispose(); };
  return g;
}

// Keep an item's mark in step with whether its cell is only sensed. Returns true if a mark is showing.
export function syncDetectedMark(item, sensed) {
  const mark = item.userData.detectedMark;
  if (sensed && !mark) {
    const m = createDetectedMark();
    item.userData.detectedMark = m;
    item.add(m);
    return true;
  }
  if (!sensed && mark) {
    mark.userData.dispose();
    item.remove(mark);
    item.userData.detectedMark = null;
    return false;
  }
  return !!mark;
}
