import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The jellies were the shared Kirby blob: a squashed sphere with bumps. This is the family's body, one kind
// at a time. Blue jelly first: the cold one, a dark glassy mass that has frozen what it caught.
// - the skin: a low, lopsided, wrinkled mound (a SphereGeometry deformed by vertex, so jelly-frost.js still
//   finds and breathes it), deep blue on its flanks, rimed pale on its crown, veined where it wrinkles;
// - the nucleus: a dark clouded core, opaque (jelly-frost finds it by that);
// - one tendril (a TubeGeometry, tapered) reaching out along the floor, blue-black, tipped in ice;
// - inside: what it froze, a skull and a rib still in the glass, with ice shards and bubbles;
// - the crust: flat-shaded plates and splinters of ice cracked across its crown, icicles hanging off the rim.
// Five draws, and jelly-frost.js adds the rime on the floor, the mist and the glints. Handles: body (quirk 'blob').
const hash = n => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
const bare = geo => { geo.deleteAttribute('uv'); return geo.index ? geo.toNonIndexed() : geo; };
const R = .31, H = .13, Y = .12; // the skin's reach and height; jelly-frost's DOME reads Y and a ~.28 radius
const PALETTES = {
  blue: {deep: '#1b3a6e', mid: '#2f5da8', crown: '#a9cdf2', vein: '#0d1e3c', nucleus: '#0b1a33', bone: '#c9cdbf', ice: '#d6ebff', iceDark: '#7fa8d6', tip: '#e8f4ff'},
  // spotted: a sour olive mass, pocked where its own acid has eaten through its skin
  spotted: {deep: '#3b4416', mid: '#6b7a24', crown: '#b4b85a', vein: '#232a0c', nucleus: '#1a1d08', bone: '#a8a583', ice: '#8f9a3a', iceDark: '#4d5a1c', tip: '#c9d070', pit: '#0c0e04', stain: '#2a3008'},
};

