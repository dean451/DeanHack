// Branch moods: each part of the dungeon should feel like a different place, not just deeper. This
// adds to the air of branch-air.js (grit, drips, embers, ash) and its stone tints:
// - The Gnomish Mines: warm dust hanging in the hero's lantern light, brightest close to the hero and
//   gone a couple of squares out; and pickaxe scars, pale fresh-cut gouges with dark grooves, on some
//   wall faces. A wall gets the same scars every time it is seen (a hash of its square and face).
// - Sokoban: a sterile puzzle box. Crisp, cool, faint grid lines along the floor squares, and the
//   drifting cave dust (cavern.js) is taken out of the still air.
// - Gehennom: heat. A few faint layers of shimmering haze above the floor around the hero, the bands
//   wavering and creeping up through them. (The ash now falls; see branch-air.js.)
// Other branches get nothing from here.
//
// No lights: the glow and haze are additive, the scars and grid are plain unlit-cheap meshes. One
// draw each, rebuilt only when the level or the set of known squares changes.
import * as THREE from 'three';

export function moodFor(dungeon = '') {
  if (/gnomish mines/i.test(dungeon)) return 'mines';
  if (/sokoban/i.test(dungeon)) return 'sokoban';
  return /gehennom/i.test(dungeon) ? 'gehennom' : null;
}

export const hash = (x, z, k = 0) => {
  let h = (x * 374761393 + z * 668265263 + k * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
};

const FACES = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const SCAR_ONE_IN = 4;
// Pickaxe scars: on the faces of known walls that look onto open ground, one face in SCAR_ONE_IN.
// `squares` maps "x,z" (dungeon coordinates) to a type ('wall' or anything open). Each scar is a few
// parallel gouges struck at one angle, as one swing after another would leave them.
export function scarPlan(squares) {
  const out = [];
  for (const [id, type] of squares) {
    if (type !== 'wall') continue;
    const [x, z] = id.split(',').map(Number);
    FACES.forEach(([dx, dz], f) => {
      const n = squares.get(`${x + dx},${z + dz}`);
      if (!n || n === 'wall') return;
      const h = hash(x, z, f + 1);
      if (h % SCAR_ONE_IN) return;
      const count = 2 + (h >>> 3) % 3, angle = (((h >>> 6) % 100) / 100 - .5) * 1.4 + ((h >>> 13) % 2 ? .6 : -.6);
      const cy = .18 + ((h >>> 9) % 100) / 100 * .26, cu = (((h >>> 16) % 100) / 100 - .5) * .4;
      const gouges = [];
      for (let i = 0; i < count; i++) {
        const g = hash(x, z, f * 13 + i + 50);
        gouges.push({u: cu + (i - (count - 1) / 2) * .055 + ((g % 100) / 100 - .5) * .02, y: cy + ((g >>> 8) % 100) / 100 * .03,
          len: .13 + ((g >>> 4) % 100) / 100 * .12});
      }
      out.push({x, z, dx, dz, angle, gouges});
    });
  }
  return out;
}

// Sokoban's grid: the edges of the open squares, each once. Returns [x0, z0, x1, z1] segments in
// dungeon coordinates on the half-square boundaries.
export function gridEdges(squares) {
  const seen = new Set(), out = [];
  for (const [id, type] of squares) {
    if (type === 'wall') continue;
    const [x, z] = id.split(',').map(Number);
    for (const [ax, az, bx, bz] of [[x - .5, z - .5, x + .5, z - .5], [x - .5, z + .5, x + .5, z + .5], [x - .5, z - .5, x - .5, z + .5], [x + .5, z - .5, x + .5, z + .5]]) {
      const k = `${ax},${az},${bx},${bz}`;
      if (seen.has(k)) continue;
      seen.add(k); out.push([ax, az, bx, bz]);
    }
  }
  return out;
}

// The lantern dust's brightness by distance from the hero: full near, gone by GLOW_REACH.
export const GLOW_REACH = 2.2;
export const glowAt = d => { const v = 1 - d / GLOW_REACH; return v <= 0 ? 0 : v * v; };

const WALL_HALF = .486, FLOOR_TOP = -.026;
const SCAR_DARK = [.13, .11, .09], SCAR_PALE = [.62, .58, .5];

function scarMesh(plan, origin) {
  const pos = [], col = [];
  const quad = (a, b, c, d, rgb) => { for (const p of [a, b, c, a, c, d]) { pos.push(...p); col.push(...rgb); } };
  for (const s of plan) {
    // the face plane: the centre of the wall's side, the u axis along it, pushed a hair off the stone
    const cx = s.x - origin.x + s.dx * (WALL_HALF + .004), cz = s.z - origin.z + s.dz * (WALL_HALF + .004);
    const ux = -s.dz, uz = s.dx, ca = Math.cos(s.angle), sa = Math.sin(s.angle);
    for (const g of s.gouges) {
      const p = (u, y) => [cx + ux * u, y, cz + uz * u];
      const half = g.len / 2, du = ca * half, dy = sa * half;
      // pale chipped rim, then the dark groove inside it
      for (const [w, rgb, lift] of [[.024, SCAR_PALE, 0], [.011, SCAR_DARK, .002]]) {
        const nu = -sa * w / 2, ny = ca * w / 2, ox = s.dx * lift, oz = s.dz * lift;
        const P = (u, y) => { const q = p(u, y); return [q[0] + ox, q[1], q[2] + oz]; };
        quad(P(g.u - du + nu, g.y - dy + ny), P(g.u + du + nu, g.y + dy + ny), P(g.u + du - nu, g.y + dy - ny), P(g.u - du - nu, g.y - dy - ny), rgb);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({vertexColors: true, roughness: 1, metalness: 0, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2}));
  m.name = 'Pickaxe scars'; m.castShadow = m.receiveShadow = false;
  return m;
}

function gridMesh(edges, origin) {
  const pos = [];
  for (const [ax, az, bx, bz] of edges) pos.push(ax - origin.x, FLOOR_TOP, az - origin.z, bx - origin.x, FLOOR_TOP, bz - origin.z);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const m = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({color: '#b9d2e6', transparent: true, opacity: .32, depthWrite: false}));
  m.name = 'Sokoban grid';
  return m;
}

export const DUST = 70;
function glowTexture() {
  const n = 16, data = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const d = Math.hypot((i + .5) / n * 2 - 1, (j + .5) / n * 2 - 1), k = (j * n + i) * 4, a = Math.max(0, 1 - d);
    data[k] = data[k + 1] = data[k + 2] = 255; data[k + 3] = Math.round(a * a * 255);
  }
  const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat); t.needsUpdate = true; return t;
}

