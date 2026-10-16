import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The vortices were a stack of seven torus rings on a disc, which read as a coiled spring. This is the
// real funnel, one kind at a time. Dust vortex first: a brown whirlwind of kicked-up earth.
// - the funnel: one twisted, tapering sheet (a column of quads spiralling up, narrow at the foot, wide
//   at the top), its rim torn into ragged teeth, banded dark and pale along the twist so the spin shows;
//   an inner sheet turns the other way inside it. vortex-spin.js turns the part named 'funnel';
// - what it carries: four chunks of earth and stone and a torn rag of cloth, caught in the spiral
//   (vortex-spin.js lifts and flings every other mesh of the body, and vortex-fx.js adds the grit);
// - the ground: a scuffed disc under the foot (vortex-spin.js breathes it).
// Fire vortex second: a roaring column rather than a funnel. The same twisted torn sheet, but narrow and
// near straight with a flickering top, drawn self-lit (MeshBasicMaterial, vertex colours from a dark
// red base through orange to a pale yellow tongue) so the spin still shows in the bands; glowing coals
// ride the spiral, a hot core burns in the middle, six embers glow on a scorched disc under the foot
// (merged into one draw; userData.embers = 6 on the group, as vortex-wear.test.js reads).
// Steam vortex third: a scalding plume. The same torn sheet, narrow at the vent and boiling out into a
// wide billowing head, pale grey-white with a faint glow of heat in it; nothing is caught in it (vortex-fx.js
// peels wisps off the head), and six beads of condensation sit on the wet dark floor round the foot, merged
// into one draw. Three draws.
// Seven draws for dust, eight for fire. Handles: body (quirk 'hover'); fire also gives core.
const hash = n => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
const H = .8, ROWS = 14, SEG = 20;
const KINDS = {
  dust: {deep: '#4a3622', mid: '#8a6c46', pale: '#c4a878', grit: '#5a4630', stone: '#6e6a62', rag: '#3a2a22', ground: '#5a4630'},
  steam: {deep: '#7c8790', mid: '#cdd6dd', pale: '#ffffff', ground: '#2a2f33', bead: '#dfe8ee', steam: true, radius: t => .04 + .09 * t ** .6 + .22 * t ** 3.2 + .02 * Math.sin(t * 13), opacity: .5},
  fire: {deep: '#4a0e04', mid: '#d4501a', pale: '#ffc858', grit: '#2a1a14', stone: '#3a2418', ground: '#16100c', fire: true, radius: t => .05 + .17 * t ** .8 + .03 * Math.sin(t * 11), opacity: .62},
};

// radius of the sheet at height fraction t: a pinched foot, a widening throat, a flared top
const radius = t => .035 + .3 * t ** 1.6 + .018 * Math.sin(t * 9);

