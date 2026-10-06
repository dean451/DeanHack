import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Wands, keyed by their shuffled appearance (objects.c). The appearance is what the hero sees
// before identification, so it never gives the wand's type away. Each wand is at most three
// meshes: the shaft, its fittings (caps, bands, tines, spikes) and a third for gems or runes.
//
// The wand is built along +y with the grip at the origin: the butt sits at y = -BUTT and the
// tip at LENGTH - BUTT. That matches createHeldWeapon's weapon space, where the held-wand aura
// sits 0.3 up the rod. On the floor it is turned to lie along x, centred, resting on y = 0.

const BUTT = .08;
const WOODS = {balsa: 0xd8c49c, maple: 0xbf8a55, pine: 0xd0a468, oak: 0x86603a, ebony: 0x2a201c,
  bamboo: 0xc8b25e, walnut: 0x5e3e27, mahogany: 0x6c3022, cedar: 0xa35e3b, forked: 0x735234, grooved: 0x7a5c3a};
// [colour, metalness, roughness]
const METALS = {tin: [0xb2b7b5, .7, .42], brass: [0xc39a48, .85, .3], copper: [0xb86a3c, .85, .32],
  silver: [0xd8dde2, .95, .18], platinum: [0xe4e4de, .95, .14], iridium: [0xaec4d2, .95, .2],
  zinc: [0x9ca6aa, .7, .46], aluminum: [0xc8ccd0, .8, .3], uranium: [0x6d7a58, .6, .5],
  iron: [0x55595e, .75, .55], steel: [0x98a3aa, .9, .24], bronze: [0x9a7738, .85, .36],
  rusty: [0x7b3f24, .35, .88], chrome: [0xeef1f3, 1, .06],
  titanium: [0x80878d, .85, .5], electrum: [0xd9c88e, .92, .2],
  nickel: [0x9a9a90, .8, .4], mithril: [0xa9bccb, .97, .12], orichalcum: [0xb5694a, .9, .28]};
// Shape-only appearances are iron in objects.c (jeweled is gemstone, forked is wood).
const SHAPES = new Set(['hexagonal', 'octagonal', 'short', 'long', 'curved', 'runed', 'spiked', 'forked', 'jeweled', 'bent']);
const STONES = {marble: 0xe6e2da, ceramic: 0xd8c3a0, porcelain: 0xf3f2ee, black: 0x151515, alabaster: 0xcdbf9f};
// Moulded plastic (a dull black rod) and bone (yellowed, with a knuckled grip): neither is stone or wood.
const ODD = {plastic: 0x1d1f22, bone: 0xcfc3a2};
const GLASSES = {glass: [0xbfe4ea, .5], crystal: [0xe6f3ff, .45], quartz: [0xf1ece6, .7]};
export const WAND_APPEARANCES = [...Object.keys(WOODS), ...Object.keys(METALS), ...SHAPES,
  ...Object.keys(STONES), ...Object.keys(ODD), ...Object.keys(GLASSES)].filter((v, i, a) => a.indexOf(v) === i);

// The appearance from a hero-view name: "oak wand", "2 oak wands", "oak wand named x".
// "wand of fire" and "wand called fire" carry none, so they get the plain wand.
export function wandAppearance(name) {
  const m = /(?:^|\s)([a-z]+) wands?\b/.exec((name || '').toLowerCase());
  return m && WAND_APPEARANCES.includes(m[1]) ? m[1] : null;
}

function std(color, metalness = 0, roughness = .7, extra = {}) {
  return new THREE.MeshStandardMaterial({color, metalness, roughness, ...extra});
}

