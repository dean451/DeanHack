import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// The Valkyrie the player plays: a woman in blackened, riveted plate, after the user's reference
// photo (2026-10-24). A closed helm with a ridge, a narrow eye slit and a beak-shaped bevor, two tall
// swept-back steel wings at the temples, long crimson hair spilling from under it over the shoulders;
// a fitted breastplate with a centre ridge over a lamed plackart, a belt with a square buckle;
// layered pauldrons, mail at the upper arms and the inner elbows, elbow cops and vambraces; a plated
// skirt of tassets with a pointed chevron panel at the front over mail; cuisses, winged knee cops,
// greaves and sabatons with a buckled instep strap.
//
// knight() in main.js builds this on its rig (hero-kits.js shows it for the Valkyrie only). Pieces
// are merged into one mesh per rig part, material and role (helm, wing, hair, panel...), so the
// whole suit is a few dozen draws however many rivets it has. +z is her front; her sword arm is
// the rig's +x arm, so the long front lock of hair falls on the other side (-x), as in the photo.
//
// The numbers that place the suit on the body mirror knight(): legs pivot at (±.122, .49) with the
// thigh an ellipsoid (rx .067, ry .148, rz .074) centred .14 below, the knee at -.205, the shin
// r .056-.062 from -.19 to -.41, the foot an ellipsoid (.099, .067, .17) at (0, -.405, .074); the
// arms pivot at (±.3, .92); the head group sits at (0, 1.23, .02) with the face inside r ~.2.

// Her colours: blackened gunmetal plate (lighter at the edges), dark leather, worn steel rivets and
// buckles, plated gloves, and the one colour on her, deep crimson hair. knight() builds its shared
// materials from these; hero-kits.js gives every other class its own palette.
export const PALETTE = Object.freeze({armor: '#5b6268', armorLight: '#8b9399', leather: '#33261d', accent: '#8d887e', boots: '#16191b', glove: '#2c2f33', hairDark: '#5e1214', hairMid: '#8e1c1a', hairLight: '#b3302a'});

const V3 = (x, y, z) => new THREE.Vector3(x, y, z), V2 = (x, y) => new THREE.Vector2(x, y);
const lerpTable = (table, y) => { // table of [r, y] sorted by y
  if (y <= table[0][1]) return table[0][0];
  for (let i = 1; i < table.length; i++) if (y <= table[i][1]) { const [r0, y0] = table[i - 1], [r1, y1] = table[i]; return r0 + (r1 - r0) * (y - y0) / (y1 - y0); }
  return table[table.length - 1][0];
};

// ---- the torso: a lathe warped into a woman's breastplate ------------------------------------
export const TORSO = [[.094, .555], [.1, .6], [.108, .65], [.121, .71], [.137, .77], [.15, .83], [.158, .88], [.182, .92], [.2, .945], [.186, .972], [.146, .993], [.12, 1.0]];
const torsoDepth = (y, front) => { const t = THREE.MathUtils.smoothstep(y, .86, .945); return (front ? .8 : .74) * (1 - t) + .58 * t; };
// Moves a point on a circle round the body's axis onto the breastplate: deeper in front than behind,
// flatter at the shoulders, a bust and a raised centre ridge in front.
export function torsoWarp(x, y, z) {
  const front = z > 0, zz = z * torsoDepth(y, front);
  if (!front) return [x, y, zz];
  const r = Math.hypot(x, z) || 1, f = Math.pow(Math.max(0, z / r), 2);
  const bust = .05 * Math.exp(-(((Math.abs(x) - .064) / .05) ** 2) - (((y - .85) / .055) ** 2));
  const ridge = (y > .6 && y < .96 ? .007 : 0) * Math.exp(-((x / .022) ** 2));
  return [x * (1 + .08 * bust / .05 * f), y, zz + (bust + ridge) * f];
}
// The breastplate's surface at angle theta (0 is the front, +pi/2 is +x) and height y.
export function torsoSurface(theta, y, out = 0) {
  const r = lerpTable(TORSO, y) + out;
  const [x, , z] = torsoWarp(r * Math.sin(theta), y, r * Math.cos(theta));
  return V3(x, y, z);
}

// ---- the skirt: a mail bell under the tassets ----------------------------------------------------
export const BELL = [[.208, .352], [.207, .372], [.204, .39], [.192, .43], [.166, .48], [.134, .54], [.108, .6]];
const BELL_DEPTH = .82;
export function bellSurfaceZ(x, y, out = 0) { const r = lerpTable(BELL, y) + out; return BELL_DEPTH * Math.sqrt(Math.max(0, r * r - x * x)); }

