import * as THREE from 'three';

// The hero's head, sculpted rather than stacked: one faceted skull mesh pulled into a face
// (brow ridge, deep eye sockets, cheekbones with hollows under them, a firm jaw tapering to a
// blunt chin, a mouth groove with lips) and painted by vertex colour so the features read from
// light and shadow at the game camera, plus a faceted nose, small deep-set eyes, fierce brows
// and ears. +z is the face; the head group's origin is the centre of the skull.
// Everything here is cheap: the skull is one mesh and the rest are a handful of small ones.

const g = (v, c, w) => Math.exp(-(((v - c) / w) ** 2));
const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const RX = .158, RY = .205, RZ = .172, CZ = .012;

// The skull's surface point for the unit direction (dx, dy, dz): the displaced position and
// how lit or shadowed that spot should be painted ({shade: -1 deep shadow .. +1 highlight, red: lip/flush}).
export function faceSurface(dx, dy, dz) {
  let x = dx * RX, y = dy * RY * (dy < 0 ? .86 : 1), z = dz * RZ + CZ;
  const front = smooth(0, .55, dz), s = Math.sign(x) || 1;
  let ax = Math.abs(x), shade = 0, red = 0;
  // jaw: the lower face narrows to a blunt chin
  const jaw = smooth(-.02, -.19, y);
  ax *= 1 - .4 * jaw;
  z += .02 * g(y, -.172, .042) * front * g(ax, 0, .05) * 1.0;
  
  shade -= .22 * smooth(-.14, -.2, y) * (1 - front * .4);
  // forehead recedes a little under the hair
  z -= .022 * smooth(.07, .2, y) * front;
  // brow ridge, with the glabella between the brows
  const brow = g(y, .056, .017) * g(ax, .07, .055) * front;
  z += .024 * brow + .012 * g(y, .04, .02) * g(ax, 0, .03) * front;
  shade += .12 * brow;
  // eye sockets: deep, shadowed
  const socket = g(y, .016, .021) * g(ax, .067, .03) * front;
  z -= .022 * socket;
  shade -= .5 * socket;
  // cheekbones catch light, with a hollow under them
  const bone = g(ax, .108, .033) * g(y, -.034, .034) * front;
  z += .013 * bone; ax += .009 * bone;
  shade += .2 * bone;
  const hollow = g(ax, .088, .034) * g(y, -.092, .034) * front;
  ax -= .013 * hollow;
  shade -= .22 * hollow;
  // nose root and the groove beside the nostrils
  shade -= .12 * g(ax, .036, .012) * g(y, -.05, .03) * front;
  // mouth: groove between a full upper lip and a lower lip, a dent under it
  const mouthW = g(ax, 0, .046) * front;
  z += .007 * g(y, -.089, .011) * mouthW + .006 * g(y, -.121, .011) * mouthW;
  z -= .01 * g(y, -.104, .005) * mouthW + .008 * g(y, -.143, .011) * mouthW;
  red += (g(y, -.087, .009) + g(y, -.118, .009)) * g(ax, 0, .027) * front * .8;
  shade -= .35 * g(y, -.104, .005) * mouthW;
  return {x: ax * s, y, z, shade, red};
}

const lerpC = (out, a, b, t) => out.copy(a).lerp(b, Math.min(1, Math.max(0, t)));

export function createFaceGeometry(palette) {
  const geo = new THREE.SphereGeometry(1, 32, 24);
  const pos = geo.attributes.position, n = pos.count, colors = new Float32Array(n * 3);
  const base = new THREE.Color(palette.skin), dark = new THREE.Color(palette.shadow), light = new THREE.Color(palette.light), red = new THREE.Color(palette.lips);
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const r = faceSurface(pos.getX(i), pos.getY(i), pos.getZ(i));
    pos.setXYZ(i, r.x, r.y, r.z);
    lerpC(c, base, r.shade < 0 ? dark : light, Math.abs(r.shade));
    if (r.red > .02) c.lerp(red, Math.min(.85, r.red));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo.toNonIndexed(); // flat facets: the head reads angular, not like a ball
}

