import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The barbed devil's own head and hide, on top of the shared demon rig in creatures.js. It was the stock
// demon with a few cones on its back. It is now a fiend grown over with hooked thorns:
// - the head: a narrow, hard skull with a heavy brow, slit eyes under it and a lipless mouth of needle teeth,
//   its crown, brows, cheeks and chin all bristling with thorns that curl like fish hooks; one crown thorn is
//   snapped to a stump and one ear is torn;
// - the hide: a ridge of hooked thorns down the spine, a spray off each shoulder, barbs down the outer side of
//   both forearms; the left shoulder has lost one to a stump;
// - the flesh: thorns that grew the wrong way. A few have curled back and driven their own tips into the
//   body (an arc of thorn, a puckered wound round the end, blood run down from it), and a couple have been
//   torn out, leaving bare wounds.
// The opaque parts share materials so creatures.js's mergeStatic bakes them; each pile of thorns is merged
// here into one mesh per material. Material names carry the tests.

const bare = geo => { geo.deleteAttribute('uv'); return geo.index ? geo.toNonIndexed() : geo; };
const std = (color, o = {}) => new THREE.MeshStandardMaterial({color, roughness: .8, ...o});
const V = (a) => new THREE.Vector3(...a);
const UP = new THREE.Vector3(0, 1, 0);
// a tapering run of five-sided segments along a point list; the last one is the tip
function run(pts, r0, r1) {
  const shaft = [], n = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[i + 1], t0 = i / n, t1 = (i + 1) / n, len = a.distanceTo(b);
    const seg = new THREE.CylinderGeometry(r0 + (r1 - r0) * t1, r0 + (r1 - r0) * t0, len * 1.06, 5, 1);
    seg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, b.clone().sub(a).normalize()));
    const m = a.clone().add(b).multiplyScalar(.5); seg.translate(m.x, m.y, m.z); shaft.push(bare(seg));
  }
  return {tip: shaft.pop(), shaft};
}
// a hooked thorn: leaves `p` along `d`, and its bend (toward `bend`) grows towards the point, so the tip curls
function hook(p, d, len, r, bend) {
  const P = V(p), D = V(d).normalize(), B = V(bend).normalize();
  return run([0, .28, .55, .8, 1].map(t => P.clone().addScaledVector(D, len * t).addScaledVector(B, len * .6 * t * t)), r, r * .08);
}
// a thorn that curled back into its owner: an arc from `a` out to `lift` and in again at `b`
function embedded(a, b, lift, r) {
  const A = V(a), B = V(b), m = A.clone().add(B).multiplyScalar(.5).add(V(lift));
  const curve = new THREE.CatmullRomCurve3([A, A.clone().lerp(m, .55), m, B.clone().lerp(m, .55), B]);
  return run(curve.getPoints(6), r, r * .5);
}
// a puckered wound: a flat dark disc lying on the skin, facing `n`, with blood run down from it
function wound(p, n, r, drip, wounds) {
  const disc = new THREE.SphereGeometry(r, 7, 4); disc.scale(1, .3, 1);
  disc.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, V(n).normalize())); disc.translate(...p); wounds.push(bare(disc));
  if (drip) {
    const c = new THREE.CylinderGeometry(r * .22, r * .1, drip, 4, 1); c.translate(0, -drip / 2, 0);
    c.rotateX(.12); c.translate(p[0], p[1] - r * .4, p[2] + .004); wounds.push(bare(c));
  }
}
function pile() { return {shaft: [], tip: [], wounds: []}; }
function thorn(pl, p, d, len, r, bend, stump = false) {
  if (stump) { const c = new THREE.CylinderGeometry(r * .55, r, len * .35, 5, 1); c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, V(d).normalize())); c.translate(...p); pl.shaft.push(bare(c)); return; }
  const h = hook(p, d, len, r, bend); pl.shaft.push(...h.shaft); pl.tip.push(h.tip);
}
function flush(parent, pl, mats) {
  for (const [list, m] of [[pl.shaft, mats.shaft], [pl.tip, mats.tip], [pl.wounds, mats.wound]]) {
    if (!list.length) continue;
    const mesh = new THREE.Mesh(mergeGeometries(list), m); mesh.castShadow = m !== mats.wound; mesh.receiveShadow = false; parent.add(mesh);
  }
}
function mats() {
  const shaft = std('#2a1a16', {roughness: .5}); shaft.name = 'devil-thorn';
  const tip = std('#b8a47c', {roughness: .55}); tip.name = 'devil-thorn-tip';
  const wound = std('#3e0a0a', {roughness: .35}); wound.name = 'devil-wound';
  return {shaft, tip, wound};
}