function sheet(c, {turns, dir, scale, phase}) {
  const pos = [], col = [], idx = [], o = new THREE.Color();
  const deep = new THREE.Color(c.deep), mid = new THREE.Color(c.mid), pale = new THREE.Color(c.pale);
  for (let r = 0; r <= ROWS; r++) {
    const t = r / ROWS;
    for (let s = 0; s <= SEG; s++) {
      const a = s / SEG * Math.PI * 2 + dir * t * turns + phase, k = scale * (c.radius || radius)(t) * (1 + .1 * Math.sin(a * 3 + t * 6));
      // the top rim is torn: every few segments it is cut back, and the cut ones are ragged
      const cut = r >= ROWS - 2 ? hash(s * 7 + phase * 3) * .5 : 0;
      const y = (t - (r === ROWS ? cut * .5 : r === ROWS - 1 ? cut * .2 : 0)) * H * scale;
      pos.push(Math.cos(a) * k, y, Math.sin(a) * k);
      const band = .5 + .5 * Math.sin(a * 2 - dir * t * 14);
      o.copy(deep).lerp(mid, Math.min(1, t * 1.6 + band * .3)).lerp(pale, Math.max(0, band - .55) * t * 1.4);
      col.push(o.r, o.g, o.b);
    }
  }
  for (let r = 0; r < ROWS; r++) for (let s = 0; s < SEG; s++) {
    // gaps in the sheet: some quads near the rim are missing
    if (r >= ROWS - 3 && hash(s * 13 + r * 5 + phase) < .3) continue;
    if (hash(s * 31 + r * 17 + phase * 5) < .06) continue;
    const a = r * (SEG + 1) + s, b = a + 1, d = a + SEG + 1, e = d + 1;
    idx.push(a, d, b, b, d, e);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

const FLAME = {ember: '#ffb040', glow: '#ff5a10'};

export function createVortex({kind = 'dust', scale = 1} = {}) {
  const c = KINDS[kind] || KINDS.dust;
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const add = (geo, mat, name, parent = body) => { const m = new THREE.Mesh(geo, mat); m.userData.part = name; m.castShadow = false; m.receiveShadow = false; parent.add(m); return m; };

  const wet = c.steam ? {opacity: .6} : {};
  const ground = new THREE.CircleGeometry(.32 * scale, 14);
  const gp = ground.attributes.position;
  for (let i = 1; i < gp.count; i++) { const k = 1 + .22 * Math.sin(i * 2.7) + .1 * hash(i); gp.setXY(i, gp.getX(i) * k, gp.getY(i) * k); }
  const gm = add(ground, new THREE.MeshStandardMaterial({color: c.ground, roughness: 1, transparent: true, opacity: .45, depthWrite: false, ...wet}), 'ground', g);
  gm.rotation.x = -Math.PI / 2; gm.position.y = .012;
  if (c.fire) {
    // six embers glow on the scorched ground round the foot, merged into one draw
    const em = [];
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05, r = (.2 + (i % 2) * .1) * scale, e = new THREE.CircleGeometry(.025 * scale * (1 + hash(i + 9)), 5);
      e.rotateX(-Math.PI / 2); e.translate(Math.cos(a) * r, .016, Math.sin(a) * r); em.push(e);
      g.userData.embers = (g.userData.embers || 0) + 1;
    }
    const merged = mergeGeometries(em); em.forEach(e => e.dispose());
    add(merged, new THREE.MeshStandardMaterial({color: FLAME.ember, emissive: FLAME.glow, emissiveIntensity: 3, roughness: .5}), 'embers', g);
  }

  if (c.steam) {
    // condensation beading on the floor round the vent: small domes, merged into one draw
    const bd = [];
    for (let i = 0; i < 6; i++) {
      const a = i * 1.9 + .4, r = (.12 + hash(i + 2) * .2) * scale, d = new THREE.SphereGeometry(.02 * scale * (.7 + hash(i + 5)), 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
      d.translate(Math.cos(a) * r, .014, Math.sin(a) * r); bd.push(d);
    }
    const mb = mergeGeometries(bd); bd.forEach(d => d.dispose());
    add(mb, new THREE.MeshStandardMaterial({color: c.bead, roughness: .1, metalness: .1, emissive: '#6a7680', emissiveIntensity: .5}), 'beads', g);
  }

  // the funnel: an outer sheet and an inner one wound the other way, merged into one draw
  const outer = sheet(c, {turns: 5.5, dir: 1, scale, phase: 0}), inner = sheet(c, {turns: 4, dir: -1, scale: scale * .6, phase: 1.7});
  const merged = new THREE.BufferGeometry(), pa = [outer.attributes.position.array, inner.attributes.position.array], ca = [outer.attributes.color.array, inner.attributes.color.array];
  const na = [outer.attributes.normal.array, inner.attributes.normal.array], off = outer.attributes.position.count;
  const cat = arrs => { const n = arrs.reduce((s, x) => s + x.length, 0), o = new Float32Array(n); let p = 0; for (const x of arrs) { o.set(x, p); p += x.length; } return o; };
  merged.setAttribute('position', new THREE.BufferAttribute(cat(pa), 3));
  merged.setAttribute('color', new THREE.BufferAttribute(cat(ca), 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(cat(na), 3));
  merged.setIndex([...outer.index.array, ...Array.from(inner.index.array, i => i + off)]);
  const skin = c.fire
    ? new THREE.MeshBasicMaterial({vertexColors: true, transparent: true, opacity: c.opacity, depthWrite: false, side: THREE.DoubleSide})
    : new THREE.MeshStandardMaterial({vertexColors: true, roughness: 1, transparent: true, opacity: c.opacity || .52, depthWrite: false, side: THREE.DoubleSide, emissive: c.steam ? '#7a848c' : '#2a1c0e', emissiveIntensity: c.steam ? .45 : .25});
  add(merged, skin, 'funnel');
  const rad = c.radius || radius;
  if (c.steam) return {g, body};

  // caught in the spiral: chunks of earth and stone, and a torn rag
  const lit = c.fire ? {emissive: FLAME.glow, emissiveIntensity: 1.6} : {};
  const chunkMat = new THREE.MeshStandardMaterial({color: c.grit, roughness: 1, flatShading: true, ...lit});
  const stoneMat = new THREE.MeshStandardMaterial({color: c.stone, roughness: 1, flatShading: true, ...lit});
  [[0, .16, 1], [1, .34, 1.4], [2, .52, 1], [3, .68, 1.6]].forEach(([i, t, big]) => {
    const a = i * 2.2, r = rad(t) * scale * 1.05, geo = new THREE.DodecahedronGeometry(.026 * big * scale, 0);
    const m = add(geo, i % 2 ? stoneMat : chunkMat, 'grit');
    m.scale.set(1, .7 + hash(i) * .4, .8 + hash(i + 3) * .5); m.position.set(Math.cos(a) * r, t * H * scale, Math.sin(a) * r); m.rotation.set(a, a * .6, 0);
  });
  if (c.fire) {
    // the hot core: a stretched white-yellow spark in the middle of the column
    const core = add(new THREE.SphereGeometry(.07 * scale, 8, 6), new THREE.MeshStandardMaterial({color: c.pale, emissive: c.pale, emissiveIntensity: 4.5, roughness: .2}), 'core');
    core.scale.set(.8, 1.6, .8); core.position.y = .32 * scale;
    g.userData.core = core;
    return {g, body, core};
  }
  const rag = new THREE.PlaneGeometry(.2 * scale, .06 * scale, 5, 1), rp = rag.attributes.position;
  for (let i = 0; i < rp.count; i++) rp.setY(i, rp.getY(i) + Math.sin(rp.getX(i) * 40) * .012 * scale);
  const rm = add(rag, new THREE.MeshStandardMaterial({color: c.rag, roughness: 1, side: THREE.DoubleSide}), 'rag');
  rm.position.set(rad(.45) * scale * 1.1, .45 * H * scale, 0); rm.rotation.set(.4, 1.1, .7);
  return {g, body};
}
