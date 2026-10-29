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
// Ice vortex fourth: a cold, glassy funnel of sleet. The same torn sheet, pale blue-white and lit faintly cold from
// within, slimmer at the waist than the dust funnel and flaring at the top; five long shards of clear ice ride the
// spiral (vortex-spin.js tumbles them fast, so they glint), and a ring of rime stands up off the floor round the
// foot, splinters of frost leaning outward, in one draw (vortex-fx.js lays the frost creeping out under it). Eight draws.
// Energy vortex fifth: a crackling column of lightning. The same torn sheet, narrow and near straight, drawn
// self-lit in electric blue to a white-hot edge, round a blazing white-blue core (vortex-spin.js flickers it);
// five jagged forks of lightning leap out of the spiral (userData.arcs = 5), drawn as one child of the funnel so they
// turn with it; under the foot, an ionised scorch with a glowing ring. vortex-fx.js crackles arcs between the levels
// in userData.arcRings and spits sparks off the core. Five draws.
// Fog cloud last: no funnel at all, a low rolling bank of cold fog. Seven lumpy puffs (each a knobbly sphere pressed
// flat on the floor, pale on top and dark grey underneath) heaped wide and low, the middle ones riding higher, and two
// torn wisps trailing off along the floor; all transparent, so vortex-spin.js billows each and drifts them round each
// other, and vortex-fx.js curls mist out along the floor. Ten draws.
// Seven draws for dust, eight for fire. Handles: body (quirk 'hover'); fire also gives core.
const hash = n => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
const H = .8, ROWS = 14, SEG = 20;
const KINDS = {
  fog: {deep: '#7c838b', pale: '#e2e6ea', ground: '#3a3e44', fog: true, opacity: .46},
  dust: {deep: '#4a3622', mid: '#8a6c46', pale: '#c4a878', grit: '#5a4630', stone: '#6e6a62', rag: '#3a2a22', ground: '#5a4630'},
  steam: {deep: '#7c8790', mid: '#cdd6dd', pale: '#ffffff', ground: '#2a2f33', bead: '#dfe8ee', steam: true, radius: t => .04 + .09 * t ** .6 + .22 * t ** 3.2 + .02 * Math.sin(t * 13), opacity: .5},
  energy: {deep: '#0a1650', mid: '#2f6cff', pale: '#eaf6ff', ground: '#0c1018', energy: true, radius: t => .05 + .12 * t ** .9 + .025 * Math.sin(t * 17), opacity: .58},
  ice: {deep: '#3c6684', mid: '#9cc8e2', pale: '#f4fbff', ground: '#9ab8c8', shard: '#d8f0ff', rime: '#eaf6ff', ice: true, radius: t => .03 + .07 * t + .23 * t ** 2.6 + .015 * Math.sin(t * 15), opacity: .44},
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

  if (c.fog) {
    // the puffs: knobbly spheres pressed flat, heaped wide and low; each its own mesh so vortex-spin.js billows it
    const fogMat = new THREE.MeshStandardMaterial({vertexColors: true, roughness: 1, transparent: true, opacity: c.opacity, depthWrite: false, emissive: '#5a6068', emissiveIntensity: .45});
    const deep = new THREE.Color(c.deep), pale = new THREE.Color(c.pale);
    [[0, 0, .22, .15, .07], [.21, .09, .17, .11, .05], [-.21, .11, .18, .12, .045], [.07, -.23, .16, .1, .04], [-.15, -.19, .15, .09, .03], [.25, -.15, .13, .08, .025], [-.06, .25, .14, .09, .03]].forEach(([x, z, r, h, y], i) => {
      const geo = new THREE.SphereGeometry(1, 18, 10), p = geo.attributes.position, col = new Float32Array(p.count * 3), o = new THREE.Color();
      for (let k = 0; k < p.count; k++) {
        let px = p.getX(k), py = p.getY(k), pz = p.getZ(k);
        const lump = 1 + .14 * Math.sin(px * 5 + i) * Math.sin(pz * 4 - i * 1.3) + .08 * Math.sin(py * 7 + px * 3 + i * 2);
        px *= lump; pz *= lump; py = Math.max(py * lump, -.35); // the underside pressed flat
        p.setXYZ(k, px * r * scale, (py + .35) * h * scale, pz * r * scale);
        o.copy(deep).lerp(pale, Math.min(1, Math.max(0, (py + .35) / 1.2)) ** .8);
        o.toArray(col, k * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
      const m = add(geo, fogMat, 'puff');
      m.position.set(x * scale, y * scale - .02 * scale, z * scale);
    });
    // two torn wisps trailing off along the floor, thin flat strands that fray at their ends
    for (let w = 0; w < 2; w++) {
      const a0 = w ? 2.4 : -.6, pts = [];
      for (let k = 0; k <= 5; k++) { const a = a0 + k * .22 * (w ? 1 : -1), r = (.24 + k * .035) * scale; pts.push(new THREE.Vector3(Math.cos(a) * r, (.05 - k * .006) * scale, Math.sin(a) * r)); }
      const curve = new THREE.CatmullRomCurve3(pts), geo = new THREE.TubeGeometry(curve, 10, .04 * scale, 6, false), tp = geo.attributes.position, col = new Float32Array(tp.count * 3), o = new THREE.Color();
      const mid = new THREE.Vector3();
      for (let k = 0; k < tp.count; k++) {
        const u = Math.floor(k / 7) / 10, c0 = curve.getPointAt(u, mid), f = 1 - .75 * u;
        tp.setXYZ(k, c0.x + (tp.getX(k) - c0.x) * f, c0.y + (tp.getY(k) - c0.y) * f * .45, c0.z + (tp.getZ(k) - c0.z) * f);
        o.copy(deep).lerp(pale, .45 - .25 * u).toArray(col, k * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
      add(geo, fogMat, 'wisp');
    }
    return {g, body};
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
  const skin = c.fire || c.energy
    ? new THREE.MeshBasicMaterial({vertexColors: true, transparent: true, opacity: c.opacity, depthWrite: false, side: THREE.DoubleSide})
    : new THREE.MeshStandardMaterial({vertexColors: true, roughness: c.ice ? .3 : 1, metalness: c.ice ? .1 : 0, transparent: true, opacity: c.opacity || .52, depthWrite: false, side: THREE.DoubleSide,
      emissive: c.ice ? '#5a8cb0' : c.steam ? '#7a848c' : '#2a1c0e', emissiveIntensity: c.ice ? .35 : c.steam ? .45 : .25});
  const funnel = add(merged, skin, 'funnel');
  const rad = c.radius || radius;
  if (c.energy) {
    // the forks: each a jagged bolt leaping out of the sheet and forking once, thin glowing prisms, one draw
    const bolts = [], seg = (p, q, w) => { const d = q.clone().sub(p), len = d.length(), b = new THREE.CylinderGeometry(w * .7, w, len, 3, 1);
      b.translate(0, len / 2, 0); b.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); b.translate(p.x, p.y, p.z); return b; };
    for (let i = 0; i < 5; i++) {
      const a = i * 1.26 + .4, t = .25 + i * .14, y = t * H * scale, r0 = rad(t) * scale, pts = [new THREE.Vector3(Math.cos(a) * r0, y, Math.sin(a) * r0)];
      for (let k = 1; k <= 3; k++) { const aa = a + (hash(i * 7 + k) - .5) * .5, rr = r0 + k * .045 * scale; pts.push(new THREE.Vector3(Math.cos(aa) * rr, y + (hash(i * 3 + k) - .4) * .08 * scale, Math.sin(aa) * rr)); }
      for (let k = 0; k < 3; k++) bolts.push(seg(pts[k], pts[k + 1], .009 * scale));
      // the fork, off the second kink
      const f = pts[2].clone().add(new THREE.Vector3(Math.cos(a + .8) * .05 * scale, -.04 * scale, Math.sin(a + .8) * .05 * scale));
      bolts.push(seg(pts[2], f, .006 * scale));
      g.userData.arcs = (g.userData.arcs || 0) + 1;
    }
    const mb = mergeGeometries(bolts); bolts.forEach(b => b.dispose());
    const bm = new THREE.Mesh(mb, new THREE.MeshBasicMaterial({color: '#dcefff'})); bm.userData.part = 'bolts'; funnel.add(bm);
    // the core: a blazing white-blue spark in the middle of the column
    const core = add(new THREE.SphereGeometry(.07 * scale, 8, 6), new THREE.MeshStandardMaterial({color: c.pale, emissive: '#9ccaff', emissiveIntensity: 4.5, roughness: .2}), 'core');
    core.scale.set(.8, 1.6, .8); core.position.y = .32 * scale;
    g.userData.core = core;
    // the ionised ring glowing on the scorched floor round the foot
    const ring = new THREE.RingGeometry(.2 * scale, .24 * scale, 24), rp = ring.attributes.position;
    for (let i = 0; i < rp.count; i++) { const k = 1 + .08 * Math.sin(i * 1.7); rp.setXY(i, rp.getX(i) * k, rp.getY(i) * k); }
    const rm = add(ring, new THREE.MeshBasicMaterial({color: '#4a8cff', transparent: true, opacity: .55, depthWrite: false}), 'charge', g);
    rm.rotation.x = -Math.PI / 2; rm.position.y = .014;
    // where vortex-fx.js crackles its arcs: levels up the sheet (body space; they turn with the funnel)
    g.userData.arcRings = [.2, .35, .5, .65, .8].map(t => ({y: t * H * scale, r: rad(t) * scale, mesh: funnel}));
    g.userData.fxScale = scale;
    return {g, body, core};
  }
  if (c.steam) return {g, body};
  if (c.ice) {
    // long shards of clear ice in the spiral, each its own mesh so vortex-spin.js tumbles it on its own phase
    const iceMat = new THREE.MeshStandardMaterial({color: c.shard, roughness: .15, metalness: .2, flatShading: true, transparent: true, opacity: .85, emissive: '#6aa8d8', emissiveIntensity: .6});
    [[0, .14, .9], [1, .3, 1.3], [2, .46, 1], [3, .62, 1.5], [4, .8, 1.1]].forEach(([i, t, big]) => {
      const a = i * 2.5 + .3, r = rad(t) * scale * 1.05, geo = new THREE.OctahedronGeometry(.024 * big * scale, 0);
      geo.scale(.55, 2.4, .8);
      const m = add(geo, iceMat, 'shard');
      m.position.set(Math.cos(a) * r, t * H * scale, Math.sin(a) * r); m.rotation.set(.6 + hash(i) * .8, a, .9 * (hash(i + 4) - .5));
    });
    // the rime ring: splinters of frost standing up off the floor round the foot, leaning outward, in one draw
    const rime = [];
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2 + hash(i) * .3, r = (.17 + hash(i + 7) * .09) * scale, len = (.035 + hash(i + 3) * .05) * scale;
      const sp = new THREE.ConeGeometry(.012 * scale * (1 + hash(i + 11)), len, 4);
      sp.translate(0, len / 2, 0); sp.rotateZ(-(.35 + hash(i + 5) * .4)); sp.rotateY(-a); sp.translate(Math.cos(a) * r, .012, Math.sin(a) * r); rime.push(sp);
    }
    const mr = mergeGeometries(rime); rime.forEach(r => r.dispose());
    add(mr, new THREE.MeshStandardMaterial({color: c.rime, roughness: .25, flatShading: true, emissive: '#7ab0d8', emissiveIntensity: .4}), 'rime', g);
    return {g, body};
  }

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
