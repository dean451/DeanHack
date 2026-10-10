import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {glowDisc} from './potion.js';

// The acid blob was a smooth green dome with five bumps. Now it is a low, sagging, lumpy mound of caustic
// jelly that is eating the floor beneath it:
// - the mass: a squat, asymmetric lump with a slumped, wrinkled skin, translucent acid green, wet and glossy,
//   lit faintly from inside, so it glows in the dark;
// - inside: a clouded dark nucleus, suspended bubbles of different sizes, and a few pale half-dissolved flecks;
// - below: it drips beaded strands from its underside, sits in a spreading acid pool whose edge has burned
//   the stone black and pitted, and a few caustic beads have splashed away from it.
// Handles: body (quirk 'blob'). Four draws: the mass, the inside, the drips, the pool.
const hash = n => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
const bare = geo => { geo.deleteAttribute('uv'); return geo.index ? geo.toNonIndexed() : geo; };

export function createAcidBlob({color = '#7ed23a'} = {}) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const add = (geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.userData.part = name; m.castShadow = name !== 'pool'; body.add(m); return m; };
  const paint = (geo, fn) => { const p = geo.attributes.position, c = new Float32Array(p.count * 3), o = new THREE.Color(); for (let i = 0; i < p.count; i++) { fn(p.getX(i), p.getY(i), p.getZ(i), o); o.toArray(c, i * 3); } geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); return geo; };
  const base = new THREE.Color(color);

  // the mass: a squashed sphere pulled into a slumped, wrinkled lump, sagging at one side
  const mass = new THREE.SphereGeometry(.3, 40, 26);
  const p = mass.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.sin(x * 11 + z * 7) * Math.cos(z * 13 - y * 9) * .012 + Math.sin(x * 23 + y * 17) * .005;
    const up = Math.max(0, y) / .3;
    y *= .52 - .1 * up * Math.abs(Math.sin(x * 5 + 1));                   // slumped and lopsided
    const slump = 1 + .22 * Math.max(0, -y) / .3;                         // the foot spreads wider than the crown
    p.setXYZ(i, x * slump * (1.08 + .1 * Math.sin(z * 4)) + n, y + .13 + n * .6, z * slump * .98 + n);
  }
  mass.computeVertexNormals();
  paint(mass, (x, y, z, o) => o.copy(base).lerp(new THREE.Color('#d8ff90'), THREE.MathUtils.clamp((y - .2) * 2.2, 0, .5)).lerp(new THREE.Color('#2a5a14'), THREE.MathUtils.clamp((.1 - y) * 3, 0, .45)));
  add(bare(mass), new THREE.MeshPhysicalMaterial({vertexColors: true, roughness: .12, transmission: 0, transparent: true, opacity: .8, clearcoat: 1, clearcoatRoughness: .05,
    emissive: color, emissiveIntensity: .35, side: THREE.DoubleSide}), 'mass');

  // inside: a clouded nucleus, suspended bubbles and dissolving flecks, one opaque mesh
  const inside = [];
  const nuc = bare(new THREE.SphereGeometry(.085, 14, 10)); nuc.scale(1, .8, 1); nuc.translate(.02, .14, -.01);
  paint(nuc, (x, y, z, o) => o.set('#1d3a0c').lerp(new THREE.Color('#4a7a1c'), hash(Math.round(x * 90) + Math.round(z * 90) * 7) * .6));
  inside.push(nuc);
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4, r = .06 + hash(i * 3) * .16, s = .01 + hash(i * 7) * .026;
    const b = bare(new THREE.SphereGeometry(s, 8, 6)); b.translate(Math.cos(a) * r, .06 + hash(i * 5) * .15, Math.sin(a) * r);
    paint(b, (x, y, z, o) => o.set('#e8ffc0'));
    inside.push(b);
  }
  for (let i = 0; i < 5; i++) {
    const f = bare(new THREE.OctahedronGeometry(.012 + hash(i) * .01)); f.translate(Math.cos(i * 1.9) * .13, .08 + hash(i * 2) * .1, Math.sin(i * 1.9) * .13);
    paint(f, (x, y, z, o) => o.set('#cfc09a'));
    inside.push(f);
  }
  add(mergeGeometries(inside), new THREE.MeshStandardMaterial({vertexColors: true, roughness: .5, emissive: '#2a5a10', emissiveIntensity: .4}), 'inside');

  // drips from the underside, each ending in a bead
  const drips = [];
  for (let i = 0; i < 6; i++) {
    const a = i * 1.1 + .4, r = .22 + hash(i) * .08, len = .06 + hash(i * 3) * .1;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const strand = bare(new THREE.CylinderGeometry(.008, .016, len, 6)); strand.translate(x, .04 + len / 2 - .0, z);
    paint(strand, (xx, y, zz, o) => o.copy(base).lerp(new THREE.Color('#d8ff90'), .3));
    drips.push(strand);
    const bead = bare(new THREE.SphereGeometry(.017, 8, 6)); bead.scale(1, 1.3, 1); bead.translate(x, .035, z);
    paint(bead, (xx, y, zz, o) => o.copy(base).lerp(new THREE.Color('#e8ffb0'), .4));
    drips.push(bead);
  }
  add(mergeGeometries(drips), new THREE.MeshPhysicalMaterial({vertexColors: true, roughness: .1, clearcoat: 1, emissive: color, emissiveIntensity: .45}), 'drips');

  // the pool: a spreading puddle with a burnt, pitted black rim, and a soft acid glow above it
  const pool = [];
  const disc = bare(new THREE.CircleGeometry(.46, 36)); disc.rotateX(-Math.PI / 2);
  const dp = disc.attributes.position;
  for (let i = 0; i < dp.count; i++) { const x = dp.getX(i), z = dp.getZ(i), r = Math.hypot(x, z), w = 1 + .22 * Math.sin(Math.atan2(z, x) * 3 + 1) + .1 * Math.sin(Math.atan2(z, x) * 7); dp.setXYZ(i, x * w, .004, z * w); }
  paint(disc, (x, y, z, o) => { const r = Math.hypot(x, z) / .46; o.copy(base).multiplyScalar(.5).lerp(new THREE.Color('#0a0e06'), THREE.MathUtils.clamp((r - .55) * 2.2, 0, .95)); });
  pool.push(disc);
  for (let i = 0; i < 10; i++) {
    const a = i * 2.2, r = .3 + hash(i * 4) * .3, s = .012 + hash(i * 6) * .016;
    const pit = bare(new THREE.CircleGeometry(s, 8)); pit.rotateX(-Math.PI / 2); pit.translate(Math.cos(a) * r, .007, Math.sin(a) * r);
    paint(pit, (x, y, z, o) => o.set('#040604'));
    pool.push(pit);
  }
  add(mergeGeometries(pool), new THREE.MeshStandardMaterial({vertexColors: true, roughness: .35, emissive: '#1a3a08', emissiveIntensity: .5}), 'pool');
  const glow = new THREE.Mesh(glowDisc(color, .5), new THREE.MeshBasicMaterial({vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false}));
  glow.name = 'glow'; glow.renderOrder = -1; body.add(glow);
  return {g, body};
}
