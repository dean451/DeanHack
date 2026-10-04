import * as THREE from 'three';

// The altar's brazier (altar.js names its group 'Altar of the Last Ember') comes alive.
// Its glowing coals breathe: their glow swells and sinks on two slow, uneven beats. Sparks
// lift off the heap now and then, one or two at a time, never a steady stream. Each one
// rises on a wandering path, cools from yellow through orange to a dull red, and shrinks
// out before it gets far. A thin grey smoke rises from the coals too: three soft puffs, each
// swelling and thinning as it climbs, leaning a little one way and then the other.
// An altar is terrain, and nothing here depends on its alignment, so it gives nothing away.
// The scene is re-scanned twice a second. The effect is added as a child group of the altar
// ('AltarEmbers'). When an altar leaves the scene, or on restore(), the group is removed, its
// materials are disposed and the coals' glow is put back. Everything is a function of t, so
// it's frame-rate independent. Each altar costs two draws for sparks and three for smoke.

export const EMBER_SCAN_EVERY = .5; // seconds between scene scans
export const EMBER_SPARKS = 9; // sparks per altar
export const EMBER_RISE = [.16, .34]; // how high a spark climbs above the coals
export const EMBER_LIFE = [.9, 1.7]; // seconds a spark lives
export const EMBER_GAP = [1.2, 4.5]; // seconds of rest before it lifts off again
export const EMBER_REACH = .2; // a spark's sideways drift from the brazier centre stays within this
export const EMBER_SIZE = .011; // spark radius at its brightest
export const SMOKE_PUFFS = 3;
export const SMOKE_RISE = .5; // how high a smoke puff climbs before it's gone
export const SMOKE_OPACITY = .09; // peak opacity of a puff
export const SMOKE_SIZE = [.07, .24]; // a puff's width as it leaves the coals, and at the top
export const SMOKE_EVERY = 3.6; // seconds for one puff's climb
export const GLOW_RANGE = [.72, 1.22]; // the coals' glow as a multiple of their own intensity

const HOT = new THREE.Color(0xffe38a), WARM = new THREE.Color(0xff8a24), COLD = new THREE.Color(0x9a1c06);

function hash(n) {
  const x = Math.sin(n * 91.345 + 17.17) * 43758.5453;
  return x - Math.floor(x);
}
const lerp = (a, b, u) => a + (b - a) * u;

// Spark i of an altar with the given phase at time t, relative to the top of the coal heap.
// `life` is 0..1 while it's in the air, and -1 while it rests.
export function sparkState(t, i, phase = 0) {
  const h = k => hash(i * 17.3 + k + phase * 5.7);
  const life = lerp(EMBER_LIFE[0], EMBER_LIFE[1], h(1)), period = life + lerp(EMBER_GAP[0], EMBER_GAP[1], h(2));
  const local = t + h(3) * period + phase * 11, cycle = Math.floor(local / period), age = local - cycle * period;
  if (age >= life) return {x: 0, y: 0, z: 0, size: 0, heat: 0, life: -1};
  // A fresh start, height and sway for each flight.
  const k = n => hash(i * 17.3 + n + cycle * 3.91 + phase * 5.7);
  const u = age / life, a0 = k(4) * Math.PI * 2, r0 = Math.sqrt(k(5)) * .055;
  const rise = lerp(EMBER_RISE[0], EMBER_RISE[1], k(6));
  // Quick off the coals, slowing near the top.
  const y = rise * (1 - (1 - u) * (1 - u));
  const lean = (k(7) - .5) * .12, wa = k(8) * 6.28, wf = 5 + k(9) * 4;
  let x = Math.cos(a0) * r0 + lean * u + Math.sin(u * wf + wa) * .025 * u;
  let z = Math.sin(a0) * r0 + lean * .6 * u + Math.cos(u * wf * .8 + wa) * .025 * u;
  const d = Math.hypot(x, z);
  if (d > EMBER_REACH) { x *= EMBER_REACH / d;z *= EMBER_REACH / d; }
  // Pops in over the first tenth, shrinks away over the last half.
  const size = EMBER_SIZE * Math.min(1, u / .1) * Math.min(1, (1 - u) / .5) * (.7 + .5 * k(10));
  return {x, y, z, size, heat: 1 - u, life: u};
}

// Smoke puff i at time t: position relative to the top of the coal heap, width and opacity.
export function smokeState(t, i, phase = 0) {
  const u = ((t / SMOKE_EVERY + i / SMOKE_PUFFS + phase) % 1 + 1) % 1;
  const sway = Math.sin(t * .37 + phase * 6.28) * .5 + Math.sin(t * .83 + i + phase * 3) * .3;
  const x = sway * .06 * u, z = Math.cos(t * .29 + i * 2 + phase * 4) * .03 * u;
  const y = .02 + SMOKE_RISE * u;
  const size = lerp(SMOKE_SIZE[0], SMOKE_SIZE[1], Math.sqrt(u));
  // Fades in off the coals, thins out as it spreads.
  const opacity = SMOKE_OPACITY * Math.min(1, u / .15) * Math.pow(1 - u, 1.4);
  return {x, y, z, size, opacity};
}

// The coals' glow multiplier: two slow, out-of-step beats and a faint shimmer.
export function glowAt(t, phase = 0) {
  const w = .5 + .3 * Math.sin(t * .9 + phase * 6.28) + .15 * Math.sin(t * 2.3 + phase * 9) + .05 * Math.sin(t * 7.1 + phase * 3);
  return lerp(GLOW_RANGE[0], GLOW_RANGE[1], Math.min(1, Math.max(0, w)));
}

