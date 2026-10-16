import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The water demon's own head and dressing, on top of the shared demon rig in creatures.js. It was a
// blue demon with a toad's head and a few barnacles. It is now something that was drowned and came back
// hungry:
// - the head: a wide, flat, drowned toad's skull with a lower jaw hanging open on a black mouth full of
//   needle teeth, a slack pale throat sac, and two bulging dead-white eyes with no pupils, each sunk in a
//   dark bruised lid, and a ragged crest of translucent fin spines over the skull;
// - gills: three dark slits cut into each side of the neck, with a torn translucent frill behind them;
// - a ridge of ragged, translucent dorsal fins down the spine, and a pale bloated belly;
// - drowned weed: black-green strands draped over one shoulder, across the chest and the far forearm,
//   caught on a horn and trailing down the back;
// - a crust of pale barnacles grown over the other shoulder and the upper back;
// - water: it never stops running off it; thin strands hang from the jaw, the elbows, the horn and the
//   tail tip, each ending in a bead, and it stands in a dark wet pool ringed with ripples.
// The opaque parts share materials so creatures.js's mergeStatic bakes them; the translucent ones (fins,
// frills, water, pool) are baked here into one mesh each. Material names carry the tests.

const bare = geo => { geo.deleteAttribute('uv'); return geo.index ? geo.toNonIndexed() : geo; };
const place = (geo, x, y, z, rx = 0, ry = 0, rz = 0, s = null) => { if (s) geo.scale(...s); if (rx) geo.rotateX(rx); if (ry) geo.rotateY(ry); if (rz) geo.rotateZ(rz); geo.translate(x, y, z); return bare(geo); };
const std = (color, o = {}) => new THREE.MeshStandardMaterial({color, roughness: .8, ...o});
// a ragged fin: a thin vertical wedge standing in the YZ plane, its base along z at y = 0, rising to
// `height`, its top edge torn into `tear` points
function fin(height, base, tear = 3) {
  const geo = new THREE.PlaneGeometry(base, height, tear * 2, 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); if (y > 0) p.setY(i, y * (1 - .55 * Math.abs(Math.sin((x / base + .5) * tear * Math.PI)))); }
  geo.translate(0, height / 2, 0); geo.rotateY(Math.PI / 2);
  return geo;
}

export function waterDemonHead(head, {skin, dark, mouth, tooth}) {
  const eye = std('#d8ecee', {emissive: '#80f0ff', emissiveIntensity: 1.1, roughness: .25}); eye.name = 'demon-dead-eye';
  const lid = std('#1d2c3a', {roughness: .9}); lid.name = 'demon-lid';
  const throat = std('#8aa8ae', {roughness: .55}); throat.name = 'demon-throat';
  const add = (geo, m, x = 0, y = 0, z = 0) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; head.add(mesh); return mesh; };
  // the skull: wide and flat, the brow heavier on one side
  const skull = add(new THREE.SphereGeometry(.13, 18, 12), skin, 0, 0, .01); skull.scale.set(1.5, .62, 1.15); skull.rotation.z = .06;
  // the lower jaw hangs open: a flat half-dome, slack to one side, over a black mouth
  const jaw = add(new THREE.SphereGeometry(.115, 16, 10), skin, 0, -.075, .035); jaw.scale.set(1.42, .32, 1.05); jaw.rotation.set(.38, 0, -.08);
  const gape = add(new THREE.CylinderGeometry(.12, .12, .04, 18), mouth, 0, -.045, .05); gape.scale.set(1.35, 1, .8); gape.rotation.x = .2;
  // needle teeth along both rims
  for (let i = 0; i < 11; i++) { const a = (i / 10 - .5) * 2.4, x = Math.sin(a) * .16, z = .02 + Math.cos(a) * .115; const t = add(new THREE.ConeGeometry(.007, .035 + (i % 3) * .01, 4), tooth, x, -.035, z); t.rotation.x = Math.PI + .25; t.rotation.z = Math.sin(a) * .2; }
  for (let i = 0; i < 9; i++) { const a = (i / 8 - .5) * 2.2, x = Math.sin(a) * .15, z = .03 + Math.cos(a) * .11; const t = add(new THREE.ConeGeometry(.006, .03, 4), tooth, x, -.085, z); t.rotation.x = -.3; }
  // the throat sac, slack and pale under the jaw
  const sac = add(new THREE.SphereGeometry(.07, 14, 10), throat, 0, -.11, -.01); sac.scale.set(1.3, .6, 1);
  // dead eyes: milky, sunk in bruised sockets, each half shut under a slack dark lid, and not a pair
  for (const s of [-1, 1]) {
    const ring = add(new THREE.TorusGeometry(.04, .013, 6, 14), lid, s * .085, .04, .058); ring.rotation.x = -.55; ring.rotation.y = s * .3;
    const e = add(new THREE.SphereGeometry(.036, 14, 10), eye, s * .085, .042, .062); e.castShadow = false; e.scale.set(1, .95, 1.05);
    const cap = add(new THREE.SphereGeometry(.039, 14, 8, 0, Math.PI * 2, 0, s < 0 ? 1.25 : .95), lid, s * .085, .042, .062); cap.rotation.x = -.45; cap.castShadow = false;
  }
  // a crest of torn fin spines back over the skull (translucent, baked here)
  const finMat = new THREE.MeshStandardMaterial({color: '#1f5560', roughness: .5, transparent: true, opacity: .7, side: THREE.DoubleSide}); finMat.name = 'demon-fin';
  const crest = [];
  for (let i = 0; i < 5; i++) crest.push(place(fin(.06 + .03 * (i === 2), .07 - i * .006, 2), 0, .055 - i * .004, .0 - i * .04, -.55 - i * .08));
  const c = new THREE.Mesh(mergeGeometries(crest), finMat); c.castShadow = false; head.add(c);
  return head;
}

