// The vortices' own weather (creature animation queue item 1, second half). vortex-spin.js makes
// the funnels turn; this adds what each one throws off, using the soft point layers from
// fx-points.js (one draw per layer) on the actor's group, so they don't lean with the column:
// - dust: grit sucked off the floor in a tightening spiral, lifted and dropped, inside a low skirt
//   of kicked-up dust that drags round the base;
// - ice: shards that orbit down the funnel, glinting as they catch the light, over a ring of rime
//   that creeps out across the floor with spiky crystal rays whose tips twinkle;
// - energy: sparks spat off the core, and jagged arcs that crackle between neighbouring rings (or
//   from the core to a ring) for a flicker at a time;
// - steam: soft wisps peeling off the top ring, curling out and up as they thin away;
// - fire: embers climbing out of the top and sparks flung out to fall and die on the floor, over a
//   charred scorch whose ragged rim smoulders;
// - fog cloud: low mist that curls out along the floor round it and drifts slowly.
// On death nothing new comes off; what's in the air fades away, the scorch stops smouldering and
// the frost stays (the death fade in deaths.js takes the rest). updateVortexSpin calls this.
import * as THREE from 'three';
import {makePointLayer, rng} from './fx-points.js';

const TAU = Math.PI * 2, FLOOR = .015;
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
// How fast the effects die away after death (1/s), and shrink while sliding along.
export const REST_RATE = 2.2, WALK_RATE = 4;

// A particle at life u (0..1) from its seeds [a, b, c, d], for a funnel of scale s at time T
// (seconds) whose body is bobbing at height `bob`. Returns {x, y, z, alpha, size}, alpha and size
// 0..1 of the layer's. Pure, so the tests can sample them.
export const PATHS = {
  // grit: sucked in from the floor in a tightening spiral, lifted and dropped
  grit([a, b, c, d], u, s, T) {
    const th = a * TAU + u * (2.5 + b * 2) + T * .8, r = (.34 - .2 * u ** .7 + .04 * c) * s;
    const y = FLOOR + (.06 + .22 * b) * s * Math.sin(Math.PI * u) ** 1.4;
    return {x: Math.cos(th) * r, y, z: Math.sin(th) * r, alpha: smooth(u / .08) * smooth((1 - u) / .25), size: .6 + .6 * d};
  },
  // a skirt of dust dragged round the base
  skirt([a, b, c], u, s, T) {
    const th = a * TAU + T * 1.1 + u * 1.5, r = (.24 + .1 * u + .04 * c) * s;
    return {x: Math.cos(th) * r, y: .03 + .07 * u * b, z: Math.sin(th) * r, alpha: Math.sin(Math.PI * u), size: .7 + .5 * u};
  },
  // ice shards: orbit down the funnel and out, glinting now and then
  shard([a, b, c, d], u, s, T) {
    const th = a * TAU + T * 2.6 * (.7 + .3 * b), h = (.15 + .65 * c) * s;
    const y = Math.max(FLOOR, FLOOR + h * (1 - u)), r = ((.1 + .2 * c) + (.12 + .08 * b) * u) * s;
    const glint = .15 + .85 * Math.max(0, Math.sin(T * (5 + 4 * d) + b * TAU)) ** 10;
    return {x: Math.cos(th) * r, y, z: Math.sin(th) * r, alpha: glint * smooth(u / .1) * smooth((1 - u) / .15), size: .7 + .5 * glint};
  },
  // energy sparks: spat off the core in all directions, dropping a little, flickering out
  spark([a, b, c, d], u, s, T, bob) {
    const th = a * TAU, el = (b - .3) * 1.6, dist = (.06 + .3 * u) * s;
    const y = .32 * s + bob + Math.sin(el) * dist - .12 * u * u;
    const flick = .6 + .4 * Math.sin(T * 41 + d * 60);
    return {x: Math.cos(th) * Math.cos(el) * dist, y: Math.max(FLOOR, y), z: Math.sin(th) * Math.cos(el) * dist,
      alpha: (1 - u) ** 1.5 * flick * smooth(u / .05), size: .6 + .6 * c};
  },
  // steam wisps: peel off the top ring and curl out and up, swelling as they thin
  wisp([a, b, c], u, s, T, bob) {
    const th = a * TAU + T * .95 + u * 1.2, r = (.22 + .2 * u + .04 * c) * s;
    return {x: Math.cos(th) * r, y: (.82 + .4 * u) * s + bob * (1 - u), z: Math.sin(th) * r, alpha: Math.sin(Math.PI * u) ** 1.3 * (.7 + .3 * b), size: .5 + .9 * u};
  },
  // fire: most embers climb out of the top; the rest are flung out and fall to die on the floor
  ember([a, b, c, d], u, s, T, bob) {
    const flick = .55 + .45 * Math.sin(T * 23 + a * 50) * Math.sin(T * 7 + b * 9);
    if (d < .62) {
      const th = a * TAU + T * 2 + u * 3, r = (.08 + .22 * u) * s;
      return {x: Math.cos(th) * r, y: (.2 + .5 * b) * s + bob + .55 * s * u, z: Math.sin(th) * r,
        alpha: (1 - u) ** 1.2 * flick * smooth(u / .06), size: .5 + .6 * c * (1 - u)};
    }
    const th = a * TAU + T * .5, r = (.12 + .26 * Math.min(1, u * 1.6)) * s, y0 = (.25 + .4 * b) * s;
    const y = Math.max(FLOOR, y0 + .1 * u - y0 * 1.6 * u * u);
    const landed = y <= FLOOR ? .55 : 1;
    return {x: Math.cos(th) * r, y, z: Math.sin(th) * r, alpha: (1 - u) * flick * landed * smooth(u / .05), size: .5 + .4 * c};
  },
  // fog: low mist curling out along the floor
  mist([a, b, c], u, s, T) {
    const th = a * TAU + T * .22 + u * .8, r = (.18 + .25 * u + .04 * c) * s;
    return {x: Math.cos(th) * r, y: .04 + .06 * u * b, z: Math.sin(th) * r, alpha: Math.sin(Math.PI * u), size: .7 + .6 * u};
  },
};