// ---- the helm --------------------------------------------------------------------------------------
// Sized to a head, not to the rig's big face (which the closed helm hides): about a seventh of her height.
export const HELM = [[.116, -.152], [.121, -.136], [.129, -.1], [.138, -.055], [.144, -.01], [.146, .028], [.141, .07], [.127, .106], [.1, .134], [.058, .151], [.001, .157]];
export const HELM_TOP = .157;
const HELM_Z = 1.04;
// The lower front of the helm narrows into a pointed beak of a bevor over the nose, mouth and chin.
function helmWarp(x, y, z) {
  const r = Math.hypot(x, z) || 1, front = Math.max(0, z / r), below = THREE.MathUtils.smoothstep(-y, .014, .14);
  const w = below * front * front;
  const nx = x * (1 - .34 * w), nz = z * HELM_Z + .04 * w * Math.exp(-((x / .05) ** 2)) + .01 * below * front * Math.exp(-((x / .016) ** 2));
  return [nx, y, nz];
}

// ---- small geometry helpers ------------------------------------------------------------------------
function lathe(table, warp, segs = 32, phiStart = Math.PI, phiLength = Math.PI * 2) {
  const g = new THREE.LatheGeometry(table.map(([r, y]) => V2(Math.max(r, 1e-4), y)), segs, phiStart, phiLength);
  if (warp) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const [x, y, z] = warp(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, x, y, z); } }
  g.computeVertexNormals();
  return g;
}
// A tapering tube along points, flattened against `outward` (a function of the point), with a few
// grooves round it so a lock of hair reads as strands. r(u) runs from r0 at the root to r1 at the tip.
function taperTube(points, r0, r1, {segs = 18, radial = 7, flat = .6, groove = .16, outward = p => V3(p.x, 0, p.z)} = {}) {
  const curve = new THREE.CatmullRomCurve3(points), pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, p = curve.getPointAt(u), T = curve.getTangentAt(u), o = outward(p);
    let N = o.sub(T.clone().multiplyScalar(o.dot(T))); if (N.lengthSq() < 1e-8) N = V3(1, 0, 0); N.normalize();
    const B = T.clone().cross(N).normalize(), r = r0 + (r1 - r0) * Math.pow(u, .8);
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * Math.PI * 2, k = r * (1 + groove * Math.sin(a * 3 + u * 4));
      const q = p.clone().addScaledVector(N, Math.cos(a) * k * flat).addScaledVector(B, Math.sin(a) * k);
      pos.push(q.x, q.y, q.z); uv.push(j / radial, u);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const place = (geo, {p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], order = 'XYZ'} = {}) => geo.applyMatrix4(new THREE.Matrix4().compose(V3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r, order)), V3(...s)));
const flat = geo => { const g = geo.index ? geo.toNonIndexed() : geo; g.computeVertexNormals(); return g; };
// Mail is textured by its real size: u runs round the part in metres, v down it.
function mailUV(geo, cx = 0, cz = 0) {
  const p = geo.attributes.position, uv = [];
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) - cx, z = p.getZ(i) - cz, r = Math.hypot(x, z); uv.push(Math.atan2(x, z) * Math.max(r, .03), p.getY(i)); }
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return geo;
}

let mailTexture = null;
// Riveted rings in staggered rows, dark between: a 32px tile repeated about every 1.6 cm.
function mailMap() {
  if (mailTexture) return mailTexture;
  const n = 32, data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let best = 9;
    for (const [cx, cy] of [[8, 8], [24, 8], [0, 24], [16, 24], [32, 24], [8, 40], [24, 40], [8, -8], [24, -8]]) best = Math.min(best, Math.abs(Math.hypot(x - cx, y - cy) - 6.2));
    const v = best < 1.6 ? 200 - best * 40 : 46;
    data.set([v, v, v, 255], (y * n + x) * 4);
  }
  mailTexture = new THREE.DataTexture(data, n, n); mailTexture.wrapS = mailTexture.wrapT = THREE.RepeatWrapping; mailTexture.repeat.set(62, 62); mailTexture.needsUpdate = true;
  return mailTexture;
}

// A feather of sculpted steel along +y, its vane along -z (the trailing side, notched), thin in x.
function feather(len, width, bend, {broken = 0} = {}) {
  const L = len * (1 - broken), pts = [[0, 0], [-width * .42, len * .1], [-width * .52, len * .45]];
  for (let i = 0; i < 4; i++) { const v = .5 + i * .1; if (v * len > L) break; pts.push([-width * (.5 - i * .05), v * len], [-width * (.43 - i * .05), (v + .04) * len]); }
  if (broken) pts.push([-width * .3, L * .97], [-width * .12, L], [width * .05, L * .94]); else pts.push([-width * .14, len * .93], [0, len]);
  pts.push([width * .22, len * .7 * (1 - broken)], [width * .26, len * .3], [width * .12, len * .05]);
  const shape = new THREE.Shape(pts.map(([z, y]) => V2(z, y)));
  const geo = new THREE.ExtrudeGeometry(shape, {depth: .012, bevelEnabled: true, bevelThickness: .003, bevelSize: .003, bevelSegments: 1, curveSegments: 2});
  geo.translate(0, 0, -.006); geo.rotateY(-Math.PI / 2); // shape x -> z, extrusion -> x
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), u = y / len; p.setZ(i, p.getZ(i) - bend * u * u); p.setX(i, p.getX(i) + .012 * Math.sin(u * Math.PI)); }
  return flat(geo);
}

