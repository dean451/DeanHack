import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The gray ooze was the shared Kirby blob tinted grey. It is the thing that rusts: a slow, low slick of
// wet slate-grey jelly that has eaten iron and shows it.
// - the mass: a wide, lopsided, sagging mound with a wrinkled oily skin, grey on top, darker and wetter
//   down its flanks, with rust bleeding through in streaks down one side; four pseudopods of different
//   lengths creep out from its foot, one reaching well ahead;
// - inside: a clouded dark nucleus, and the half-dissolved iron it has swallowed: a corroded blade,
//   a nail, a ring and flakes of rust turning in the jelly, with a few grey bubbles;
// - its skin is scabbed with rust: flattened orange-brown crusts cluster on the rusty flank;
// - below: a spreading wet slick, stained rust-brown where the ooze has lain, with flecks of rust
//   shed around it.
// Four draws: the mass with its pseudopods, the inside, the crust, the pool. No lights, no glow (it is
// not luminous; the lantern finds it). Handles: body (quirk 'blob').
const hash = n => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
const bare = geo => { geo.deleteAttribute('uv'); return geo.index ? geo.toNonIndexed() : geo; };
const C = {
  grey: '#737876', crown: '#a7aeaa', wet: '#3b4240', rust: '#9a4d24', rustDark: '#5a2a12', rustHot: '#c8692c',
  nucleus: '#262c2a', nucleusLit: '#4a5452', iron: '#4a3a30', bubble: '#9aa39e', pool: '#2f3331', stain: '#6a3a1c',
};