// Layers per kind: path, count, period (s), point size (world), peak alpha, colour, blending.
export const FX = {
  'dust vortex': {layers: [
    {path: 'grit', count: 36, period: 1.6, size: .035, alpha: .85, color: '#6e5238'},
    {path: 'skirt', count: 9, period: 3, size: .14, alpha: .2, color: '#8a7050'}]},
  'ice vortex': {frost: true, layers: [
    {path: 'shard', count: 22, period: 3.2, size: .03, alpha: 1, color: '#e8f8ff', blend: 'add'}]},
  'energy vortex': {arcs: true, layers: [
    {path: 'spark', count: 18, period: .5, size: .025, alpha: 1, color: '#d8f0ff', blend: 'add'}]},
  'steam vortex': {layers: [
    {path: 'wisp', count: 12, period: 2.8, size: .14, alpha: .32, color: '#e6ecf2'}]},
  'fire vortex': {scorch: true, layers: [
    {path: 'ember', count: 28, period: 1.8, size: .03, alpha: 1, color: '#ffa030', blend: 'add'}]},
  'fog cloud': {layers: [
    {path: 'mist', count: 10, period: 5, size: .16, alpha: .22, color: '#b8bcc0'}]},
};
// Energy arcs: how many at once, segments each, how long one lasts and the gap before the next (s).
export const ARCS = 3, ARC_SEGS = 6, ARC_LIFE = [.07, .16], ARC_GAP = [.05, .55], ARC_JAG = .035;
// The floor marks: radius (× scale), rays, and their colours and opacities.
export const MARK_R = .36, MARK_RAYS = 28, CREEP = 2.5;
const SCORCH_DARK = [.05, .035, .025], SCORCH_RIM = [1, .42, .08], FROST = [.82, .93, 1], FROST_TIP = [1, 1, 1];

let markMat = null, arcMat = null;
const markMaterial = () => markMat || (markMat = new THREE.MeshBasicMaterial({vertexColors: true, transparent: true, depthWrite: false,
  polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide}));
const arcMaterial = () => arcMat || (arcMat = new THREE.LineBasicMaterial({vertexColors: true, transparent: true, depthWrite: false,
  blending: THREE.AdditiveBlending}));

