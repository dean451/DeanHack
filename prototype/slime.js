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
