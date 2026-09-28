// Rays (motion queue item 11, part 1). Replays the zap beams in the bridge's fx stream
// (fx.js timelines): each type of ray gets its own core and glow, travels along the cells
// NetHack actually drew, and throws sparks where it bounces off a wall or ricochets back
// off something that reflects it. The trail fades out after the beam ends instead of
// vanishing. World marks (scorches, ice), mirror flashes and the digging beam come later.
//
// rayFrame() and raySparks() are pure, so they can be tested without a renderer;
// createRays() draws them with two instanced meshes and one point cloud.

// Ray cells are 1 tile long; they sit at chest height.
export const RAY_Y = .5;
// A lit cell fades out over this long once its beam ends (ms).
export const RAY_FADE_MS = 160;
// Sparks from a bounce live this long (ms).
export const SPARK_MS = 320;
export const SPARKS_PER_BOUNCE = 12;

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
  return effect?.kind === 'zap' ? RAY_LOOKS[effect.zap] ?? null : null;
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
      segs.push({x: s.x, z: s.z, yaw: DIR_YAW[s.effect.dir] ?? 0, look, head: i === head && t < s.until,
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

const MAX_SEGS = 96, MAX_SPARKS = 96;

// Draws queued ray timelines. play(timeline) starts one now; update(dt, origin) advances
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
  for (const m of [core, glow, sparks]) { m.frustumCulled = false; m.renderOrder = 5; m.userData.part = 'rays'; parent.add(m); }
  core.count = glow.count = 0; sparkGeo.setDrawRange(0, 0);
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scale = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0), color = new THREE.Color();
  const playing = [];

  function play(timeline) {
    if (!rayRuns(timeline).length) return false;
    playing.push({timeline, bounces: rayBounces(timeline), t: 0});
    return true;
  }

  function update(dt, origin) {
    let n = 0, p = 0;
    const ox = origin?.x ?? 0, oz = origin?.z ?? 0;
    for (let i = playing.length - 1; i >= 0; i--) {
      const r = playing[i];
      r.t += dt * 1000;
      if (r.t > r.timeline.duration + Math.max(RAY_FADE_MS, SPARK_MS)) { playing.splice(i, 1); continue; }
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
      for (const s of raySparks(r.bounces, r.t)) {
        if (p >= MAX_SPARKS) break;
        sparkPos.set([s.x - ox, s.y, s.z - oz], p * 3);
        color.setHex(s.color).multiplyScalar(s.alpha);
        sparkCol.set([color.r, color.g, color.b], p * 3);
        p++;
      }
    }
    core.count = glow.count = n;
    for (const m of [core, glow]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    sparkGeo.setDrawRange(0, p);
    sparkGeo.attributes.position.needsUpdate = sparkGeo.attributes.color.needsUpdate = true;
    return n + p;
  }

  const clear = () => { playing.length = 0; update(0); };
  const dispose = () => {
    for (const m of [core, glow, sparks]) parent.remove(m);
    box.dispose(); sparkGeo.dispose(); coreMat.dispose(); glowMat.dispose(); sparks.material.dispose();
  };
  return {play, update, clear, dispose, core, glow, sparks, get active() { return playing.length; }};
}
