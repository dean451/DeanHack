// Melting iron bars (motion queue item 15, part 3). When bars go away (acid from a ray, a
// thrown potion or a monster's spit, a disintegrating monster, a metal-eater chewing through,
// or the hero doing it), the client only sees a frame where the `bars` tile has become
// floor, so live.js drops the grille in one frame. This module plays the loss over that swap
// with a ghost of the same grille, with the same seed and facing, on the tile:
// - heat: the iron glows (red to orange for heat, yellow-green for acid) and fumes rise;
// - slump: the bars sag, bow and sink into a spreading puddle while drops fall from them;
// - cool: the puddle's glow dies and everything fades, leaving the new floor.
// Disintegration skips the drips and crumbles fast in a violet-black flicker, and chewing
// has no glow, just iron flakes.
//
// meltMessage(), findMelts(), meltFrame() and slumpPoint() are pure, so they can be tested
// without a renderer; createBarsMelt() draws the ghosts, one instanced mesh of drops and a
// point cloud of fumes.

import {createBars} from './bars.js';

export const MAX_MELTS = 4;
const DROPS = 10, FUMES = 18;
// The grille's full height (sill to spear tips) in tiles, from bars.js.
const TOP = .98;

// How each cause looks. ms is the whole melt; heat, slump and cool are phase fractions that
// add up to 1. glow is the iron's emissive colour at full heat (null: no glow); drop the
// colour of falling drops (null: none), dropGlow whether they glow; fume the rising motes'
// colour and rise how far they go; puddle the pool's colour (null: none).
export const MELT_LOOKS = {
  heat: {ms: 2600, heat: .14, slump: .52, cool: .34, glow: 0xff4a10, hot: 0xffc040,
    drop: 0xff7a20, dropGlow: true, fume: 0x6a5a50, rise: .7, puddle: 0x2a1a12},
  acid: {ms: 2600, heat: .16, slump: .5, cool: .34, glow: 0x7fbf10, hot: 0xd8ff50,
    drop: 0x4a5a18, dropGlow: false, fume: 0x9ad61a, rise: .9, puddle: 0x34401a},
  disintegrate: {ms: 1200, heat: .2, slump: .45, cool: .35, glow: 0x5a1a8a, hot: 0xd8a0ff,
    drop: null, dropGlow: false, fume: 0x3b1450, rise: .5, puddle: null},
  chew: {ms: 1800, heat: .05, slump: .7, cool: .25, glow: null, hot: null,
    drop: null, dropGlow: false, fume: 0x5a3a28, rise: .15, puddle: null},
};

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const hash = (a, b = 0, c = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
const smooth = k => k * k * (3 - 2 * k);

// What a message line says about bars going away: a cause from MELT_LOOKS, or null.
// mthrowu.c/zap.c say "The iron bars are dissolved!" (acid) or, unseen, "You hear a hissing
// noise."; monmove.c "The black pudding dissolves the iron bars." (AD_DISN) and "The rust
// monster chews through the iron bars."; hack.c "You chew through the iron bars.".
export function meltMessage(text) {
  if (typeof text !== 'string') return null;
  if (/^The iron bars are dissolved!$/.test(text)) return 'acid';
  if (/^You hear a hissing noise\.$/.test(text)) return 'acid';
  if (/ dissolves the iron bars\.$/.test(text)) return 'disintegrate';
  if (/ chews? through the iron bars\.$/.test(text)) return 'chew';
  if (/^You hear a crunching noise\.$/.test(text)) return 'chew';
  return null;
}

const cellMap = frame => new Map((frame?.cells ?? []).map(c => [`${c.x},${c.z}`, c]));
const STANDING = ['wall', 'bars', 'door'];

// The tiles whose bars went away between prev and frame, each {x, z, seed, turn}: seed and
// turn (0 or π/2 about y) match how live.js built the grille there. Only tiles that are in
// view now and hold a known terrain count; a level change finds nothing.
export function findMelts(prev, frame) {
  if (!prev?.cells || !frame?.cells) return [];
  if (prev.branch !== frame.branch || prev.depth !== frame.depth) return [];
  const before = cellMap(prev);
  const out = [];
  for (const c of frame.cells) {
    if (c.terrain === 'bars' || c.terrain === 'unknown' || !c.terrain || c.visible === false) continue;
    const was = before.get(`${c.x},${c.z}`);
    if (was?.terrain !== 'bars') continue;
    // Face the grille the way it stood: along the walls or bars it joined, from prev.
    const joined = (dx, dz) => Number(STANDING.includes(before.get(`${c.x + dx},${c.z + dz}`)?.terrain));
    const h = joined(-1, 0) + joined(1, 0), v = joined(0, -1) + joined(0, 1);
    out.push({x: c.x, z: c.z, seed: c.x * 53 + c.z * 29, turn: h !== v && v > h ? Math.PI / 2 : 0});
  }
  return out;
}

// Where a grille vertex (local, x along the grille, y up from the floor) ends up at slump k
// (0 standing, 1 a puddle). Bars sink, the top most; they bow out to one side (bow, ±1) and
// the foot spreads along the grille as the iron pools. Nothing goes below the floor.
export function slumpPoint(x, y, z, k, bow = 1) {
  const e = smooth(clamp01(k));
  const h = clamp01(y / TOP);
  const ny = Math.max(.004, y * (1 - .96 * e) - .02 * e * h * h);
  const nz = z + bow * .16 * e * (1 - e * .6) * Math.sin(Math.PI * h) + z * 1.5 * e * (1 - h);
  const nx = x * (1 + .22 * e * (1 - h) ** 2);
  return [nx, ny, nz];
}

// One melt at an age (ms), or null when it's over. glow is {color, k} for the iron (null when
// cold); slump is 0..1; alpha the ghost's opacity; drops and fumes are in tiles relative to
// the tile (floor y 0) in the grille's own frame, with an alpha; puddle is {r, heat, alpha}.
export function meltFrame(melt, age) {
  const look = MELT_LOOKS[melt?.cause] ?? MELT_LOOKS.heat;
  if (!melt || !(age >= 0) || age >= look.ms) return null;
  const k = age / look.ms;
  const heatEnd = look.heat, slumpEnd = look.heat + look.slump;
  const heatK = clamp01(k / heatEnd);
  const slump = smooth(clamp01((k - heatEnd) / look.slump));
  const coolK = clamp01((k - slumpEnd) / look.cool);
  // Heat ramps in, holds and brightens while slumping, then dies as it cools.
  const heat = look.glow == null ? 0 : smooth(heatK) * (1 - smooth(coolK));
  const glow = heat > .002 ? {color: look.glow, hot: look.hot, k: heat, white: slump * (1 - coolK)} : null;
  // Chewed bars break into flakes and fade as they go; the others fade in the cool phase.
  const alpha = melt.cause === 'chew' ? 1 - smooth(clamp01((k - .35) / .65)) : 1 - smooth(coolK);
  const seed = melt.seed ?? 0;

  const drops = [];
  if (look.drop != null) {
    for (let j = 0; j < DROPS; j++) {
      // Each drop falls from the bars' underside several times while they slump.
      const period = .16 + .1 * hash(seed, j, 1);
      const phase = hash(seed, j, 2);
      const t = (k - heatEnd * .7) / period + phase;
      if (t < 0 || k > slumpEnd + .05) continue;
      const f = t - Math.floor(t);
      const x = (hash(seed, j, 3) - .5) * .82;
      const from = (.12 + .5 * hash(seed, j, Math.floor(t))) * (1 - slump);
      const y = Math.max(0, from * (1 - f * f));
      const size = .012 + .012 * hash(seed, j, 4);
      drops.push({x, y, z: (hash(seed, j, 5) - .5) * .05, size, alpha: clamp01(1 - f * .3) * alpha});
    }
  }

  const fumes = [];
  for (let j = 0; j < FUMES; j++) {
    const phase = hash(seed, j, 7);
    const t = k * 2.2 + phase;
    const f = t - Math.floor(t);
    const on = melt.cause === 'chew' ? clamp01((k - .1) / .1) * (1 - clamp01((k - .8) / .2)) : heat;
    if (on <= .01) continue;
    const x = (hash(seed, j, Math.floor(t) + 9) - .5) * .8;
    const y = (.05 + .6 * (1 - slump) * hash(seed, j, 11)) + look.rise * f;
    // Flakes fall instead of rising.
    const fy = melt.cause === 'chew' ? Math.max(0, .5 * (1 - slump) * hash(seed, j, 11) * (1 - f)) : y;
    fumes.push({x: x + .05 * Math.sin(f * 6 + j), y: fy, z: (hash(seed, j, 12) - .5) * .2 + .04 * Math.cos(f * 5 + j),
      alpha: on * Math.sin(f * Math.PI) * .8});
  }

  let puddle = null;
  if (look.puddle != null && slump > 0) {
    puddle = {r: .08 + .3 * slump, heat: heat * slump, alpha: slump * alpha};
  }
  return {glow, slump, alpha, drops, fumes, puddle};
}

// Draws melts. message(text) notes a cause, frame(frame) starts a melt on every tile whose
// bars went away since the last frame (the message comes first), add(melt) starts one
// directly and update(dt, origin) advances them, returning {count, drops, fumes}.
// makeBars(seed) builds the ghost grille (bars.js by default).
export function createBarsMelt(THREE, parent, {makeBars = createBars} = {}) {
  const dropGeo = new THREE.SphereGeometry(1, 8, 6);
  const dropMat = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, depthWrite: false, toneMapped: false});
  const dropMesh = new THREE.InstancedMesh(dropGeo, dropMat, MAX_MELTS * DROPS);
  dropMesh.count = 0; dropMesh.frustumCulled = false; dropMesh.renderOrder = 3; dropMesh.userData.part = 'bars-melt-drops';
  parent.add(dropMesh);

  const fumePos = new Float32Array(MAX_MELTS * FUMES * 3), fumeCol = new Float32Array(MAX_MELTS * FUMES * 3);
  const fumeGeo = new THREE.BufferGeometry();
  fumeGeo.setAttribute('position', new THREE.BufferAttribute(fumePos, 3));
  fumeGeo.setAttribute('color', new THREE.BufferAttribute(fumeCol, 3));
  fumeGeo.setDrawRange(0, 0);
  const fumes = new THREE.Points(fumeGeo, new THREE.PointsMaterial({size: .06, vertexColors: true, transparent: true,
    depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending}));
  fumes.frustumCulled = false; fumes.renderOrder = 3; fumes.userData.part = 'bars-melt-fumes';
  parent.add(fumes);

  const puddleGeo = new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2);
  const melts = [];
  let cause = null, prev = null, now = 0;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const col = new THREE.Color(), hot = new THREE.Color(), white = new THREE.Color(1, .95, .8);

  function ghostOf(melt) {
    const g = new THREE.Group();
    g.name = 'Melting bars';
    g.rotation.y = melt.turn ?? 0;
    const bars = makeBars(melt.seed ?? 0);
    g.add(bars);
    const meshes = [];
    bars.traverse(o => {
      if (!o.isMesh) return;
      o.material.transparent = true;
      o.castShadow = false;
      const pos = o.geometry.attributes.position;
      meshes.push({mesh: o, rest: Float32Array.from(pos.array), iron: o.userData.part !== 'stone'});
    });
    let puddle = null;
    const look = MELT_LOOKS[melt.cause];
    if (look.puddle != null) {
      puddle = new THREE.Mesh(puddleGeo, new THREE.MeshStandardMaterial({color: look.puddle, metalness: .6, roughness: .35,
        transparent: true, depthWrite: false}));
      puddle.position.y = .052; puddle.scale.set(.01, 1, .01); puddle.renderOrder = 2;
      g.add(puddle);
    }
    return {group: g, bars, meshes, puddle, bow: hash(melt.seed ?? 0, 3) < .5 ? -1 : 1, shown: -1};
  }

  function drop(m) {
    parent.remove(m.ghost.group);
    m.ghost.bars.userData.dispose?.();
    m.ghost.puddle?.material.dispose();
  }

  function add(melt) {
    if (!melt || !Number.isFinite(melt.x) || !Number.isFinite(melt.z)) return null;
    const m = {...melt, cause: MELT_LOOKS[melt.cause] ? melt.cause : 'heat', t: now};
    const same = melts.findIndex(o => o.x === m.x && o.z === m.z);
    if (same >= 0) drop(melts.splice(same, 1)[0]);
    m.ghost = ghostOf(m);
    parent.add(m.ghost.group);
    melts.push(m);
    if (melts.length > MAX_MELTS) drop(melts.shift());
    return m;
  }
  const message = text => {
    const c = meltMessage(text);
    if (c) cause = c;
    return !!c;
  };
  const frame = fr => {
    const out = findMelts(prev, fr).map(m => add({...m, cause: cause ?? 'heat'}));
    cause = null;
    if (fr?.cells) prev = fr;
    return out;
  };

  function pose(m, fr, ox, oz) {
    const gh = m.ghost;
    gh.group.position.set(m.x - ox, 0, m.z - oz);
    // Re-bend the grille only when the slump has moved on.
    const slump = Math.round(fr.slump * 200) / 200;
    if (slump !== gh.shown) {
      gh.shown = slump;
      for (const {mesh, rest, iron} of gh.meshes) {
        const pos = mesh.geometry.attributes.position;
        const k = iron ? slump : slump * .25;
        for (let i = 0; i < pos.count; i++) {
          const [x, y, z] = slumpPoint(rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2], k, gh.bow);
          pos.setXYZ(i, x, y, z);
        }
        pos.needsUpdate = true;
        mesh.geometry.computeBoundingSphere();
      }
    }
    for (const {mesh, iron} of gh.meshes) {
      mesh.material.opacity = fr.alpha;
      if (iron && mesh.material.emissive) {
        if (fr.glow) {
          col.setHex(fr.glow.color).lerp(hot.setHex(fr.glow.hot), fr.glow.white).lerp(white, fr.glow.white * fr.glow.white * .4);
          mesh.material.emissive.copy(col);
          mesh.material.emissiveIntensity = 1.6 * fr.glow.k;
        } else mesh.material.emissiveIntensity = 0;
      }
    }
    if (gh.puddle) {
      if (fr.puddle) {
        gh.puddle.visible = true;
        gh.puddle.scale.set(fr.puddle.r * 1.6, 1, fr.puddle.r * .8);
        gh.puddle.material.opacity = fr.puddle.alpha;
        const look = MELT_LOOKS[m.cause];
        gh.puddle.material.emissive.setHex(look.glow ?? 0);
        gh.puddle.material.emissiveIntensity = 1.4 * fr.puddle.heat;
      } else gh.puddle.visible = false;
    }
  }

  function update(dt, origin) {
    now += (dt || 0) * 1000;
    const ox = origin?.x ?? 0, oz = origin?.z ?? 0;
    for (let i = melts.length - 1; i >= 0; i--) {
      if (now - melts[i].t >= (MELT_LOOKS[melts[i].cause].ms)) drop(melts.splice(i, 1)[0]);
    }
    let d = 0, f = 0;
    for (const m of melts) {
      const fr = meltFrame(m, now - m.t);
      if (!fr) continue;
      pose(m, fr, ox, oz);
      const look = MELT_LOOKS[m.cause];
      const turn = m.turn ?? 0, cos = Math.cos(turn), sin = Math.sin(turn);
      const cx = m.x - ox, cz = m.z - oz;
      // Grille-local (x along it, z across) to the tile, turned like the ghost.
      const at = (x, y, z) => p.set(cx + x * cos + z * sin, y, cz - x * sin + z * cos);
      for (const dr of fr.drops) {
        at(dr.x, dr.y, dr.z);
        s.set(dr.size, dr.size * 1.5, dr.size);
        dropMesh.setMatrixAt(d, m4.compose(p, q.identity(), s));
        col.setHex(look.drop);
        if (look.dropGlow && fr.glow) col.lerp(hot.setHex(look.hot), .5 * fr.glow.k);
        dropMesh.setColorAt(d, col.multiplyScalar(dr.alpha));
        d++;
      }
      col.setHex(look.fume);
      for (const fm of fr.fumes) {
        at(fm.x, fm.y, fm.z);
        fumePos.set([p.x, p.y, p.z], f * 3);
        fumeCol.set([col.r * fm.alpha, col.g * fm.alpha, col.b * fm.alpha], f * 3);
        f++;
      }
    }
    dropMesh.count = d;
    dropMesh.instanceMatrix.needsUpdate = true;
    if (dropMesh.instanceColor) dropMesh.instanceColor.needsUpdate = true;
    fumeGeo.setDrawRange(0, f);
    fumeGeo.attributes.position.needsUpdate = true;
    fumeGeo.attributes.color.needsUpdate = true;
    return {count: melts.length, drops: d, fumes: f};
  }

  const clear = () => { while (melts.length) drop(melts.pop()); cause = null; prev = null; update(0); };
  const dispose = () => {
    clear();
    parent.remove(dropMesh); parent.remove(fumes);
    dropGeo.dispose(); dropMat.dispose(); fumeGeo.dispose(); fumes.material.dispose(); puddleGeo.dispose();
  };
  return {add, message, frame, update, clear, dispose};
}