function noseGeometry() {
  const T = [0, .046, .168], P = [0, -.05, .205], L = [-.027, -.054, .172], R = [.027, -.054, .172], B = [0, -.052, .15], K = [0, .02, .14];
  const tris = [[T, L, P], [T, P, R], [P, L, R], [L, B, R], [T, K, L], [T, R, K], [L, K, B], [R, B, K]];
  const out = []; for (const t of tris) for (const v of t) out.push(...v);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(out), 3));
  geo.computeVertexNormals();
  return geo;
}

// Adds the face to `head`. `m` supplies materials: {skin (flat, vertex-coloured), nose, eyeWhite, iris, brow, lash, lips}.
export function buildFace(head, m) {
  const add = (geo, mat, x, y, z) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); head.add(o); return o; };
  const skull = add(createFaceGeometry(m.palette), m.skin, 0, 0, 0); skull.name = 'HeroSkull';
  add(noseGeometry(), m.nose, 0, 0, 0).name = 'HeroNose';
  for (const side of [-1, 1]) {
    // eyes: a small almond of white, a dark iris looking forward, a bright speck; tilted up at the outer corner
    const eye = add(new THREE.SphereGeometry(1, 10, 8), m.eyeWhite, side * .067, .016, .152);
    eye.scale.set(.024, .0105, .0085);
    const iris = add(new THREE.SphereGeometry(1, 8, 6), m.iris, side * .067, .0155, .1585); iris.scale.set(.0092, .0092, .004);
    add(new THREE.SphereGeometry(1, 5, 4), m.catch, side * .0645, .0185, .1625).scale.set(.0022, .0022, .0012);
    // heavy upper lid and a hint of lower lash
    const lid = add(new THREE.BoxGeometry(.05, .006, .01), m.lash, side * .069, .0285, .152); lid.rotation.z = side * .2;
    const lower = add(new THREE.BoxGeometry(.04, .0035, .007), m.lash, side * .068, .0025, .153); lower.rotation.z = side * .12;
    // brow: a thick wedge over the nose end, tapering and angled down towards the centre
    const brow = add(new THREE.BoxGeometry(.06, .0075, .011), m.brow, side * .074, .0635, .186); brow.rotation.z = -side * .3;
    // ear: a small faceted shell at the side of the skull
    const ear = add(new THREE.ConeGeometry(.026, .05, 5), m.skin, side * .152, -.012, -.004); ear.rotation.set(0, 0, side * -1.2); ear.scale.z = .5;
  }
  // a fine scar across the left brow
  const scar = add(new THREE.BoxGeometry(.004, .05, .004), m.scar, -.098, .045, .178); scar.rotation.z = -.25;
  return skull;
}

export function faceMaterials() {
  const palette = {skin: '#f2bc9c', shadow: '#9a5238', light: '#ffd8bc', lips: '#bb5a52'};
  const skin = new THREE.MeshStandardMaterial({color: 0xffffff, vertexColors: true, roughness: .7, flatShading: true, emissive: '#5a3020', emissiveIntensity: .75});
  const nose = new THREE.MeshStandardMaterial({color: palette.light, roughness: .7, emissive: '#5a3020', emissiveIntensity: .75, flatShading: true, side: THREE.DoubleSide});
  return {
    palette, skin, nose,
    eyeWhite: new THREE.MeshStandardMaterial({color: '#f2ecde', roughness: .5, emissive: '#6a6458', emissiveIntensity: .5}),
    iris: new THREE.MeshStandardMaterial({color: '#2a5470', roughness: .4, emissive: '#123a58', emissiveIntensity: .4}),
    catch: new THREE.MeshBasicMaterial({color: '#ffffff'}),
    brow: new THREE.MeshStandardMaterial({color: '#2a1c16', roughness: 1}),
    lash: new THREE.MeshStandardMaterial({color: '#1f1410', roughness: 1}),
    scar: new THREE.MeshStandardMaterial({color: '#d9ad94', roughness: 1}),
  };
}
