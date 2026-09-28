// Rays (motion queue item 11, part 1). Replays the zap beams in the bridge's fx stream
// (fx.js timelines): each type of ray gets its own core and glow, travels along the cells
// NetHack actually drew, and throws sparks where it bounces off a wall or ricochets back
// off something that reflects it. The trail fades out after the beam ends instead of
// vanishing. When the beam turns straight back on a creature's cell (the hero or a monster
// with reflection), a mirror flash faces the beam there. World marks (scorches, ice) are
// in ray-marks.js.
//
// The digging beam (the bridge's kind 'dig') is drawn too: a short, dusty, earthy bolt
// that sheds grit at every cell it passes, and where it goes through rock, a wall or a
// door, a puff of dust billows out and stone chips tumble to the floor.
//
// rayFrame(), raySparks(), digGrit() and rubble() are pure, so they can be tested
// without a renderer; createRays() draws them with instanced meshes and one point cloud.

// Ray cells are 1 tile long; they sit at chest height.
export const RAY_Y = .5;
// A lit cell fades out over this long once its beam ends (ms).
export const RAY_FADE_MS = 160;
// Sparks from a bounce live this long (ms).
export const SPARK_MS = 320;
export const SPARKS_PER_BOUNCE = 12;
// A mirror flash (a ray reflected off a creature) lasts this long (ms).
export const MIRROR_MS = 280;

// core: the bright centre, drawn solid; glow: the additive halo round it.
// Death is the odd one out, a dark core in a dim violet haze.
export const RAY_LOOKS = {
  'magic missile': {core: 0xe8f0ff, glow: 0x6d8cff, width: .05, glowWidth: .2, flicker: .15, spark: 0xaec4ff},
  fire: {core: 0xfff2c0, glow: 0xff5a14, width: .07, glowWidth: .26, flicker: .3, spark: 0xffa040},
  cold: {core: 0xf2fdff, glow: 0x7fd8ff, width: .05, glowWidth: .22, flicker: .08, spark: 0xd8f6ff},
  sleep: {core: 0xf0e0ff, glow: 0x9a5cff, width: .045, glowWidth: .22, flicker: .1, spark: 0xc9a8ff},
  death: {core: 0x06020a, glow: 0x3b1450, width: .08, glowWidth: .3, flicker: .12, spark: 0x7a4a96, dark: true},
  lightning: {core: 0xffffff, glow: 0xa8d4ff, width: .04, glowWidth: .18, flicker: .6, spark: 0xffffff, jag: .09},
  'poison gas': {core: 0xd8ff9a, glow: 0x5fae22, width: .06, glowWidth: .3, flicker: .1, spark: 0xa6e05a},
  lava: {core: 0xffd070, glow: 0xd8340c, width: .08, glowWidth: .26, flicker: .25, spark: 0xff7a20},
  acid: {core: 0xf4ffb0, glow: 0x9ad61a, width: .05, glowWidth: .22, flicker: .15, spark: 0xd6ff5a},
};

// The digging beam: a tan core in a dusty brown haze that sputters. It has no ray type,
// so it isn't in RAY_LOOKS (breath and ray marks only look there).
export const DIG_LOOK = {core: 0xf0d8a8, glow: 0x8a5a2a, width: .06, glowWidth: .3, flicker: .35, spark: 0xc8a070, dig: true};
// Grit shed by each dug cell, and how long it lives (ms).
export const GRIT_PER_CELL = 6;
export const GRIT_MS = 480;
// A rubble puff where a solid cell is dug out: dust balls and chips, and how long (ms).
export const PUFF_MS = 900;
export const PUFFS_PER_CELL = 4;
export const CHIPS_PER_CELL = 7;
const DUST = [0x8d7a62, 0x7a6a58, 0x9a8870];
const STONE = [0x6f6a64, 0x857d72, 0x5c5650, 0x94897a];