// The foot in the leg's frame (sole on the floor at y -.476, heel at z -.08, toe at z .225): a side
// profile extruded across and narrowed toward the toe. `sole` cuts the bottom strip for the sole.
const FOOT = [[-.082, -.476], [-.086, -.41], [-.068, -.362], [.0, -.35], [.06, -.372], [.13, -.41], [.2, -.444], [.226, -.462], [.222, -.476]];
const footWidth = z => .064 - .024 * THREE.MathUtils.clamp((z - .02) / .2, 0, 1);
const footTopY = z => { const top = FOOT.slice(2, 8); for (let i = 1; i < top.length; i++) if (z <= top[i][0]) { const [z0, y0] = top[i - 1], [z1, y1] = top[i]; return y0 + (y1 - y0) * (z - z0) / (z1 - z0); } return top[top.length - 1][1]; };
const footTop = y => 1 - .3 * THREE.MathUtils.clamp((y + .476) / .12, 0, 1);
function sabaton(sole = false) {
  const pts = sole ? [[-.084, -.476], [-.086, -.462], [.226, -.462], [.224, -.476]] : FOOT;
  const shape = new THREE.Shape(pts.map(([z, y]) => V2(z, y)));
  const g = new THREE.ExtrudeGeometry(shape, {depth: 1, bevelEnabled: false, steps: 1});
  g.translate(0, 0, -.5); g.rotateY(-Math.PI / 2); // shape x -> z, extrusion -> x
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const z = p.getZ(i), y = p.getY(i), w = footWidth(z) * (sole ? 1.04 : 1); p.setX(i, p.getX(i) * 2 * w * footTop(y)); }
  return flat(g);
}

// The buckets: one merged mesh per (rig part, material, role).
// With `keep`, each piece added under a tag is also kept unmerged (in its rig part's frame) for tests.
function collector(keep) {
  const buckets = new Map(), pieces = {};
  return {
    tag: null, pieces,
    add(anchor, mat, role, geo, untagged = false) {
      const key = `${anchor.uuid}|${mat.uuid}|${role}`;
      if (!buckets.has(key)) buckets.set(key, {anchor, mat, role, geos: []});
      const g = geo.index ? geo.toNonIndexed() : geo;
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      if (!g.attributes.normal) g.computeVertexNormals();
      buckets.get(key).geos.push(g);
      if (keep && this.tag && !untagged) (pieces[this.tag] ||= []).push({anchor, geometry: g.clone()});
    },
    finish() {
      const out = [];
      for (const {anchor, mat, role, geos} of buckets.values()) {
        const m = new THREE.Mesh(mergeGeometries(geos), mat); m.name = 'Valkyrie' + role; m.castShadow = true; m.userData.valkyrie = role;
        anchor.add(m); out.push(m); geos.forEach(g => g.dispose());
      }
      return out;
    },
  };
}

