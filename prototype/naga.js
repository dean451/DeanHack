import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The nagas were a torus coil with a tube and a column of yellow belly blocks. This is the family's own body,
// one colour at a time. Red naga first (and its hatchling):
// - the coil: one tapered tube, widest at the middle of its length and ending in a point under the heap, wound
//   in a flat spiral that climbs a little; the scales are vertex colour (diamond lattice, a keel along the back,
//   ridged rings), the belly a rotten amber banded with plates, and old scars and a gash in pale tissue;
// - the neck: a second tube rising out of the coil in an S and leaning forward, banded belly plates on its front,
//   three raked scars; it is the swaying 'tail' group;
// - the head: faceted and asymmetric, a hooded cobra head with a human face (brow ridge, deep-set slit-pupil eyes
//   under it, a nose bridge, cheekbones, a hard jaw hanging open on two fangs, one of them snapped);
// - the hood: a torn, half-spread fan of ribs behind the head, with a mane of flame (self-lit) down its rim and nape.
// Golden naga: tarnished gold scales and a hood in dull brass, a battered circlet (one point snapped) with a gem lit from within on the brow and a faint warm glow on the floor round the coil, red eyes, no mane. Eight draws. Black naga: the same rig in near-black scale, a plain hood with a ridge of sharp black spines (some broken) down its rim and nape in place of the flame, green eyes. Six draws. Hatchlings are small and soft-scaled with the hood folded and no mane.
const hash = n => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
const bare = geo => { geo.deleteAttribute('uv'); return geo.index ? geo.toNonIndexed() : geo; };
const PALETTES = {
  golden: {dark: '#34240a', mid: '#80601a', high: '#cfa83c', belly: '#d8c880', band: '#7a622a', scar: '#ecdca0', flesh: '#98762a', ridge: '#c4a040', socket: '#120a04', jaw: '#54400e', eye: '#ff5a3a', fang: '#e8dcb4', hood: '#56400e', rib: '#94701c'},
  black: {dark: '#0c0b10', mid: '#24222c', high: '#4a4858', belly: '#4a4852', band: '#222029', scar: '#7a7884', flesh: '#2e2c36', ridge: '#4a4858', socket: '#040406', jaw: '#1a1920', eye: '#8aff4a', fang: '#cfd2c2', hood: '#16151c', rib: '#2c2a36'},
  red: {dark: '#3c120c', mid: '#7c2418', high: '#b0442a', belly: '#b08a4c', band: '#6a4a26', scar: '#c8a48a', flesh: '#9c4630', ridge: '#a8553a', socket: '#140706', jaw: '#5a1c12', eye: '#ffc23a', fang: '#e4dcc6', hood: '#4c140e', rib: '#8e2a1a'},
};

const tint = (geo, hex) => {
  const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.toArray(a, i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
};
// a primitive scaled, turned and moved, flat in one colour
const piece = (geo, hex, [sx, sy, sz], [rx, ry, rz], [px, py, pz]) => {
  const g = bare(geo);
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz)));
  return tint(g, hex);
};