export function barbedDevilHead(head, {skin, dark, tooth, glow}) {
  const add = (geo, m, x = 0, y = 0, z = 0) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; head.add(mesh); return mesh; };
  // the skull: narrow and hard, a little lopsided, under a heavy brow
  const cranium = add(new THREE.IcosahedronGeometry(.1, 0), skin, 0, .01, -.005); cranium.scale.set(.88, 1, 1.12); cranium.rotation.set(.25, .5, .05);
  const brow = add(new THREE.BoxGeometry(.12, .02, .04), dark, 0, .042, .082); brow.rotation.set(.3, 0, -.06);
  const muzzle = add(new THREE.CylinderGeometry(.03, .052, .12, 5), skin, 0, -.025, .125); muzzle.rotation.x = Math.PI / 2 + .18;
  const jaw = add(new THREE.CylinderGeometry(.022, .045, .12, 5), skin, 0, -.078, .105); jaw.rotation.x = Math.PI / 2 - .08; jaw.scale.set(1, 1, .6);
  add(new THREE.BoxGeometry(.06, .012, .1), new THREE.MeshStandardMaterial({color: '#1a0606', roughness: 1}), 0, -.054, .115);
  // needle teeth along both rims
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const z = .07 + i * .026;
    const up = add(new THREE.ConeGeometry(.005, .032, 4), tooth, s * (.03 - i * .004), -.05, z); up.rotation.x = Math.PI;
    add(new THREE.ConeGeometry(.005, .028, 4), tooth, s * (.026 - i * .003), -.066, z + .008);
  }
  // slit eyes, slanted, under the brow in dark sockets
  for (const s of [-1, 1]) {
    const sock = add(new THREE.CylinderGeometry(.026, .02, .03, 5), dark, s * .046, .008, .08); sock.rotation.set(Math.PI / 2 - .2, 0, s * .3);
    const e = add(new THREE.SphereGeometry(.011, 8, 6), glow, s * .046, .01, .1); e.castShadow = false; e.scale.set(1.7, .4, .8); e.rotation.z = -s * .35;
  }
  // ears swept back, the left one torn through
  for (const s of [-1, 1]) {
    const ear = add(new THREE.ConeGeometry(.024, .1, 4), skin, s * .098, .01, -.035); ear.rotation.z = -s * 1.25; ear.rotation.y = s * .35; ear.scale.z = .35;
    if (s < 0) add(new THREE.BoxGeometry(.012, .022, .02), dark, s * .112, .005, -.035).castShadow = false;
  }
  // thorns: a crown along the skull (the fourth is snapped), brow spurs, cheek hooks, a chin of barbs
  const pl = pile();
  [[0, .088, .03, .15], [.004, .09, -.005, .17], [-.004, .084, -.04, .15], [0, .074, -.073, .12], [.003, .06, -.1, .1]].forEach(([x, y, z, len], i) =>
    thorn(pl, [x, y, z], [x * 4, .5, -1], len, .022, [0, -1, 0], i === 3));
  for (const s of [-1, 1]) {
    thorn(pl, [s * .07, .066, .05], [s * .8, .55, -.25], .12, .018, [-s * .2, -1, 0]);
    thorn(pl, [s * .062, -.02, .06], [s, -.1, -.4], .1, .016, [-s * .1, 0, 1]);
    thorn(pl, [s * .05, -.07, .1], [s * .8, -.4, 0], .08, .013, [0, 0, 1]);
  }
  for (const [x, len] of [[-.016, .08], [0, .11], [.017, .07]]) thorn(pl, [x, -.1, .15], [x * 3, -1, .1], len, .012, [0, 0, -1]);
  flush(head, pl, mats());
  return head;
}

export function barbedDevilBody(body, {chestY, shoulderX, bulk}) {
  const m = mats(), pl = pile(), k = bulk || 1;
  // the spine: a ridge of thorns up the back, swept up and back and hooked down, leaning side to side
  for (let i = 0; i < 8; i++) {
    const y = .46 + i * .075, x = (i % 2 ? .03 : -.03) * k;
    thorn(pl, [x, y, -(.15 - Math.abs(y - chestY) * .22) * k], [x * 3, .3, -1], (i % 2 ? .24 : .19) * k, .03, [0, -1, .35]);
  }
  // each shoulder throws a spray; the left one lost its second thorn to a stump
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const p = [s * (shoulderX + .02 + i * .02), chestY + .17 - i * .012, .03 - i * .04];
    thorn(pl, p, [s * (.5 + i * .1), .8 - i * .1, -.2 - i * .2], (.24 - i * .025) * k, .028, [-s * .2, -1, 0], s < 0 && i === 1);
  }
  // barbs down the outer side of both forearms, pointing back toward the elbow
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const t = .1 + i * .28, y = chestY - .04 - t * .14, x = s * (shoulderX + .1 - t * .02 + .02), z = .04 + t * .1;
    thorn(pl, [x, y, z], [s * .9, .4, -.25], .13 - i * .01, .018, [-s * .2, -1, .2]);
  }
  // thorns that curled back and drove their own tips in: arcs of thorn, a puckered wound round each end
  const arcs = [
    [[-.075, chestY + .06, .15], [-.025, chestY + .035, .155], [0, .05, .04], .0075, [-.3, -.4, .8]],
    [[.09, chestY + .04, -.13], [.04, chestY - .03, -.15], [0, .035, -.06], .008, [.3, -.3, -.9]],
    [[-(shoulderX + .105), chestY - .1, .07], [-(shoulderX + .1), chestY - .15, .115], [-.05, .02, .04], .006, [-1, 0, .3]]
  ];
  for (const [a, b, lift, r, n] of arcs) {
    const e = embedded(a, b, lift, r); pl.shaft.push(...e.shaft); pl.tip.push(e.tip);
    wound(b, n, .022, .09, pl.wounds); wound(a, n, .012, 0, pl.wounds);
  }
  // two thorns torn out, leaving wounds that have not closed
  wound([.17, chestY - .02, .05], [1, .2, .3], .02, .06, pl.wounds);
  wound([-.06, chestY - .12, -.14], [0, 0, -1], .018, .07, pl.wounds);
  flush(body, pl, m);
  return body;
}