let sharedSpark = null, sharedSmoke = null;
function sparkGeo() { return sharedSpark ??= new THREE.SphereGeometry(1, 6, 4); }
function smokeTex() {
  if (!sharedSmoke) {
    const n = 48, data = new Uint8Array(n * n * 4);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = (i + .5) / n * 2 - 1, y = (j + .5) / n * 2 - 1, a = Math.atan2(y, x);
      const r = Math.hypot(x, y) / (1 + .1 * Math.sin(a * 3 + 2) + .06 * Math.sin(a * 5));
      const f = Math.max(0, 1 - r), k = (i + j * n) * 4;
      data[k] = data[k + 1] = data[k + 2] = 255;
      data[k + 3] = Math.round(255 * f * f * (3 - 2 * f));
    }
    sharedSmoke = new THREE.DataTexture(data, n, n);
    sharedSmoke.magFilter = sharedSmoke.minFilter = THREE.LinearFilter;
    sharedSmoke.needsUpdate = true;
  }
  return sharedSmoke;
}

function phaseOf(obj) {
  const x = Math.sin(obj.id * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function attachEmbers(altar) {
  const b = altar.userData.brazier ?? {x: 0, y: .43, z: .02};
  const group = new THREE.Group();
  group.name = 'AltarEmbers';group.position.set(b.x, b.y, b.z);
  const sparkMat = new THREE.MeshBasicMaterial({color: 0xffffff, toneMapped: false});
  const sparks = new THREE.InstancedMesh(sparkGeo(), sparkMat, EMBER_SPARKS);
  sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < EMBER_SPARKS; i++) sparks.setColorAt(i, HOT);
  sparks.frustumCulled = false;sparks.castShadow = sparks.receiveShadow = false;sparks.userData.part = 'sparks';
  group.add(sparks);
  const puffs = [];
  for (let i = 0; i < SMOKE_PUFFS; i++) {
    const m = new THREE.SpriteMaterial({color: 0x8a8580, map: smokeTex(), transparent: true, opacity: 0, depthWrite: false});
    const s = new THREE.Sprite(m);s.renderOrder = 2;s.userData.puff = i;puffs.push(s);group.add(s);
  }
  // The coals' own material, so their glow can breathe; its intensity is put back on detach.
  let coals = null;
  altar.traverse(o => { if (!coals && o.isMesh && o.userData.part === 'coals') coals = o.material; });
  const baseGlow = coals?.emissiveIntensity ?? 0;
  group.userData.sparks = sparks;group.userData.puffs = puffs;
  group.userData.coals = coals;group.userData.baseGlow = baseGlow;
  group.userData.dispose = () => {
    if (coals) coals.emissiveIntensity = baseGlow;
    sparkMat.dispose();sparks.dispose();
    for (const s of puffs) s.material.dispose();
  };
  altar.add(group);
  altar.userData.emberPhase ??= phaseOf(altar);
  return group;
}

const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
export function poseEmbers(group, t, phase = 0) {
  const {sparks, puffs, coals, baseGlow} = group.userData;
  for (let i = 0; i < EMBER_SPARKS; i++) {
    const s = sparkState(t, i, phase);
    sparks.setMatrixAt(i, m4.compose(v.set(s.x, s.y, s.z), q, sc.setScalar(Math.max(s.size, 1e-5))));
    // Cools yellow → orange → dull red.
    if (s.heat > .5) col.copy(WARM).lerp(HOT, (s.heat - .5) * 2);else col.copy(COLD).lerp(WARM, s.heat * 2);
    sparks.setColorAt(i, col);
  }
  sparks.instanceMatrix.needsUpdate = true;
  if (sparks.instanceColor) sparks.instanceColor.needsUpdate = true;
  for (const p of puffs) {
    const s = smokeState(t, p.userData.puff, phase);
    p.position.set(s.x, s.y, s.z);p.scale.setScalar(s.size);p.material.opacity = s.opacity;
    p.material.rotation = t * .15 + p.userData.puff * 2.1;
  }
  if (coals) coals.emissiveIntensity = baseGlow * glowAt(t, phase);
}

export function detachEmbers(group) {
  group.userData.dispose();
  group.removeFromParent();
}

export function findAltars(scene) {
  const out = [];
  scene.traverse(o => { if (o.isGroup && o.name === 'Altar of the Last Ember') out.push(o); });
  return out;
}

export function createAltarEmbers(scene) {
  let embers = new Map(), nextScan = -Infinity;
  return {
    get embers() { return embers; },
    update(t) {
      if (t >= nextScan || t < nextScan - EMBER_SCAN_EVERY * 2) {
        const found = new Set(findAltars(scene)), next = new Map();
        for (const [altar, group] of embers) if (found.has(altar) && group.parent === altar) next.set(altar, group);else detachEmbers(group);
        for (const altar of found) if (!next.has(altar)) next.set(altar, attachEmbers(altar));
        embers = next;nextScan = t + EMBER_SCAN_EVERY;
      }
      for (const [altar, group] of embers) if (altar.visible) poseEmbers(group, t, altar.userData.emberPhase);
    },
    restore() { for (const group of embers.values()) detachEmbers(group);embers = new Map();nextScan = -Infinity; },
  };
}