// A tube along a curve with a ring-by-ring profile and a vertex colour by (ring, side, normal, along). Ring layout
// stays TubeGeometry's (`sides` sides, sides + 1 vertices a ring, 8 and 9 unless asked) so a tail tip can be measured.
function serpent(curve, segs, radius, profile, paintFn, sides = 8, facet = null) {
  const geo = new THREE.TubeGeometry(curve, segs, radius, sides, false), pos = geo.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3(), R = sides + 1;
  for (let i = 0; i <= segs; i++) {
    const u = i / segs; curve.getPointAt(u, c);
    const k = profile(u) * (i % 2 ? 1.05 : .96);
    for (let j = 0; j < R; j++) { const n = i * R + j; v.fromBufferAttribute(pos, n).sub(c).multiplyScalar(k * (facet ? facet(i, j % sides) : 1)).add(c); pos.setXYZ(n, v.x, v.y, v.z); }
  }
  geo.computeVertexNormals();
  const nor = geo.attributes.normal, col = new Float32Array(pos.count * 3), o = new THREE.Color();
  for (let i = 0; i <= segs; i++) for (let j = 0; j < R; j++) {
    const n = i * R + j;
    paintFn(o, i, j % sides, i / segs, nor.getX(n), nor.getY(n), nor.getZ(n));
    o.toArray(col, n * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

export function createNaga({kind = 'red', baby = false} = {}) {
  const C = PALETTES[kind] || PALETTES.red, col = Object.fromEntries(Object.entries(C).map(([k, v]) => [k, new THREE.Color(v)]));
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  g.scale.setScalar(baby ? .8 : 1);
  const r = baby ? .05 : .075, ridge = baby ? .5 : 1;
  const add = (geo, mat, name, parent) => { const m = new THREE.Mesh(geo, mat); m.userData.part = name; m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const scaleMat = new THREE.MeshStandardMaterial({vertexColors: true, roughness: baby ? .65 : .5, metalness: .1});

  // scales: a diamond lattice of dark and mid, a lit keel along the spine, darker between rows
  const scaled = (o, i, j, u, nx, ny, nz, belly) => {
    const lattice = hash(i * 7 + (j + (i & 1 ? 4 : 0)) * 13);
    o.copy(col.mid).lerp(col.dark, .15 + lattice * .55).lerp(col.high, Math.max(0, ny - .72) * 2.2 * ridge * (.5 + lattice));
    if (i % 2 === 0) o.multiplyScalar(.85);
    if (belly(nx, ny, nz)) o.copy(col.belly).lerp(col.band, i % 3 === 0 ? .65 : .2 + lattice * .2);
  };

  // the coil: tail tip outside, wound inward and climbing, ending under the raised neck
  const y0 = r * .95, SEG = 100, pts = [];
  for (let i = 0; i <= 34; i++) {
    const t = i / 34, a = Math.PI * .6 + t * Math.PI * 5.2, rad = .34 - t * .24;
    pts.push(new THREE.Vector3(Math.cos(a) * rad, y0 + t * t * r * 1.1, -Math.sin(a) * rad * .9 - .02));
  }
  const NECK = new THREE.Vector3(0, y0 + r * 1.1, .1);
  pts.push(NECK.clone());
  const coil = new THREE.CatmullRomCurve3(pts);
  // pointed at the tip, thickest two thirds of the way along, a heavier loop where it meets the neck
  const coilProfile = u => { const k = Math.min(1, u / .55); return .09 + .91 * k * k * (3 - 2 * k) + .12 * Math.sin(Math.PI * Math.min(1, u)) ; };
  const coilG = serpent(coil, SEG, r, coilProfile, (o, i, j, u, nx, ny, nz) => {
    scaled(o, i, j, u, nx, ny, nz, (x, y) => y < -.35);
    // scars: pale raked tissue across the middle turns, and one long gash cutting across a few rings
    if (!baby && u > .3 && u < .7 && ((i * 5 + j * 11) % 41 === 0 || (i >= 52 && i <= 56 && j >= 1 && j <= 3))) o.lerp(col.scar, .8);
    if (!baby && i % 6 === 0) o.lerp(col.dark, .5);                       // a notch between every few scale rows
  }, 6, (i, j) => (j % 2 ? .84 : 1.06) * (i % 6 === 0 ? .86 : 1) * (!baby && i >= 28 && i <= 33 && j < 3 ? .8 : 1));  // star-ish section, notched rows, one flank hacked flat
  // a low-sided cross-section, a blade keel and notched scale rows, flat-shaded so it catches light in facets
  add(coilG, new THREE.MeshStandardMaterial({vertexColors: true, roughness: baby ? .65 : .5, metalness: .1, flatShading: true}), 'coil', body);

  // the neck: rises out of the coil, kicks back, then leans forward to carry the head
  const rise = new THREE.CatmullRomCurve3([[0, 0, 0], [0, .1, -.035], [0, .22, -.025], [0, .34, .03], [0, .43, .1], [0, .48, .17]].map(p => new THREE.Vector3(...p)));
  const neck = new THREE.Group(); neck.position.copy(NECK); body.add(neck);
  const neckG = serpent(rise, 32, r * 1.05, u => 1.1 - u * .38, (o, i, j, u, nx, ny, nz) => {
    // the front (+z) is belly: amber plates, a band every other ring; the nape is scale
    scaled(o, i, j, u, nx, ny, nz, (x, y, z) => z > .3 && y > -.5);
    // three raked scars slashed over the neck
    if (!baby && ((i === 8 && j >= 2 && j <= 4) || (i === 14 && j >= 5 && j <= 7) || (i === 20 && j >= 1 && j <= 3))) o.lerp(col.scar, .85);
  });
  add(neckG, scaleMat, 'neck', neck);

  // the head and what grows behind it, in the neck's frame: set at the top of the rise, nodding forward
  const headAt = new THREE.Matrix4().compose(new THREE.Vector3(0, .5, .18), new THREE.Quaternion().setFromEuler(new THREE.Euler(.32, .06, 0)), new THREE.Vector3(1, 1, 1).multiplyScalar(baby ? .8 : 1));
  const head = [];
  const B = () => new THREE.BoxGeometry(1, 1, 1), I = d => new THREE.IcosahedronGeometry(1, d);
  // skull and the shadow and light on it
  head.push(piece(I(1), C.flesh, [.056, .06, .08], [0, 0, 0], [0, 0, .02]));
  for (const s of [-1, 1]) head.push(piece(B(), C.ridge, [.062, .02, .04], [-.1, s * .12, -s * .28], [s * .033, .03, .064])); // brow ridge: two slabs sunk into the skull, sloping to a scowl over the eyes
  head.push(piece(B(), C.ridge, [.014, .056, .014], [.45, 0, 0], [0, .0, .112]));           // nose bridge catches light
  for (const s of [-1, 1]) {
    head.push(piece(I(0), C.socket, [.024, .018, .016], [0, 0, 0], [s * .034, .017, .094])); // sockets: dark
    head.push(piece(B(), C.ridge, [.03, .013, .045], [0, s * .45, s * .3], [s * .057, -.01, .066])); // cheekbones
    head.push(piece(B(), C.jaw, [.02, .045, .045], [.2, 0, s * .15], [s * .05, -.04, .018]));  // jaw hinge
    head.push(piece(B(), C.socket, [.0035, .014, .004], [0, 0, 0], [s * .034, .017, .112]));   // slit pupil, in front of the eye
  }
  head.push(piece(new THREE.CylinderGeometry(.55, 1, 1, 5), C.flesh, [.04, .052, .04], [Math.PI / 2, 0, .2], [0, -.022, .115])); // muzzle
  head.push(piece(new THREE.ConeGeometry(1, 1, 4), C.jaw, [.044, .1, .026], [Math.PI / 2 + .3, .25, 0], [.004, -.067, .083]));      // hard jaw, hanging open and slightly askew
  head.push(piece(B(), '#100505', [.05, .018, .07], [0, 0, 0], [0, -.047, .09]));                                                   // mouth
  head.push(piece(new THREE.ConeGeometry(1, 1, 4), C.fang, [.0075, .05, .0075], [Math.PI, 0, 0], [-.022, -.047, .122]));          // fangs: the right one snapped
  head.push(piece(new THREE.ConeGeometry(1, 1, 4), C.fang, [.0075, .026, .0075], [Math.PI, 0, .15], [.022, -.036, .122]));
  const headG = mergeGeometries(head); headG.applyMatrix4(headAt);
  add(headG, new THREE.MeshStandardMaterial({vertexColors: true, roughness: .55, flatShading: true}), 'head', neck);
  // eyes: small and bright against the darkened sockets
  const eyes = [-1, 1].map(s => { const e = bare(new THREE.OctahedronGeometry(1)); e.scale(.014, .012, .007); e.translate(s * .034, .017, .108); return tint(e, C.eye); });
  const eyeG = mergeGeometries(eyes); eyeG.applyMatrix4(headAt);
  const eyeM = add(eyeG, new THREE.MeshBasicMaterial({vertexColors: true}), 'eyes', neck); eyeM.castShadow = false;

  // the hood: a torn, half-spread fan of ribs behind the head (folded away on a hatchling)
  if (!baby) {
    const hoodAt = new THREE.Matrix4().compose(new THREE.Vector3(0, .465, .1), new THREE.Quaternion().setFromEuler(new THREE.Euler(-.25, 0, 0)), new THREE.Vector3(1, 1, 1));
    const tri = [], colr = [], rim = [];
    const N = 13, W = .125, Hh = .19;
    for (let k = 0; k <= N; k++) {
      const phi = -.35 + k / N * (Math.PI + .7), torn = 1 - (k === 4 || k === 9 ? .32 : 0) - hash(k * 3) * .16 - (k > 9 ? .08 : 0);
      rim.push([Math.cos(phi) * W * torn, Math.sin(phi) * Hh * torn - .02, -.015 - Math.sin(phi) * .015]);
    }
    for (let k = 0; k < N; k++) {
      tri.push(0, -.06, -.01, ...rim[k], ...rim[k + 1]);
      const c = k % 2 ? col.rib : col.hood, e = c.clone().lerp(col.dark, .55);
      colr.push(c.r, c.g, c.b, e.r, e.g, e.b, e.r, e.g, e.b);
    }
    const hoodG = new THREE.BufferGeometry();
    hoodG.setAttribute('position', new THREE.Float32BufferAttribute(tri, 3));
    hoodG.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
    hoodG.computeVertexNormals(); hoodG.applyMatrix4(hoodAt);
    const hm = add(hoodG, new THREE.MeshStandardMaterial({vertexColors: true, roughness: .6, side: THREE.DoubleSide}), 'hood', neck); hm.receiveShadow = false;

    // the mane: tongues of flame down the hood's rim and the nape, self-lit, hot at the tips
    const mane = [], flame = (x, y, z, len, lean, side) => {
      const f = bare(new THREE.ConeGeometry(.013 + len * .06, len, 4)), p = f.attributes.position, c = new Float32Array(p.count * 3), o = new THREE.Color();
      for (let i = 0; i < p.count; i++) { o.set('#b81a08').lerp(new THREE.Color('#ffc43a'), THREE.MathUtils.clamp(p.getY(i) / len + .5, 0, 1)); o.toArray(c, i * 3); }
      f.setAttribute('color', new THREE.BufferAttribute(c, 3));
      f.rotateZ(-side * lean); f.rotateX(-.55); f.translate(x, y, z);
      return f;
    };
    for (let k = 1; k < N; k++) {
      const [x, y, z] = rim[k], len = .07 + hash(k * 5) * .07 - (k === 6 ? .045 : 0), v = new THREE.Vector3(x, y, z).applyMatrix4(hoodAt);
      mane.push(flame(v.x, v.y + len * .35, v.z - .01, len, Math.sign(x) * (.2 + hash(k) * .3), 1));
    }
    for (let i = 0; i < 5; i++) mane.push(flame(0, .36 - i * .07, -.03 + i * .006 - (i === 3 ? .01 : 0), .06 + hash(i + 40) * .05, 0, 1));
    if (kind === 'black' || kind === 'golden') mane.length = 0;
    if (kind === 'black') {
      // black spines: bone-hard thorns raked back along the rim and nape, base nearly black, tips a dull grey; two snapped
      const spine = (x, y, z, len, lean, side) => {
        const f = bare(new THREE.ConeGeometry(.007 + len * .05, len, 4)), p = f.attributes.position, c = new Float32Array(p.count * 3), o = new THREE.Color();
        for (let i = 0; i < p.count; i++) { o.set('#0a090d').lerp(new THREE.Color('#5a5864'), THREE.MathUtils.clamp(p.getY(i) / len + .5, 0, 1)); o.toArray(c, i * 3); }
        f.setAttribute('color', new THREE.BufferAttribute(c, 3));
        f.rotateZ(-side * lean); f.rotateX(-.8); f.translate(x, y, z);
        return f;
      };
      for (let k = 1; k < N; k++) {
        const [x, y, z] = rim[k], len = (.1 + hash(k * 5) * .09) * (k === 4 || k === 9 ? .4 : 1), v = new THREE.Vector3(x, y, z).applyMatrix4(hoodAt);
        mane.push(spine(v.x, v.y + len * .3, v.z - .01, len, Math.sign(x) * (.25 + hash(k) * .35), 1));
      }
      for (let i = 0; i < 5; i++) mane.push(spine(0, .36 - i * .07, -.03 + i * .006, .09 + hash(i + 40) * .06, 0, 1));
    }
    if (kind === 'golden') {
      // a circlet worn low on the brow: a tilted, dented band, five points (the right one snapped), a gem lit from within
      const band = [], gems = [], tilt = [.06, 0, -.05];
      const ring = piece(new THREE.CylinderGeometry(1, 1, 1, 7, 1, true), '#a8862c', [.066, .016, .082], tilt, [0, .042, .018]);
      ring.computeVertexNormals(); band.push(ring);
      for (let k = 0; k < 5; k++) {
        const a = (k - 2) * .62, len = k === 4 ? .014 : k === 2 ? .05 : .034 + hash(k + 60) * .01;
        band.push(piece(new THREE.ConeGeometry(1, 1, 4), k === 2 ? '#e0c050' : '#b8942e', [.009, len, .009], [Math.cos(a) * .3, 0, -Math.sin(a) * .35], [Math.sin(a) * .066, .05 + len / 2, .018 + Math.cos(a) * .082]));
      }
      gems.push(piece(new THREE.OctahedronGeometry(1), '#ff4a2a', [.011, .016, .008], [0, 0, 0], [0, .052, .104]));
      gems.push(piece(new THREE.OctahedronGeometry(1), '#ffb040', [.006, .009, .006], [0, 0, 0], [-.046, .046, .082]));
      const bandG = mergeGeometries(band); bandG.applyMatrix4(headAt);
      add(bandG, new THREE.MeshStandardMaterial({vertexColors: true, roughness: .35, metalness: .75, flatShading: true}), 'circlet', neck);
      const gemG = mergeGeometries(gems); gemG.applyMatrix4(headAt);
      add(gemG, new THREE.MeshBasicMaterial({vertexColors: true}), 'gems', neck).castShadow = false;
      // the glow: a faint warm pool on the floor round the coil, a ragged disc that never quite closes
      const halo = new THREE.CircleGeometry(.5, 9); halo.rotateX(-Math.PI / 2);
      const hp = halo.attributes.position; for (let i = 1; i < hp.count; i++) { const s = .86 + hash(i * 3) * .3; hp.setX(i, hp.getX(i) * s); hp.setZ(i, hp.getZ(i) * s); }
      halo.translate(0, .008, 0);
      const hm2 = add(halo, new THREE.MeshBasicMaterial({color: '#d8a030', transparent: true, opacity: .16, depthWrite: false}), 'glow', body);
      hm2.castShadow = false; hm2.receiveShadow = false;
    }
    const maneG = mane.length ? mergeGeometries(mane) : null;
    const mm = !maneG ? null : add(maneG, kind === 'black' ? new THREE.MeshStandardMaterial({vertexColors: true, roughness: .4, metalness: .2, flatShading: true}) : new THREE.MeshBasicMaterial({vertexColors: true, side: THREE.DoubleSide}), 'mane', neck); if (mm) mm.castShadow = kind === 'black';
    g.userData.scarred = true;
  }
  return {g, body, legs: [], tail: neck, wings: [], quirk: 'snake'};
}
