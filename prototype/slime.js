import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The slimes were the shared Kirby blob with three hooked tubes. This is the family's own body, one kind at a
// time. Blue slime first (an UnNetHack addition): the cold one. Where the blue jelly is a deep, faceted mass
// that froze what it caught, the slime is a pale, wet heap that is freezing as it crawls:
// - the skin: a tall, lopsided heap with a slumped lobe, glossy and smooth where it is still alive, pale
//   cyan-white where the cold has taken it, dark teal in the folds. No glow: it is lit by what is round it;
// - inside: a dark clotted core, a half-frozen bone and bubbles caught mid-rise, one opaque draw;
// - the crust: cracked sheets of ice laid over its back and rim, hanging icicles and one frozen drip that
//   has reached the floor, flat-shaded;
// - the runners: five wet tongues creeping out over the floor, tapered, their tips gone white, on a skin of
//   slick that is freezing at its edge;
// - the mist: a low cold fog that clings to the floor round it.
// Five draws. Handles: body (quirk 'blob').
const hash = n => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
const bare = geo => { geo.deleteAttribute('uv'); return geo.index ? geo.toNonIndexed() : geo; };
const R = .3, H = .2, Y = .1;
const PALETTES = {
  green: {deep: '#142108', mid: '#4a7f26', crown: '#a6d94a', glow: '#c4f25a', vein: '#0b1505', clot: '#0c1406', bone: '#cdc5a6', flesh: '#a8977a', rot: '#5d6b2e', scab: '#1a2410', tip: '#d8f77a'},
  blue: {deep: '#12343f', mid: '#2c6f86', crown: '#b6e3ee', rime: '#e4f6fb', vein: '#0a1d26', core: '#0a1a22', bone: '#cfd3c4', ice: '#cfeaf4', iceDark: '#7db0c4', mist: '#9cc6d6'},
};