export function createGrayOoze() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const add = (geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.userData.part = name; m.castShadow = name !== 'pool'; m.receiveShadow = true; body.add(m); return m; };
  const paint = (geo, fn) => { const p = geo.attributes.position, c = new Float32Array(p.count * 3), o = new THREE.Color(); for (let i = 0; i < p.count; i++) { fn(p.getX(i), p.getY(i), p.getZ(i), o); o.toArray(c, i * 3); } geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); return geo; };
  const col = Object.fromEntries(Object.entries(C).map(([k, v]) => [k, new THREE.Color(v)]));
  // rust bleeds through on the +x flank: 1 at the streaks, 0 away from them
  const rustAt = (x, y, z) => { const side = THREE.MathUtils.clamp((x - .02) * 4, 0, 1), streak = .5 + .5 * Math.sin(z * 23 + y * 9 + 1.3) * Math.sin(x * 17 - z * 11); return side * THREE.MathUtils.clamp((streak - .45) * 3, 0, 1); };
  const skinColour = (x, y, z, o) => {
    o.copy(col.grey).lerp(col.crown, THREE.MathUtils.clamp((y - .13) * 5, 0, .6)).lerp(col.wet, THREE.MathUtils.clamp((.08 - y) * 7, 0, .7));
    o.lerp(col.rust, rustAt(x, y, z) * .85);
  };

  // the mass: a sphere squashed low, spread wide at the foot, lopsided, with a wrinkled, sagging skin
  const mass = new THREE.SphereGeometry(.34, 44, 28);
  const p = mass.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const up = Math.max(0, y) / .34;
    const n = Math.sin(x * 13 + z * 9) * Math.cos(z * 15 - y * 7) * .014 + Math.sin(x * 29 + y * 19) * .006;
    y *= .5 - .12 * up * Math.abs(Math.sin(x * 4 + z * 3 + .7));          // low, with a slumped crown
    const spread = 1 + .3 * Math.max(0, -p.getY(i)) / .34;                 // the foot spreads wider than the crown
    p.setXYZ(i, x * spread * (1.1 + .12 * Math.sin(z * 3 + 1)) + n + .03, Math.max(0, y + .17 + n * .5), z * spread * (.96 + .08 * Math.cos(x * 5)) + n);
  }
  const parts = [bare(mass)];
  // pseudopods creeping out from under the foot, one well ahead: each roots wide inside the mass and
  // tapers to a blunt tip, flattening as it goes, so it reads as the ooze reaching, not a flipper
  for (const [a, len, w] of [[.3, .36, .13], [1.9, .22, .1], [3.3, .27, .11], [4.9, .17, .09]]) {
    const lobe = new THREE.SphereGeometry(w, 18, 10); lobe.scale(len / w, .4, 1);
    const lp = lobe.attributes.position;
    for (let i = 0; i < lp.count; i++) { const x = lp.getX(i), t = THREE.MathUtils.clamp((x + len * .3) / (len * 1.3), 0, 1); lp.setZ(i, lp.getZ(i) * (1.2 - .65 * t)); lp.setY(i, Math.max(-.03, lp.getY(i) * (1.15 - .55 * t) + Math.sin(x * 40) * .003)); }
    lobe.rotateY(-a); lobe.translate(Math.cos(a) * (.2 + len * .55), .038, Math.sin(a) * (.2 + len * .55));
    parts.push(bare(lobe));
  }
  const massGeo = mergeGeometries(parts); massGeo.computeVertexNormals();
  paint(massGeo, skinColour);
  add(massGeo, new THREE.MeshPhysicalMaterial({vertexColors: true, roughness: .28, transparent: true, opacity: .86, clearcoat: .9, clearcoatRoughness: .25, side: THREE.DoubleSide}), 'mass');

  // inside: the nucleus, the swallowed iron, rust flakes and a few bubbles, one opaque mesh
  const inside = [];
  const nuc = bare(new THREE.SphereGeometry(.09, 14, 10)); nuc.scale(1.1, .7, 1); nuc.translate(.01, .13, -.02);
  paint(nuc, (x, y, z, o) => o.copy(col.nucleus).lerp(col.nucleusLit, hash(Math.round(x * 80) + Math.round(z * 80) * 7) * .5));
  inside.push(nuc);
  const ironColour = (x, y, z, o) => o.copy(col.iron).lerp(col.rust, .4 + .5 * hash(Math.round(x * 300) * 3 + Math.round(y * 300) * 5 + Math.round(z * 300))).lerp(col.rustHot, hash(Math.round(x * 90) + Math.round(z * 70)) > .8 ? .5 : 0);
  // a corroded blade, eaten ragged, lying tilted in the jelly
  const blade = new THREE.BoxGeometry(.19, .006, .028); { const bp = blade.attributes.position; for (let i = 0; i < bp.count; i++) { const x = bp.getX(i); bp.setZ(i, bp.getZ(i) * (1 - Math.max(0, x) * 3.5) + Math.sin(x * 60) * .003); } }
  blade.rotateZ(.3); blade.rotateY(.9); blade.translate(-.06, .12, .06); inside.push(paint(bare(blade), ironColour));
  const nail = new THREE.CylinderGeometry(.004, .007, .11, 5); nail.rotateZ(1.1); nail.rotateY(-.6); nail.translate(.09, .1, -.05); inside.push(paint(bare(nail), ironColour));
  const ring = new THREE.TorusGeometry(.028, .006, 5, 12); ring.rotateX(1.2); ring.rotateY(.4); ring.translate(.04, .17, .04); inside.push(paint(bare(ring), ironColour));
  for (let i = 0; i < 9; i++) {
    const f = new THREE.BoxGeometry(.012 + hash(i) * .014, .003, .009 + hash(i * 3) * .01); f.rotateX(hash(i * 5) * 3); f.rotateY(hash(i * 7) * 6);
    const a = i * 2.3; f.translate(Math.cos(a) * (.08 + hash(i * 2) * .14), .05 + hash(i * 4) * .14, Math.sin(a) * (.08 + hash(i * 6) * .12));
    inside.push(paint(bare(f), ironColour));
  }
  for (let i = 0; i < 7; i++) {
    const a = i * 2.7 + .5, r = .1 + hash(i * 3) * .14, s = .008 + hash(i * 7) * .016;
    const b = bare(new THREE.SphereGeometry(s, 8, 6)); b.translate(Math.cos(a) * r, .06 + hash(i * 5) * .12, Math.sin(a) * r);
    inside.push(paint(b, (x, y, z, o) => o.copy(col.bubble)));
  }
  add(mergeGeometries(inside), new THREE.MeshStandardMaterial({vertexColors: true, roughness: .55, metalness: .15}), 'inside');

  // the crust: flattened rust scabs clustered on the rusty flank, a few on the crown
  const crust = [];
  for (let i = 0; i < 11; i++) {
    const a = -.9 + hash(i * 11) * 1.9, r = .16 + hash(i * 13) * .16, s = .018 + hash(i * 17) * .03;
    const x = Math.cos(a) * r + .03, z = Math.sin(a) * r, y = .15 + Math.max(0, .17 - r * .5) * .9;
    const c = new THREE.SphereGeometry(s, 9, 6); c.scale(1.3, .35, 1); c.rotateY(hash(i) * 3); c.rotateZ(-.5 * Math.cos(a)); c.translate(x, y, z);
    crust.push(paint(bare(c), (xx, yy, zz, o) => o.copy(col.rustDark).lerp(col.rustHot, hash(Math.round(xx * 200) + Math.round(zz * 200) * 3) * .7)));
  }
  add(mergeGeometries(crust), new THREE.MeshStandardMaterial({vertexColors: true, roughness: .95}), 'crust');

  // the pool: a wet grey slick, stained rust where the ooze has lain, with rust flecks shed around it
  const pool = [];
  const disc = bare(new THREE.CircleGeometry(.5, 40)); disc.rotateX(-Math.PI / 2);
  const dp = disc.attributes.position;
  for (let i = 0; i < dp.count; i++) { const x = dp.getX(i), z = dp.getZ(i), w = 1 + .2 * Math.sin(Math.atan2(z, x) * 3 + .6) + .12 * Math.sin(Math.atan2(z, x) * 5 + 2); dp.setXYZ(i, x * w + .04, .004, z * w); }
  paint(disc, (x, y, z, o) => { const r = Math.hypot(x - .04, z) / .5; o.copy(col.pool).lerp(col.stain, THREE.MathUtils.clamp(.9 - r * 1.4, 0, .8) * (.5 + .5 * Math.sin(x * 9 + z * 7))).lerp(col.wet, THREE.MathUtils.clamp((r - .7) * 3, 0, .6)); });
  pool.push(disc);
  for (let i = 0; i < 12; i++) {
    const a = i * 2.1 + .3, r = .36 + hash(i * 4) * .28, s = .008 + hash(i * 6) * .012;
    const fleck = bare(new THREE.CircleGeometry(s, 7)); fleck.rotateX(-Math.PI / 2); fleck.translate(Math.cos(a) * r + .04, .006, Math.sin(a) * r);
    paint(fleck, (x, y, z, o) => o.copy(col.rust).lerp(col.rustDark, hash(i * 9) * .6));
    pool.push(fleck);
  }
  add(mergeGeometries(pool), new THREE.MeshStandardMaterial({vertexColors: true, roughness: .3, transparent: true, opacity: .9, depthWrite: false}), 'pool');
  return {g, body};
}
