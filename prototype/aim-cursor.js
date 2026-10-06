import * as THREE from 'three';

// Choosing a spot: the centre of a stinking cloud, a travel destination, anywhere the game says
// "Move cursor to ...". The engine owns the cursor and sends its square with the position request
// (`cursor`), so the client can draw it in the world and on the minimap, and can walk it to a
// square the player clicks by sending the same keys the player would.

// getpos() steps: h j k l y u b n move one square, the capitals move eight.
const STEP = {h: [-1, 0], j: [0, 1], k: [0, -1], l: [1, 0], y: [-1, -1], u: [1, -1], b: [-1, 1], n: [1, 1]};

// The key codes that walk a cursor from `from` to `to` and then select it with '.'.
export function aimKeys(from, to) {
  const keys = [];
  let dx = to.x - from.x, dz = to.z - from.z;
  const diag = (sx, sz) => ({'-1,-1': 'y', '1,-1': 'u', '-1,1': 'b', '1,1': 'n'})[`${sx},${sz}`];
  const walk = (key, n) => { for (let i = 0; i < n; i++) keys.push(key); };
  const sx = Math.sign(dx), sz = Math.sign(dz);
  const both = Math.min(Math.abs(dx), Math.abs(dz));
  if (both) {
    const d = diag(sx, sz);
    walk(d.toUpperCase(), Math.floor(both / 8));
    walk(d, both % 8);
    dx -= sx * both; dz -= sz * both;
  }
  if (dx) { const k = dx > 0 ? 'l' : 'h'; walk(k.toUpperCase(), Math.floor(Math.abs(dx) / 8)); walk(k, Math.abs(dx) % 8); }
  if (dz) { const k = dz > 0 ? 'j' : 'k'; walk(k.toUpperCase(), Math.floor(Math.abs(dz) / 8)); walk(k, Math.abs(dz) % 8); }
  return [...keys.map(k => k.charCodeAt(0)), 46];
}

// What those keys do to a cursor (used by the tests, and a check on the key table above).
export function walkCursor(from, codes) {
  let {x, z} = from;
  for (const c of codes) {
    const ch = String.fromCharCode(c);
    const step = STEP[ch.toLowerCase()];
    if (!step || ch === '.') continue;
    const n = ch === ch.toUpperCase() ? 8 : 1;
    x += step[0] * n; z += step[1] * n;
  }
  return {x, z};
}

export function createAimCursor() {
  const g = new THREE.Group();
  g.name = 'aim-cursor';
  g.visible = false;
  const material = new THREE.MeshBasicMaterial({color: 0xfff0b8, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide});
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.47, 4, 1, Math.PI / 4), material);   // a square ring
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  ring.renderOrder = 30;
  const tick = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12), material);
  tick.rotation.x = -Math.PI / 2;
  tick.position.y = 0.051;
  tick.renderOrder = 30;
  g.add(ring, tick);
  return {
    g,
    show(x, z) { g.position.set(x, 0, z); g.visible = true; },
    hide() { g.visible = false; },
    update(t) { if (g.visible) { const s = 1 + 0.07 * Math.sin(t * 5); ring.scale.set(s, s, 1); material.opacity = 0.7 + 0.2 * Math.sin(t * 5); } },
    dispose() { ring.geometry.dispose(); tick.geometry.dispose(); material.dispose(); },
  };
}