// A ragged fan on the floor: centre, an inner ring and a jagged outer ring (long spikes for frost).
function markGeometry(random, s, spiky) {
  const pos = [0, .007, 0], idx = [];
  for (let i = 0; i < MARK_RAYS; i++) {
    const a = i / MARK_RAYS * TAU + (random() - .5) * .1, ri = (MARK_R * .62 + random() * .05) * s;
    const ro = ri + (spiky ? (i % 2 ? .03 + random() * .03 : .08 + random() * .1) : .04 + random() * (i % 3 ? .05 : .12)) * s;
    pos.push(Math.cos(a) * ri, .007, Math.sin(a) * ri, Math.cos(a) * ro, .007, Math.sin(a) * ro);
  }
  for (let i = 0; i < MARK_RAYS; i++) {
    const j = (i + 1) % MARK_RAYS, ia = 1 + i * 2, ib = 1 + j * 2;
    idx.push(0, ia, ib, ia, ia + 1, ib + 1, ia, ib + 1, ib);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array((1 + MARK_RAYS * 2) * 4), 4));
  geo.setIndex(idx);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), .7);
  return geo;
}

// Paints the mark: the scorch smoulders along its rim (glow 0..1); the frost's spike tips twinkle.
function paintMark(st, T, w) {
  const c = st.mark.geometry.attributes.color;
  if (st.fx.scorch) {
    c.setXYZW(0, ...SCORCH_DARK, .7);
    for (let i = 0; i < MARK_RAYS; i++) {
      const ember = w * (.35 + .65 * Math.max(0, Math.sin(T * (1.3 + (i * 7 % 5) * .4) + i * 2.1)) ** 3);
      c.setXYZW(1 + i * 2, ...SCORCH_DARK, .62);
      c.setXYZW(2 + i * 2, SCORCH_DARK[0] + (SCORCH_RIM[0] - SCORCH_DARK[0]) * ember, SCORCH_DARK[1] + (SCORCH_RIM[1] - SCORCH_DARK[1]) * ember,
        SCORCH_DARK[2] + (SCORCH_RIM[2] - SCORCH_DARK[2]) * ember, .25 + .5 * ember);
    }
  } else {
    c.setXYZW(0, ...FROST, .22);
    for (let i = 0; i < MARK_RAYS; i++) {
      const glint = Math.max(0, Math.sin(T * (2 + (i * 5 % 7) * .5) + i * 1.7)) ** 12 * w;
      c.setXYZW(1 + i * 2, ...FROST, .42);
      c.setXYZW(2 + i * 2, FROST[0] + (FROST_TIP[0] - FROST[0]) * glint, FROST[1] + (FROST_TIP[1] - FROST[1]) * glint, 1, .3 + .6 * glint);
    }
  }
  c.needsUpdate = true;
}

// A point on a ring (in the body's frame), at angle th round its tube's centre line.
const v = new THREE.Vector3();
function ringPoint(ring, th) {
  const r = ring.geometry.parameters.radius;
  ring.updateMatrix();
  return v.set(Math.cos(th) * r, Math.sin(th) * r, 0).applyMatrix4(ring.matrix);
}

function newArc(st, random) {
  const rings = st.rings, core = st.core;
  let from, to;
  if (core && random() < .3) {
    core.updateMatrix(); from = new THREE.Vector3().setFromMatrixPosition(core.matrix);
    to = ringPoint(rings[Math.floor(random() * rings.length)], random() * TAU).clone();
  } else {
    const i = Math.floor(random() * (rings.length - 1));
    from = ringPoint(rings[i], random() * TAU).clone(); to = ringPoint(rings[i + 1], random() * TAU).clone();
  }
  return {from, to, age: 0, life: ARC_LIFE[0] + random() * (ARC_LIFE[1] - ARC_LIFE[0]), jag: 0};
}

