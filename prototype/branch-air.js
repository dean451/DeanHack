// Branch atmosphere: the air of each part of the dungeon. The Gnomish Mines are cold, grimy and
// wet: grey grit sifts down out of the dark ceiling, and now and then a bead of water falls fast and
// is gone. Gehennom lifts embers and ash on the heat. Sokoban holds a few still flecks of cold stone dust. Other branches have no air of their own yet (`airFor` returns null).
//
// One Points cloud of PARTICLES around the hero in a box that wraps as the hero moves: one draw
// call, no lights, no per-tile cost. Plain alpha blending (not additive) so grit stays dull.
import * as THREE from 'three';

export const PARTICLES = 54;
export const HALF = 6;      // half-width of the box around the hero (tiles)
export const TOP = 3.4;     // ceiling of the box above the floor
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

export const MINES = {
  grit: {count: 42, fall: .1, sway: .05, color: [.5, .47, .42], alpha: .55},
  drip: {count: 12, fall: 2.6, sway: 0, color: [.55, .66, .72], alpha: .8},
};

// Gehennom: embers and black ash lift off the floor on the heat and drift sideways.
export const GEHENNOM = {
  ember: {count: 30, fall: -.35, sway: .25, color: [.95, .38, .1], alpha: .8},
  ash: {count: 24, fall: -.08, sway: .12, color: [.18, .14, .13], alpha: .6},
};

// Sokoban: stark and still. A few cold, pale flecks of cut-stone dust hang almost motionless in the
// dead air of the puzzle rooms; nothing drips, nothing burns.
export const SOKOBAN = {
  dust: {count: 14, fall: .03, sway: .02, color: [.74, .78, .84], alpha: .4},
};

export function airFor(dungeon = '') {
  if (/gnomish mines/i.test(dungeon)) return MINES;
  if (/sokoban/i.test(dungeon)) return SOKOBAN;
  return /gehennom/i.test(dungeon) ? GEHENNOM : null;
}

// The rock mass round the level (`cavern.js`) multiplies its stone texture by this colour: the Mines
// are grimy brown-grey, Sokoban a stark cold blue-grey. Other branches keep the plain stone.
export const ROCK_TINTS = {
  mines: [1.12, .98, .8],
  sokoban: [.82, .94, 1.14],
};
export function rockTint(dungeon = '') {
  if (/gnomish mines/i.test(dungeon)) return ROCK_TINTS.mines;
  return /sokoban/i.test(dungeon) ? ROCK_TINTS.sokoban : [1, 1, 1];
}

// How rough the rock is. The Mines seep: wet stone catches the torchlight in a dull sheen. Sokoban's
// cut stone is a little smoother and cleaner than the open cave. Other branches keep full roughness.
export const ROCK_ROUGHNESS = {mines: .62, sokoban: .85};
export function rockRoughness(dungeon = '') {
  if (/gnomish mines/i.test(dungeon)) return ROCK_ROUGHNESS.mines;
  return /sokoban/i.test(dungeon) ? ROCK_ROUGHNESS.sokoban : 1;
}

// Mineral veins: one Mines rock in nine is shot through with a dull copper-green ore that picks up the
// torchlight. `h` is the rock's hash; returns an instance colour multiplier, or null for plain stone.
export const MINES_VEIN = [1.9, 1.6, 1.2];
export function rockVein(dungeon = '', h = 0) {
  return /gnomish mines/i.test(dungeon) && h % 9 === 0 ? MINES_VEIN : null;
}

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

function texture() {
  const n = 8, data = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const d = Math.hypot((i + .5) / n * 2 - 1, (j + .5) / n * 2 - 1), k = (j * n + i) * 4;
    data[k] = data[k + 1] = data[k + 2] = 255; data[k + 3] = Math.round(clamp01(1.2 - d) * 255);
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

export function createBranchAir({group}) {
  const st = {seed: 90210, air: null, dots: [], hero: new THREE.Vector3()};
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLES * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(PARTICLES * 3), 3));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
  const mat = new THREE.PointsMaterial({size: .05, map: texture(), vertexColors: true, transparent: true,
    opacity: .7, depthWrite: false, sizeAttenuation: true});
  const points = new THREE.Points(geo, mat);
  points.name = 'Branch air'; points.frustumCulled = false; points.visible = false;
  points.castShadow = points.receiveShadow = false;
  group.add(points);

  function scatter(hero) {
    st.dots = [];
    const kinds = Object.values(st.air);
    for (const kind of kinds) for (let i = 0; i < kind.count && st.dots.length < PARTICLES; i++)
      st.dots.push({kind, x: hero.x + (rand(st) * 2 - 1) * HALF, y: rand(st) * TOP, z: hero.z + (rand(st) * 2 - 1) * HALF, ph: rand(st) * 6.28});
    const col = geo.attributes.color;
    st.dots.forEach((d, i) => col.setXYZ(i, ...d.kind.color));
    col.needsUpdate = true;
  }

  return {
    points,
    get air() { return st.air; },
    setBranch(dungeon, hero = st.hero) {
      const air = airFor(dungeon);
      if (air === st.air) return;
      st.air = air; points.visible = !!air;
      if (air) scatter(hero);
    },
    update(t, dt, hero) {
      if (!st.air) return;
      st.hero.copy(hero);
      const pos = geo.attributes.position;
      st.dots.forEach((d, i) => {
        d.y -= d.kind.fall * dt;
        d.x += Math.sin(t * .6 + d.ph) * d.kind.sway * dt;
        if (d.y > TOP) { d.y -= TOP; d.x = hero.x + (rand(st) * 2 - 1) * HALF; d.z = hero.z + (rand(st) * 2 - 1) * HALF; }
        if (d.y < 0) { d.y += TOP; d.x = hero.x + (rand(st) * 2 - 1) * HALF; d.z = hero.z + (rand(st) * 2 - 1) * HALF; }
        // wrap into the box around the hero as they walk
        d.x = hero.x + ((d.x - hero.x + HALF * 3) % (HALF * 2) + HALF * 2) % (HALF * 2) - HALF;
        d.z = hero.z + ((d.z - hero.z + HALF * 3) % (HALF * 2) + HALF * 2) % (HALF * 2) - HALF;
        pos.setXYZ(i, d.x, d.y, d.z);
      });
      for (let i = st.dots.length; i < PARTICLES; i++) pos.setXYZ(i, 0, -50, 0);
      pos.needsUpdate = true;
    },
    dispose() { geo.dispose(); mat.map.dispose(); mat.dispose(); group.remove(points); },
  };
}
