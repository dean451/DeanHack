import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The puddings were the shared blob with a skull and a few lumps. Each now has its own mass, still the
// geometry pudding-heave.js reshapes (a translucent SphereGeometry skin, an opaque SphereGeometry nucleus,
// transparent SphereGeometry lobes round the foot), with the dressing laid on it as merged, flat-shaded draws:
// - black pudding: a slick of tar that dissolves metal. Sunk in it are what it has eaten, a rusted sword
//   blade and crossguard, a dented helm, bent nails and a half-eaten skull rising from the crown, and
//   hard black crust splits the mass like cooling pitch. Twelve draws.
// - brown pudding: a rotting mass. Grey-green mould blooms spot its back with pale spore heads, a rotten rib
//   arch shows through the hide, and slack, sagging strands hang off the skirt. Eleven draws.
// Handles: body (quirk 'blob').
const hash = n => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
const R = .28, SY = .72, CY = .2;
const PALETTES = {
  black: {skin: '#1a1a1d', nucleus: '#2a1608', lobe: '#151519', iron: '#6b3a1c', ironDark: '#3a2010', bone: '#b8ac8c', hole: '#050506', crust: '#34343f', glow: '#241c2a'},
  brown: {skin: '#6a4a2a', nucleus: '#2a1a0c', lobe: '#5a3e22', mould: '#8f9a7a', mouldDark: '#4e5a42', spore: '#d8dcc0', bone: '#bdb08e', strand: '#3e2a16', glow: '#2a1c0c'},
};

