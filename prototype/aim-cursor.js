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

// The squares a straight line from `from` to `to` crosses, both ends left out (Bresenham), capped
// at `max` squares so a far cursor does not draw a long trail.
export function aimLine(from, to, max = 24) {
  const out = [];
  let x = from.x, z = from.z;
  const dx = Math.abs(to.x - x), dz = Math.abs(to.z - z), sx = Math.sign(to.x - x), sz = Math.sign(to.z - z);
  let err = dx - dz;
  while (!(x === to.x && z === to.z) && out.length <= max) {
    const e2 = 2 * err;
    if (e2 > -dz) { err -= dz; x += sx; }
    if (e2 < dx) { err += dx; z += sz; }
    if (!(x === to.x && z === to.z)) out.push({x, z});
  }
  return out.slice(0, max);
}

// "In what direction?" (zap, throw, fire, kick, apply a digger...): the eight lanes the choice
// can take, each a run of squares from the hero up to `range`, stopped short at the first solid
// square. `solid(x, z)` says whether a square blocks.
export const isDirectionPrompt = text => /direction/i.test(text ?? '');
export function directionLanes(from, solid, range = 8) {
  const lanes = [];
  for (const [dx, dz] of Object.values(STEP)) {
    const lane = [];
    for (let i = 1; i <= range; i++) {
      const x = from.x + dx * i, z = from.z + dz * i;
      if (solid(x, z)) break;
      lane.push({x, z});
    }
    lanes.push(lane);
  }
  return lanes;
}

// The first monster square on each lane (a pet is skipped: you rarely mean to hit it), so the
// prompt can mark what each direction would strike. `isMonster(x, z)` says whether one stands there.
export function laneHits(lanes, isMonster) {
  return lanes.map(lane => lane.find(p => isMonster(p.x, p.z))).filter(Boolean);
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
  // A trail of small dots from the hero to the cursor, so the path to the chosen square reads at a glance.
  const dotGeo = new THREE.CircleGeometry(0.05, 8), dots = [];
  const dot = i => {
    if (!dots[i]) { const d = new THREE.Mesh(dotGeo, material); d.rotation.x = -Math.PI / 2; d.renderOrder = 30; g.parent?.add(d); dots[i] = d; }
    return dots[i];
  };
  // Square brackets round whatever a direction lane would hit (kept apart from the cursor ring).
  const marks = [];
  const mark = i => {
    if (!marks[i]) { const m = new THREE.Mesh(ring.geometry, material); m.rotation.x = -Math.PI / 2; m.renderOrder = 30; g.parent?.add(m); marks[i] = m; }
    return marks[i];
  };
  const hideDots = () => { dots.forEach(d => { d.visible = false; }); marks.forEach(m => { m.visible = false; }); };
  return {
    g,
    show(x, z, from) {
      g.position.set(x, 0, z); g.visible = true;
      hideDots();
      if (!from) return;
      aimLine({x: Math.round(from.x), z: Math.round(from.z)}, {x: Math.round(x), z: Math.round(z)}).forEach((p, i) => { const d = dot(i); d.position.set(p.x, 0.05, p.z); d.visible = true; });
    },
    // Dim dots along every lane of a direction prompt (world squares, already relative to the scene).
    lanes(points, hits = []) {
      g.visible = false; hideDots();
      points.forEach((p, i) => { const d = dot(i); d.position.set(p.x, 0.05, p.z); d.visible = true; });
      hits.forEach((p, i) => { const m = mark(i); m.position.set(p.x, 0.052, p.z); m.visible = true; });
    },
    hide() { g.visible = false; hideDots(); },
    update(t) { if (g.visible) { const s = 1 + 0.07 * Math.sin(t * 5); ring.scale.set(s, s, 1); material.opacity = 0.7 + 0.2 * Math.sin(t * 5); } },
    dispose() { ring.geometry.dispose(); tick.geometry.dispose(); dotGeo.dispose(); material.dispose(); [...dots, ...marks].forEach(d => d.parent?.remove(d)); },
  };
}
