import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The horned devil's own head and trident, on top of the shared demon rig in creatures.js. It was the
// stock demon head with two long horns. It is now a ram-horned goat skull on a fiend's neck:
// - the skull: a faceted bone-grey cranium, a long wedge muzzle with a split black nose, a heavy brow ridge,
//   deep black sockets with a small hot ember in each, a jaw hanging a little open on yellow fangs, and a
//   ragged goat's beard of dark hair;
// - the horns: thick ridged ram's horns that sweep back, curl down round the ears and turn forward again
//   to a point; the left one is snapped short and the right keeps its tip;
// - the ears: pointed, one torn through;
// - the trident burns: tongues of flame lick up from all three tines, with a few embers hanging off them.
// The opaque parts share materials so creatures.js's mergeStatic bakes them; the flames are translucent and
// are baked here into one mesh. Material names carry the tests.

const bare = geo => { geo.deleteAttribute('uv'); return geo.index ? geo.toNonIndexed() : geo; };
const std = (color, o = {}) => new THREE.MeshStandardMaterial({color, roughness: .8, ...o});
// a tapering run of ridged segments along a curve: the horn's body, thick at the root, ending in a point
function horn(pts, r0, r1, rings = 0) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), n = 9, out = [], ridge = [];
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, a = curve.getPoint(t0), b = curve.getPoint(t1), len = a.distanceTo(b);
    const ra = r0 + (r1 - r0) * t0, rb = r0 + (r1 - r0) * t1;
    const seg = new THREE.CylinderGeometry(rb, ra, len * 1.04, 5, 1);
    seg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
    const mid = a.clone().add(b).multiplyScalar(.5); seg.translate(mid.x, mid.y, mid.z); out.push(bare(seg));
    if (rings && i % 2 === 1 && i < n - 2) { const ring = new THREE.TorusGeometry(ra * 1.12, ra * .22, 4, 5); ring.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), b.clone().sub(a).normalize())); ring.translate(a.x, a.y, a.z); ridge.push(bare(ring)); }
  }
  return {shaft: out, ridge};
}