// Materials and shape for one appearance.
function wandLook(look) {
  const brass = () => std(0xbf9650, .8, .32), silver = () => std(0xc9d0d6, .9, .22);
  const L = {length: .46, radius: .02, taper: .75, sides: 12, faceted: false, curve: 0,
    shaft: null, fit: null, accent: null, tip: 'cap', extras: []};
  if (look in WOODS) {
    L.shaft = std(WOODS[look], 0, look === 'ebony' ? .42 : .82);
    L.fit = look === 'ebony' ? silver() : brass();
    if (look === 'bamboo') L.extras.push('nodes');
    if (look === 'forked') { L.tip = 'fork'; L.fit = std(0x5a3f27, 0, .9); L.extras.push('knots'); }
    if (look === 'grooved') { L.fit = std(0x3b281a, 0, .9); L.extras.push('bands'); }
    if (look === 'balsa') { L.radius = .023; L.fit = std(0xc9b58c, 0, .9); }
  } else if (look in METALS) {
    const [c, m, r] = METALS[look];
    L.shaft = std(c, m, r, look === 'uranium' ? {emissive: 0x3c6a1a, emissiveIntensity: .35} : {});
    L.fit = look === 'rusty' ? std(0x4a2a1c, .4, .9) : look === 'brass' || look === 'bronze' || look === 'copper' || look === 'orichalcum' ? std(0x3a2a20, .6, .5) : brass();
    L.taper = .9; L.radius = .018;
    if (look === 'mithril') { L.fit = silver(); L.taper = .8; L.radius = .016; }
    if (look === 'rusty') L.extras.push('pits');
  } else if (look in STONES) {
    L.shaft = std(STONES[look], 0, look === 'porcelain' ? .22 : look === 'black' ? .32 : .5);
    L.fit = look === 'porcelain' ? std(0x2f4f9e, .1, .3) : look === 'marble' ? std(0x8d8a86, .1, .45) : look === 'black' ? silver() : std(0x7b5236, 0, .6);
    L.radius = .021; L.taper = .85;
    if (look === 'marble' || look === 'alabaster') L.extras.push('veins');
    if (look === 'porcelain') L.extras.push('bands');
  } else if (look in ODD) {
    if (look === 'plastic') { L.shaft = std(ODD.plastic, 0, .3); L.fit = std(0x34373b, 0, .38); L.radius = .019; }
    else { L.shaft = std(ODD.bone, 0, .66); L.fit = std(0x8b7c5a, 0, .8); L.radius = .021; L.taper = .8; L.extras.push('knots'); }
  } else if (look in GLASSES) {
    const [c, opacity] = GLASSES[look];
    L.shaft = std(c, .05, .06, {transparent: true, opacity, emissive: c, emissiveIntensity: .08});
    L.fit = silver(); L.tip = 'crystal';
    if (look !== 'glass') { L.sides = 6; L.faceted = true; L.taper = .6; }
  } else if (SHAPES.has(look)) {
    L.shaft = std(0x5b6066, .8, .4); L.fit = std(0x2e3236, .7, .5);
    if (look === 'hexagonal' || look === 'octagonal') { L.sides = look === 'hexagonal' ? 6 : 8; L.faceted = true; L.taper = .92; L.radius = .022; }
    if (look === 'short') { L.length = .3; L.radius = .022; }
    if (look === 'long') { L.length = .66; L.radius = .017; }
    if (look === 'curved') L.curve = .07;
    if (look === 'bent') { L.curve = .1; L.shaft = std(0x4a4d52, .7, .62); }
    if (look === 'spiked') L.extras.push('spikes');
    if (look === 'runed') { L.accent = std(0x9fc6ff, .2, .4, {emissive: 0x2d5cff, emissiveIntensity: .55}); L.extras.push('runes'); }
    if (look === 'jeweled') {
      L.shaft = std(0x2a2266, .3, .18); L.fit = brass();
      L.accent = std(0xc01834, .1, .08, {emissive: 0x3a0610, emissiveIntensity: .4}); L.tip = 'gem'; L.extras.push('jewels');
    }
  } else {
    // Unseen or identified by name only: a plain dark wand with brass fittings.
    L.shaft = std(0x3d2c22, 0, .7); L.fit = brass();
  }
  return L;
}

// Where along the shaft a point at height y sits, for the curved wand (a gentle bow in x).
function bend(L, y) { const top = L.length - BUTT, s = (y + BUTT) / L.length; return L.curve * Math.sin(Math.PI * s) * (y > -BUTT && y < top ? 1 : 0); }