function setup(a) {
  const fx = FX[a.species], random = rng(((a.g?.id ?? 1) * 2654435761) >>> 0);
  const tori = a.body.children.filter(m => m.isMesh && m.geometry?.type === 'TorusGeometry');
  const s = tori.length ? Math.min(...tori.map(m => m.geometry.parameters.radius)) / .07 : 1;
  const st = {fx, s, t: 0, life: 1, walk: 0, random, layers: [], bob: 0};
  for (const style of fx.layers) {
    const path = PATHS[style.path];
    const layer = makePointLayer(style, random, (seed, u) => {
      const p = path(seed, u, s, st.t, st.bob);
      return {x: p.x, y: p.y, z: p.z, alpha: p.alpha * st.life * (1 - .4 * st.walk), size: p.size};
    });
    layer.points.userData.part = 'vortexFx';
    a.g.add(layer.points);
    st.layers.push(layer);
  }
  if (fx.frost || fx.scorch) {
    st.mark = new THREE.Mesh(markGeometry(random, s, fx.frost), markMaterial());
    st.mark.userData.part = fx.frost ? 'vortexFrost' : 'vortexScorch';
    st.mark.castShadow = st.mark.receiveShadow = false; st.mark.renderOrder = -2;
    st.mark.scale.setScalar(fx.frost ? .15 : 1);
    a.g.add(st.mark);
  }
  if (fx.arcs) {
    st.rings = tori.slice().sort((p, q) => p.position.y - q.position.y);
    st.core = a.core || a.g.userData.core || null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ARCS * ARC_SEGS * 2 * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(ARCS * ARC_SEGS * 2 * 4), 4));
    st.arcLines = new THREE.LineSegments(geo, arcMaterial());
    st.arcLines.userData.part = 'vortexArcs'; st.arcLines.frustumCulled = false; st.arcLines.renderOrder = 2;
    a.body.add(st.arcLines);
    st.arcs = Array.from({length: ARCS}, () => ({gap: random() * ARC_GAP[1], arc: null}));
  }
  return st;
}

function updateArcs(st, dt, w) {
  const {random} = st, pos = st.arcLines.geometry.attributes.position, col = st.arcLines.geometry.attributes.color;
  st.arcs.forEach((slot, k) => {
    if (slot.arc) { slot.arc.age += dt; if (slot.arc.age >= slot.arc.life) { slot.arc = null; slot.gap = ARC_GAP[0] + random() * (ARC_GAP[1] - ARC_GAP[0]); } }
    else if (w > .5 && st.rings.length > 1) { slot.gap -= dt; if (slot.gap <= 0) slot.arc = newArc(st, random); }
    const arc = slot.arc, base = k * ARC_SEGS * 2;
    // re-jag every 1/30 s so the bolt crackles while it lasts
    if (arc && (arc.jag -= dt) <= 0) {
      arc.jag = 1 / 30;
      arc.pts = [arc.from];
      for (let i = 1; i < ARC_SEGS; i++) {
        const p = arc.from.clone().lerp(arc.to, i / ARC_SEGS), j = ARC_JAG * st.s * Math.sin(Math.PI * i / ARC_SEGS) * 2;
        arc.pts.push(p.add(new THREE.Vector3((random() - .5) * j, (random() - .5) * j, (random() - .5) * j)));
      }
      arc.pts.push(arc.to);
    }
    const a = arc ? w * Math.sin(Math.PI * clamp01(arc.age / arc.life)) ** .5 : 0;
    for (let i = 0; i < ARC_SEGS; i++) for (let e = 0; e < 2; e++) {
      const n = base + i * 2 + e, p = arc ? arc.pts[i + e] : null;
      pos.setXYZ(n, p ? p.x : 0, p ? p.y : 0, p ? p.z : 0);
      col.setXYZW(n, .85, .95, 1, a);
    }
  });
  pos.needsUpdate = col.needsUpdate = true;
}

// Call once a frame, after the spin has posed the rings (updateVortexSpin does). Returns the state.
export function updateVortexFx(a, dt, walking) {
  if (!a?.g || !a.body || !FX[a.species]) return null;
  const st = a.vortexFx || (a.vortexFx = setup(a));
  const dead = !!a.actions?.dead;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.t += dt;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : approach(st.life, 1, REST_RATE * 2, dt);
  if (st.life < 1e-3) st.life = 0;
  st.walk = approach(st.walk, walking && !dead ? 1 : 0, WALK_RATE, dt);
  st.bob = Number.isFinite(a.body.position.y) ? a.body.position.y : 0;
  for (const layer of st.layers) layer.update(st.t);
  if (st.mark) {
    // frost creeps out from under it; a mark pulls in while the vortex slides along
    const grow = st.fx.frost ? .15 + .85 * smooth(st.t / CREEP) : 1;
    st.mark.scale.setScalar(grow * (1 - .35 * st.walk));
    paintMark(st, st.t, st.life);
  }
  if (st.arcLines) updateArcs(st, dt, st.life);
  return st;
}