export function hornedDevilHead(head, {skin, dark, tooth, glow}) {
  const bone = std('#a89c80', {roughness: .7}); bone.name = 'devil-skull';
  const stain = std('#3e342a', {roughness: .95}); stain.name = 'devil-skull-dark';
  const hornMat = std('#2c241c', {roughness: .5}); hornMat.name = 'devil-horn';
  const ringMat = std('#625640', {roughness: .75}); ringMat.name = 'devil-horn-ridge';
  const ember = std('#ff8a28', {emissive: '#ff6a18', emissiveIntensity: 2.2, roughness: .3}); ember.name = 'devil-eye';
  const hair = std('#17110e', {roughness: 1}); hair.name = 'devil-beard';
  const add = (geo, m, x = 0, y = 0, z = 0) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; head.add(mesh); return mesh; };
  // the cranium: faceted, a little lopsided, the brow ridge a heavy bar over the sockets
  const cranium = add(new THREE.IcosahedronGeometry(.1, 0), bone, 0, .01, -.01); cranium.scale.set(1, .92, 1.1); cranium.rotation.set(.3, .4, .06);
  const brow = add(new THREE.BoxGeometry(.15, .024, .045), stain, 0, .045, .08); brow.rotation.set(.25, 0, .07);
  // the muzzle: a long wedge pointing forward and down, over a jaw that hangs a little open
  const muzzle = add(new THREE.CylinderGeometry(.034, .07, .19, 5), bone, 0, -.025, .15); muzzle.rotation.x = Math.PI / 2 + .22; muzzle.rotation.z = .04;
  const jaw = add(new THREE.CylinderGeometry(.026, .055, .17, 5), bone, 0, -.088, .12); jaw.rotation.x = Math.PI / 2 + .02; jaw.scale.set(1, 1, .6);
  const gape = add(new THREE.BoxGeometry(.07, .014, .15), stain, 0, -.062, .13); gape.rotation.x = .1;
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(.012, .02, .016), stain, s * .014, -.012, .245).rotation.z = s * .4;
  // fangs along both rims, one broken
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) {
    const z = .075 + i * .028, up = add(new THREE.ConeGeometry(.007, i === 2 && s > 0 ? .012 : .03, 4), tooth, s * (.04 - i * .004), -.058, z); up.rotation.x = Math.PI;
    if (i % 2 === 0) add(new THREE.ConeGeometry(.006, .026, 4), tooth, s * (.03 - i * .003), -.07, z + .008);
  }
  // sockets and embers
  for (const s of [-1, 1]) {
    const sock = add(new THREE.CylinderGeometry(.03, .022, .03, 5), stain, s * .05, .01, .085); sock.rotation.set(Math.PI / 2 - .2, 0, s * .3);
    const e = add(new THREE.SphereGeometry(.011, 8, 6), ember, s * .05, .008, .1); e.castShadow = false; e.scale.set(1.2, .7, 1);
  }
  // the goat's beard: ragged dark hair hanging from the chin
  for (let i = 0; i < 5; i++) { const c = add(new THREE.ConeGeometry(.012, .08 + (i % 3) * .03, 4), hair, (i - 2) * .012, -.135 - (i % 2) * .01, .165 - Math.abs(i - 2) * .008); c.rotation.x = Math.PI - .15; c.rotation.z = (i - 2) * .12; c.castShadow = false; }
  // ears: pointed and swept out, the left one torn through
  for (const s of [-1, 1]) {
    const ear = add(new THREE.ConeGeometry(.026, .1, 4), skin, s * .105, .0, -.04); ear.rotation.z = -s * 1.35; ear.rotation.y = s * .3; ear.scale.z = .35;
    if (s < 0) add(new THREE.BoxGeometry(.012, .02, .02), dark, s * .115, -.005, -.04).castShadow = false;
  }
  // ram's horns: sweep back, curl down round the ear, turn forward; the left is snapped, the right whole
  const shafts = [], ridges = [];
  for (const s of [-1, 1]) {
    const pts = s > 0
      ? [[.07, .06, -.02], [.14, .1, -.07], [.2, .06, -.1], [.21, -.03, -.06], [.17, -.08, .02], [.12, -.07, .07]]
      : [[-.07, .06, -.02], [-.14, .1, -.07], [-.2, .06, -.1], [-.21, -.02, -.07]];
    const h = horn(pts.map(p => p.map(v => v * 1.3)), .04, s > 0 ? .008 : .022, 1); shafts.push(...h.shaft); ridges.push(...h.ridge);
  }
  const hs = new THREE.Mesh(mergeGeometries(shafts), hornMat); hs.castShadow = true; head.add(hs);
  const hr = new THREE.Mesh(mergeGeometries(ridges), ringMat); hr.castShadow = false; head.add(hr);
  return head;
}

export function hornedDevilBody(body, {chestY, shoulderX, flame}) {
  const fire = new THREE.MeshStandardMaterial({color: flame, emissive: flame, emissiveIntensity: 1.5, roughness: .3, transparent: true, opacity: .85, depthWrite: false}); fire.name = 'devil-fire';
  const grip = [shoulderX + .08, chestY - .2, .16], tilt = .15;
  // a point on the trident's shaft, `y` up its length: the trident hangs from the hand tipped forward by `tilt`
  const at = (x, y) => [grip[0] + x, grip[1] + y * Math.cos(tilt), grip[2] + y * Math.sin(tilt)];
  const tongues = [];
  for (const [x, y0, h, w, lean] of [[-.05, .72, .14, .03, -.25], [0, .76, .19, .04, .1], [.05, .72, .12, .028, .3], [-.02, .66, .1, .02, -.5], [.04, .68, .08, .018, .6]]) {
    const c = new THREE.ConeGeometry(w, h, 5); c.translate(0, h / 2, 0); c.rotateZ(-lean); c.rotateX(tilt + .1);
    const p = at(x, y0); c.translate(...p); tongues.push(bare(c));
  }
  // embers hanging off the tines
  for (const [x, y] of [[-.06, .9], [.03, .98], [.07, .86]]) { const e = new THREE.OctahedronGeometry(.009, 0); const p = at(x, y); e.translate(...p); tongues.push(bare(e)); }
  const m = new THREE.Mesh(mergeGeometries(tongues), fire); m.castShadow = false; m.receiveShadow = false; body.add(m);
  return body;
}