function buildParts(L) {
  const parts = {shaft: [], fit: [], accent: []};
  const put = (key, geo, x, y, z = 0, rx = 0, rz = 0) => {
    geo.rotateX(rx); geo.rotateZ(rz); geo.translate(x + bend(L, y), y, z); parts[key].push(geo);
  };
  const top = L.length - BUTT, r0 = L.radius, r1 = L.radius * L.taper;
  // Shaft: a lathe from butt to tip, tapering, or a tube along a bow for the curved wand.
  if (L.curve) {
    const pts = [];
    for (let i = 0; i <= 8; i++) { const y = -BUTT + L.length * i / 8; pts.push(new THREE.Vector3(bend(L, y), y, 0)); }
    parts.shaft.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, (r0 + r1) / 2, L.sides, false));
  } else {
    const profile = [new THREE.Vector2(0, -BUTT), new THREE.Vector2(r0, -BUTT), new THREE.Vector2(r1, top), new THREE.Vector2(0, top)];
    parts.shaft.push(new THREE.LatheGeometry(profile, L.sides));
  }
  // Butt cap and the two grip bands.
  put('fit', new THREE.SphereGeometry(r0 * 1.35, 10, 8), 0, -BUTT);
  for (const y of [-.035, .035]) put('fit', new THREE.CylinderGeometry(r0 * 1.25, r0 * 1.25, .014, Math.max(L.sides, 10)), 0, y);
  // Tip.
  if (L.tip === 'cap') {
    put('fit', new THREE.CylinderGeometry(r1 * 1.2, r1 * 1.3, .03, Math.max(L.sides, 10)), 0, top - .015);
    put('fit', new THREE.SphereGeometry(r1 * 1.15, 10, 8), 0, top);
  } else if (L.tip === 'crystal') {
    put('fit', new THREE.CylinderGeometry(r1 * 1.5, r1 * 1.2, .03, 10), 0, top - .015);
    const point = new THREE.OctahedronGeometry(r1 * 1.9); point.scale(1, 2.2, 1); put('shaft', point, 0, top + .03);
  } else if (L.tip === 'gem') {
    put('fit', new THREE.CylinderGeometry(r1 * 2, r1 * 1.1, .035, 10), 0, top - .01);
    const gem = new THREE.OctahedronGeometry(r1 * 2); gem.scale(1, 1.4, 1); put('accent', gem, 0, top + .03);
  } else if (L.tip === 'fork') {
    for (const s of [-1, 1]) {
      const tine = new THREE.CylinderGeometry(r1 * .5, r1 * .9, .1, 6); tine.translate(0, .05, 0);
      put('shaft', tine, 0, top - .01, 0, 0, -s * .38);
    }
  }
  const around = (i, n, off = 0) => (i / n) * Math.PI * 2 + off;
  const span = (i, n) => -BUTT + .1 + (L.length - .16) * (n === 1 ? .5 : i / (n - 1));
  const rAt = y => r0 + (r1 - r0) * ((y + BUTT) / L.length);
  for (const extra of L.extras) {
    if (extra === 'nodes') for (let i = 0; i < 3; i++) { const y = span(i, 3); put('fit', new THREE.TorusGeometry(rAt(y) * 1.02, .004, 5, 12), 0, y, 0, Math.PI / 2); }
    if (extra === 'bands' || extra === 'veins') for (let i = 0; i < (extra === 'bands' ? 3 : 4); i++) {
      const y = span(i, extra === 'bands' ? 3 : 4), ring = new THREE.TorusGeometry(rAt(y) * 1.01, extra === 'bands' ? .003 : .0018, 4, 14);
      put('fit', ring, 0, y, 0, Math.PI / 2 + (extra === 'veins' ? (i % 2 ? .5 : -.4) : 0));
    }
    if (extra === 'knots') for (const [y, a] of L.tip === 'fork' ? [[.08, 0], [.2, 2.4]] : [[.06, 0], [.14, 2.1], [.22, 4.2], [.3, 1]]) put('shaft', new THREE.SphereGeometry(.011, 6, 5), Math.cos(a) * rAt(y), y, Math.sin(a) * rAt(y));
    if (extra === 'pits') for (let i = 0; i < 6; i++) { const y = span(i, 6), a = around(i, 6, i * 1.7); put('fit', new THREE.SphereGeometry(.006, 5, 4), Math.cos(a) * rAt(y), y, Math.sin(a) * rAt(y)); }
    if (extra === 'spikes') for (let i = 0; i < 3; i++) for (let k = 0; k < 4; k++) {
      const y = .08 + i * .09, a = around(k, 4, i * .8), cone = new THREE.ConeGeometry(.007, .03, 5);
      cone.translate(0, .015 + rAt(y) * .8, 0); cone.rotateZ(-Math.PI / 2); cone.rotateY(-a); cone.translate(0, y, 0); parts.fit.push(cone);
    }
    if (extra === 'runes') for (let i = 0; i < 5; i++) {
      const y = .07 + i * .055, a = around(i, 5, 0) * .6, rune = new THREE.BoxGeometry(.004, i % 2 ? .026 : .018, .012);
      rune.rotateZ(i % 2 ? .35 : -.2); rune.translate(rAt(y) * .98, 0, 0); rune.rotateY(-a); rune.translate(0, y, 0); parts.accent.push(rune);
    }
    if (extra === 'jewels') for (let i = 0; i < 3; i++) {
      const y = .06 + i * .1, a = around(i, 3); put('accent', new THREE.SphereGeometry(.009, 8, 6), Math.cos(a) * rAt(y), y, Math.sin(a) * rAt(y));
    }
  }
  return parts;
}

