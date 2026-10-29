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
// Spotted jelly: the same mound, sour olive, pocked with acid pits that run together, a slick on the floor.
// Ochre jelly: the corrosive one, a wet glossy amber mass, slack and sagging, runnels down its flanks, slumped out in a
// lobe over a leather boot it is eating (the toe swallowed, the shaft out on the floor, blackened where the jelly has
// it), its tendril lying over the ankle, and only pitted bones left inside. Five draws; acid-fizz.js adds the etch,
// the bubbles and the fumes to both acid jellies.
const hash = n => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
const bare = geo => { geo.deleteAttribute('uv'); return geo.index ? geo.toNonIndexed() : geo; };
const R = .31, H = .13, Y = .12; // the skin's reach and height; jelly-frost's DOME reads Y and a ~.28 radius
const PALETTES = {
  blue: {deep: '#1b3a6e', mid: '#2f5da8', crown: '#a9cdf2', vein: '#0d1e3c', nucleus: '#0b1a33', bone: '#c9cdbf', ice: '#d6ebff', iceDark: '#7fa8d6', tip: '#e8f4ff'},
  // spotted: a sour olive mass, pocked where its own acid has eaten through its skin
  // ochre: a wet amber mass, glossy and slack, sagging over the boot it is eating
  ochre: {deep: '#5a2c06', mid: '#b8701a', crown: '#f4c45c', vein: '#3a1804', nucleus: '#2a1204', bone: '#b0a07e', iceDark: '#7a4810', tip: '#ffd27a',
    leather: '#6e4524', scuffed: '#93683e', burnt: '#1e1007', stain: '#a8691a', sole: '#33241a', buckle: '#5c6a4c'},
  spotted: {deep: '#3b4416', mid: '#6b7a24', crown: '#b4b85a', vein: '#232a0c', nucleus: '#1a1d08', bone: '#a8a583', ice: '#8f9a3a', iceDark: '#4d5a1c', tip: '#c9d070', pit: '#0c0e04', stain: '#07090400'.slice(0, 7)},
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

// The ochre jelly's boot: a tall leather boot lying on its side, its foot swallowed into the jelly's lobe at angle
// `a` (toward the camera, +z), its shaft lying out along the floor past the rim. The tendril reaches out over the
// ankle and down the far side of the shaft.
const BOOT = (() => {
  const a = 1.1, ankle = .35, size = .85, dir = [Math.cos(a), Math.sin(a)], toward = Math.atan2(dir[1], -dir[0]), shaft = [-Math.sin(toward), -Math.cos(toward)];
  const at = (r, along, up, out = 0) => [dir[0] * (r + out) + shaft[0] * along, up, dir[1] * (r + out) + shaft[1] * along];
  return {a, ankle, size, dir, toward, tendril: [at(.21, 0, .06), at(.31, .01, .09), at(.37, .05, .09), at(.34, .09, .03)]};
})();
function bootGeometry(col) {
  // built standing, toe along +x and the shaft up +y from the ankle at the origin, then laid on its side: one tube
  // from the shaft's mouth down through the ankle and out along the foot to the toe, its bottom pressed flat for the sole
  const path = new THREE.CatmullRomCurve3([[0, .16, 0], [0, .1, 0], [0, .03, 0], [.02, -.022, 0], [.07, -.032, 0], [.125, -.036, 0]].map(p => new THREE.Vector3(...p)));
  const N = 22, RAD = 12, tube = new THREE.TubeGeometry(path, N, 1, RAD, false), tp = tube.attributes.position, sole = [];
  const radius = u => u < .55 ? .045 - .008 * u : THREE.MathUtils.lerp(.04, .022, (u - .55) / .45);
  const c = new THREE.Vector3(), off = new THREE.Vector3();
  for (let i = 0; i < tp.count; i++) {
    const u = Math.floor(i / (RAD + 1)) / N; path.getPointAt(u, c); off.fromBufferAttribute(tp, i).sub(c);
    const foot = THREE.MathUtils.smoothstep(u, .5, .7), r = radius(u);
    off.multiplyScalar(r);
    // the foot: wider than tall, its underside pressed flat; the mouth's rim eaten ragged
    if (foot > 0) { off.z *= 1 + .25 * foot; if (off.y < 0) off.y *= 1 - .6 * foot; }
    if (u < .08) off.multiplyScalar(1 + .12 * Math.abs(Math.sin(Math.atan2(off.z, off.x) * 3)) * (1 - u / .08));
    sole[i] = foot > .5 && off.y < -.4 * r * (1 - .6 * foot);
    tp.setXYZ(i, c.x + off.x, c.y + off.y, c.z + off.z);
  }
  const boot = bare(tube); boot.userData.c = 'leather'; boot.userData.sole = sole;
  const toe = bare(new THREE.SphereGeometry(.022, 8, 6)); toe.scale(1, .8, 1.25); toe.translate(.125, -.036, 0); toe.userData.c = 'leather';
  const strap = bare(new THREE.CylinderGeometry(.047, .047, .012, 12, 1, true)); strap.translate(0, .045, 0); strap.userData.c = 'sole';
  const buckle = bare(new THREE.TorusGeometry(.014, .004, 4, 8)); buckle.rotateY(Math.PI / 2); buckle.translate(0, .045, .048); buckle.userData.c = 'buckle';
  // the dark inside of the shaft's mouth
  const mouth = bare(new THREE.CircleGeometry(.042, 12)); mouth.rotateX(-Math.PI / 2); mouth.translate(0, .15, 0); mouth.userData.c = 'burnt';
  const parts = [boot, toe, strap, buckle, mouth];
  // laid on its side, the toe toward the jelly's middle
  const dir = new THREE.Vector3(BOOT.dir[0], 0, BOOT.dir[1]);
  for (const geo of parts) {
    geo.scale(BOOT.size, BOOT.size, BOOT.size); geo.rotateX(-Math.PI / 2); geo.rotateY(BOOT.toward); geo.translate(dir.x * BOOT.ankle, .051 * BOOT.size, dir.z * BOOT.ankle);
    // the leather blackened and stained amber where the jelly has it, scuffed further out, holes eaten through near the toe
    const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), o = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), r = Math.hypot(x, z), inJelly = THREE.MathUtils.clamp((.34 - r) / .09, 0, 1);
      const spot = hash(Math.round(x * 140) * 13 + Math.round(z * 140) * 7 + Math.round(y * 140));
      o.copy(col[geo.userData.sole?.[i] ? 'sole' : geo.userData.c]);
      if (geo.userData.c === 'leather' && !geo.userData.sole?.[i]) o.lerp(col.scuffed, spot * .4 * (1 - inJelly));
      if (geo.userData.c !== 'burnt') o.lerp(col.stain, inJelly * .5).lerp(col.burnt, inJelly * (spot > .6 ? .9 : .3));
      o.toArray(cols, i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  }
  return mergeGeometries(parts);
}