// NetHack's zap glyph direction → yaw of a cell's segment in the x/z plane. The map's y
// is the world's z, so "vertical" runs along z; "\" (lslant) has x and z rising together.
const DIR_YAW = {horizontal: 0, vertical: Math.PI / 2, lslant: Math.PI / 4, rslant: -Math.PI / 4};

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
// Deterministic 0..1 noise from integers, so flicker and sparks replay the same way.
const hash = (a, b = 0, c = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

export function rayLook(effect) {
  if (effect?.kind === 'dig') return DIG_LOOK;
  return effect?.kind === 'zap' ? RAY_LOOKS[effect.zap] ?? null : null;
}

// The digging beam carries no direction, so a cell's yaw comes from its neighbours in
// the run (the step into it, or out of it for the first cell).
function stepYaw(run, i) {
  const a = run[i - 1] ?? run[i], b = run[i - 1] ? run[i] : run[i + 1] ?? run[i];
  const dx = Math.sign(b.x - a.x), dz = Math.sign(b.z - a.z);
  return dx || dz ? Math.atan2(dz, dx) : 0;
}

// The zap cells of a timeline, grouped by sequence in the order they were drawn.
function rayRuns(timeline) {
  const runs = new Map();
  for (const s of timeline?.sprites ?? []) {
    if (!rayLook(s.effect) || !Number.isFinite(s.x) || !Number.isFinite(s.z)) continue;
    if (!runs.has(s.seq)) runs.set(s.seq, []);
    runs.get(s.seq).push(s);
  }
  for (const run of runs.values()) run.sort((a, b) => a.from - b.from);
  return [...runs.values()];
}

// Where a beam turned: a step whose direction differs from the step before it (a wall
// bounce, or a reflection straight back). x/z is the edge it turned at, half a step on
// from the last cell before the turn; `back` is true for a straight reversal.
export function rayBounces(timeline) {
  const out = [];
  for (const run of rayRuns(timeline)) {
    for (let i = 2; i < run.length; i++) {
      const a = run[i - 2], b = run[i - 1], c = run[i];
      const inX = Math.sign(b.x - a.x), inZ = Math.sign(b.z - a.z);
      const outX = Math.sign(c.x - b.x), outZ = Math.sign(c.z - b.z);
      if (!inX && !inZ) continue;
      if (inX === outX && inZ === outZ) continue;
      out.push({x: b.x + inX * .5, z: b.z + inZ * .5, t: c.from, look: rayLook(b.effect),
        inDir: [inX, inZ], outDir: outX || outZ ? [outX, outZ] : [-inX || 0, -inZ || 0],
        back: (outX === -inX && outZ === -inZ) || (!outX && !outZ)});
    }
  }
  return out;
}

// Marks the straight-back bounces that happened on a creature's cell as mirror
// reflections. reflectorAt(x, z) says who is on a map cell ('hero', 'monster' or null);
// walls never hold creatures, so a wall bounce is never taken for a reflection. A mirror
// bounce gets `mirror` ({x, z, dir, who}: the creature's cell and the incoming direction),
// and its sparks move to the creature's face, towards the beam, instead of the far edge.
export function markMirrors(bounces, reflectorAt) {
  if (typeof reflectorAt !== 'function') return bounces;
  for (const b of bounces) {
    if (!b.back) continue;
    const [ix, iz] = b.inDir;
    const cx = b.x - ix * .5, cz = b.z - iz * .5;
    const who = reflectorAt(cx, cz);
    if (!who) continue;
    b.mirror = {x: cx, z: cz, dir: [ix, iz], who};
    b.x = cx - ix * .3; b.z = cz - iz * .3;
  }
  return bounces;
}

// Who stands on map cell x/z in a bridge frame: 'hero', 'monster' (a visible monster or
// pet) or null. This is markMirrors()'s lookup for live play.
export function reflectorAt(frame, x, z) {
  if (!frame) return null;
  if (frame.player?.x === x && frame.player?.z === z) return 'hero';
  for (const c of frame.cells ?? [])
    if (c.x === x && c.z === z && c.visible && (c.kind === 'monster' || c.kind === 'pet')) return 'monster';
  return null;
}

// The mirror flash of one bounce at time t: {x, z, yaw, size, alpha, ring, ringAlpha,
// color} or null. A bright disc facing the beam snaps open and fades; a ring spreads
// from it. yaw turns a disc (which faces +z) to face back along the incoming beam.
export function mirrorFlash(bounce, t) {
  const m = bounce?.mirror;
  if (!m) return null;
  const age = t - bounce.t;
  if (age < 0 || age >= MIRROR_MS) return null;
  const u = age / MIRROR_MS;
  const [ix, iz] = m.dir;
  const open = clamp01(age / 40);
  const L = bounce.look;
  return {x: m.x - ix * .3, z: m.z - iz * .3, yaw: Math.atan2(ix, iz),
    size: .18 + .3 * open * (1 - .4 * u), alpha: open * (1 - u) * (1 - u),
    ring: .2 + .75 * Math.sqrt(u), ringAlpha: (1 - u) * .8,
    color: L.dark ? L.spark : L.glow};
}

// Beam segments lit at time t (ms): {x, z, yaw, look, intensity, head, offset}. The newest
// cell of each beam is its head. Cells fade over RAY_FADE_MS after their `until`.
export function rayFrame(timeline, t) {
  const segs = [];
  for (const run of rayRuns(timeline)) {
    let head = -1;
    for (let i = 0; i < run.length; i++) if (run[i].from <= t) head = i;
    for (let i = 0; i <= head; i++) {
      const s = run[i];
      const fade = t < s.until ? 1 : 1 - clamp01((t - s.until) / RAY_FADE_MS);
      if (fade <= 0) continue;
      const look = rayLook(s.effect);
      // The head arrives bright; older cells settle a little and shimmer.
      const age = t - s.from;
      const settle = .72 + .28 * Math.exp(-age / 90);
      const tick = Math.floor(t / 40);
      const shimmer = 1 - look.flicker * hash(s.x, s.z, tick);
      const offset = look.jag ? (hash(s.x + 3, s.z, tick) * 2 - 1) * look.jag : 0;
      const yaw = look.dig ? stepYaw(run, i) : DIR_YAW[s.effect.dir] ?? 0;
      segs.push({x: s.x, z: s.z, yaw, look, head: i === head && t < s.until,
        intensity: clamp01(fade * settle * shimmer), offset});
    }
  }
  return segs;
}

// Sparks alive at time t from the given bounces: {x, y, z, color, alpha}. Each flies off
// the wall with gravity; a straight-back reflection throws a tighter, brighter burst.
export function raySparks(bounces, t) {
  const out = [];
  for (let b = 0; b < bounces.length; b++) {
    const bounce = bounces[b];
    const age = t - bounce.t;
    if (age < 0 || age >= SPARK_MS) continue;
    const u = age / SPARK_MS, s = age / 1000;
    const [ox, oz] = bounce.outDir;
    for (let i = 0; i < SPARKS_PER_BOUNCE; i++) {
      const spread = bounce.back ? .5 : 1.1;
      const ang = Math.atan2(oz, ox) + (hash(b, i, 1) * 2 - 1) * spread;
      const speed = 1.2 + hash(b, i, 2) * 1.6;
      const up = .4 + hash(b, i, 3) * 1.4;
      const y = RAY_Y + up * s - 4.9 * s * s;
      out.push({x: bounce.x + Math.cos(ang) * speed * s, y: Math.max(.02, y), z: bounce.z + Math.sin(ang) * speed * s,
        color: bounce.look.spark, alpha: (1 - u) * (bounce.back ? 1 : .8)});
    }
  }
  return out;
}

// The cells a digging beam passed through: [{x, z, t, dir: [dx, dz]}], t being when the
// beam reached the cell. solidAt(x, z), if given, is asked about each cell before the dig
// shows on the map; the cells it calls solid get `dug: true` (they're where rubble flies).
export function digCells(timeline, solidAt) {
  const out = [];
  for (const run of rayRuns(timeline)) {
    if (!rayLook(run[0].effect)?.dig) continue;
    for (let i = 0; i < run.length; i++) {
      const s = run[i], yaw = stepYaw(run, i);
      const cell = {x: s.x, z: s.z, t: s.from, dir: [Math.round(Math.cos(yaw)), Math.round(Math.sin(yaw))]};
      if (typeof solidAt === 'function' && solidAt(s.x, s.z)) cell.dug = true;
      out.push(cell);
    }
  }
  return out;
}

// Is map cell x/z solid in a bridge frame (rock, a wall or a closed door)? Unseen or
// missing cells count as rock, which is what a digging beam bores through. This is
// digCells()'s lookup for live play, asked before the frame that shows the tunnel.
export function solidAt(frame, x, z) {
  if (!frame) return false;
  const c = (frame.cells ?? []).find(c => c.x === x && c.z === z);
  return !c || c.terrain === 'wall' || c.terrain === 'unknown' || c.terrain === 'door' || c.terrain === 'tree';
}

// Grit alive at time t: {x, y, z, color, alpha}. Each cell sheds a little sand as the
// beam reaches it; it drifts forward with the beam, spreads and falls.
export function digGrit(cells, t) {
  const out = [];
  for (let c = 0; c < cells.length; c++) {
    const cell = cells[c], age = t - cell.t;
    if (age < 0 || age >= GRIT_MS) continue;
    const u = age / GRIT_MS, s = age / 1000, [dx, dz] = cell.dir;
    for (let i = 0; i < GRIT_PER_CELL; i++) {
      const ang = Math.atan2(dz, dx) + (hash(cell.x, cell.z, i) * 2 - 1) * 2.2;
      const speed = .35 + hash(cell.x, i, 5) * .8;
      const y = RAY_Y + (hash(cell.z, i, 6) - .3) * .12 + (.3 + hash(i, cell.x, 7) * .6) * s - 4.9 * s * s;
      out.push({x: cell.x + Math.cos(ang) * speed * s + dx * .6 * s, y: Math.max(.02, y),
        z: cell.z + Math.sin(ang) * speed * s + dz * .6 * s, color: DIG_LOOK.spark, alpha: (1 - u) * .9});
    }
  }
  return out;
}

// The rubble thrown out of the dug cells at time t: {puffs, chips}. A puff is
// {x, y, z, r, alpha, color}: a dust ball that swells, rises a little and thins out. A
// chip is {x, y, z, size, rx, ry, color}: a stone flake that flies out, bounces once,
// settles on the floor and shrinks away at the end.
export function rubble(cells, t) {
  const puffs = [], chips = [];
  for (const cell of cells) {
    if (!cell.dug) continue;
    const age = t - cell.t;
    if (age < 0 || age >= PUFF_MS) continue;
    const u = age / PUFF_MS, s = age / 1000, [dx, dz] = cell.dir;
    const base = Math.atan2(dz, dx);
    for (let i = 0; i < PUFFS_PER_CELL; i++) {
      // Dust billows out of the cell's faces, most of it back towards the digger.
      const ang = base + Math.PI + (hash(cell.x, cell.z, 20 + i) * 2 - 1) * 1.9;
      const reach = (.25 + .3 * hash(cell.z, i, 21)) * (1 - Math.exp(-age / 180));
      const open = clamp01(age / 70);
      puffs.push({x: cell.x + Math.cos(ang) * reach, y: .22 + .25 * hash(i, cell.x, 22) + .22 * u,
        z: cell.z + Math.sin(ang) * reach, r: (.16 + .1 * hash(cell.x, i, 23)) * (.4 + .9 * Math.sqrt(u)),
        alpha: open * (1 - u) * (1 - u) * .7, color: DUST[i % DUST.length]});
    }
    for (let i = 0; i < CHIPS_PER_CELL; i++) {
      const ang = base + Math.PI + (hash(cell.x, cell.z, 40 + i) * 2 - 1) * 1.6;
      const speed = .8 + 1.1 * hash(cell.z, i, 41), up = .5 + .8 * hash(i, cell.x, 42);
      const size = .035 + .035 * hash(cell.x, i, 43);
      // Out of the wall at knee height, down to the floor (y 0), one small bounce, rest.
      const y0 = .4, land = (up + Math.sqrt(up * up + 19.6 * y0)) / 9.8;
      const up2 = .25 * (9.8 * land - up), land2 = 2 * up2 / 9.8;
      let y, d;
      if (s < land) { y = y0 + up * s - 4.9 * s * s; d = speed * s; }
      else {
        const b = Math.min(s - land, land2);
        y = up2 * b - 4.9 * b * b; d = speed * land + speed * .3 * b;
      }
      const shrink = u < .7 ? 1 : 1 - (u - .7) / .3;
      y = Math.max(0, y) + size * shrink / 2;
      const spin = Math.min(s, land + .15) * (6 + 8 * hash(i, cell.z, 44));
      chips.push({x: cell.x + Math.cos(ang) * d, y, z: cell.z + Math.sin(ang) * d, size: size * shrink,
        rx: spin, ry: hash(cell.x, cell.z, 45 + i) * 6.28 + spin * .5, color: STONE[i % STONE.length]});
    }
  }
  return {puffs, chips};
}

const MAX_SEGS = 96, MAX_SPARKS = 192, MAX_MIRRORS = 8, MAX_PUFFS = 48, MAX_CHIPS = 64;

// Draws queued ray timelines. play(timeline, {reflectorAt, solidAt}) starts one now
// (reflectorAt, if given, is markMirrors()'s lookup and solidAt digCells()'s, in map cells); update(dt, origin) advances
// them and positions everything relative to the level origin, as live.js places tiles.
export function createRays(THREE, parent) {
  const box = new THREE.BoxGeometry(1, 1, 1);
  const coreMat = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, depthWrite: false, toneMapped: false});
  const glowMat = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: .55, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false});
  const core = new THREE.InstancedMesh(box, coreMat, MAX_SEGS);
  const glow = new THREE.InstancedMesh(box, glowMat, MAX_SEGS);
  const sparkGeo = new THREE.BufferGeometry();
  const sparkPos = new Float32Array(MAX_SPARKS * 3), sparkCol = new Float32Array(MAX_SPARKS * 3);
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkCol, 3));
  const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({size: .07, vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false}));
  // Mirror flashes: a disc and a ring per reflection, both white and tinted per instance.
  const disc = new THREE.CircleGeometry(1, 20), ringGeo = new THREE.RingGeometry(.86, 1, 28);
  const flashMat = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false});
  const flash = new THREE.InstancedMesh(disc, flashMat, MAX_MIRRORS);
  const ring = new THREE.InstancedMesh(ringGeo, flashMat, MAX_MIRRORS);
  // Dig rubble: additive dust balls (tinted and faded per instance) and lit stone chips.
  const puffGeo = new THREE.IcosahedronGeometry(1, 1);
  const puffMat = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: .5, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false});
  const puff = new THREE.InstancedMesh(puffGeo, puffMat, MAX_PUFFS);
  const chipGeo = new THREE.BoxGeometry(1, .45, .8);
  const chipMat = new THREE.MeshLambertMaterial({color: 0xffffff});
  const chip = new THREE.InstancedMesh(chipGeo, chipMat, MAX_CHIPS);
  for (const m of [core, glow, sparks, flash, ring, puff, chip]) { m.frustumCulled = false; m.renderOrder = 5; m.userData.part = 'rays'; parent.add(m); }
  core.count = glow.count = flash.count = ring.count = puff.count = chip.count = 0; sparkGeo.setDrawRange(0, 0);
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scale = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0), color = new THREE.Color(), euler = new THREE.Euler();
  const playing = [];

  const white = new THREE.Color(0xffffff);
  function play(timeline, {reflectorAt, solidAt} = {}) {
    if (!rayRuns(timeline).length) return false;
    playing.push({timeline, bounces: markMirrors(rayBounces(timeline), reflectorAt), dig: digCells(timeline, solidAt), t: 0});
    return true;
  }

  function update(dt, origin) {
    let n = 0, p = 0, f = 0, d = 0, c = 0;
    const ox = origin?.x ?? 0, oz = origin?.z ?? 0;
    for (let i = playing.length - 1; i >= 0; i--) {
      const r = playing[i];
      r.t += dt * 1000;
      const tail = r.dig.length ? Math.max(RAY_FADE_MS, GRIT_MS, PUFF_MS) : Math.max(RAY_FADE_MS, SPARK_MS);
      if (r.t > r.timeline.duration + tail) { playing.splice(i, 1); continue; }
      for (const s of rayFrame(r.timeline, r.t)) {
        if (n >= MAX_SEGS) break;
        const L = s.look, k = s.intensity * (s.head ? 1.25 : 1);
        q.setFromAxisAngle(up, -s.yaw);
        const diag = s.yaw % (Math.PI / 2) ? Math.SQRT2 : 1;
        // The perpendicular jag (lightning) shifts the cell sideways, across its own run.
        pos.set(s.x - ox - Math.sin(s.yaw) * s.offset, RAY_Y, s.z - oz + Math.cos(s.yaw) * s.offset);
        matrix.compose(pos, q, scale.set(diag * 1.02, L.width, L.width));
        core.setMatrixAt(n, matrix);
        color.setHex(L.core).multiplyScalar(L.dark ? 1 : Math.min(1.4, k));
        core.setColorAt(n, color);
        matrix.compose(pos, q, scale.set(diag * 1.08, L.glowWidth * (.8 + .4 * k), L.glowWidth * (.8 + .4 * k)));
        glow.setMatrixAt(n, matrix);
        glow.setColorAt(n, color.setHex(L.glow).multiplyScalar(k));
        n++;
      }
      for (const s of [...raySparks(r.bounces, r.t), ...digGrit(r.dig, r.t)]) {
        if (p >= MAX_SPARKS) break;
        sparkPos.set([s.x - ox, s.y, s.z - oz], p * 3);
        color.setHex(s.color).multiplyScalar(s.alpha);
        sparkCol.set([color.r, color.g, color.b], p * 3);
        p++;
      }
      const {puffs, chips} = rubble(r.dig, r.t);
      for (const b of puffs) {
        if (d >= MAX_PUFFS) break;
        pos.set(b.x - ox, b.y, b.z - oz);
        matrix.compose(pos, q.identity(), scale.set(b.r, b.r * .8, b.r));
        puff.setMatrixAt(d, matrix);
        puff.setColorAt(d, color.setHex(b.color).multiplyScalar(b.alpha));
        d++;
      }
      for (const k of chips) {
        if (c >= MAX_CHIPS) break;
        pos.set(k.x - ox, k.y, k.z - oz);
        q.setFromEuler(euler.set(k.rx, k.ry, 0));
        matrix.compose(pos, q, scale.set(k.size, k.size, k.size));
        chip.setMatrixAt(c, matrix);
        chip.setColorAt(c, color.setHex(k.color));
        c++;
      }
      for (const b of r.bounces) {
        const m = f < MAX_MIRRORS && mirrorFlash(b, r.t);
        if (!m) continue;
        q.setFromAxisAngle(up, m.yaw);
        pos.set(m.x - ox, RAY_Y, m.z - oz);
        matrix.compose(pos, q, scale.set(m.size, m.size, m.size));
        flash.setMatrixAt(f, matrix);
        // A silvery white core, tinted towards the ray's colour as it fades.
        flash.setColorAt(f, color.setHex(m.color).lerp(white, .6).multiplyScalar(m.alpha));
        matrix.compose(pos, q, scale.set(m.ring, m.ring, m.ring));
        ring.setMatrixAt(f, matrix);
        ring.setColorAt(f, color.setHex(m.color).lerp(white, .3).multiplyScalar(m.ringAlpha));
        f++;
      }
    }
    core.count = glow.count = n;
    flash.count = ring.count = f;
    puff.count = d; chip.count = c;
    for (const m of [core, glow, flash, ring, puff, chip]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    sparkGeo.setDrawRange(0, p);
    sparkGeo.attributes.position.needsUpdate = sparkGeo.attributes.color.needsUpdate = true;
    return n + p + f + d + c;
  }

  const clear = () => { playing.length = 0; update(0); };
  const dispose = () => {
    for (const m of [core, glow, sparks, flash, ring, puff, chip]) parent.remove(m);
    box.dispose(); sparkGeo.dispose(); coreMat.dispose(); glowMat.dispose(); sparks.material.dispose();
    disc.dispose(); ringGeo.dispose(); flashMat.dispose();
    puffGeo.dispose(); puffMat.dispose(); chipGeo.dispose(); chipMat.dispose();
  };
  return {play, update, clear, dispose, core, glow, sparks, flash, ring, puff, chip, get active() { return playing.length; }};
}