const paint = (geo, fn) => {
  const p = geo.attributes.position, c = new Float32Array(p.count * 3), o = new THREE.Color();
  for (let i = 0; i < p.count; i++) { fn(p.getX(i), p.getY(i), p.getZ(i), o); o.toArray(c, i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
};
const reach = a => R * (1 + .2 * Math.sin(a * 2 + .4) + .1 * Math.sin(a * 3 - 1.3) + .06 * Math.sin(a * 6 + 2) + .03 * Math.sin(a * 11));
// the frozen patch: the cold has the side of the heap facing +x/-z
const frozen = (x, z) => THREE.MathUtils.clamp((x * .8 - z * .6) / R * 1.2 + .35 + .25 * Math.sin(x * 40 + z * 17), 0, 1);

export function createSlime({kind = 'blue'} = {}) {
  if (kind === 'green') return createGreenSlime();
  const C = PALETTES[kind] || PALETTES.blue, col = Object.fromEntries(Object.entries(C).map(([k, v]) => [k, new THREE.Color(v)]));
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const add = (geo, mat, name, parent = body) => { const m = new THREE.Mesh(geo, mat); m.userData.part = name; m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };

  // skin: a sphere heaped up on one side, the base cut level, slumped folds down the flanks
  const skinG = new THREE.SphereGeometry(1, 34, 22), sp = skinG.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i), y = sp.getY(i), z = sp.getZ(i), a = Math.atan2(z, x), r = reach(a), rr = Math.hypot(x, z);
    const fold = 1 + .06 * Math.sin(a * 7 + y * 5) * (y > 0 ? 1 : .3) + .035 * Math.sin(y * 14 + a * 3);
    const wx = x * r * fold, wz = z * r * fold;
    const heap = 1 + .55 * Math.max(0, 1 - Math.hypot(wx + .06, wz - .05) / .17); // the raised hump, off-centre
    sp.setXYZ(i, wx, y > 0 ? y * H * heap * (1 - .3 * rr * rr) : y * Y * .95, wz);
  }
  skinG.computeVertexNormals();
  paint(skinG, (x, y, z, o) => {
    const up = THREE.MathUtils.clamp(y / (H * 1.3), 0, 1), f = frozen(x, z), fold = Math.max(0, Math.sin(x * 33 + z * 19) * Math.sin(z * 27 - x * 15));
    o.copy(col.mid).lerp(col.deep, THREE.MathUtils.clamp(.5 - up, 0, 1) * 1.3).lerp(col.vein, fold * .35).lerp(col.crown, f * (.4 + up * .5)).lerp(col.rime, Math.max(0, f - .7) * 1.6);
  });
  const skin = add(skinG, new THREE.MeshPhysicalMaterial({vertexColors: true, roughness: .12, clearcoat: 1, clearcoatRoughness: .1, transparent: true, opacity: .82, emissiveIntensity: 0, side: THREE.DoubleSide}), 'skin');
  skin.position.y = Y;

  // inside: clotted core, a half-frozen bone, bubbles caught mid-rise
  const inside = [];
  const core = bare(new THREE.IcosahedronGeometry(.07, 1)); core.scale(1.2, .8, 1); core.translate(-.04, Y + .045, .03);
  paint(core, (x, y, z, o) => o.copy(col.core).lerp(col.mid, hash(Math.round(x * 90) + Math.round(z * 90) * 5) * .3));
  inside.push(core);
  const bone = bare(new THREE.CylinderGeometry(.009, .014, .2, 5)); bone.rotateZ(1.2); bone.rotateY(.5); bone.translate(.04, Y + .07, -.02);
  paint(bone, (x, y, z, o) => o.copy(col.bone).lerp(col.iceDark, .5));
  inside.push(bone);
  for (let i = 0; i < 7; i++) {
    const a = i * 2.1, r = .04 + hash(i * 11) * .16, b = bare(new THREE.SphereGeometry(.007 + hash(i * 2) * .008, 6, 5));
    b.translate(Math.cos(a) * r, Y + .015 + hash(i * 13) * .1, Math.sin(a) * r); paint(b, (x, y, z, o) => o.copy(col.rime));
    inside.push(b);
  }
  add(mergeGeometries(inside), new THREE.MeshStandardMaterial({vertexColors: true, roughness: .5}), 'inside');

  // the crust: sheets of ice cracked over the frozen flank, icicles off the rim, one drip frozen to the floor
  const crust = [];
  for (let i = 0; i < 8; i++) {
    const a = -.9 + i * .55, r = R * (.3 + hash(i * 4) * .5), x = Math.cos(a) * r, z = Math.sin(a) * r;
    const y = Y + H * Math.max(.1, 1 - (r / R) ** 2) * (1 + .3 * Math.max(0, 1 - Math.hypot(x + .06, z - .05) / .17)) * .93;
    const plate = bare(new THREE.CylinderGeometry(.025 + hash(i * 6) * .04, .04 + hash(i * 9) * .03, .012, 4 + (i % 3), 1));
    plate.rotateY(hash(i) * 3); plate.rotateX((hash(i * 2) - .5) * .7); plate.rotateZ((hash(i * 3) - .5) * .7); plate.translate(x, y, z);
    paint(plate, (px, py, pz, o) => o.copy(col.ice).lerp(col.iceDark, hash(i * 17 + Math.round(py * 500)) * .6));
    crust.push(plate);
  }
  for (let i = 0; i < 8; i++) {
    const a = i * .8 + .2, len = .04 + hash(i * 3) * .07, rr = reach(a) * .95, ic = bare(new THREE.ConeGeometry(.012 + hash(i) * .01, len, 4)); ic.rotateX(Math.PI);
    ic.translate(Math.cos(a) * rr, Y - .005 - len / 2, Math.sin(a) * rr);
    paint(ic, (x, y, z, o) => o.copy(col.rime).lerp(col.iceDark, THREE.MathUtils.clamp((.1 - y) * 4, 0, 1) * .5));
    crust.push(ic);
  }
  const drip = bare(new THREE.CylinderGeometry(.01, .022, Y, 5)); const da = 5.2, dr = reach(da) * .9;
  drip.translate(Math.cos(da) * dr, Y * .5, Math.sin(da) * dr); paint(drip, (x, y, z, o) => o.copy(col.ice).lerp(col.mid, .35));
  crust.push(drip);
  add(mergeGeometries(crust), new THREE.MeshStandardMaterial({vertexColors: true, roughness: .25, flatShading: true}), 'crust');

  // the runners: wet tongues over the floor, tapered, tips gone white, and a slick that is freezing at its edge
  const runners = [];
  [[.2, .9, .22], [1.7, .8, .2], [2.9, 1.1, .17], [4.0, .7, .2], [5.3, 1.0, .23]].forEach(([a, bend, len], k) => {
    const p0 = new THREE.Vector3(Math.cos(a) * R * .75, .02, Math.sin(a) * R * .75), a2 = a + .35 * (bend - .9);
    const path = new THREE.CatmullRomCurve3([p0, new THREE.Vector3(Math.cos(a2) * (R * .75 + len * .5), .018, Math.sin(a2) * (R * .75 + len * .5)), new THREE.Vector3(Math.cos(a + bend * .5) * (R * .75 + len), .01, Math.sin(a + bend * .5) * (R * .75 + len))]);
    let tg = new THREE.TubeGeometry(path, 10, .04, 6, false), tp = tg.attributes.position;
    for (let i = 0; i < tp.count; i++) { const u = Math.floor(i / 7) / 10, c = path.getPoint(u), t = 1 - u * .8; tp.setXYZ(i, c.x + (tp.getX(i) - c.x) * t, c.y + (tp.getY(i) - c.y) * t * .5, c.z + (tp.getZ(i) - c.z) * t); }
    tg.computeVertexNormals();
    tg = bare(tg);
    paint(tg, (x, y, z, o) => { const u = THREE.MathUtils.clamp((Math.hypot(x, z) - R * .75) / len, 0, 1); o.copy(col.mid).lerp(col.deep, .3).lerp(col.rime, Math.max(0, u - .55) * 2.2); });
    runners.push(tg);
  });
  const slick = bare(new THREE.CircleGeometry(1, 40)), fp = slick.attributes.position;
  for (let v = 0; v < fp.count; v++) { const x = fp.getX(v), y = fp.getY(v), a = Math.atan2(y, x), j = 1 + .25 * Math.sin(a * 3 + 1) + .15 * Math.sin(a * 5) + .07 * Math.sin(a * 9); fp.setXYZ(v, x * j * R * 1.1, y * j * R * 1.05, 0); }
  slick.rotateX(-Math.PI / 2); slick.translate(0, .004, 0);
  paint(slick, (x, y, z, o) => o.copy(col.deep).lerp(col.rime, THREE.MathUtils.clamp((Math.hypot(x, z) / (R * 1.1) - .75) * 2.5, 0, 1) * .3));
  runners.push(slick);
  add(mergeGeometries(runners), new THREE.MeshStandardMaterial({vertexColors: true, roughness: .2, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1}), 'runners', g);

  // the mist: cold fog lying on the floor
  const mist = new THREE.CircleGeometry(.46, 24); mist.rotateX(-Math.PI / 2); mist.translate(.01, .02, 0);
  const mm = add(mist, new THREE.MeshBasicMaterial({color: col.mist, transparent: true, opacity: .2, depthWrite: false}), 'mist', g);
  mm.castShadow = false; mm.receiveShadow = false;
  return {g, body};
}