// Merge one material's parts, applying `matrix` (placement), with facets for faceted shafts.
function merged(list, matrix, faceted) {
  const flat = list.map(g => { const n = g.index ? g.toNonIndexed() : g; if (n !== g) g.dispose(); for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k); return n; });
  const geo = mergeGeometries(flat); flat.forEach(g => g.dispose());
  geo.applyMatrix4(matrix);
  if (faceted) geo.computeVertexNormals();
  return geo;
}

// createWand(appearance, {floor}) -> Group of up to three meshes with userData.dispose.
// Held: +y from the grip. Floor: lying along x, centred and resting on y = 0, 1.2x larger.
export function createWand(appearance, {floor = false} = {}) {
  const look = (appearance || '').toLowerCase(), L = wandLook(look), parts = buildParts(L);
  const g = new THREE.Group(); g.name = look ? `${look} wand` : 'wand';
  const matrix = new THREE.Matrix4();
  // On the floor, a quarter turn about the shaft first puts a bow or a fork flat along the
  // ground; then the shaft is laid along x. The meshes are re-centred to rest on y = 0 below.
  if (floor) matrix.makeRotationZ(-Math.PI / 2).multiply(new THREE.Matrix4().makeScale(1.2, 1.2, 1.2)).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2));
  const materials = [];
  for (const [key, material] of [['shaft', L.shaft], ['fit', L.fit], ['accent', L.accent]]) {
    if (!parts[key].length || !material) { parts[key].forEach(p => p.dispose()); if (material) material.dispose(); continue; }
    const mesh = new THREE.Mesh(merged(parts[key], matrix, key === 'shaft' && L.faceted), material);
    mesh.castShadow = true; mesh.receiveShadow = floor; mesh.userData.part = key;
    g.add(mesh); materials.push(material);
  }
  if (floor) {
    const box = new THREE.Box3(); for (const m of g.children) { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox); }
    for (const m of g.children) { m.geometry.translate(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2); m.geometry.computeBoundingBox(); m.geometry.computeBoundingSphere(); }
  }
  g.userData.look = look || 'plain'; g.userData.materials = materials;
  g.userData.dispose = () => { g.traverse(o => o.geometry?.dispose()); materials.forEach(m => m.dispose()); };
  return g;
}