const paint = (geo, fn) => {
  const p = geo.attributes.position, c = new Float32Array(p.count * 3), o = new THREE.Color();
  for (let i = 0; i < p.count; i++) { fn(p.getX(i), p.getY(i), p.getZ(i), o); o.toArray(c, i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
};

// The mound's outline at angle a: lopsided, with a slumped lobe on one side.
// The skull's place on the crown: the skin is pressed into a bowl round it so it shows from above.
const SKULL = {x: .09, z: -.06}, bowl = (x, z) => Math.max(0, 1 - Math.hypot(x - SKULL.x, z - SKULL.z) / .085);
// Cracks: thin bands where two wandering sine fields cross zero, cut into the skin and darkened.
const crack = (x, z) => { const a = Math.abs(Math.sin(x * 26 + z * 11 + Math.sin(z * 19) * 1.6)), b = Math.abs(Math.sin(z * 23 - x * 9 + Math.sin(x * 17) * 1.4)); return Math.max(0, 1 - Math.min(a, b) * 9); };
const reach = a => R * (1 + .16 * Math.sin(a * 2 + .8) + .09 * Math.sin(a * 3 - 1.1) + .05 * Math.sin(a * 7));

export function createJelly({kind = 'blue'} = {}) {
  const spotted = kind === 'spotted', C = PALETTES[kind] || PALETTES.blue;
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const col = Object.fromEntries(Object.entries(C).map(([k, v]) => [k, new THREE.Color(v)]));
  const add = (geo, mat, name, parent = body) => { const m = new THREE.Mesh(geo, mat); m.userData.part = name; m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };

  // the acid pits (spotted): where the skin has been eaten in, as unit-sphere directions (x, z) and a radius
  const pits = !spotted ? [] : Array.from({length: 9}, (_, i) => { const a = i * 2.399 + .4, r = .15 + hash(i * 4 + 1) * .6; return {x: Math.cos(a) * r, z: Math.sin(a) * r, s: .1 + hash(i * 7) * .09}; });
  const pitAt = (x, z) => { let d = 0; for (const p of pits) d = Math.max(d, 1 - Math.hypot(x - p.x, z - p.z) / p.s); return Math.max(0, d); };
  // skin: a sphere pressed flat, the base cut level, the surface wrinkled
  const skinG = new THREE.SphereGeometry(1, 36, 22), sp = skinG.attributes.position;
  const surf = (x, z) => { const a = Math.atan2(z, x); return {r: reach(a), a}; };
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i), y = sp.getY(i), z = sp.getZ(i), {r, a} = surf(x, z);
    const rr = Math.hypot(x, z);
    const wr = 1 + .045 * Math.sin(a * 9 + y * 6) * (y > 0 ? 1 : .3) + .03 * Math.sin(y * 17 + a * 4);
    const dent = y > 0 ? pitAt(x, z) : 0, wx = x * r * wr, wz = z * r * wr;
    const bl = !spotted && y > 0 ? bowl(wx, wz) : 0, ck = !spotted && y > 0 ? crack(wx, wz) : 0;
    const top = (y > 0 ? y * H * (1 + .16 * Math.sin(rr * 9 + a * 2)) : Math.max(y, -.9) * H * .9) * (1 - .55 * dent) * (1 - .7 * bl) * (1 - .22 * ck);
    sp.setXYZ(i, wx, top, wz);
  }
  skinG.computeVertexNormals();
  paint(skinG, (x, y, z, o) => {
    const up = THREE.MathUtils.clamp(y / H, 0, 1), veined = Math.max(0, Math.sin(x * 31 + z * 23) * Math.sin(z * 29 - x * 17));
    const ck = spotted ? 0 : crack(x, z);
    o.copy(col.mid).lerp(col.deep, THREE.MathUtils.clamp(.55 - up, 0, 1) * 1.2).lerp(col.crown, THREE.MathUtils.clamp((up - .55) * 1.9, 0, spotted ? .35 : .8)).lerp(col.vein, veined * .45);
    if (ck > 0) o.lerp(col.vein, Math.min(1, ck * 1.3));
    if (spotted) { const d = pitAt(x / R * .95, z / R * .95); if (d > 0) o.lerp(col.pit, Math.min(1, d * 1.6)); }
  });
  const skin = add(skinG, new THREE.MeshPhysicalMaterial({vertexColors: true, roughness: spotted ? .12 : .42, transparent: true, opacity: .84, clearcoat: spotted ? 1 : .25, clearcoatRoughness: spotted ? .08 : .5, flatShading: !spotted,
    emissive: spotted ? '#4a5a10' : '#1a3f80', emissiveIntensity: spotted ? .16 : .22, side: THREE.DoubleSide}), 'skin');
  skin.position.y = Y;

  // nucleus: dark, clouded, off-centre
  const nucG = new THREE.SphereGeometry(.075, 14, 10); nucG.scale(1.1, .75, .95);
  paint(bare(nucG), (x, y, z, o) => o.copy(col.nucleus).lerp(col.mid, hash(Math.round(x * 80) + Math.round(z * 80) * 7) * .25));
  const nuc = add(nucG, new THREE.MeshStandardMaterial({vertexColors: true, roughness: .5}), 'nucleus');
  nuc.position.set(-.03, Y + .015, .02);

  // the tendril: tapered along its length, curling out along the floor, blue-black, an icy tip
  const path = new THREE.CatmullRomCurve3([new THREE.Vector3(.2, .034, .08), new THREE.Vector3(.34, .03, .1), new THREE.Vector3(.44, .026, .18), new THREE.Vector3(.46, .022, .3)]);
  const tubeG = new THREE.TubeGeometry(path, 14, .05, 8, false), tp = tubeG.attributes.position, seg = 9;
  for (let i = 0; i < tp.count; i++) {
    const ring = Math.floor(i / seg), u = ring / 14, c = path.getPoint(u);
    const k = (1 - u * .8) ; tp.setXYZ(i, c.x + (tp.getX(i) - c.x) * k, c.y + (tp.getY(i) - c.y) * k * .5, c.z + (tp.getZ(i) - c.z) * k);
  }
  tubeG.computeVertexNormals();
  paint(tubeG, (x, y, z, o) => { const u = THREE.MathUtils.clamp((Math.hypot(x - .2, z - .08)) / .4, 0, 1); o.copy(col.deep).lerp(col.vein, .3).lerp(col.tip, Math.max(0, u - .7) * 2.5); });
  add(tubeG, new THREE.MeshPhysicalMaterial({vertexColors: true, roughness: .15, clearcoat: 1, transparent: true, opacity: .88}), 'tendril');

  // inside: a frozen skull and rib, ice shards, bubbles, one opaque mesh
  const inside = [];
  const skull = bare(new THREE.IcosahedronGeometry(.05, 1)); skull.scale(1.3, 1.15, 1.35); skull.rotateY(.6); skull.translate(SKULL.x, Y + .05, SKULL.z);
  paint(skull, (x, y, z, o) => o.copy(col.bone).lerp(col.iceDark, .55 + hash(Math.round(x * 90) + Math.round(y * 90)) * .15));
  inside.push(skull);
  for (const s of [-1, 1]) { const eye = bare(new THREE.IcosahedronGeometry(.017, 0)); eye.translate(SKULL.x + s * .024, Y + .099, SKULL.z + .022); paint(eye, (x, y, z, o) => o.set('#050a14')); inside.push(eye); }
  const rib = bare(new THREE.TorusGeometry(.07, .008, 5, 12, 2.4)); rib.rotateX(Math.PI / 2 - .3); rib.rotateY(.8); rib.translate(-.1, Y - .01, -.05);
  paint(rib, (x, y, z, o) => o.copy(col.bone).lerp(col.iceDark, .4));
  inside.push(rib);
  for (let i = 0; i < (spotted ? 0 : 5); i++) {
    const a = i * 2.5 + .5, r = .06 + hash(i * 3) * .15, s = .02 + hash(i * 5) * .02;
    const sh = bare(new THREE.OctahedronGeometry(s, 0)); sh.scale(.6, 1.6, .6); sh.rotateZ(hash(i) * 2 - 1); sh.translate(Math.cos(a) * r, Y + .02 + hash(i * 7) * .05, Math.sin(a) * r);
    paint(sh, (x, y, z, o) => o.copy(col.ice).lerp(col.iceDark, .3));
    inside.push(sh);
  }
  for (let i = 0; i < 8; i++) {
    const a = i * 1.9, r = .05 + hash(i * 11) * .18, b = bare(new THREE.SphereGeometry(.007 + hash(i * 2) * .008, 6, 5));
    b.translate(Math.cos(a) * r, Y + .01 + hash(i * 13) * .08, Math.sin(a) * r);
    paint(b, (x, y, z, o) => o.set(spotted ? '#c3c96a' : '#bcd8f4'));
    inside.push(b);
  }
  add(mergeGeometries(inside), new THREE.MeshStandardMaterial({vertexColors: true, roughness: .45, emissive: spotted ? '#3a4510' : '#16305a', emissiveIntensity: .35}), 'inside');

  if (spotted) {
    // the pits: each a ragged rim of scab round a black hole, with a thread of acid hanging off the lip
    const scabs = [];
    pits.forEach((p, i) => {
      const x = p.x * R * .95, z = p.z * R * .95, rr = Math.hypot(p.x, p.z), top = Y + H * Math.sqrt(Math.max(0, 1 - rr * rr)) * 1.05, y = top * .5 + Y * .5 + .004;
      const rim = bare(new THREE.CylinderGeometry(p.s * R * .95, p.s * R * 1.25, .016, 6 + (i % 3), 1, true)); rim.rotateY(hash(i) * 3); rim.translate(x, top * .82 + Y * .18 + .002, z);
      paint(rim, (px, py, pz, o) => o.copy(col.iceDark).lerp(col.tip, hash(i * 13 + Math.round(px * 400)) * .4));
      const hole = bare(new THREE.CircleGeometry(p.s * R * .9, 6 + (i % 3))); hole.rotateX(-Math.PI / 2); hole.translate(x, top * .46 + Y * .54 + .006, z);
      paint(hole, (px, py, pz, o) => o.copy(col.pit));
      scabs.push(rim, hole);
      if (i % 2 === 0) { const d = bare(new THREE.ConeGeometry(.012, .06 + hash(i) * .03, 4)); d.rotateX(Math.PI); d.translate(x * 1.25, Y + .02, z * 1.25); paint(d, (px, py, pz, o) => o.copy(col.tip).lerp(col.mid, .4)); scabs.push(d); }
    });
    add(mergeGeometries(scabs), new THREE.MeshStandardMaterial({vertexColors: true, roughness: .55, flatShading: true, side: THREE.DoubleSide, emissive: '#2a3208', emissiveIntensity: .3}), 'pits');
    return {g, body};
  }
  // the crust: cracked plates of ice on the crown, splinters, icicles hanging off the rim; flat-shaded
  const crust = [];
  for (let i = 0; i < 9; i++) {
    const a = i * 2.399, r = hash(i * 4) * .17, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x - SKULL.x, z - SKULL.z) < .11) continue; // keep the skull clear
    const y = Y + H * .93 * (1 - (r / R) ** 2) * (1 + .1) - .005;
    const plate = bare(new THREE.CylinderGeometry(.03 + hash(i * 6) * .035, .042 + hash(i * 9) * .03, .014, 5 + (i % 3), 1));
    plate.rotateY(hash(i) * 3); plate.rotateX((hash(i * 2) - .5) * .5); plate.rotateZ((hash(i * 3) - .5) * .5); plate.translate(x, y, z);
    paint(plate, (px, py, pz, o) => o.copy(col.ice).lerp(col.iceDark, hash(i * 17 + Math.round(py * 500)) * .5));
    crust.push(plate);
  }
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9 + .3, len = .035 + hash(i * 3) * .05, rr = reach(a) * .93;
    const ic = bare(new THREE.ConeGeometry(.013 + hash(i) * .01, len, 4)); ic.rotateX(Math.PI);
    ic.translate(Math.cos(a) * rr, Y - .02 - len / 2, Math.sin(a) * rr);
    paint(ic, (x, y, z, o) => o.copy(col.tip).lerp(col.iceDark, THREE.MathUtils.clamp((y + .02) * 6, 0, 1) * .5));
    crust.push(ic);
  }
  for (let i = 0; i < 3; i++) {
    const a = i * 1.7 + 1, r = .1 + hash(i * 5) * .1, sp2 = bare(new THREE.ConeGeometry(.012, .05 + hash(i) * .03, 4));
    sp2.rotateZ((hash(i * 7) - .5) * .8); sp2.translate(Math.cos(a) * r, Y + H * .95 + .03, Math.sin(a) * r);
    paint(sp2, (x, y, z, o) => o.copy(col.tip));
    crust.push(sp2);
  }
  add(mergeGeometries(crust), new THREE.MeshStandardMaterial({vertexColors: true, roughness: .3, flatShading: true, emissive: '#2a4f88', emissiveIntensity: .25}), 'crust');
  return {g, body};
}
