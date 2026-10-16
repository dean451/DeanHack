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
const C = {deep: '#1b3a6e', mid: '#2f5da8', crown: '#a9cdf2', vein: '#0d1e3c', nucleus: '#0b1a33', bone: '#c9cdbf', ice: '#d6ebff', iceDark: '#7fa8d6', tip: '#e8f4ff'};

const paint = (geo, fn) => {
  const p = geo.attributes.position, c = new Float32Array(p.count * 3), o = new THREE.Color();
  for (let i = 0; i < p.count; i++) { fn(p.getX(i), p.getY(i), p.getZ(i), o); o.toArray(c, i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
};

// The mound's outline at angle a: lopsided, with a slumped lobe on one side.
const reach = a => R * (1 + .16 * Math.sin(a * 2 + .8) + .09 * Math.sin(a * 3 - 1.1) + .05 * Math.sin(a * 7));

export function createJelly({kind = 'blue'} = {}) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const col = Object.fromEntries(Object.entries(C).map(([k, v]) => [k, new THREE.Color(v)]));
  const add = (geo, mat, name, parent = body) => { const m = new THREE.Mesh(geo, mat); m.userData.part = name; m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };

  // skin: a sphere pressed flat, the base cut level, the surface wrinkled
  const skinG = new THREE.SphereGeometry(1, 36, 22), sp = skinG.attributes.position;
  const surf = (x, z) => { const a = Math.atan2(z, x); return {r: reach(a), a}; };
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i), y = sp.getY(i), z = sp.getZ(i), {r, a} = surf(x, z);
    const rr = Math.hypot(x, z);
    const wr = 1 + .045 * Math.sin(a * 9 + y * 6) * (y > 0 ? 1 : .3) + .03 * Math.sin(y * 17 + a * 4);
    const top = y > 0 ? y * H * (1 + .16 * Math.sin(rr * 9 + a * 2)) : Math.max(y, -.9) * H * .9;
    sp.setXYZ(i, x * r * wr, top, z * r * wr);
  }
  skinG.computeVertexNormals();
  paint(skinG, (x, y, z, o) => {
    const up = THREE.MathUtils.clamp(y / H, 0, 1), veined = Math.max(0, Math.sin(x * 31 + z * 23) * Math.sin(z * 29 - x * 17));
    o.copy(col.mid).lerp(col.deep, THREE.MathUtils.clamp(.55 - up, 0, 1) * 1.2).lerp(col.crown, THREE.MathUtils.clamp((up - .55) * 1.9, 0, .8)).lerp(col.vein, veined * .45);
  });
  const skin = add(skinG, new THREE.MeshPhysicalMaterial({vertexColors: true, roughness: .12, transparent: true, opacity: .84, clearcoat: 1, clearcoatRoughness: .08,
    emissive: '#1a3f80', emissiveIntensity: .22, side: THREE.DoubleSide}), 'skin');
  skin.position.y = Y;

  // nucleus: dark, clouded, off-centre
  const nucG = new THREE.SphereGeometry(.075, 14, 10); nucG.scale(1.1, .75, .95);
  paint(bare(nucG), (x, y, z, o) => o.copy(col.nucleus).lerp(col.mid, hash(Math.round(x * 80) + Math.round(z * 80) * 7) * .25));
  const nuc = add(nucG, new THREE.MeshStandardMaterial({vertexColors: true, roughness: .5}), 'nucleus');
  nuc.position.set(-.03, Y + .015, .02);

  // the tendril: tapered along its length, curling out along the floor, blue-black, an icy tip
  const path = new THREE.CatmullRomCurve3([new THREE.Vector3(.18, .05, .08), new THREE.Vector3(.32, .035, .2), new THREE.Vector3(.4, .02, .32), new THREE.Vector3(.36, .012, .43)]);
  const tubeG = new THREE.TubeGeometry(path, 14, .05, 8, false), tp = tubeG.attributes.position, seg = 9;
  for (let i = 0; i < tp.count; i++) {
    const ring = Math.floor(i / seg), u = ring / 14, c = path.getPoint(u);
    const k = (1 - u * .8) ; tp.setXYZ(i, c.x + (tp.getX(i) - c.x) * k, c.y + (tp.getY(i) - c.y) * k * .7, c.z + (tp.getZ(i) - c.z) * k);
  }
  tubeG.computeVertexNormals();
  paint(tubeG, (x, y, z, o) => { const u = THREE.MathUtils.clamp((Math.hypot(x - .18, z - .08)) / .45, 0, 1); o.copy(col.deep).lerp(col.vein, .3).lerp(col.tip, Math.max(0, u - .7) * 2.5); });
  add(tubeG, new THREE.MeshPhysicalMaterial({vertexColors: true, roughness: .15, clearcoat: 1, transparent: true, opacity: .88}), 'tendril');

  // inside: a frozen skull and rib, ice shards, bubbles, one opaque mesh
  const inside = [];
  const skull = bare(new THREE.IcosahedronGeometry(.05, 1)); skull.scale(1, .88, 1.05); skull.rotateY(.6); skull.translate(.09, Y - .005, -.06);
  paint(skull, (x, y, z, o) => o.copy(col.bone).lerp(col.iceDark, .35 + hash(Math.round(x * 90) + Math.round(y * 90)) * .15));
  inside.push(skull);
  for (const s of [-1, 1]) { const eye = bare(new THREE.IcosahedronGeometry(.012, 0)); eye.translate(.09 + s * .017 - .01, Y + .004, -.06 + .045); paint(eye, (x, y, z, o) => o.set('#050a14')); inside.push(eye); }
  const rib = bare(new THREE.TorusGeometry(.07, .008, 5, 12, 2.4)); rib.rotateX(Math.PI / 2 - .3); rib.rotateY(.8); rib.translate(-.1, Y - .01, -.05);
  paint(rib, (x, y, z, o) => o.copy(col.bone).lerp(col.iceDark, .4));
  inside.push(rib);
  for (let i = 0; i < 5; i++) {
    const a = i * 2.5 + .5, r = .06 + hash(i * 3) * .15, s = .02 + hash(i * 5) * .02;
    const sh = bare(new THREE.OctahedronGeometry(s, 0)); sh.scale(.6, 1.6, .6); sh.rotateZ(hash(i) * 2 - 1); sh.translate(Math.cos(a) * r, Y + .02 + hash(i * 7) * .05, Math.sin(a) * r);
    paint(sh, (x, y, z, o) => o.copy(col.ice).lerp(col.iceDark, .3));
    inside.push(sh);
  }
  for (let i = 0; i < 8; i++) {
    const a = i * 1.9, r = .05 + hash(i * 11) * .18, b = bare(new THREE.SphereGeometry(.007 + hash(i * 2) * .008, 6, 5));
    b.translate(Math.cos(a) * r, Y + .01 + hash(i * 13) * .08, Math.sin(a) * r);
    paint(b, (x, y, z, o) => o.set('#bcd8f4'));
    inside.push(b);
  }
  add(mergeGeometries(inside), new THREE.MeshStandardMaterial({vertexColors: true, roughness: .45, emissive: '#16305a', emissiveIntensity: .35}), 'inside');

  // the crust: cracked plates of ice on the crown, splinters, icicles hanging off the rim; flat-shaded
  const crust = [];
  for (let i = 0; i < 9; i++) {
    const a = i * 2.399, r = hash(i * 4) * .17, x = Math.cos(a) * r, z = Math.sin(a) * r;
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
