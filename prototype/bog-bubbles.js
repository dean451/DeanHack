import * as THREE from 'three';

// Marsh gas comes up through the bog's pools (bog.js names its group 'Bog' and hands over its
// pool shapes as userData.pools). Now and then a glossy dome of gas swells on the black water
// at a spot near a pool's middle, bulges for a moment and pops. A pale ring spreads from where
// it was and fades into the water before it reaches the rim. Each pool has two slots on
// long, uneven rests, so a pool gurgles every few seconds and never boils.
// The bog is terrain, so nothing here gives anything away.
// All bogs share two instanced meshes at the scene root (the domes and the rings): two draws
// however much swamp is on screen. The scene is re-scanned twice a second; each frame the
// instances are placed through each bog's world matrix, so they follow the level if it moves,
// and a bog that is hidden (or whose cell is) shows nothing. Everything is a function of t,
// so it's frame-rate independent. restore() removes the meshes.

export const BUBBLE_SCAN_EVERY = .5; // seconds between scene scans
export const BUBBLE_SLOTS = 2; // bubble slots per pool
export const BUBBLE_SWELL = [.4, 1.1]; // seconds a dome takes to swell before it pops
export const BUBBLE_SIZE = [.009, .022]; // dome radius when it pops
export const BUBBLE_GAP = [2.5, 8]; // seconds of rest before the slot bubbles again
export const BUBBLE_SPOT = .3; // domes rise within this fraction of the pool's radius
export const RING_LIFE = [.8, 1.3]; // seconds a ring takes to spread and fade
export const RING_RIM = .72; // the pool rim is at least this fraction of its radius (bog.js wobble)
export const RING_OPACITY = .5;
export const BUBBLE_MAX = 1024; // instances per mesh; slots past this are left out

const PALE = new THREE.Color(0x8e9672), DARK = new THREE.Color(0x10140c);

function hash(n) {
  const x = Math.sin(n * 91.345 + 17.17) * 43758.5453;
  return x - Math.floor(x);
}
const lerp = (a, b, u) => a + (b - a) * u;

// Slot i of a pool ({x,z,r,sx}, bog-local) at time t. Dome: `size` > 0 while it swells.
// Ring: `ring` is its radius (0 when there is none) and `fade` its strength, 1 → 0.
export function bubbleState(t, i, pool, phase = 0) {
  const h = k => hash(i * 23.1 + k + phase * 7.3);
  const swell = lerp(BUBBLE_SWELL[0], BUBBLE_SWELL[1], h(1)), ringLife = lerp(RING_LIFE[0], RING_LIFE[1], h(2));
  const period = swell + ringLife + lerp(BUBBLE_GAP[0], BUBBLE_GAP[1], h(3));
  const local = t + h(4) * period + phase * 13, cycle = Math.floor(local / period), age = local - cycle * period;
  // A fresh spot and size each time.
  const k = n => hash(i * 23.1 + n + cycle * 4.17 + phase * 7.3);
  const a = k(5) * Math.PI * 2, d = Math.sqrt(k(6)) * BUBBLE_SPOT * pool.r;
  const dx = Math.cos(a) * d * pool.sx, dz = Math.sin(a) * d / pool.sx;
  const x = pool.x + dx, z = pool.z + dz, top = lerp(BUBBLE_SIZE[0], BUBBLE_SIZE[1], k(7));
  // Room for the ring before the nearest the rim can come.
  const reach = Math.max(top * 1.6, RING_RIM * pool.r * Math.min(pool.sx, 1 / pool.sx) - Math.hypot(dx, dz));
  const out = {x, z, size: 0, ring: 0, fade: 0, stage: 'rest'};
  if (age < swell) {
    const u = age / swell;
    // Wells up quickly, then strains a little larger just before it goes.
    out.size = top * (1 - (1 - u) * (1 - u)) * (u > .88 ? 1 + (u - .88) / .12 * .12 : 1) * (1 + Math.sin(u * 19 + k(8) * 6) * .03 * u);
    out.stage = 'dome';
  } else if (age < swell + ringLife) {
    const v = (age - swell) / ringLife;
    out.ring = lerp(top, reach, 1 - (1 - v) * (1 - v));
    out.fade = Math.pow(1 - v, 1.5);
    out.stage = 'ring';
  }
  return out;
}

