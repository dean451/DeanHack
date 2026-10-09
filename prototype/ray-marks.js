// Ray world marks (motion queue item 11, part 3). A ray leaves something behind on the
// floor it crossed: fire and lava scorch it with embers that cool, cold rimes it with
// frost that crackles then melts, lightning leaves faint burn streaks and a blinding
// flash, acid etches it, poison gas hangs in a low haze, and a death ray sends a black
// ripple out from every cell it touched. Magic missile pings one small ring that is gone in half a second, and sleep hangs a violet haze that settles slowly.
//
// The marks come from the same fx timelines as rays.js, one per cell (a beam that bounces
// back over a cell marks it once, when it first got there). Terrain changes NetHack makes
// itself (a pool freezing, a web or door burning) arrive with the next map frame; these
// are only the transient marks on top.
//
// rayMarks(), markFrame() and rayFlash() are pure; createRayMarks() draws with two
// instanced flat quads (one normal-blended for dark marks, one additive for glows).

// Marks lie just above the floor, under items and creatures.
export const MARK_Y = .012;
// A lightning flash rises over 25 ms, then fades over this long (ms).
export const FLASH_MS = 220;

// Each part of a mark: shape 0 is a ragged blot, 1 a ring spreading out, 2 soft haze, 3 a
// four-point frost star, 4 a pitted blot (so cold and acid read apart from fire without colour).
// ms is how long it lasts (it holds, then fades over the last `fadeMs`); size is its
// radius at full size in tiles; grow is how long it takes to reach that size (ms).
// add: true draws it additively (glows); otherwise it darkens/tints the floor.
export const MARK_LOOKS = {
  fire: [
    {shape: 0, color: 0x1c0f08, alpha: .72, size: .44, ms: 9000, fadeMs: 3000, grow: 90},
    {shape: 0, color: 0xff5a14, alpha: .9, size: .34, ms: 1400, fadeMs: 1200, grow: 60, add: true},
  ],
  lava: [
    {shape: 0, color: 0x160a06, alpha: .82, size: .48, ms: 12000, fadeMs: 4000, grow: 90},
    {shape: 0, color: 0xff3a0a, alpha: 1, size: .4, ms: 2600, fadeMs: 2200, grow: 60, add: true},
  ],
  cold: [
    {shape: 3, color: 0xdff6ff, alpha: .55, size: .46, ms: 6000, fadeMs: 2500, grow: 160},
    {shape: 1, color: 0xbfeaff, alpha: .8, size: .5, ms: 420, fadeMs: 360, grow: 300, add: true},
  ],
  lightning: [
    {shape: 0, color: 0x24242c, alpha: .38, size: .3, ms: 5000, fadeMs: 2000, grow: 30},
    {shape: 2, color: 0xd8ecff, alpha: .9, size: .6, ms: 260, fadeMs: 240, grow: 20, add: true},
  ],
  acid: [
    {shape: 4, color: 0x3c4a10, alpha: .5, size: .38, ms: 5000, fadeMs: 2000, grow: 200},
    {shape: 2, color: 0x9ad61a, alpha: .5, size: .4, ms: 900, fadeMs: 800, grow: 100, add: true},
  ],
  'poison gas': [
    {shape: 2, color: 0x5fae22, alpha: .45, size: .62, ms: 2400, fadeMs: 1600, grow: 500, add: true},
  ],
  'magic missile': [
    {shape: 1, color: 0x8aa4ff, alpha: .8, size: .3, ms: 520, fadeMs: 400, grow: 260, add: true},
  ],
  sleep: [
    {shape: 2, color: 0x5a3a9a, alpha: .55, size: .55, ms: 3600, fadeMs: 2000, grow: 1100, add: true},
  ],
  death: [
    {shape: 1, color: 0x06020a, alpha: .85, size: .75, ms: 700, fadeMs: 600, grow: 700},
    {shape: 1, color: 0x3b1450, alpha: .6, size: .6, ms: 700, fadeMs: 600, grow: 700, add: true},
  ],
};

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const hash = (a, b = 0, c = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

// The marks a timeline leaves: {x, z, t, type, seed}, one per zap cell whose type marks
// the floor, at the time the beam first reached it. t is in the timeline's ms.
export function rayMarks(timeline) {
  const first = new Map();
  for (const s of timeline?.sprites ?? []) {
    const e = s.effect;
    if (e?.kind !== 'zap' || !MARK_LOOKS[e.zap] || !Number.isFinite(s.x) || !Number.isFinite(s.z)) continue;
    const key = `${s.x},${s.z},${e.zap}`;
    const had = first.get(key);
    if (!had || s.from < had.t) first.set(key, {x: s.x, z: s.z, t: s.from, type: e.zap, seed: hash(s.x, s.z, 9)});
  }
  return [...first.values()].sort((a, b) => a.t - b.t);
}

// How bright the lightning flash is at time t (0..1): it peaks each time the bolt reaches
// a new stretch and fades over FLASH_MS after the last lightning cell.
export function rayFlash(timeline, t) {
  let k = 0;
  for (const s of timeline?.sprites ?? []) {
    if (s.effect?.kind !== 'zap' || s.effect.zap !== 'lightning') continue;
    const age = t - s.from;
    if (age < 0) continue;
    const rise = clamp01(age / 25);
    const fall = clamp01(1 - Math.max(0, age - 25) / FLASH_MS);
    k = Math.max(k, rise * fall * fall);
  }
  return k;
}

// The drawable parts of the given marks at time `now` (same clock as each mark's t):
// {x, z, shape, color, alpha, size, rot, add, seed}. Parts not yet started or finished are
// left out.
export function markFrame(marks, now) {
  const out = [];
  for (const m of marks) {
    const age = now - m.t;
    if (age < 0) continue;
    for (const L of MARK_LOOKS[m.type] ?? []) {
      if (age >= L.ms) continue;
      const fade = clamp01((L.ms - age) / L.fadeMs);
      const grow = clamp01(age / L.grow);
      // Blots pop to size; rings keep spreading and thin out as they go.
      const size = L.shape === 1 ? L.size * (.15 + .85 * grow) : L.size * (.55 + .45 * (1 - (1 - grow) ** 2));
      const ringFade = L.shape === 1 ? 1 - grow * .5 : 1;
      out.push({x: m.x, z: m.z, shape: L.shape, color: L.color, alpha: L.alpha * fade * ringFade,
        size: size * (.9 + .2 * m.seed), rot: m.seed * Math.PI * 2, add: !!L.add, seed: m.seed});
    }
  }
  return out;
}

const MAX_MARKS = 160, MAX_PARTS = 256;

const VERT = `
attribute vec3 aColor; attribute float aAlpha; attribute vec2 aShape;
varying vec2 vUv; varying vec3 vColor; varying float vAlpha; varying vec2 vShape;
void main() {
  vUv = uv * 2.0 - 1.0; vColor = aColor; vAlpha = aAlpha; vShape = aShape;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}`;
// aShape.x: 0 blot, 1 ring, 2 haze, 3 frost star, 4 pitted blot; aShape.y: per-mark seed for the ragged edge.
const FRAG = `
varying vec2 vUv; varying vec3 vColor; varying float vAlpha; varying vec2 vShape;
void main() {
  float r = length(vUv);
  float a = atan(vUv.y, vUv.x);
  float s = vShape.y * 40.0;
  float k;
  if (vShape.x < 0.5) {
    float edge = 0.78 + 0.12 * sin(a * 5.0 + s) + 0.07 * sin(a * 11.0 + s * 2.3);
    float speck = 0.85 + 0.15 * sin(vUv.x * 23.0 + s) * sin(vUv.y * 19.0 - s);
    k = (1.0 - smoothstep(edge - 0.25, edge, r)) * speck;
  } else if (vShape.x < 1.5) {
    k = smoothstep(0.62, 0.84, r) * (1.0 - smoothstep(0.86, 1.0, r));
  } else if (vShape.x < 2.5) {
    k = pow(clamp(1.0 - r, 0.0, 1.0), 1.6);
  } else if (vShape.x < 3.5) {
    float arm = 0.35 + 0.65 * pow(abs(cos(2.0 * a)), 6.0);
    k = 1.0 - smoothstep(arm * 0.8 - 0.2, arm * 0.8, r);
  } else {
    float edge = 0.78 + 0.12 * sin(a * 5.0 + s);
    float pits = smoothstep(0.55, 0.7, sin(vUv.x * 17.0 + s) * sin(vUv.y * 15.0 - s * 1.7) + 0.35);
    k = (1.0 - smoothstep(edge - 0.25, edge, r)) * (1.0 - 0.85 * pits);
  }
  if (k * vAlpha < 0.004) discard;
  gl_FragColor = vec4(vColor, k * vAlpha);
}`;

// Draws ray marks on the floor. add(timeline) queues a timeline's marks to start now;
// update(dt, origin) advances them and returns {count, flash}: flash (0..1) is the
// lightning flash for the caller to use as a brief light boost if it wants one.
export function createRayMarks(THREE, parent) {
  const quad = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
  const makeMat = additive => new THREE.ShaderMaterial({vertexShader: VERT, fragmentShader: FRAG, transparent: true,
    depthWrite: false, toneMapped: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2});
  const layers = [false, true].map(additive => {
    // Each layer needs its own geometry to carry its own per-instance attributes.
    const mesh = new THREE.InstancedMesh(quad.clone(), makeMat(additive), MAX_PARTS);
    const color = new Float32Array(MAX_PARTS * 3), alpha = new Float32Array(MAX_PARTS), shape = new Float32Array(MAX_PARTS * 2);
    mesh.geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(color, 3));
    mesh.geometry.setAttribute('aAlpha', new THREE.InstancedBufferAttribute(alpha, 1));
    mesh.geometry.setAttribute('aShape', new THREE.InstancedBufferAttribute(shape, 2));
    mesh.frustumCulled = false; mesh.renderOrder = 1; mesh.count = 0; mesh.userData.part = 'ray-marks';
    parent.add(mesh);
    return {mesh, color, alpha, shape};
  });
  const marks = [];
  const flashes = [];
  let now = 0;
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scale = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();

  function add(timeline) {
    const found = rayMarks(timeline);
    for (const m of found) marks.push({...m, t: now + m.t});
    if (marks.length > MAX_MARKS) marks.splice(0, marks.length - MAX_MARKS);
    if (timeline?.sprites?.some(s => s.effect?.kind === 'zap' && s.effect.zap === 'lightning')) flashes.push({timeline, t0: now});
    return found.length;
  }

  function update(dt, origin) {
    now += dt * 1000;
    const ox = origin?.x ?? 0, oz = origin?.z ?? 0;
    // Drop marks whose longest part has ended.
    for (let i = marks.length - 1; i >= 0; i--) {
      const longest = Math.max(...MARK_LOOKS[marks[i].type].map(L => L.ms));
      if (now - marks[i].t >= longest) marks.splice(i, 1);
    }
    const n = [0, 0];
    for (const p of markFrame(marks, now)) {
      const li = p.add ? 1 : 0, L = layers[li], i = n[li];
      if (i >= MAX_PARTS) continue;
      q.setFromAxisAngle(up, p.rot);
      // Additive glows ride a hair above the dark marks so they don't z-fight.
      pos.set(p.x - ox, MARK_Y + (p.add ? .004 : 0) + p.seed * .002, p.z - oz);
      matrix.compose(pos, q, scale.set(p.size, 1, p.size));
      L.mesh.setMatrixAt(i, matrix);
      c.setHex(p.color);
      L.color.set([c.r, c.g, c.b], i * 3);
      L.alpha[i] = p.alpha;
      L.shape.set([p.shape, p.seed], i * 2);
      n[li]++;
    }
    let flash = 0;
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i], t = now - f.t0;
      if (t > f.timeline.duration + FLASH_MS + 25) { flashes.splice(i, 1); continue; }
      flash = Math.max(flash, rayFlash(f.timeline, t));
    }
    layers.forEach((L, li) => {
      L.mesh.count = n[li];
      L.mesh.instanceMatrix.needsUpdate = true;
      for (const k of ['aColor', 'aAlpha', 'aShape']) L.mesh.geometry.attributes[k].needsUpdate = true;
    });
    return {count: n[0] + n[1], flash};
  }

  const clear = () => { marks.length = 0; flashes.length = 0; update(0); };
  const dispose = () => {
    for (const L of layers) { parent.remove(L.mesh); L.mesh.geometry.dispose(); L.mesh.material.dispose(); }
    quad.dispose();
  };
  return {add, update, clear, dispose, layers: layers.map(L => L.mesh), get active() { return marks.length + flashes.length; }};
}
