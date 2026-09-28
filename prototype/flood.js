// Floods (motion queue item 13). The scroll of flood (do_flood in read.c) and an
// overflowing fountain (gush in fountain.c) turn floor round the hero into pools in one
// go, with no tmp_at, so the bridge's fx stream never sees them: the next frame just has
// water where there was floor. A confused scroll of flood (undo_flood) does the reverse.
// Here a frame-to-frame diff finds those cells, and they become a set-piece: a foaming
// wavefront rushes out from the hero, each cell fills with a crest and a splash of spray
// as the front reaches it, then settles flat before the real pool takes over. Drained
// cells sink away with a few bubbles.
//
// floodChange() and floodFrame() are pure, so they can be tested without a renderer;
// createFlood() draws them with two instanced meshes, a ring and one point cloud.

// The wavefront's speed (ms per tile) and how long a cell takes to settle once reached.
export const FRONT_MS_PER_TILE = 85;
export const SETTLE_MS = 420;
// A drained cell sinks over this long, the far ones slightly after the near ones.
export const DRAIN_MS = 650;
export const SPRAY_PER_CELL = 5;
// The crest's peak height above the floor and the resting sheet's height (tiles).
export const CREST_H = .16;
export const SHEET_Y = .03;
export const MAX_CELLS = 96;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const hash = (a, b = 0, c = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
const smooth = k => k * k * (3 - 2 * k);
const key = (x, z) => `${x},${z}`;

// Cells that turned from seen floor into water (surge) or from water into floor (drain)
// between two frames of the same level. Only cells visible in the new frame count, so
// water that is merely newly seen isn't mistaken for a flood. Returns null when nothing
// changed, else {kind, x, z, cells:[{x, z, d}], duration} centred on the hero, nearest
// cells first.
export function floodChange(prev, next) {
  if (!prev?.cells || !next?.cells || !next.player) return null;
  if (prev.branch !== next.branch || prev.depth !== next.depth) return null;
  const before = new Map();
  for (const c of prev.cells) before.set(key(c.x, c.z), c.terrain);
  const hx = next.player.x, hz = next.player.z;
  const surge = [], drain = [];
  for (const c of next.cells) {
    if (!c.visible) continue;
    const was = before.get(key(c.x, c.z));
    const d = Math.hypot(c.x - hx, c.z - hz);
    if (was === 'floor' && c.terrain === 'water') surge.push({x: c.x, z: c.z, d});
    else if (was === 'water' && c.terrain === 'floor') drain.push({x: c.x, z: c.z, d});
  }
  const pick = surge.length >= drain.length ? {kind: 'surge', cells: surge} : {kind: 'drain', cells: drain};
  if (!pick.cells.length) return null;
  pick.cells.sort((a, b) => a.d - b.d);
  pick.cells.length = Math.min(pick.cells.length, MAX_CELLS);
  const far = pick.cells.at(-1).d;
  const duration = pick.kind === 'surge' ? far * FRONT_MS_PER_TILE + SETTLE_MS : DRAIN_MS + far * 30;
  return {kind: pick.kind, x: hx, z: hz, cells: pick.cells, far, duration};
}

// When the front reaches a cell (ms after the start).
export const reachMs = d => d * FRONT_MS_PER_TILE;

// One cell at a given age: fill 0..1 (sheet size), h (surface height), foam 0..1.
function surgeCell(c, age) {
  const k = (age - reachMs(c.d)) / SETTLE_MS;
  if (k < 0) return {fill: 0, h: 0, foam: 0};
  if (k >= 1) return {fill: 1, h: SHEET_Y, foam: 0};
  const fill = smooth(clamp01(k * 2.2));
  // A crest that rises fast, overshoots and rocks down to the flat sheet.
  const crest = Math.sin(Math.min(k * 3, 1) * Math.PI) * (1 - k) + Math.sin(k * 9) * .12 * (1 - k);
  return {fill, h: SHEET_Y + CREST_H * Math.max(0, crest), foam: clamp01(1.4 * (1 - k)) * fill};
}

function drainCell(c, age) {
  const k = clamp01((age - c.d * 30) / DRAIN_MS);
  const fill = 1 - smooth(k);
  return {fill, h: SHEET_Y * fill - .02 * k, foam: k > 0 && k < 1 ? .35 * Math.sin(k * Math.PI) : 0};
}

// The flood at a given age (ms), or null once it's over. front is the foam ring's radius
// and alpha (surge only). spray is a list of droplets (surge) or bubbles (drain), in tiles
// relative to the flood's centre.
export function floodFrame(flood, age) {
  if (!flood || !(age >= 0) || age >= flood.duration) return null;
  const surge = flood.kind === 'surge';
  const cells = flood.cells.map(c => ({x: c.x, z: c.z, ...(surge ? surgeCell(c, age) : drainCell(c, age))}));
  const r = age / FRONT_MS_PER_TILE;
  const front = surge ? {r: Math.min(r, flood.far + .6), alpha: clamp01(1 - r / (flood.far + 1.2)) * .9} : null;
  const spray = [];
  flood.cells.forEach((c, i) => {
    const start = surge ? reachMs(c.d) : c.d * 30 + DRAIN_MS * .2;
    const life = surge ? 520 : 380;
    const t = (age - start) / life;
    if (t < 0 || t >= 1) return;
    for (let j = 0; j < SPRAY_PER_CELL; j++) {
      const a = hash(i, j, 1) * Math.PI * 2, s = hash(i, j, 2);
      const sec = t * life / 1000;
      if (surge) {
        // Thrown up and outward, away from the hero, and falling back.
        const out = c.d > 0 ? [(c.x - flood.x) / c.d, (c.z - flood.z) / c.d] : [0, 0];
        const vx = Math.cos(a) * .6 * s + out[0] * .9, vz = Math.sin(a) * .6 * s + out[1] * .9;
        const vy = 1.4 + 1.2 * hash(i, j, 3);
        const y = SHEET_Y + vy * sec - 4.9 * sec * sec;
        if (y < 0) continue;
        spray.push({x: c.x - flood.x + vx * sec, y, z: c.z - flood.z + vz * sec, alpha: 1 - t});
      } else {
        // Bubbles rising a little from the sinking water and popping.
        spray.push({x: c.x - flood.x + (hash(i, j, 4) - .5) * .7, y: .02 + .18 * t * s, z: c.z - flood.z + (hash(i, j, 5) - .5) * .7, alpha: Math.sin(t * Math.PI) * .7});
      }
    }
  });
  return {kind: flood.kind, cells, front, spray};
}

const MAX_FLOODS = 2;
const MAX_SPRAY = MAX_CELLS * SPRAY_PER_CELL;

// Draws floods. add(prevFrame, nextFrame) starts one if the diff finds any, and returns
// it (or null). update(dt, origin) advances them and returns {count, cells, spray}.
// pending(x, z) is true while a surging cell hasn't filled yet or a drained one hasn't
// emptied, so the caller can hide the real pool (or show it) until the set-piece is done.
export function createFlood(THREE, parent) {
  const sheetGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const foamGeo = new THREE.CircleGeometry(.5, 14).rotateX(-Math.PI / 2);
  const sheetMat = new THREE.MeshStandardMaterial({color: 0x2f6f9a, emissive: 0x0c2a40, roughness: .12, metalness: .05,
    transparent: true, opacity: .78, depthWrite: false});
  const foamMat = new THREE.MeshBasicMaterial({color: 0xe8f6ff, transparent: true, opacity: .7, depthWrite: false, toneMapped: false});
  const inst = (geo, mat) => {
    const m = new THREE.InstancedMesh(geo, mat, MAX_FLOODS * MAX_CELLS);
    m.count = 0; m.frustumCulled = false; m.renderOrder = 2; m.userData.part = 'flood';
    parent.add(m);
    return m;
  };
  const sheets = inst(sheetGeo, sheetMat), foams = inst(foamGeo, foamMat);
  const ringGeo = new THREE.RingGeometry(.86, 1, 48, 1).rotateX(-Math.PI / 2);
  const rings = Array.from({length: MAX_FLOODS}, () => {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({color: 0xf0faff, transparent: true, depthWrite: false, toneMapped: false}));
    m.visible = false; m.frustumCulled = false; m.renderOrder = 2; m.userData.part = 'flood-front';
    parent.add(m);
    return m;
  });
  const sprayPos = new Float32Array(MAX_FLOODS * MAX_SPRAY * 3), sprayCol = new Float32Array(MAX_FLOODS * MAX_SPRAY * 3);
  const sprayGeo = new THREE.BufferGeometry();
  sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
  sprayGeo.setAttribute('color', new THREE.BufferAttribute(sprayCol, 3));
  sprayGeo.setDrawRange(0, 0);
  const spray = new THREE.Points(sprayGeo, new THREE.PointsMaterial({size: .07, vertexColors: true, transparent: true,
    depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending}));
  spray.frustumCulled = false; spray.renderOrder = 2; spray.userData.part = 'flood-spray';
  parent.add(spray);

  const floods = [];
  const waiting = new Map();
  let now = 0;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();

  function add(prev, next) {
    const f = floodChange(prev, next);
    if (!f) return null;
    floods.push({...f, t: now});
    if (floods.length > MAX_FLOODS) floods.shift();
    return f;
  }

  function update(dt, origin) {
    now += (dt || 0) * 1000;
    const ox = origin?.x ?? 0, oz = origin?.z ?? 0;
    for (let i = floods.length - 1; i >= 0; i--) if (now - floods[i].t >= floods[i].duration) floods.splice(i, 1);
    waiting.clear();
    let n = 0, fm = 0, e = 0, count = 0;
    rings.forEach(r => { r.visible = false; });
    floods.forEach((f, fi) => {
      const fr = floodFrame(f, now - f.t);
      if (!fr) return;
      count++;
      const cx = f.x - ox, cz = f.z - oz;
      for (const c of fr.cells) {
        if (f.kind === 'surge' ? c.fill < 1 : c.fill > 0) waiting.set(key(c.x, c.z), true);
        if (c.fill <= .002) continue;
        p.set(c.x - ox, c.h, c.z - oz); s.set(c.fill, 1, c.fill);
        sheets.setMatrixAt(n++, m4.compose(p, q, s));
        if (c.foam > .02) {
          p.y = c.h + .004; s.set(c.foam * 1.1, 1, c.foam * 1.1);
          foams.setMatrixAt(fm++, m4.compose(p, q, s));
        }
      }
      if (fr.front && fr.front.alpha > .002) {
        const ring = rings[fi];
        ring.visible = true;
        ring.position.set(cx, SHEET_Y + .01, cz); ring.scale.set(fr.front.r, 1, fr.front.r);
        ring.material.opacity = fr.front.alpha;
      }
      for (const d of fr.spray) {
        if (e >= MAX_FLOODS * MAX_SPRAY) break;
        sprayPos.set([cx + d.x, d.y, cz + d.z], e * 3);
        // Additive points: fade by scaling the colour down.
        sprayCol.set([.78 * d.alpha, .9 * d.alpha, 1 * d.alpha], e * 3);
        e++;
      }
    });
    sheets.count = n; foams.count = fm;
    sheets.instanceMatrix.needsUpdate = true; foams.instanceMatrix.needsUpdate = true;
    sprayGeo.setDrawRange(0, e);
    sprayGeo.attributes.position.needsUpdate = true;
    sprayGeo.attributes.color.needsUpdate = true;
    return {count, cells: n, spray: e};
  }

  const pending = (x, z) => waiting.has(key(x, z));
  const clear = () => { floods.length = 0; update(0); };
  const dispose = () => {
    for (const m of [sheets, foams, spray, ...rings]) parent.remove(m);
    for (const r of rings) r.material.dispose();
    sheetGeo.dispose(); foamGeo.dispose(); ringGeo.dispose(); sprayGeo.dispose();
    sheetMat.dispose(); foamMat.dispose(); spray.material.dispose();
  };
  return {add, update, pending, clear, dispose};
}