// rig: {body, head, arm, elbow, shieldArm, shieldElbow, legs:[left,right]}; mats: the rig's shared
// {armor, armorLight, leather, accent, boots, hairDark, hairMid, hairLight}. Returns every mesh it added
// (`objects`, for the kit to show or hide) and the named pieces tests look at.
export function buildValkyrie(rig, mats, {keep = false} = {}) {
  const C = collector(keep), tag = t => { C.tag = t; }, hairPaths = [];
  const mail = new THREE.MeshStandardMaterial({color: '#868b90', map: mailMap(), bumpMap: mailMap(), bumpScale: .6, metalness: .72, roughness: .58});
  const slit = new THREE.MeshStandardMaterial({color: '#030405', roughness: .9, metalness: 0});
  const eyes = new THREE.MeshStandardMaterial({color: '#2a2622', emissive: '#7a6a58', emissiveIntensity: .45, roughness: .5});
  const {armor, armorLight, leather, accent, hairDark, hairMid, hairLight} = mats;
  const rivet = (anchor, x, y, z, r = .0068) => C.add(anchor, accent, 'Rivets', place(new THREE.OctahedronGeometry(r, 0), {p: [x, y, z]}), true);
  const {body, head} = rig;

  // -- breastplate, gorget, plackart, belt
  tag('breastplate');
  C.add(body, armor, 'Plate', lathe(TORSO, torsoWarp, 40));
  // a dent and a scrape in the plate (worn, not factory clean): pressed in under the left breast
  const dent = place(new THREE.SphereGeometry(.018, 6, 4), {p: [.09, .8, 0], s: [1.4, .7, .4]}); dent.translate(0, 0, torsoSurface(.62, .8).z - .004); C.add(body, armorLight, 'Plate', dent);
  tag('gorget');
  // the gorget: three stepped rings round the neck (r .13 at .97 to .11 at 1.11, set .02 forward), up under the helm
  C.add(body, armorLight, 'Plate', lathe([[.153, .955], [.149, .983], [.141, 1.0]], (x, y, z) => [x, y, z * .95 + .006], 24));
  C.add(body, armor, 'Plate', lathe([[.137, .995], [.133, 1.022], [.128, 1.04]], (x, y, z) => [x, y, z * .96 + .012], 24));
  C.add(body, armorLight, 'Plate', lathe([[.133, 1.035], [.129, 1.06], [.125, 1.085]], (x, y, z) => [x, y, z * .98 + .013], 24));
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + .3; rivet(body, Math.sin(a) * .152, .97, Math.cos(a) * .152 * .95); }
  tag('plackart');
  for (let k = 0; k < 4; k++) { // the plackart: four lames over the belly, each overlapping the one below
    const yb = .625 + k * .037, yt = yb + .046;
    C.add(body, k % 2 ? armorLight : armor, 'Plate', lathe([[lerpTable(TORSO, yb) + .009, yb], [lerpTable(TORSO, yt) + .004, yt]], torsoWarp, 40));
    for (const th of [-.75, -.4, .4, .75]) { const s = torsoSurface(th, yb + .009, .011); rivet(body, s.x, s.y, s.z); }
  }
  tag('belt');
  C.add(body, leather, 'Belt', lathe([[lerpTable(TORSO, .585) + .011, .585], [lerpTable(TORSO, .627) + .009, .627]], torsoWarp, 40));
  tag('buckle');
  { // the square buckle: a frame, its tongue and the strap's end through the keeper
    const f = torsoSurface(0, .606, .016).z;
    for (const [w, h, x, y] of [[.046, .008, 0, .623], [.046, .008, 0, .589], [.008, .042, -.019, .606], [.008, .042, .019, .606]]) C.add(body, accent, 'Buckle', place(new THREE.BoxGeometry(w, h, .008), {p: [x, y, f]}));
    C.add(body, accent, 'Buckle', place(new THREE.BoxGeometry(.006, .03, .005), {p: [.004, .606, f + .002], r: [0, 0, .25]}));
    tag('beltEnd');
    C.add(body, leather, 'Belt', place(new THREE.BoxGeometry(.05, .03, .006), {p: [.05, .606, f - .004], r: [0, -.35, 0]}));
  }
  // breastplate rivets: along the neck edge and down each side
  for (const th of [-1.2, -.7, .7, 1.2]) for (const y of [.69, .78, .87]) { const s = torsoSurface(th, y, .002); rivet(body, s.x, s.y, s.z); }

  // -- pauldrons: a rounded cap on the shoulder, three lames on the upper arm under it
  for (const [arm, side] of [[rig.arm, 1], [rig.shieldArm, -1]]) {
    const cap = place(new THREE.SphereGeometry(.1, 10, 5, 0, Math.PI * 2, 0, Math.PI * .56), {p: [side * .3, .9, 0], r: [0, 0, -side * .55], s: [1.0, .9, 1.02]});
    if (side > 0) { const p = cap.attributes.position; for (let i = 0; i < p.count; i++) { const d = Math.hypot(p.getX(i) - .36, p.getY(i) - .975, p.getZ(i) - .05); if (d < .03) p.setZ(i, p.getZ(i) - (.03 - d) * .25); } } // a dent in the right cap
    tag('pauldronCap'); C.add(body, armor, 'Pauldron', flat(cap)); // faceted, not a ball
    // a raised roll along the top of the cap, front to back
    C.add(body, armorLight, 'Pauldron', place(new THREE.TorusGeometry(.094, .007, 4, 16, Math.PI), {p: [side * .3, .9, 0], r: [0, Math.PI / 2, -side * .55], order: 'ZYX'}));
    for (let i = 0; i < 7; i++) { const a = (i / 6 - .5) * 2.4; rivet(body, side * (.3 + .1 * Math.cos(.55) * Math.cos(a)) + side * .012, .9 - .1 * Math.sin(.55) * Math.cos(a) - .006, .1 * Math.sin(a), .0075); } // round the cap's lower rim
    tag('pauldronLame');
    for (let k = 0; k < 3; k++) {
      const y = -.03 - k * .042, rt = .08 - k * .006, rb = .09 - k * .006, th0 = side > 0 ? Math.PI / 2 - 1.7 : -Math.PI / 2 - 1.7;
      const lame = place(new THREE.CylinderGeometry(rt, rb, .052, 18, 1, true, th0, 3.4), {p: [side * .008, y, 0], r: [0, 0, side * .16]});
      C.add(arm, k % 2 ? armorLight : armor, 'Pauldron', lame);
      for (let j = 0; j < 5; j++) { const a = th0 + .35 + j * .675; rivet(arm, side * .008 + Math.sin(a) * (rb + .002) * .99, y - .018, Math.cos(a) * (rb + .002)); }
    }
    // mail on the upper arm below the lames, round the whole arm
    tag('mailSleeve'); C.add(arm, mail, 'Mail', mailUV(place(new THREE.CylinderGeometry(.063, .056, .2, 14, 1, true), {p: [0, -.14, 0]})));
  }

  // -- elbows and forearms: mail at the joint (it shows at the inner elbow), a cop with a fan wing
  // behind, and a riveted vambrace over the forearm
  for (const [elbow, side] of [[rig.elbow, 1], [rig.shieldElbow, -1]]) {
    tag('elbowMail'); C.add(elbow, mail, 'Mail', mailUV(new THREE.SphereGeometry(.067, 12, 8)));
    const cop = place(new THREE.SphereGeometry(.06, 9, 5, 0, Math.PI * 2, 0, Math.PI * .45), {p: [0, .008, -.028], r: [-Math.PI / 2 + .25, 0, 0], s: [1.05, 1, 1.15]});
    tag('elbowCop'); C.add(elbow, armorLight, 'Plate', flat(cop));
    const fan = new THREE.Shape([V2(0, 0), V2(.035, -.03), V2(.05, 0), V2(.04, .035), V2(0, .05), V2(-.03, .03)]);
    const wing = new THREE.ExtrudeGeometry(fan, {depth: .007, bevelEnabled: false}); wing.rotateY(side * Math.PI / 2); place(wing, {p: [side * .056, -.004, -.034], r: [0, side * .2, 0]});
    C.add(elbow, armor, 'Plate', flat(wing)); rivet(elbow, side * .064, .0, -.03);
    tag('vambrace'); C.add(elbow, armor, 'Plate', lathe([[.047, -.215], [.05, -.19], [.057, -.11], [.059, -.05], [.064, -.03]], (x, y, z) => [x, y, z + (z > 0 ? .006 * Math.exp(-((x / .015) ** 2)) : 0)], 18));
    for (const y of [-.205, -.04]) { C.add(elbow, armorLight, 'Plate', place(new THREE.TorusGeometry(y < -.1 ? .049 : .063, .005, 4, 18), {p: [0, y, 0], r: [Math.PI / 2, 0, 0]})); for (let j = 0; j < 6; j++) { const a = j / 6 * Math.PI * 2; rivet(elbow, Math.sin(a) * (y < -.1 ? .052 : .066), y + .012, Math.cos(a) * (y < -.1 ? .052 : .066)); } }
  }

  // -- legs: cuisse, winged knee cop with lames above and below, greave, sabaton and instep strap
  for (const leg of rig.legs) {
    const side = Math.sign(leg.position.x) || 1;
    const thigh = y => .074 * Math.sqrt(Math.max(0, 1 - ((y + .14) / .148) ** 2));
    const cuisse = []; for (let i = 0; i <= 6; i++) { const y = -.035 - i * .027; cuisse.push([thigh(y) + .009, y]); }
    tag('cuisse'); C.add(leg, armor, 'Plate', lathe(cuisse.reverse(), (x, y, z) => [x * .93, y, z + (z > 0 ? .007 * Math.exp(-((x / .018) ** 2)) : 0)], 20));
    for (const a of [-.9, -.3, .3, .9]) rivet(leg, Math.sin(a) * (thigh(-.05) + .011) * .93, -.05, Math.cos(a) * (thigh(-.05) + .011));
    tag('kneeMail'); C.add(leg, mail, 'Mail', mailUV(place(new THREE.CylinderGeometry(.068, .066, .07, 14, 1, true), {p: [0, -.215, 0]})));
    tag('kneeCop'); C.add(leg, armorLight, 'Plate', place(new THREE.SphereGeometry(.05, 9, 6, 0, Math.PI * 2, 0, Math.PI * .5), {p: [0, -.212, .044], r: [Math.PI / 2, 0, 0], s: [1.08, 1.0, .8]}));
    rivet(leg, 0, -.212, .088, .008);
    for (const [y, r] of [[-.178, .078], [-.246, .074]]) C.add(leg, armor, 'Plate', place(new THREE.CylinderGeometry(r - .004, r, .024, 16, 1, true, -1.35, 2.7), {p: [0, y, .004]}));
    const fan = new THREE.Shape([V2(0, -.03), V2(.03, -.02), V2(.042, .01), V2(.022, .034), V2(-.004, .03), V2(-.016, .0)]);
    const kneeWing = new THREE.ExtrudeGeometry(fan, {depth: .007, bevelEnabled: false}); kneeWing.rotateY(side * Math.PI / 2); place(kneeWing, {p: [side * .066, -.212, .012], r: [0, side * .15, 0]});
    C.add(leg, armorLight, 'Plate', flat(kneeWing)); rivet(leg, side * .074, -.21, .02);
    tag('greave'); C.add(leg, armor, 'Plate', lathe([[.068, -.362], [.068, -.34], [.069, -.3], [.067, -.262], [.066, -.248]], (x, y, z) => [x, y, z * 1.04 + (z > 0 ? .008 * Math.exp(-((x / .016) ** 2)) : 0)], 20));
    C.add(leg, armorLight, 'Plate', place(new THREE.TorusGeometry(.067, .005, 4, 20), {p: [0, -.36, 0], r: [Math.PI / 2, 0, 0], s: [1, 1.04, 1]}));
    for (const a of [-.8, .8, Math.PI]) rivet(leg, Math.sin(a) * .073, -.27, Math.cos(a) * .073 * 1.04);
    // sabaton: an angular steel foot (it replaces the rig's round boot) narrowing to a blunt toe,
    // stepped lames across the top, a dark sole, and the buckled strap across the instep
    tag('sabaton'); C.add(leg, armor, 'Plate', sabaton());
    C.add(leg, mats.boots || leather, 'Belt', sabaton(true));
    for (const z of [.07, .115, .16]) { const y = footTopY(z), tilt = Math.atan2(footTopY(z - .01) - footTopY(z + .01), .02); C.add(leg, armorLight, 'Plate', place(new THREE.BoxGeometry(1, .008, .012), {p: [0, y + .002, z], r: [tilt, 0, 0], s: [footWidth(z) * 2 * footTop(y) + .004, 1, 1]})); }
    tag('instepStrap'); const strap = []; for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI; strap.push(V3(Math.cos(a) * .058, -.472 + Math.sin(a) * .108, .028)); }
    C.add(leg, leather, 'Belt', taperTube(strap, .008, .008, {flat: .5, groove: 0, radial: 5, outward: p => V3(p.x, p.y + .44, 0)}));
    C.add(leg, accent, 'Buckle', place(new THREE.BoxGeometry(.006, .024, .02), {p: [side * .058, -.43, .028]}));
  }

  // -- skirt: mail all round, tassets on each thigh and a culet behind, a pointed chevron panel in front
  tag('mailSkirt'); C.add(body, mail, 'Mail', mailUV(lathe(BELL, (x, y, z) => [x, y, z * BELL_DEPTH], 36)));
  tag('tasset');
  const tasset = (phiStart, phiLength) => { for (let k = 0; k < 4; k++) {
    const yt = .595 - k * .052, yb = yt - .068, o = .009 + k * .003;
    C.add(body, k % 2 ? armorLight : armor, 'Tasset', lathe([[lerpTable(BELL, yb) + o + .004, yb], [lerpTable(BELL, yt) + o, yt]], (x, y, z) => [x, y, z * BELL_DEPTH], 12, phiStart, phiLength));
    for (let j = 0; j < 3; j++) { const a = phiStart + phiLength * (j + .5) / 3, r = lerpTable(BELL, yb + .01) + o + .006; rivet(body, Math.sin(a) * r, yb + .01, Math.cos(a) * r * BELL_DEPTH); }
  } };
  tasset(.4, 1.12); tasset(-1.52, 1.12); tasset(1.72, Math.PI * 2 - 3.44);
  const chevrons = [];
  for (let k = 0; k < 5; k++) { // V-shaped lames, each narrower, down to a point
    const yt = .585 - k * .042, w = .085 - k * .012, d = .022, h = .034;
    const shape = k < 4 ? new THREE.Shape([V2(-w, yt), V2(0, yt - d), V2(w, yt), V2(w, yt - h), V2(0, yt - d - h), V2(-w, yt - h)]) : new THREE.Shape([V2(-w, yt), V2(0, yt - d), V2(w, yt), V2(0, yt - d - .055)]);
    const g = new THREE.ExtrudeGeometry(shape, {depth: .008, bevelEnabled: false});
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, p.getZ(i) + bellSurfaceZ(x, y, .016 + k * .002)); }
    chevrons.push(flat(g));
    C.add(body, accent, 'Rivets', place(new THREE.OctahedronGeometry(.0068, 0), {p: [0, yt - d - h * .5, bellSurfaceZ(0, yt - d - h * .5, .028)]}));
  }
  tag('chevron'); for (const g of chevrons) C.add(body, armorLight, 'SkirtPanel', g);

  // -- the helm: a closed shell with a beak bevor, a raised ridge front to back, a brow over a narrow
  // eye slit, riveted rim; the eyes a faint glint in the dark of the slit
  tag('helmShell'); C.add(head, armor, 'Helm', lathe(HELM, helmWarp, 28));
  tag('helmDetail');
  {
    const outline = []; // the ridge: a fin along the top of the shell from the brow to the nape
    for (let i = 0; i <= 20; i++) { const t = i / 20, y = .04 + Math.sin(t * Math.PI) * .117, front = t < .5, r = lerpTable(HELM, y), z = (front ? 1 : -1) * r * (front ? HELM_Z : 1); outline.push([z, y]); }
    const inner = outline.map(([z, y]) => [z * .92, y - .01]), outer = outline.map(([z, y], i) => { const k = .013 * Math.sin(i / 20 * Math.PI) + .004; const n = Math.hypot(z, y) || 1; return [z + z / n * k, y + y / n * k]; });
    const shape = new THREE.Shape([...outer.map(([z, y]) => V2(z, y)), ...inner.reverse().map(([z, y]) => V2(z, y))]);
    const g = new THREE.ExtrudeGeometry(shape, {depth: .016, bevelEnabled: false}); g.translate(0, 0, -.008); g.rotateY(-Math.PI / 2);
    C.add(head, armorLight, 'Helm', flat(g));
  }
  const slitY = .006, slitR = lerpTable(HELM, slitY) * HELM_Z;
  C.add(head, slit, 'Slit', place(new THREE.CylinderGeometry(slitR + .004, slitR + .004, .024, 18, 1, true, -.95, 1.9), {p: [0, slitY, 0], s: [1 / HELM_Z, 1, 1]}));
  C.add(head, armorLight, 'Helm', place(new THREE.CylinderGeometry(slitR + .02, slitR + .008, .024, 20, 1, true, -1.15, 2.3), {p: [0, slitY + .024, 0], s: [1 / HELM_Z, 1, 1]})); // the brow over the slit
  C.add(head, armorLight, 'Helm', place(new THREE.CylinderGeometry(slitR + .007, slitR + .009, .01, 20, 1, true, -1.05, 2.1), {p: [0, slitY - .017, 0], s: [1 / HELM_Z, 1, 1]})); // its lower lip
  for (const x of [-.042, .042]) C.add(head, eyes, 'Eyes', place(new THREE.SphereGeometry(.0075, 6, 4), {p: [x, slitY, Math.sqrt(slitR * slitR - x * x) + .004], s: [1.5, .6, .5]}));
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = lerpTable(HELM, -.136) + .003; const [x, , z] = helmWarp(Math.sin(a) * r, -.136, Math.cos(a) * r); rivet(head, x, -.136, z); }
  for (let i = 0; i < 7; i++) { const a = -1.0 + i / 6 * 2.0, r = slitR + .014; rivet(head, Math.sin(a) * r / HELM_Z, slitY + .036, Math.cos(a) * r); }
  for (const x of [-.02, .02]) for (const y of [-.05, -.095]) { const r = lerpTable(HELM, y); const [hx, , hz] = helmWarp(x * 1.4, y, Math.sqrt(Math.max(0, r * r - x * x * 1.96))); rivet(head, hx, y, hz + .003); }
  rivet(head, 0, HELM_TOP, 0, .009);

  // -- the wings: a crescent of steel feathers on each side. The leading edge rises from the temple
  // and curves up and back; the feathers hang back off it, longest at the top, so the trailing edge
  // is hollow like a crescent moon and the tips stand well above the helm. Each wing is swept back
  // and splayed out so it reads from the front and from above. The left wing has a feather snapped.
  tag('wing');
  for (const side of [-1, 1]) {
    const E = t => V3(0, .3 * t, -.13 * t * t), root = [side * .138, .04, -.005];
    const pose = geo => place(geo, {p: root, r: [0, -side * .8, -side * .08], order: 'YZX'}); // swept out behind at about 45 degrees, its face turned to the front and up to the game camera
    const at = (geo, t, beta, dx = 0) => { place(geo, {r: [-beta, 0, 0]}); const e = E(t); geo.translate(e.x + side * dx, e.y, e.z); return pose(geo); };
    for (let i = 0; i < 10; i++) { const u = i / 9; C.add(head, armor, 'Wing', at(feather(.13 + .18 * Math.pow(u, 1.2), .11, .05, {broken: side < 0 && i === 5 ? .4 : 0}), .04 + u * .96, 1.5 - u * .9)); }
    for (let i = 0; i < 5; i++) { const u = i / 4; C.add(head, armor, 'Wing', at(feather(.1 + .03 * u, .08, .02), .08 + u * .78, 1.25 - u * .75, .011)); }
    const edge = []; for (let i = 0; i <= 8; i++) edge.push(E(i / 8 * 1.04));
    C.add(head, armorLight, 'Wing', pose(taperTube(edge, .017, .006, {flat: .7, groove: 0, radial: 6, outward: () => V3(0, 0, 1)})));
    // the boss where the wing meets the helm
    C.add(head, armor, 'Wing', place(new THREE.CylinderGeometry(.024, .028, .016, 8), {p: [side * .143, .045, .0], r: [0, 0, Math.PI / 2]}));
    rivet(head, side * .152, .045, .0, .009);
  }

  // -- the hair: long crimson locks from under the helm, down the back and over her shoulders; one
  // lock falls in front over the right shoulder onto the chest
  // The hair rides the body, not the head, so a nod cannot swing it through the breastplate; it
  // starts inside the helm's skirt, between the neck and the rim.
  tag('hair');
  const hairLock = (pts, r0, r1, mat, o) => { hairPaths.push({points: pts.map(p => p.clone()), r0}); C.add(body, mat, 'Hair', taperTube(pts, r0, r1, o)); };
  const hairOut = p => V3(p.x, 0, p.z + .01);
  const backLock = (theta, tipY, r0, mat) => {
    const pts = [], start = V3(Math.sin(theta) * .095, 1.11, Math.cos(theta) * .1 + .02);
    pts.push(start, V3(Math.sin(theta) * .14, 1.035, Math.cos(theta) * .15 + .02), V3(Math.sin(theta) * .17, .99, Math.cos(theta) * .16));
    for (const y of [.92, .84, tipY]) { if (y < tipY) break; const s = torsoSurface(theta, y, 0); const n = V3(s.x, 0, s.z).normalize(); pts.push(s.clone().addScaledVector(n, r0 * .7 + .006)); }
    if (pts[pts.length - 1].y > tipY + .01) { const s = torsoSurface(theta, tipY, 0); const n = V3(s.x, 0, s.z).normalize(); pts.push(s.clone().addScaledVector(n, r0 * .4 + .005)); }
    hairLock(pts, r0, .006, mat, {outward: hairOut});
  };
  [[Math.PI - .78, .82, .036], [Math.PI - .46, .76, .042], [Math.PI - .15, .71, .046], [Math.PI + .17, .73, .044], [Math.PI + .48, .78, .04], [Math.PI + .8, .84, .034]].forEach(([th, tip, r], i) => backLock(th, tip, r, i % 2 ? hairDark : hairMid));
  for (const [th, tip] of [[Math.PI - 1.15, .86], [Math.PI + 1.15, .88], [Math.PI, .7]]) backLock(th, tip, .018, hairLight);
  { // the front lock, over the right shoulder (the rig's -x side) and down onto the breast
    const pts = [V3(-.07, 1.11, .05), V3(-.13, 1.04, .08)];
    for (const [th, y, o] of [[-.6, .96, .04], [-.46, .9, .04], [-.38, .83, .034], [-.34, .77, .02]]) { const s = torsoSurface(th, y, 0); const n = V3(s.x * .5, 0, s.z).normalize(); pts.push(s.addScaledVector(n, o)); }
    hairLock(pts, .046, .008, hairMid, {outward: p => V3(p.x * .4, 0, 1)});
    const second = pts.map((p, i) => p.clone().add(V3(-.03 - i * .006, -.01, -.012 * i)));
    hairLock(second.slice(0, 5), .036, .008, hairDark, {outward: p => V3(p.x * .4, 0, 1)});
    const thin = pts.map((p, i) => p.clone().add(V3(.016, .004, i ? .012 : .0)));
    hairLock(thin.slice(0, 5), .013, .004, hairLight, {outward: p => V3(p.x * .4, 0, 1)});
    const side = [V3(-.09, 1.11, -.02), V3(-.15, 1.03, -.02), ...[[-1.55, .93], [-1.5, .86]].map(([th, y]) => { const s = torsoSurface(th, y, 0); return s.addScaledVector(V3(s.x, 0, s.z).normalize(), .03); })];
    hairLock(side, .026, .006, hairDark, {outward: hairOut});
  }
  { // the left side: a shorter lock behind the pauldron
    const side = [V3(.09, 1.11, -.02), V3(.15, 1.03, -.04), ...[[1.75, .93], [1.75, .87]].map(([th, y]) => { const s = torsoSurface(th, y, 0); return s.addScaledVector(V3(s.x, 0, s.z).normalize(), .028); })];
    hairLock(side, .026, .006, hairMid, {outward: hairOut});
  }

  const objects = C.finish();
  const byRole = role => objects.filter(o => o.userData.valkyrie === role);
  return {objects, helm: byRole('Helm').find(o => o.material === armor), wings: byRole('Wing'), hair: byRole('Hair'), panel: byRole('SkirtPanel')[0], byRole, hairPaths, pieces: C.pieces, materials: {mail, slit, eyes}};
}
