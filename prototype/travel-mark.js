import * as THREE from 'three';

// The destination of a click-to-move travel, marked on the floor while the hero walks there. The
// engine runs the whole trip inside one command, so the mark lives from the click until the next
// command prompt (the trip is done, or was interrupted), or until the hero stands on it.

// Pure state: `begin(to)` on the click, `request(kind, player)` for each engine request, `target`
// is the square to mark or null.
export function createTravelState() {
  let target = null;
  return {
    get target() { return target; },
    begin(to) { target = to ? {x: to.x, z: to.z} : null; },
    // The position prompt that answers the click keeps the mark; the next command prompt ends it.
    request(kind, player) {
      if (kind === 'command') target = null;
      else if (target && player && player.x === target.x && player.z === target.z) target = null;
      return target;
    },
    clear() { target = null; },
  };
}

// A cold, hard-edged diamond that contracts onto the square in uneven beats, so it reads as a
// brand on the floor rather than a friendly marker.
export function createTravelMark() {
  const g = new THREE.Group();
  g.name = 'travel-mark';
  g.visible = false;
  const material = new THREE.MeshBasicMaterial({color: 0xb8c4d8, transparent: true, opacity: 0.8, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide});
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.37, 4, 1, 0), material);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.045;
  ring.renderOrder = 29;
  g.add(ring);
  return {
    g,
    show(x, z) { g.position.set(x, 0, z); g.visible = true; },
    hide() { g.visible = false; },
    // Contracts in two jerks, then hangs a moment too long before starting again.
    update(t) {
      if (!g.visible) return;
      const p = (t * 1.1) % 1;
      const s = p < 0.35 ? 1.5 - 0.5 * (p / 0.35) : p < 0.5 ? 1 : p < 0.65 ? 1 + 0.25 * ((p - 0.5) / 0.15) : 1.25;
      ring.scale.set(s, s, 1);
      material.opacity = 0.55 + 0.3 * (1.5 - Math.min(s, 1.5)) / 0.5;
    },
    dispose() { ring.geometry.dispose(); material.dispose(); },
  };
}