export function waterDemonBody(body, {skin, chestY, headY, shoulderX, bulk}) {
  const barn = std('#b3b09e', {roughness: .9}); barn.name = 'demon-barnacle';
  const barnDark = std('#6f6c5c', {roughness: .95}); barnDark.name = 'demon-barnacle';
  const weed = std('#182a1c', {roughness: .9}); weed.name = 'demon-weed';
  const gill = std('#3a0c12', {roughness: 1}); gill.name = 'demon-gill';
  const belly = std('#8ea9b0', {roughness: .55}); belly.name = 'demon-belly';
  const finMat = new THREE.MeshStandardMaterial({color: '#1f5560', roughness: .5, transparent: true, opacity: .7, side: THREE.DoubleSide}); finMat.name = 'demon-fin';
  const water = new THREE.MeshPhysicalMaterial({color: '#bfe6f0', roughness: .05, transparent: true, opacity: .55, clearcoat: 1, depthWrite: false}); water.name = 'demon-drip';
  const wet = new THREE.MeshStandardMaterial({color: '#0b1c26', roughness: .08, metalness: .1, transparent: true, opacity: .55, depthWrite: false}); wet.name = 'demon-wet';
  const add = (geo, m, x = 0, y = 0, z = 0) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; body.add(mesh); return mesh; };
  const bake = (geos, m, shadow = false) => { const mesh = new THREE.Mesh(mergeGeometries(geos), m); mesh.castShadow = shadow; mesh.receiveShadow = false; body.add(mesh); return mesh; };
  const tube = (pts, r, m, seg = 12) => add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), seg, r, 7, false), m);
  const neckY = headY - .1, r = .19 * bulk;
  // the pale bloated belly, slung low on the chest
  const b = add(new THREE.SphereGeometry(.14 * bulk, 16, 12), belly, .01, chestY - .12, .09 * bulk); b.scale.set(1.05, 1.15, .6); b.rotation.x = -.15;
  // gills: three slits each side of the neck, a torn frill behind them
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const g = add(new THREE.BoxGeometry(.006, .045 - i * .006, .018), gill, s * (.055 * bulk + .002), neckY + .01 - i * .004, .03 - i * .022); g.rotation.y = s * .5; g.rotation.z = s * .18; g.castShadow = false; }
  const frills = [];
  for (const s of [-1, 1]) for (let i = 0; i < 2; i++) frills.push(place(fin(.05, .06, 2), s * .065 * bulk, neckY - .03 - i * .012, -.01 - i * .03, .9, s * .55, s * 1.1));
  // a ragged dorsal ridge down the spine, leaning back
  for (let i = 0; i < 6; i++) frills.push(place(fin(.075 - i * .006, .075 - i * .004, 3), 0, chestY + .17 - i * .085, -r * .92 - i * .004, -.75));
  bake(frills, finMat);
  // drowned weed: draped over the left shoulder and across the chest, over the right forearm, caught on a horn, trailing down the back
  tube([[-shoulderX * 1.2, chestY + .16, -.02], [-shoulderX * .6, chestY + .06, r * .95], [.02, chestY - .08, r * 1.02], [shoulderX * .5, chestY - .26, r * .8], [shoulderX * .7, chestY - .42, r * .55]], .014, weed, 16);
  tube([[-shoulderX * 1.25, chestY + .14, .02], [-shoulderX * 1.35, chestY - .02, -.06], [-shoulderX * 1.25, chestY - .2, -.1], [-shoulderX * 1.4, chestY - .4, -.06]], .011, weed, 12);
  tube([[shoulderX + .12, chestY - .12, .1], [shoulderX + .2, chestY - .2, .14], [shoulderX + .22, chestY - .36, .1], [shoulderX + .16, chestY - .5, .08]], .009, weed, 10);
  tube([[.07, headY + .09, .0], [.1, headY + .02, -.07], [.06, headY - .12, -.1], [.03, headY - .3, -.12]], .008, weed, 10);
  for (const [x, z] of [[.03, -r * .9], [-.05, -r * .85]]) tube([[x, chestY + .1, z], [x * 2, chestY - .1, z - .04], [x * 1.5, chestY - .35, z - .02], [x * 3, chestY - .6, z + .02]], .01, weed, 12);
  // barnacles: a crust over the right shoulder and the upper back, pale cones in rings of their own shells
  const spots = [[shoulderX * 1.1, chestY + .14, .02, .022], [shoulderX * 1.25, chestY + .09, -.03, .018], [shoulderX * .95, chestY + .17, -.06, .016], [shoulderX * 1.3, chestY + .16, .06, .014], [shoulderX * 1.05, chestY + .07, .08, .012],
    [.06, chestY + .1, -r * .95, .02], [-.03, chestY + .02, -r * .98, .017], [.1, chestY - .02, -r * .9, .014], [-.08, chestY + .12, -r * .9, .013], [.0, chestY - .12, -r * .96, .011], [shoulderX * 1.15, chestY + .03, -.08, .012]];
  for (const [x, y, z, s] of spots) {
    const dir = new THREE.Vector3(x, y - chestY - .05, z).normalize();
    const cone = add(new THREE.ConeGeometry(s, s * 1.6, 5), barn, x, y, z); cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const ring = add(new THREE.TorusGeometry(s * 1.05, s * .3, 5, 9), barnDark, x, y, z); ring.quaternion.copy(cone.quaternion); ring.rotateX(Math.PI / 2); ring.castShadow = false;
  }
  // water running off it: strands from the jaw, the elbows, a horn and the tail, each ending in a bead
  const drips = [];
  for (const [x, y, z, len] of [[.03, headY - .13, .09, .11], [-.05, headY - .14, .07, .07], [shoulderX + .1, chestY - .08, .05, .13], [-(shoulderX + .1), chestY - .06, .04, .09], [-.07, headY + .07, -.01, .08], [.15, .3, -.3, .07], [.04, chestY - .2, r * .9, .1]]) {
    drips.push(place(new THREE.CylinderGeometry(.004, .009, len, 6), x, y - len / 2, z));
    drips.push(place(new THREE.SphereGeometry(.012, 8, 6), x, y - len - .006, z, 0, 0, 0, [1, 1.35, 1]));
  }
  bake(drips, water);
  // the wet pool it stands in, ringed with ripples
  const pool = [place(new THREE.CircleGeometry(.44, 32), 0, .006, .02, -Math.PI / 2)];
  for (const [rr, w] of [[.2, .006], [.33, .005], [.42, .004]]) pool.push(place(new THREE.TorusGeometry(rr, w, 4, 36), 0, .007, .02, -Math.PI / 2));
  const p = bake(pool, wet); p.userData.ring = true; p.renderOrder = -1;
  return body;
}