// the skin's height at a spot on its crown
const top = (x, z) => CY + R * SY * Math.sqrt(Math.max(0, 1 - (x * x + z * z) / (R * R)));
const frame = (px, py, pz, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

// merge pieces [geo, matrix, color] into one flat-shaded vertex-coloured geometry
function build(list) {
  const gs = list.map(([geo, m, c]) => {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()); g.deleteAttribute('uv'); g.applyMatrix4(m);
    const col = new THREE.Color(c), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.toArray(a, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g;
  });
  const out = mergeGeometries(gs); out.computeVertexNormals(); return out;
}

export function createPudding({kind = 'black'} = {}) {
  const C = PALETTES[kind] || PALETTES.black, black = kind === 'black';
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const add = (geo, material, name) => { const m = new THREE.Mesh(geo, material); m.userData.part = name; m.castShadow = true; m.receiveShadow = true; body.add(m); return m; };
  const flat = (name, list, o = {}) => add(build(list), new THREE.MeshStandardMaterial({vertexColors: true, flatShading: true, roughness: .85, ...o}), name);

  // the skin: tar-black and glossy, or rotten brown and wet-matte
  const skin = add(new THREE.SphereGeometry(R, 24, 16), new THREE.MeshStandardMaterial({color: C.skin, emissive: C.glow, emissiveIntensity: .35,
    roughness: black ? .12 : .55, metalness: black ? .35 : 0, transparent: true, opacity: black ? .92 : .86}), 'skin');
  skin.position.y = CY; skin.scale.set(1, SY, 1);
  // the nucleus: a dark clot, seen faintly through the hide
  const nuc = add(new THREE.SphereGeometry(.09, 12, 9), new THREE.MeshStandardMaterial({color: C.nucleus, roughness: .9}), 'nucleus');
  nuc.position.y = CY; nuc.scale.set(1, .8, 1);
  // five lobes slumped round the foot, uneven
  const lobeMat = new THREE.MeshStandardMaterial({color: C.lobe, roughness: black ? .15 : .55, metalness: black ? .3 : 0, transparent: true, opacity: .9});
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3 + .2, r = .22 + hash(i + 3) * .06, s = .06 + hash(i + 9) * .035;
    const l = add(new THREE.SphereGeometry(s, 12, 8), lobeMat, 'lobe'); l.position.set(Math.cos(a) * r, .06, Math.sin(a) * r); l.scale.set(1.2, .6, 1);
  }

  if (black) {
    // what it has dissolved: a rusted blade and crossguard sunk at a slant, a dented helm, bent nails
    const iron = [], scrap = [];
    const sword = (x, z, turn, lean) => {
      const m = frame(x, top(x, z) - .02, z, lean, turn, .25);
      iron.push([new THREE.CylinderGeometry(.004, .026, .2, 4), frame(0, .08, 0, 0, .8, 0).premultiply(m), C.iron]);
      iron.push([new THREE.BoxGeometry(.13, .025, .025), frame(0, -.03, 0).premultiply(m), C.ironDark]);
      iron.push([new THREE.CylinderGeometry(.008, .008, .07, 5), frame(0, -.075, 0).premultiply(m), C.ironDark]);
    };
    sword(-.1, .1, .6, -.5);
    const helm = frame(.13, top(.13, -.07) - .005, -.07, .25, .5, -.35);
    scrap.push([new THREE.SphereGeometry(.06, 8, 5, 0, Math.PI * 2, 0, Math.PI * .55), helm, C.iron]);
    scrap.push([new THREE.BoxGeometry(.012, .06, .012), frame(0, .02, .05).premultiply(helm), C.ironDark]);
    for (const [x, z, t] of [[-.2, -.08, .8], [.02, .2, 2.4], [.2, .12, 4.1]]) {
      const m = frame(x, top(x, z) - .01, z, .9 + hash(x * 7) * .4, t, .2);
      scrap.push([new THREE.CylinderGeometry(.006, .004, .1, 4), m, C.ironDark]);
      scrap.push([new THREE.CylinderGeometry(.014, .014, .006, 5), frame(0, .05, 0).premultiply(m), C.iron]);
    }
    flat('iron', iron);
    flat('scrap', scrap);
    // a skull half-eaten, rising from the crown, eyes full of tar, jaw gone on one side
    const sk = frame(.04, top(.04, .0) + .02, .02, .5, -.4, .3), skull = [];
    skull.push([new THREE.SphereGeometry(.07, 10, 8), frame(0, 0, 0, 0, 0, 0, 1, .9, 1.1).premultiply(sk), C.bone]);
    skull.push([new THREE.BoxGeometry(.06, .03, .05), frame(0, -.045, .03).premultiply(sk), C.bone]);
    for (const s of [-1, 1]) skull.push([new THREE.SphereGeometry(.02, 6, 5), frame(s * .03, -.005, .058, 0, 0, 0, 1, 1.1, .5).premultiply(sk), C.hole]);
    skull.push([new THREE.ConeGeometry(.011, .03, 3), frame(0, -.03, .062, Math.PI, 0, 0).premultiply(sk), C.hole]);
    flat('skull', skull);
    // hard pitch crust: broken angular plates split the mass, asymmetric, each seated in the skin
    const crust = [], shards = [];
    for (const [x, z, s, t] of [[-.17, .1, .08, .3], [.18, -.1, .07, 1.4], [-.04, -.2, .09, 2.2], [.1, .17, .06, 3.3], [-.2, -.08, .05, 4.4], [.0, -.04, .05, 5.1]]) {
      const y = top(x, z) - .035, n = new THREE.Vector3(x, (y - CY) / SY, z).normalize();
      const m = frame(x, y, z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n)));
      (s > .06 ? crust : shards).push([new THREE.TetrahedronGeometry(s, 0), m.multiply(frame(0, 0, 0, t, t * 1.7, 0, 1.3, .45, .9)), C.crust]);
    }
    flat('crust', crust, {roughness: .4, metalness: .2});
    flat('shards', shards, {roughness: .4, metalness: .2});
  } else {
    // mould blooms: flat grey-green rosettes with pale spore heads
    const bloom = [], spores = [];
    for (const [x, z, r, t] of [[-.1, .08, .08, 0], [.13, .02, .06, 1], [.02, -.14, .07, 2], [-.04, .17, .06, 3], [-.2, -.06, .05, 4], [.17, .13, .05, 5]]) {
      const y = top(x, z) - .008, n = new THREE.Vector3(x, (y - CY) / SY, z).normalize();
      const m = frame(x, y, z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n)));
      bloom.push([new THREE.CylinderGeometry(r, r * 1.15, .012, 7), m, hash(t) > .5 ? C.mould : C.mouldDark]);
      for (let k = 0; k < 3; k++) {
        const a = k * 2.1 + t, d = r * .5;
        spores.push([new THREE.ConeGeometry(.011, .035 + hash(t + k) * .02, 5), frame(Math.cos(a) * d, .02, Math.sin(a) * d).premultiply(m), C.spore]);
      }
    }
    flat('mould', bloom, {roughness: 1});
    flat('spores', spores, {roughness: .6});
    // a rotten rib arch rising out of the back, half in the hide
    const rib = [];
    for (let i = 0; i < 3; i++) {
      const x = .02 + i * .055, z = -.05 + i * .02, m = frame(x, top(x, z) - .03, z, 0, .35, .1 - i * .05);
      rib.push([new THREE.TorusGeometry(.07 - i * .008, .007, 4, 8, Math.PI * .9), m, C.bone]);
    }
    flat('ribs', rib, {roughness: .9});
    // slack rotten strands sagging off the skirt, one rotted through at the tip
    const strands = [];
    for (const [a, len] of [[.2, .17], [1.5, .13], [2.9, .2], [4.1, .12], [5.3, .15]]) {
      const x = Math.cos(a) * .25, z = Math.sin(a) * .25;
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x, .1, z), new THREE.Vector3(x * 1.08, .06, z * 1.08), new THREE.Vector3(x * 1.12 + .02, .02 + len * .1, z * 1.12), new THREE.Vector3(x * 1.1 + .04, .005, z * 1.1 + .03)]);
      strands.push([new THREE.TubeGeometry(curve, 8, .02, 5), frame(0, 0, 0), C.strand]);
    }
    flat('strands', strands, {roughness: .3});
  }
  g.userData.kind = kind;
  return {g, body};
}
