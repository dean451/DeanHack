import * as THREE from 'three';

// A thin ground mist that clings to every grave in the scene (grave.js names its group 'Grave').
// Each grave gets a few faint, flat wisps lying just above the soil. They drift slowly round the
// mound, over its flanks and the kerb, on their own lazy loops. They swell and thin, and fade in
// and out out of step, so the mist never stands still and never all vanishes at once. It stays
// low, so it wraps round the mound's crown rather than covering it, and it stays inside the tile.
// A grave is terrain, not an item, so nothing here can give away anything unidentified.
// The scene is re-scanned twice a second. The wisps are added as a child group of the grave
// ('GraveMist'); when a grave leaves the scene, or on restore(), they're removed and their
// materials disposed. The soft-edged texture and the quad are shared by every wisp.
// Everything is a function of t, so it's frame-rate independent.

export const MIST_SCAN_EVERY = .5; // seconds between scene scans
export const MIST_WISPS = 5; // wisps per grave
export const MIST_OPACITY = .16; // peak opacity of a wisp
export const MIST_Y = [.05, .12]; // wisp heights above the tile floor
export const MIST_REACH = .46; // a wisp's soft edge stays within this of the tile centre
export const MIST_SIZE = .22; // base width of a wisp
export const MIST_FADE_EVERY = 9; // seconds in one wisp's fade cycle

let sharedGeo = null, sharedTex = null;
function shared() {
  if (!sharedGeo) {
    sharedGeo = new THREE.PlaneGeometry(1, 1);
    sharedGeo.rotateX(-Math.PI / 2);
    // Soft radial blob with a little lumpiness, so a wisp isn't a perfect disc.
    const n = 64, data = new Uint8Array(n * n * 4);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = (i + .5) / n * 2 - 1, y = (j + .5) / n * 2 - 1, a = Math.atan2(y, x);
      const r = Math.hypot(x, y) / (1 + .12 * Math.sin(a * 3 + 1) + .07 * Math.sin(a * 5 + 4));
      const f = Math.max(0, 1 - r), k = (i + j * n) * 4;
      data[k] = data[k + 1] = data[k + 2] = 255;
      data[k + 3] = Math.round(255 * f * f * (3 - 2 * f));
    }
    sharedTex = new THREE.DataTexture(data, n, n);
    sharedTex.magFilter = sharedTex.minFilter = THREE.LinearFilter;
    sharedTex.needsUpdate = true;
  }
  return {geo: sharedGeo, tex: sharedTex};
}

function hash(n) {
  const x = Math.sin(n * 91.345 + 17.17) * 43758.5453;
  return x - Math.floor(x);
}

// Pose of wisp i of a grave with the given phase at time t, in the grave's frame.
export function wispState(t, i, phase = 0) {
  const h = k => hash(i * 13.7 + k + phase * 3.1);
  const size = MIST_SIZE * (.75 + h(1) * .5) * (1 + .12 * Math.sin(t * (.21 + h(2) * .1) + h(3) * 6.28));
  const stretch = 1.3 + h(4) * .35;
  // A lazy loop round the mound (which runs along z): wider along z than x, with its own speed
  // and direction, and a slow wobble on the radius.
  const dir = h(5) < .5 ? -1 : 1, w = (.045 + h(6) * .035) * dir, a = t * w + h(7) * 6.28 + phase;
  const wob = 1 + .25 * Math.sin(t * (.13 + h(8) * .08) + h(9) * 6.28);
  const rx = .15 + h(10) * .08, rz = .2 + h(11) * .1;
  // Keep the whole blob (its visible edge is at most half its long side from its centre)
  // inside MIST_REACH, by pulling the centre in onto a circle.
  const half = size * stretch / 2, lim = Math.max(0, MIST_REACH - half);
  let x = Math.cos(a) * rx * wob, z = .05 + Math.sin(a) * rz * wob;
  const d = Math.hypot(x, z);
  if (d > lim) { x *= lim / d;z *= lim / d; }
  const y = MIST_Y[0] + (MIST_Y[1] - MIST_Y[0]) * (i + .5) / MIST_WISPS + .006 * Math.sin(t * .4 + h(12) * 6.28);
  // Fade: a smooth rise and fall over MIST_FADE_EVERY, each wisp at its own point in the cycle,
  // with a floor so the mist thins but rarely vanishes.
  const f = .5 - .5 * Math.cos((t / MIST_FADE_EVERY + i / MIST_WISPS + h(13) * .3 + phase) * Math.PI * 2);
  const opacity = MIST_OPACITY * (.25 + .75 * f);
  const spin = a + Math.PI / 2 + .3 * Math.sin(t * .1 + h(14) * 6.28);
  return {x, y, z, sx: size * stretch, sz: size, spin, opacity};
}

function phaseOf(obj) {
  const x = Math.sin(obj.id * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function attachMist(grave) {
  const {geo, tex} = shared(), group = new THREE.Group();
  group.name = 'GraveMist';
  for (let i = 0; i < MIST_WISPS; i++) {
    const m = new THREE.MeshBasicMaterial({color: 0xc8d2dc, map: tex, transparent: true, opacity: 0, depthWrite: false, fog: true});
    const mesh = new THREE.Mesh(geo, m);
    mesh.renderOrder = 2;mesh.castShadow = mesh.receiveShadow = false;mesh.userData.wisp = i;
    group.add(mesh);
  }
  group.userData.dispose = () => { for (const mesh of group.children) mesh.material.dispose(); };
  grave.add(group);
  grave.userData.mistPhase ??= phaseOf(grave);
  return group;
}

export function poseMist(group, t, phase = 0) {
  for (const mesh of group.children) {
    const s = wispState(t, mesh.userData.wisp, phase);
    mesh.position.set(s.x, s.y, s.z);
    mesh.rotation.y = s.spin;
    mesh.scale.set(s.sx, 1, s.sz);
    mesh.material.opacity = s.opacity;
  }
}

export function detachMist(group) {
  group.userData.dispose();
  group.removeFromParent();
}

export function findGraves(scene) {
  const out = [];
  scene.traverse(o => { if (o.name === 'Grave') out.push(o); });
  return out;
}

export function createGraveMist(scene) {
  let mists = new Map(), nextScan = -Infinity;
  return {
    get mists() { return mists; },
    update(t) {
      if (t >= nextScan || t < nextScan - MIST_SCAN_EVERY * 2) {
        const found = new Set(findGraves(scene)), next = new Map();
        for (const [grave, group] of mists) if (found.has(grave) && group.parent === grave) next.set(grave, group);else detachMist(group);
        for (const grave of found) if (!next.has(grave)) next.set(grave, attachMist(grave));
        mists = next;nextScan = t + MIST_SCAN_EVERY;
      }
      for (const [grave, group] of mists) if (grave.visible) poseMist(group, t, grave.userData.mistPhase);
    },
    restore() { for (const group of mists.values()) detachMist(group);mists = new Map();nextScan = -Infinity; },
  };
}
