import * as THREE from 'three';

// The vortices were a stack of seven torus rings on a disc, which read as a coiled spring. This is the
// real funnel, one kind at a time. Dust vortex first: a brown whirlwind of kicked-up earth.
// - the funnel: one twisted, tapering sheet (a column of quads spiralling up, narrow at the foot, wide
//   at the top), its rim torn into ragged teeth, banded dark and pale along the twist so the spin shows;
//   an inner sheet turns the other way inside it. vortex-spin.js turns the part named 'funnel';
// - what it carries: four chunks of earth and stone and a torn rag of cloth, caught in the spiral
//   (vortex-spin.js lifts and flings every other mesh of the body, and vortex-fx.js adds the grit);
// - the ground: a scuffed disc under the foot (vortex-spin.js breathes it).
// Seven draws. Handles: body (quirk 'hover').
const hash = n => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
const H = .8, ROWS = 14, SEG = 20;
const KINDS = {
  dust: {deep: '#4a3622', mid: '#8a6c46', pale: '#c4a878', grit: '#5a4630', stone: '#6e6a62', rag: '#3a2a22', ground: '#5a4630'},
};

// radius of the sheet at height fraction t: a pinched foot, a widening throat, a flared top
const radius = t => .035 + .3 * t ** 1.6 + .018 * Math.sin(t * 9);

function sheet(c, {turns, dir, scale, phase}) {
  const pos = [], col = [], idx = [], o = new THREE.Color();
  const deep = new THREE.Color(c.deep), mid = new THREE.Color(c.mid), pale = new THREE.Color(c.pale);
  for (let r = 0; r <= ROWS; r++) {
    const t = r / ROWS;
    for (let s = 0; s <= SEG; s++) {
      const a = s / SEG * Math.PI * 2 + dir * t * turns + phase, k = scale * radius(t) * (1 + .1 * Math.sin(a * 3 + t * 6));
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

export function createVortex({kind = 'dust', scale = 1} = {}) {
  const c = KINDS[kind] || KINDS.dust;
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const add = (geo, mat, name, parent = body) => { const m = new THREE.Mesh(geo, mat); m.userData.part = name; m.castShadow = false; m.receiveShadow = false; parent.add(m); return m; };

  const ground = new THREE.CircleGeometry(.32 * scale, 14);
  const gp = ground.attributes.position;
  for (let i = 1; i < gp.count; i++) { const k = 1 + .22 * Math.sin(i * 2.7) + .1 * hash(i); gp.setXY(i, gp.getX(i) * k, gp.getY(i) * k); }
  const gm = add(ground, new THREE.MeshStandardMaterial({color: c.ground, roughness: 1, transparent: true, opacity: .45, depthWrite: false}), 'ground', g);
  gm.rotation.x = -Math.PI / 2; gm.position.y = .012;

  // the funnel: an outer sheet and an inner one wound the other way, merged into one draw
  const outer = sheet(c, {turns: 5.5, dir: 1, scale, phase: 0}), inner = sheet(c, {turns: 4, dir: -1, scale: scale * .6, phase: 1.7});
  const merged = new THREE.BufferGeometry(), pa = [outer.attributes.position.array, inner.attributes.position.array], ca = [outer.attributes.color.array, inner.attributes.color.array];
  const na = [outer.attributes.normal.array, inner.attributes.normal.array], off = outer.attributes.position.count;
  const cat = arrs => { const n = arrs.reduce((s, x) => s + x.length, 0), o = new Float32Array(n); let p = 0; for (const x of arrs) { o.set(x, p); p += x.length; } return o; };
  merged.setAttribute('position', new THREE.BufferAttribute(cat(pa), 3));
  merged.setAttribute('color', new THREE.BufferAttribute(cat(ca), 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(cat(na), 3));
  merged.setIndex([...outer.index.array, ...Array.from(inner.index.array, i => i + off)]);
  add(merged, new THREE.MeshStandardMaterial({vertexColors: true, roughness: 1, transparent: true, opacity: .52, depthWrite: false, side: THREE.DoubleSide, emissive: '#2a1c0e', emissiveIntensity: .25}), 'funnel');

  // caught in the spiral: chunks of earth and stone, and a torn rag
  const chunkMat = new THREE.MeshStandardMaterial({color: c.grit, roughness: 1, flatShading: true});
  const stoneMat = new THREE.MeshStandardMaterial({color: c.stone, roughness: 1, flatShading: true});
  [[0, .16, 1], [1, .34, 1.4], [2, .52, 1], [3, .68, 1.6]].forEach(([i, t, big]) => {
    const a = i * 2.2, r = radius(t) * scale * 1.05, geo = new THREE.DodecahedronGeometry(.026 * big * scale, 0);
    const m = add(geo, i % 2 ? stoneMat : chunkMat, 'grit');
    m.scale.set(1, .7 + hash(i) * .4, .8 + hash(i + 3) * .5); m.position.set(Math.cos(a) * r, t * H * scale, Math.sin(a) * r); m.rotation.set(a, a * .6, 0);
  });
  const rag = new THREE.PlaneGeometry(.2 * scale, .06 * scale, 5, 1), rp = rag.attributes.position;
  for (let i = 0; i < rp.count; i++) rp.setY(i, rp.getY(i) + Math.sin(rp.getX(i) * 40) * .012 * scale);
  const rm = add(rag, new THREE.MeshStandardMaterial({color: c.rag, roughness: 1, side: THREE.DoubleSide}), 'rag');
  rm.position.set(radius(.45) * scale * 1.1, .45 * H * scale, 0); rm.rotation.set(.4, 1.1, .7);
  return {g, body};
}