// Green slime: the one that turns you into slime. A tall, sagging mass that is climbing something, its tip
// hooked over, lit from inside by a sick green core, with a half-slimed victim still in it (a skull in the
// belly, a hand clawing out of the flank), tendrils reaching and hooked, drips hanging, and a wide slick
// with runners creeping out across the floor. Thirteen draws; handles: body (quirk 'blob').
const GH = .5, GR = .27;
const fold = (a, t) => 1 + .07 * Math.sin(a * 7 + t * 3) * (1 - t * .6) + .03 * Math.sin(a * 13);
// a point on the skin at angle a and height fraction t (0 floor, 1 tip), r pushes it out
const surf = (a, t, push = 0) => {
  const u = Math.sqrt(Math.max(0, 1 - t * t)), r = (Math.pow(u, .8) * GR * (1 - .5 * t) * reach(a) / R * fold(a, t)) + push;
  return new THREE.Vector3(Math.cos(a) * r + .09 * t * t + .17 * t ** 4, t * GH, Math.sin(a) * r - .05 * t * t);
};
const taper = (path, rad, seg, end) => {
  let tg = new THREE.TubeGeometry(path, seg, rad, 6, false); const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) { const u = Math.floor(i / 7) / seg, c = path.getPoint(u), t = 1 - u * (end ?? .85); tp.setXYZ(i, c.x + (tp.getX(i) - c.x) * t, c.y + (tp.getY(i) - c.y) * t, c.z + (tp.getZ(i) - c.z) * t); }
  tg.computeVertexNormals(); return bare(tg);
};
function createGreenSlime() {
  const C = PALETTES.green, col = Object.fromEntries(Object.entries(C).map(([k, v]) => [k, new THREE.Color(v)]));
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const add = (geo, mat, name, parent = body) => { const m = new THREE.Mesh(geo, mat); m.userData.part = name; m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const glowMat = (o = {}) => new THREE.MeshStandardMaterial({vertexColors: true, roughness: .2, emissive: col.mid, emissiveIntensity: .35, ...o});

  // skin: a tall tapering heap, slumped folds down its flanks, the tip hooked over toward +x
  const skinG = new THREE.SphereGeometry(1, 40, 30), sp = skinG.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const y = sp.getY(i), p = surf(Math.atan2(sp.getZ(i), sp.getX(i)), Math.max(0, y));
    sp.setXYZ(i, p.x, p.y, p.z);
  }
  skinG.computeVertexNormals();
  paint(skinG, (x, y, z, o) => {
    const up = THREE.MathUtils.clamp(y / GH, 0, 1), fl = Math.max(0, Math.sin(x * 31 + z * 17 + y * 9) * Math.sin(z * 23 - x * 13));
    o.copy(col.deep).lerp(col.mid, THREE.MathUtils.clamp(.35 + up * 1.1, 0, 1)).lerp(col.vein, fl * .3).lerp(col.crown, Math.pow(up, 2.2) * .55);
  });
  const skin = add(skinG, new THREE.MeshPhysicalMaterial({vertexColors: true, roughness: .1, clearcoat: 1, clearcoatRoughness: .08, transparent: true, opacity: .6, emissive: col.mid, emissiveIntensity: .5, side: THREE.DoubleSide}), 'skin');
  skin.position.y = .02;

  // the core: a sick light deep in the mass, ringed with dark clots
  const core = bare(new THREE.IcosahedronGeometry(.05, 1)); core.scale(1, 1.6, 1); core.translate(.02, .2, -.04);
  paint(core, (x, y, z, o) => o.copy(col.glow).lerp(col.crown, hash(Math.round(x * 80) + Math.round(y * 60) * 7) * .3));
  add(core, new THREE.MeshStandardMaterial({vertexColors: true, roughness: .4, emissive: col.glow, emissiveIntensity: .95, flatShading: true}), 'core');
  const clots = [];
  for (let i = 0; i < 6; i++) {
    const a = i * 1.1 + .3, c = bare(new THREE.IcosahedronGeometry(.02 + hash(i * 5) * .02, 0)); c.scale(1, .7 + hash(i), 1);
    c.translate(Math.cos(a) * (.08 + hash(i * 3) * .05), .06 + hash(i * 7) * .26, Math.sin(a) * (.08 + hash(i * 3) * .05) + .02);
    paint(c, (x, y, z, o) => o.copy(col.clot).lerp(col.rot, hash(i * 9) * .3)); clots.push(c);
  }
  add(mergeGeometries(clots), new THREE.MeshStandardMaterial({vertexColors: true, roughness: .6, flatShading: true}), 'clots');

  // the victim: a skull in the belly, jaw hanging, its lower half already green; a hand clawing out of the flank
  const skull = [];
  const rotted = (y, o) => o.copy(col.bone).lerp(col.rot, THREE.MathUtils.clamp((.24 - y) * 7, 0, 1) * .85);
  const cran = bare(new THREE.IcosahedronGeometry(.075, 1)); cran.scale(1, .92, 1.08); skull.push(cran);
  const jaw = bare(new THREE.BoxGeometry(.07, .022, .07)); jaw.rotateX(.35); jaw.translate(0, -.08, .03); skull.push(jaw);
  const place = geo => { geo.rotateZ(.5); geo.rotateY(-.5); geo.translate(-.02, .17, .13); };
  skull.forEach(geo => { place(geo); paint(geo, (x, y, z, o) => rotted(y, o)); });
  const sockets = [-1, 1].map(s => { const e = bare(new THREE.IcosahedronGeometry(.02, 0)); e.translate(s * .03, .008, .065); place(e); paint(e, (x, y, z, o) => o.copy(col.clot)); return e; });
  const sk = mergeGeometries([...skull, ...sockets]);
  add(sk, new THREE.MeshStandardMaterial({vertexColors: true, roughness: .85, flatShading: true}), 'skull');
  const hand = [], wrist = new THREE.Vector3(.0, .24, .14), dir = new THREE.Vector3(.35, .55, .75).normalize();
  const K = 2, bit = (len, rad, from, d) => { len *= K; rad *= K; from = wrist.clone().add(from.clone().sub(wrist).multiplyScalar(K)); const c = bare(new THREE.CylinderGeometry(rad * .7, rad, len, 5)); c.translate(0, len / 2, 0); c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)); c.translate(from.x, from.y, from.z); return c; };
  const palm = bit(.055, .017, wrist, dir); hand.push(palm);
  const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 0, 1)).normalize(), top = wrist.clone().addScaledVector(dir, .055);
  [[-1.5, 1], [-.5, 1.12], [.5, 1.05], [1.5, .85]].forEach(([k, l], i) => {
    const base = top.clone().addScaledVector(side, k * .0125), d1 = dir.clone().addScaledVector(side, k * .1).normalize(), len = .04 * l;
    hand.push(bit(len, .007, base, d1));
    const knuckle = base.clone().addScaledVector(d1, len), d2 = d1.clone().lerp(new THREE.Vector3(-.6, -.2, 0), .55).normalize();
    hand.push(bit(len * .8, .0055, knuckle, d2));
  });
  hand.push(bit(.035, .008, wrist.clone().addScaledVector(dir, .015).addScaledVector(side, -.022), side.clone().multiplyScalar(-1).addScaledVector(dir, .6).normalize()));
  const handG = mergeGeometries(hand);
  paint(handG, (x, y, z, o) => o.copy(col.flesh).lerp(col.bone, .35).lerp(col.rot, THREE.MathUtils.clamp((.17 - z) * 10, 0, 1) * .6));
  add(handG, new THREE.MeshStandardMaterial({vertexColors: true, roughness: .75, flatShading: true, emissive: col.flesh, emissiveIntensity: .15}), 'hand');

  // the tendrils: three reaching up and over, hooked, the hooks bright
  const tendrils = [], tips = [];
  [[.6, .45, .8], [2.7, .4, .65], [4.5, .52, .9]].forEach(([a, t0, up], k) => {
    const p0 = surf(a, t0, -.02), out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), pts = [p0];
    pts.push(p0.clone().addScaledVector(out, .08).add(new THREE.Vector3(0, .09 * up, 0)));
    pts.push(p0.clone().addScaledVector(out, .13).add(new THREE.Vector3(0, .2 * up, 0)));
    pts.push(p0.clone().addScaledVector(out, .08).add(new THREE.Vector3(0, .27 * up, 0)));
    pts.push(p0.clone().addScaledVector(out, -.01).add(new THREE.Vector3(0, .26 * up, 0)));
    const path = new THREE.CatmullRomCurve3(pts), tg = taper(path, .026 - k * .003, 14, .8);
    paint(tg, (x, y, z, o) => o.copy(col.mid).lerp(col.crown, THREE.MathUtils.clamp(y / .6, 0, 1) * .6)); tendrils.push(tg);
    const end = path.getPoint(1), dir2 = path.getTangent(1), hook = bare(new THREE.ConeGeometry(.012, .06, 5));
    hook.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir2)); hook.translate(end.x + dir2.x * .02, end.y + dir2.y * .02, end.z + dir2.z * .02);
    paint(hook, (x, y, z, o) => o.copy(col.tip)); tips.push(hook);
  });
  add(mergeGeometries(tendrils), glowMat({transparent: true, opacity: .85, emissiveIntensity: .45}), 'tendrils');
  add(mergeGeometries(tips), new THREE.MeshStandardMaterial({vertexColors: true, roughness: .3, emissive: col.tip, emissiveIntensity: .7, flatShading: true}), 'hooks');

  // drips hanging off the rim, each ending in a bead
  const drips = [];
  [[.2, .13], [1.2, .08], [2.0, .11], [3.3, .09], [4.1, .14], [5.2, .07], [5.8, .1]].forEach(([a, len], i) => {
    const p = surf(a, .08, -.012), c = bare(new THREE.ConeGeometry(.014, len, 5)); c.rotateX(Math.PI); c.translate(p.x, Math.max(len / 2, p.y + .02 - len / 2 + .02), p.z);
    const b = bare(new THREE.IcosahedronGeometry(.013, 0)); b.scale(1, 1.3, 1); b.translate(p.x, Math.max(.02, Math.max(len / 2, p.y + .02 - len / 2 + .02) - len / 2), p.z);
    paint(c, (x, y, z, o) => o.copy(col.mid)); paint(b, (x, y, z, o) => o.copy(col.crown)); drips.push(c, b);
  });
  add(mergeGeometries(drips), new THREE.MeshStandardMaterial({vertexColors: true, roughness: .12, flatShading: true, emissive: col.mid, emissiveIntensity: .3}), 'drips');

  // blisters: acid beads on the skin, bright; scabs: dried black-green plates on the back
  const blis = [], scabs = [];
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4 + 1, t = .12 + hash(i * 5) * .6, p = surf(a, t, .004), b = bare(new THREE.IcosahedronGeometry(.009 + hash(i) * .012, 1));
    b.translate(p.x, p.y + .02, p.z); paint(b, (x, y, z, o) => o.copy(col.glow).lerp(col.crown, hash(i) * .4)); blis.push(b);
  }
  for (let i = 0; i < 7; i++) {
    const a = -1.2 + i * .5, t = .2 + hash(i * 3) * .5, p = surf(a, t, .006), pl = bare(new THREE.CylinderGeometry(.018 + hash(i) * .018, .03 + hash(i * 2) * .015, .008, 5 + (i % 2)));
    pl.rotateX((hash(i * 4) - .5) * .8); pl.rotateZ((hash(i * 6) - .5) * .8); pl.translate(p.x, p.y + .02, p.z);
    paint(pl, (x, y, z, o) => o.copy(col.scab).lerp(col.rot, hash(i * 7 + Math.round(y * 400)) * .35)); scabs.push(pl);
  }
  add(mergeGeometries(blis), new THREE.MeshStandardMaterial({vertexColors: true, roughness: .15, emissive: col.glow, emissiveIntensity: .8}), 'blisters');
  add(mergeGeometries(scabs), new THREE.MeshStandardMaterial({vertexColors: true, roughness: .9, flatShading: true}), 'scabs');

  // the floor: a wide slick and runners reaching out of it
  const slick = bare(new THREE.CircleGeometry(1, 44)), fp = slick.attributes.position;
  for (let v = 0; v < fp.count; v++) { const x = fp.getX(v), y = fp.getY(v), a = Math.atan2(y, x), j = 1 + .25 * Math.sin(a * 3 + 1) + .15 * Math.sin(a * 5) + .07 * Math.sin(a * 9); fp.setXYZ(v, x * j * GR * 1.05, y * j * GR * 1.0, 0); }
  slick.rotateX(-Math.PI / 2); slick.translate(0, .004, 0);
  paint(slick, (x, y, z, o) => o.copy(col.deep).lerp(col.mid, THREE.MathUtils.clamp(1 - Math.hypot(x, z) / (GR * 1.4), 0, 1) * .5));
  add(slick, new THREE.MeshStandardMaterial({vertexColors: true, roughness: .1, emissive: col.mid, emissiveIntensity: .25, polygonOffset: true, polygonOffsetFactor: -1, side: THREE.DoubleSide}), 'slick', g);
  const runs = [];
  [[.1, .8, .17], [1.3, .9, .19], [2.4, 1.1, .16], [3.5, .7, .2], [4.7, 1.0, .18], [5.6, .8, .15]].forEach(([a, bend, len]) => {
    const r0 = GR * .9, a2 = a + .35 * (bend - .9), P = (aa, rr, y) => new THREE.Vector3(Math.cos(aa) * rr, y, Math.sin(aa) * rr);
    const path = new THREE.CatmullRomCurve3([P(a, r0, .04), P(a2, r0 + len * .5, .035), P(a + bend * .5, r0 + len, .025)]);
    const tg = taper(path, .028, 10, .85);
    paint(tg, (x, y, z, o) => { const u = THREE.MathUtils.clamp((Math.hypot(x, z) - r0) / len, 0, 1); o.copy(col.mid).lerp(col.deep, .25).lerp(col.crown, Math.max(0, u - .5) * 1.2); });
    runs.push(tg);
  });
  add(mergeGeometries(runs), new THREE.MeshStandardMaterial({vertexColors: true, roughness: .12, emissive: col.mid, emissiveIntensity: .3, polygonOffset: true, polygonOffsetFactor: -1.5}), 'runners', g);

  // a faint acrid haze clinging to the slick
  const haze = new THREE.CircleGeometry(.44, 24); haze.rotateX(-Math.PI / 2); haze.translate(0, .03, 0);
  const hm = add(haze, new THREE.MeshBasicMaterial({color: col.rot, transparent: true, opacity: .16, depthWrite: false}), 'fume', g);
  hm.castShadow = false; hm.receiveShadow = false;
  return {g, body};
}