export function createJelly({kind = 'blue'} = {}) {
  const spotted = kind === 'spotted', ochre = kind === 'ochre', blue = !spotted && !ochre, C = PALETTES[kind] || PALETTES.blue;
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const col = Object.fromEntries(Object.entries(C).map(([k, v]) => [k, new THREE.Color(v)]));
  const add = (geo, mat, name, parent = body) => { const m = new THREE.Mesh(geo, mat); m.userData.part = name; m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };

  // the acid pits (spotted): where the skin has been eaten in, as unit-sphere directions (x, z) and a radius
  // Not a ring of equals: a few big sores, small ones between, and pairs that overlap and run together.
  // x, z are unit-disc directions; s the reach and d the depth of each.
  const pits = !spotted ? [] : [
    {x: -.52, z: .1, s: .21, d: 1}, {x: -.34, z: .24, s: .12, d: .75}, // the worst: a big one with a second eating into it
    {x: .08, z: -.5, s: .17, d: .9}, {x: .24, z: -.36, s: .08, d: .6}, {x: .36, z: -.52, s: .07, d: .5},
    {x: .5, z: .24, s: .075, d: .45}, {x: -.08, z: .46, s: .13, d: .8}, {x: .04, z: .04, s: .055, d: .5}, {x: .62, z: -.12, s: .1, d: .7},
  ];
  // where pits overlap their depths add, so the joined ones sink into one trench
  const pitAt = (x, z) => { let d = 0; for (const p of pits) d += p.d * Math.max(0, 1 - Math.hypot(x - p.x, z - p.z) / p.s); return Math.min(1, d); };
  // spotted: the mound's rim is torn, not smooth; ochre: it slumps out in a lobe over the boot (at BOOT.a)
  const torn = a => spotted ? 1 + .06 * Math.sin(a * 5 + 1) + .045 * Math.sin(a * 11 + 2) + .03 * Math.sin(a * 17 + .5)
    : ochre ? 1 + .1 * Math.max(0, Math.cos(a - BOOT.a)) ** 3 - .05 * Math.max(0, Math.cos(a - BOOT.a - Math.PI)) ** 2 : 1;
  // skin: a sphere pressed flat, the base cut level, the surface wrinkled
  const skinG = new THREE.SphereGeometry(1, 36, 22), sp = skinG.attributes.position;
  const surf = (x, z) => { const a = Math.atan2(z, x); return {r: reach(a) * torn(a), a}; };
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i), y = sp.getY(i), z = sp.getZ(i), {r, a} = surf(x, z);
    const rr = Math.hypot(x, z);
    // (ochre: slack folds sagging round its flanks instead of wrinkles, and runnels down its sides)
    const wr = ochre ? 1 + .035 * Math.sin(y * 9 + Math.sin(a * 3) * 1.5) * (1 - Math.abs(y)) + .025 * Math.max(0, Math.sin(a * 13 + 1)) * (1 - y)
      : 1 + .045 * Math.sin(a * 9 + y * 6) * (y > 0 ? 1 : .3) + .03 * Math.sin(y * 17 + a * 4);
    const dent = y > 0 ? pitAt(x, z) : 0, wx = x * r * wr, wz = z * r * wr;
    const bl = blue && y > 0 ? bowl(wx, wz) : 0, ck = blue && y > 0 ? crack(wx, wz) : 0;
    // (ochre: sagging, its crown pulled down toward the lobe it is pouring out over the boot)
    const sag = ochre ? 1 - .25 * Math.max(0, Math.cos(a - BOOT.a)) * rr : 1;
    const top = (y > 0 ? y * H * sag * (1 + (ochre ? .08 : .16) * Math.sin(rr * 9 + a * 2)) : Math.max(y, -.9) * H * .9) * (1 - (spotted ? .8 : .55) * dent) * (1 - .7 * bl) * (1 - .22 * ck);
    sp.setXYZ(i, wx, top, wz);
  }
  skinG.computeVertexNormals();
  paint(skinG, (x, y, z, o) => {
    const up = THREE.MathUtils.clamp(y / H, 0, 1), veined = Math.max(0, Math.sin(x * 31 + z * 23) * Math.sin(z * 29 - x * 17));
    const ck = blue ? crack(x, z) : 0;
    o.copy(col.mid).lerp(col.deep, THREE.MathUtils.clamp(.55 - up, 0, 1) * 1.2).lerp(col.crown, THREE.MathUtils.clamp((up - .55) * 1.9, 0, spotted ? .35 : .8)).lerp(col.vein, veined * .45);
    if (ck > 0) o.lerp(col.vein, Math.min(1, ck * 1.3));
    if (spotted) { const d = pitAt(x / R * .95, z / R * .95); if (d > 0) o.lerp(col.pit, Math.min(1, d * 2.8)); }
    // ochre: paler runnels streaking down the flanks, and the lobe over the boot darkened with what it is dissolving
    if (ochre) { const a = Math.atan2(z, x); o.lerp(col.tip, Math.max(0, Math.sin(a * 13 + 1)) ** 4 * (1 - up) * .45).lerp(col.deep, Math.max(0, Math.cos(a - BOOT.a)) ** 4 * (1 - up) * .5); }
  });
  const wet = !blue, skin = add(skinG, new THREE.MeshPhysicalMaterial({vertexColors: true, roughness: ochre ? .06 : spotted ? .12 : .42, transparent: true, opacity: ochre ? .8 : .84,
    clearcoat: wet ? 1 : .25, clearcoatRoughness: ochre ? .04 : spotted ? .08 : .5, flatShading: blue,
    emissive: ochre ? '#6a3606' : spotted ? '#4a5a10' : '#1a3f80', emissiveIntensity: ochre ? .2 : spotted ? .16 : .22, side: THREE.DoubleSide}), 'skin');
  skin.position.y = Y;

  // nucleus: dark, clouded, off-centre
  const nucG = new THREE.SphereGeometry(.075, 14, 10); nucG.scale(1.1, .75, .95);
  paint(bare(nucG), (x, y, z, o) => o.copy(col.nucleus).lerp(col.mid, hash(Math.round(x * 80) + Math.round(z * 80) * 7) * .25));
  const nuc = add(nucG, new THREE.MeshStandardMaterial({vertexColors: true, roughness: .5}), 'nucleus');
  nuc.position.set(-.03, Y + .015, .02);

  // the tendril: tapered along its length, curling out along the floor, blue-black, an icy tip
  // (ochre: it lies over the boot's shaft, holding it while it eats)
  const path = new THREE.CatmullRomCurve3(ochre ? BOOT.tendril.map(p => new THREE.Vector3(...p))
    : [new THREE.Vector3(.2, .034, .08), new THREE.Vector3(.34, .03, .1), new THREE.Vector3(.44, .026, .18), new THREE.Vector3(.46, .022, .3)]);
  const tubeG = new THREE.TubeGeometry(path, 14, .05, 8, false), tp = tubeG.attributes.position, seg = 9;
  for (let i = 0; i < tp.count; i++) {
    const ring = Math.floor(i / seg), u = ring / 14, c = path.getPoint(u);
    const k = (1 - u * .8) ; tp.setXYZ(i, c.x + (tp.getX(i) - c.x) * k, c.y + (tp.getY(i) - c.y) * k * .5, c.z + (tp.getZ(i) - c.z) * k);
  }
  tubeG.computeVertexNormals();
  const root = path.getPoint(0);
  paint(tubeG, (x, y, z, o) => { const u = THREE.MathUtils.clamp((Math.hypot(x - root.x, z - root.z)) / .4, 0, 1); o.copy(col.deep).lerp(col.vein, ochre ? 0 : .3).lerp(col.tip, Math.max(0, u - .7) * 2.5); });
  add(tubeG, new THREE.MeshPhysicalMaterial({vertexColors: true, roughness: .15, clearcoat: 1, transparent: true, opacity: .88}), 'tendril');

  // inside: a frozen skull and rib, ice shards, bubbles, one opaque mesh
  const inside = [];
  if (ochre) {
    // what is left of the last thing it ate: no skull, only pitted, half-gone bones (finger bones, a rib end)
    for (let i = 0; i < 6; i++) {
      const a = i * 1.3 + 2, r = .05 + hash(i * 7) * .12, len = .025 + hash(i * 3) * .03;
      const b = bare(new THREE.CylinderGeometry(.006, .008, len, 5)); b.rotateZ(Math.PI / 2 + (hash(i) - .5)); b.rotateY(hash(i * 5) * 3); b.translate(Math.cos(a) * r, Y + .015 + hash(i * 9) * .04, Math.sin(a) * r);
      paint(b, (x, y, z, o) => o.copy(col.bone).lerp(col.iceDark, .35 + hash(i * 17 + Math.round(y * 600)) * .4));
      inside.push(b);
    }
  }
  const skull = bare(new THREE.IcosahedronGeometry(.05, 1)); skull.scale(1.3, 1.15, 1.35); skull.rotateY(.6); skull.translate(SKULL.x, Y + .05, SKULL.z);
  paint(skull, (x, y, z, o) => o.copy(col.bone).lerp(col.iceDark, .55 + hash(Math.round(x * 90) + Math.round(y * 90)) * .15));
  if (!ochre) inside.push(skull);
  for (const s of ochre ? [] : [-1, 1]) { const eye = bare(new THREE.IcosahedronGeometry(.017, 0)); eye.translate(SKULL.x + s * .024, Y + .099, SKULL.z + .022); paint(eye, (x, y, z, o) => o.set('#050a14')); inside.push(eye); }
  const rib = bare(new THREE.TorusGeometry(.07, .008, 5, 12, 2.4)); rib.rotateX(Math.PI / 2 - .3); rib.rotateY(.8); rib.translate(-.1, Y - .01, -.05);
  paint(rib, (x, y, z, o) => o.copy(col.bone).lerp(col.iceDark, .4));
  inside.push(rib);
  for (let i = 0; i < (blue ? 5 : 0); i++) {
    const a = i * 2.5 + .5, r = .06 + hash(i * 3) * .15, s = .02 + hash(i * 5) * .02;
    const sh = bare(new THREE.OctahedronGeometry(s, 0)); sh.scale(.6, 1.6, .6); sh.rotateZ(hash(i) * 2 - 1); sh.translate(Math.cos(a) * r, Y + .02 + hash(i * 7) * .05, Math.sin(a) * r);
    paint(sh, (x, y, z, o) => o.copy(col.ice).lerp(col.iceDark, .3));
    inside.push(sh);
  }
  for (let i = 0; i < 8; i++) {
    const a = i * 1.9, r = .05 + hash(i * 11) * .18, b = bare(new THREE.SphereGeometry(.007 + hash(i * 2) * .008, 6, 5));
    b.translate(Math.cos(a) * r, Y + .01 + hash(i * 13) * .08, Math.sin(a) * r);
    paint(b, (x, y, z, o) => o.set(ochre ? '#ffe2a0' : spotted ? '#c3c96a' : '#bcd8f4'));
    inside.push(b);
  }
  add(mergeGeometries(inside), new THREE.MeshStandardMaterial({vertexColors: true, roughness: .45, emissive: ochre ? '#4a2a08' : spotted ? '#3a4510' : '#16305a', emissiveIntensity: .35}), 'inside');
  if (ochre) { add(bootGeometry(col), new THREE.MeshStandardMaterial({vertexColors: true, roughness: .7, side: THREE.DoubleSide}), 'boot'); g.userData.boot = true; return {g, body}; }

  if (spotted) {
    // the pits: each a ragged rim of scab round a black hole, with a thread of acid hanging off the lip
    const scabs = [];
    pits.forEach((p, i) => {
      const x = p.x * R * .95, z = p.z * R * .95, rr = Math.hypot(p.x, p.z), top = Y + H * Math.sqrt(Math.max(0, 1 - rr * rr)) * 1.05, y = top * .5 + Y * .5 + .004;
      const rim = bare(new THREE.CylinderGeometry(p.s * R * .95, p.s * R * 1.25, .016, 6 + (i % 3), 1, true)); rim.scale(1, 1, .55 + hash(i * 3) * .6); rim.rotateY(hash(i) * 3); rim.translate(x, top * .82 + Y * .18 + .002, z);
      paint(rim, (px, py, pz, o) => o.copy(col.iceDark).lerp(col.tip, hash(i * 13 + Math.round(px * 400)) * .4));
      const hole = bare(new THREE.CircleGeometry(p.s * R * .9, 6 + (i % 3))); hole.scale(1, .55 + hash(i * 3) * .6, 1); hole.rotateX(-Math.PI / 2); hole.rotateY(hash(i) * 3); hole.translate(x, top * .46 + Y * .54 + .006, z);
      paint(hole, (px, py, pz, o) => o.copy(col.pit));
      scabs.push(rim, hole);
      if (i % 2 === 0) { const d = bare(new THREE.ConeGeometry(.012, .06 + hash(i) * .03, 4)); d.rotateX(Math.PI); d.translate(x * 1.25, Y + .02, z * 1.25); paint(d, (px, py, pz, o) => o.copy(col.tip).lerp(col.mid, .4)); scabs.push(d); }
    });
    // the slick: acid and juice pooled on the floor under the worst pits and out past the torn rim
    const slick = [[-.5, .14, .2, .16], [.12, -.52, .15, .12]].map(([sx, sz, rad, ry], k) => {
      const f = bare(new THREE.CircleGeometry(1, 40)), fp = f.attributes.position;
      for (let v = 0; v < fp.count; v++) { const x = fp.getX(v), y = fp.getY(v), e = Math.hypot(x, y), a = Math.atan2(y, x), j = 1 + .3 * Math.sin(a * 3 + k) + .2 * Math.sin(a * 5 + k * 2) + .08 * Math.sin(a * 9 + k); fp.setXYZ(v, x * j * rad, y * j * ry, 0); }
      f.rotateX(-Math.PI / 2); f.rotateY(k * 1.1 + .4); f.translate(sx * R * 1.25, .004 + k * .001, sz * R * 1.25);
      paint(f, (px, py, pz, o) => { const e = Math.hypot(px - sx * R * 1.25, pz - sz * R * 1.25) / rad; o.copy(col.stain).lerp(col.mid, THREE.MathUtils.clamp(e - .8, 0, 1) * .25); });
      return f;
    });
    scabs.push(...slick); g.userData.slick = slick.length; // drawn with the pits: one more mesh would shift every later object id, and acid-fizz.js seeds from it
    add(mergeGeometries(scabs), new THREE.MeshStandardMaterial({vertexColors: true, roughness: .4, flatShading: true, side: THREE.DoubleSide, emissive: '#2a3208', emissiveIntensity: .3, polygonOffset: true, polygonOffsetFactor: -1}), 'pits');
    g.userData.pits = pits;
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