const HAZE_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const HAZE_FRAG = `uniform float uTime; uniform float uLayer; varying vec2 vUv;
void main(){
  vec2 p = (vUv - .5) * 12.0;
  float r = length(p);
  float edge = smoothstep(6.0, 2.5, r);
  float w = sin(p.x * 2.3 + sin(p.y * 1.7 + uTime * 1.3 + uLayer) * 1.4 + uTime * .9)
          * sin(p.y * 2.1 - uTime * 1.1 + sin(p.x * 1.3 - uTime * .7) * 1.2);
  float band = smoothstep(.35, 1.0, w);
  gl_FragColor = vec4(vec3(1.0, .42, .14) * band * edge * (.2 - uLayer * .05), 1.0);
}`;

export function createBranchMood({group, cavernMotes = null}) {
  const root = new THREE.Group(); root.name = 'Branch mood'; group.add(root);
  let mood = null, signature = '', scars = null, grid = null;

  // lantern dust (Mines)
  const dustGeo = new THREE.BufferGeometry(), dustPos = new Float32Array(DUST * 3), dustCol = new Float32Array(DUST * 3), dustSeed = [];
  for (let i = 0; i < DUST; i++) dustSeed.push({x: 0, y: 0, z: 0, ph: (i * 2.399) % 6.28, sp: .5 + (i * .618) % 1});
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute('color', new THREE.BufferAttribute(dustCol, 3));
  dustGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({size: .07, map: glowTexture(), vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending}));
  dust.name = 'Lantern dust'; dust.frustumCulled = false; dust.visible = false; root.add(dust);
  let dustSeeded = false;
  const seedDust = hero => {
    dustSeed.forEach((d, i) => { const a = i * 2.399, r = Math.sqrt((i + .5) / DUST) * GLOW_REACH; d.x = hero.x + Math.cos(a) * r; d.z = hero.z + Math.sin(a) * r; d.y = .15 + ((i * .37) % 1) * 1.5; });
    dustSeeded = true;
  };

  // heat haze (Gehennom): three stacked layers round the hero
  const hazeMats = [], haze = new THREE.Group(); haze.name = 'Heat haze'; haze.visible = false; root.add(haze);
  [.06, .32, .62].forEach((y, i) => {
    const m = new THREE.ShaderMaterial({uniforms: {uTime: {value: 0}, uLayer: {value: i}}, vertexShader: HAZE_VERT, fragmentShader: HAZE_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending});
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), m); plane.rotation.x = -Math.PI / 2; plane.position.y = y; plane.renderOrder = 2;
    hazeMats.push(m); haze.add(plane);
  });

  function drop(m) { if (!m) return; root.remove(m); m.geometry.dispose(); m.material.dispose(); }

  return {
    root,
    get mood() { return mood; },
    get scars() { return scars; },
    get grid() { return grid; },
    get dust() { return dust; },
    get haze() { return haze; },
    // Each engine frame: the branch, the known squares (live.js tiles: "x,z" -> tile with userData.type) and the origin.
    frame(dungeon, tiles, origin) {
      const next = moodFor(dungeon);
      if (next !== mood) { mood = next; dustSeeded = false; signature = ''; }
      dust.visible = mood === 'mines'; haze.visible = mood === 'gehennom';
      if (cavernMotes) cavernMotes.visible = mood !== 'sokoban';
      const sig = `${mood}:${origin.x},${origin.z}:${tiles.size}`;
      if (sig === signature) return;
      signature = sig;
      drop(scars); drop(grid); scars = grid = null;
      if (mood !== 'mines' && mood !== 'sokoban') return;
      const squares = new Map();
      for (const [id, t] of tiles) squares.set(id, t.userData?.type === 'wall' ? 'wall' : 'open');
      if (mood === 'mines') { const plan = scarPlan(squares); if (plan.length) { scars = scarMesh(plan, origin); root.add(scars); } }
      else { const edges = gridEdges(squares); if (edges.length) { grid = gridMesh(edges, origin); root.add(grid); } }
    },
    update(t, dt, hero) {
      if (mood === 'gehennom') { haze.position.set(hero.x, 0, hero.z); for (const m of hazeMats) m.uniforms.uTime.value = t; }
      if (mood !== 'mines') return;
      if (!dustSeeded) seedDust(hero);
      dustSeed.forEach((d, i) => {
        d.x += Math.sin(t * .3 * d.sp + d.ph) * .05 * dt; d.z += Math.cos(t * .27 * d.sp + d.ph) * .05 * dt; d.y += Math.sin(t * .5 + d.ph) * .03 * dt;
        // keep the motes in the lamp's reach: one that drifts (or is walked) out comes back in on the far side
        let ox = d.x - hero.x, oz = d.z - hero.z, r = Math.hypot(ox, oz);
        if (r > GLOW_REACH) { d.x = hero.x - ox / r * (GLOW_REACH - .05); d.z = hero.z - oz / r * (GLOW_REACH - .05); ox = d.x - hero.x; oz = d.z - hero.z; r = Math.hypot(ox, oz); }
        const g = glowAt(Math.hypot(r, d.y - .8)) * (.75 + .25 * Math.sin(t * 1.3 + d.ph));
        dustPos[i * 3] = d.x; dustPos[i * 3 + 1] = d.y; dustPos[i * 3 + 2] = d.z;
        dustCol[i * 3] = 1 * g; dustCol[i * 3 + 1] = .72 * g; dustCol[i * 3 + 2] = .38 * g;
      });
      dustGeo.attributes.position.needsUpdate = dustGeo.attributes.color.needsUpdate = true;
    },
    dispose() { drop(scars); drop(grid); dustGeo.dispose(); dust.material.map.dispose(); dust.material.dispose(); for (const p of haze.children) { p.geometry.dispose(); p.material.dispose(); } group.remove(root); },
  };
}