export function findBogs(scene) {
  const out = [];
  scene.traverse(o => { if (o.isGroup && o.name === 'Bog' && o.userData.pools?.length) out.push(o); });
  return out;
}

function shown(o) {
  for (; o; o = o.parent) if (!o.visible) return false;
  return true;
}

function phaseOf(obj) {
  const x = Math.sin(obj.id * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

let domeGeo = null, ringGeo = null;
function geos() {
  domeGeo ??= new THREE.SphereGeometry(1, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2);
  ringGeo ??= new THREE.RingGeometry(.78, 1, 28).rotateX(-Math.PI / 2);
  return {domeGeo, ringGeo};
}

function makeMeshes(capacity) {
  const {domeGeo, ringGeo} = geos();
  const domeMat = new THREE.MeshStandardMaterial({color: 0x2a311f, roughness: .12, metalness: .15});
  const ringMat = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: RING_OPACITY, depthWrite: false});
  const domes = new THREE.InstancedMesh(domeGeo, domeMat, capacity), rings = new THREE.InstancedMesh(ringGeo, ringMat, capacity);
  for (const m of [domes, rings]) {
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled = false;m.castShadow = false;m.count = 0;
  }
  domes.receiveShadow = true;rings.receiveShadow = false;rings.renderOrder = 2;
  domes.name = 'BogBubbles';rings.name = 'BogRipples';
  rings.setColorAt(0, PALE);
  return {domes, rings, capacity};
}

function freeMeshes(meshes) {
  for (const m of [meshes.domes, meshes.rings]) { m.removeFromParent();m.material.dispose();m.dispose(); }
}

const m4 = new THREE.Matrix4(), local = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

// Writes every shown bog's slots into the two meshes; returns how many slots were placed.
export function poseBubbles(meshes, bogs, t) {
  const {domes, rings, capacity} = meshes;
  let n = 0;
  for (const bog of bogs) {
    if (!shown(bog)) continue;
    const water = bog.userData.water ?? .016, phase = bog.userData.bubblePhase ??= phaseOf(bog);
    bog.userData.pools.forEach((pool, p) => {
      for (let i = 0; i < BUBBLE_SLOTS && n < capacity; i++, n++) {
        const s = bubbleState(t, p * BUBBLE_SLOTS + i, pool, phase);
        if (s.size > 0) domes.setMatrixAt(n, m4.multiplyMatrices(bog.matrixWorld, local.compose(v.set(s.x, water, s.z), q, sc.setScalar(s.size))));
        else domes.setMatrixAt(n, HIDDEN);
        if (s.ring > 0) {
          rings.setMatrixAt(n, m4.multiplyMatrices(bog.matrixWorld, local.compose(v.set(s.x, water + .0015, s.z), q, sc.set(s.ring, 1, s.ring))));
          rings.setColorAt(n, col.copy(DARK).lerp(PALE, s.fade));
        } else rings.setMatrixAt(n, HIDDEN);
      }
    });
  }
  domes.count = rings.count = n;
  domes.instanceMatrix.needsUpdate = rings.instanceMatrix.needsUpdate = true;
  if (rings.instanceColor) rings.instanceColor.needsUpdate = true;
  return n;
}

export function createBogBubbles(scene) {
  let bogs = [], meshes = null, nextScan = -Infinity;
  return {
    get bogs() { return bogs; },
    get meshes() { return meshes; },
    update(t) {
      if (t >= nextScan || t < nextScan - BUBBLE_SCAN_EVERY * 2) {
        bogs = findBogs(scene);nextScan = t + BUBBLE_SCAN_EVERY;
        const need = Math.min(BUBBLE_MAX, bogs.reduce((s, b) => s + b.userData.pools.length * BUBBLE_SLOTS, 0));
        if (need && (!meshes || meshes.capacity < need)) {
          if (meshes) freeMeshes(meshes);
          meshes = makeMeshes(Math.min(BUBBLE_MAX, 2 ** Math.ceil(Math.log2(Math.max(16, need)))));
          scene.add(meshes.domes, meshes.rings);
        }
      }
      if (meshes) poseBubbles(meshes, bogs, t);
    },
    restore() { if (meshes) freeMeshes(meshes);meshes = null;bogs = [];nextScan = -Infinity; },
  };
}
