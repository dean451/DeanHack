// An oil lamp lying on the floor, in the sinister direction: a squat, boat-shaped brass bowl on a
// small foot, a long spout that narrows and lifts to a soot-blackened mouth with a charred wick,
// a domed lid crowned with a twisted, thorn-like finial, and a handle that curls back over itself
// and ends in a barbed hook. The brass is old: tarnished dark low down and in blotches, green
// verdigris packed into the engraved band and under the lid's rim, worn bright only on the top of
// the bowl and the edge of the lid.
// Oil lamps and magic lamps share this model, unidentified or not ("lamp" either way); a magic
// lamp's golden hum (wand-auras.js, keyed on the hero's name for it) is laid out for this spout,
// whose mouth is at x .36, y .2. All the brass is one merged, vertex-coloured mesh; a lit lamp
// ("lit" in the name) adds a flame at the mouth as a second draw, tagged part 'flame' so
// flame-flicker.js flickers it and lends it a light.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const SPOUT_MOUTH = new THREE.Vector3(.365, .2, 0);

const BRASS = new THREE.Color(0xa8853e), POLISH = new THREE.Color(0xe6c878), TARNISH = new THREE.Color(0x3e321c),
  VERDIGRIS = new THREE.Color(0x3d6b57), SOOT = new THREE.Color(0x120e0b);
const noise = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;return s - Math.floor(s); };

function prep(geo) {
  const n = geo.index ? geo.toNonIndexed() : geo;if (n !== geo) geo.dispose();
  for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k);
  return n;
}
// Paint a geometry (already in lamp space) with fn(x, y, z, colour).
function paint(geo, fn) {
  const p = geo.attributes.position, cols = [], c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { fn(p.getX(i), p.getY(i), p.getZ(i), c);cols.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  return geo;
}
// Old brass: darker low down and in blotches, a little polish on top.
function aged(x, y, z, c) {
  const n = noise(x * 9, y * 9, z * 9), m = noise(x * 31, y * 29, z * 37);
  c.copy(BRASS).lerp(TARNISH, Math.min(.85, .2 + .45 * n * n + Math.max(0, .09 - y) * 4));
  if (y > .13) c.lerp(POLISH, Math.min(.5, (y - .13) * 6) * (1 - n));
  if (m > .86) c.lerp(VERDIGRIS, .5);
}
const lathe = (profile, n = 32) => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), n);

export function createOilLamp(name = 'lamp') {
  const g = new THREE.Group();g.name = name;g.userData.restingWeapon = true;
  const parts = [];
  const put = (geo, fn = aged) => { parts.push(paint(prep(geo), fn));return geo; };
  // The foot: a small stepped pedestal.
  put(lathe([[0, 0], [.068, 0], [.074, .006], [.07, .014], [.05, .022], [.046, .034], [0, .034]], 28));
  // The bowl: turned round, then stretched along x into a boat. Engraved band at the waist.
  const bowl = lathe([[0, .03], [.06, .032], [.105, .048], [.13, .075], [.134, .095], [.125, .118], [.098, .138], [.066, .15], [.06, .155], [0, .155]], 36);
  bowl.scale(1.28, 1, .96);
  put(bowl, (x, y, z, c) => { aged(x, y, z, c);if (Math.abs(y - .095) < .007) c.lerp(VERDIGRIS, .7).multiplyScalar(.75); });
  const band = new THREE.TorusGeometry(.134, .005, 6, 48);band.rotateX(Math.PI / 2);band.scale(1.28, 1, .96);band.translate(0, .101, 0);
  put(band, (x, y, z, c) => { aged(x, y, z, c);c.lerp(POLISH, .25); });
  const band2 = band.clone();band2.translate(0, -.012, 0);put(band2, (x, y, z, c) => { aged(x, y, z, c);c.lerp(POLISH, .2); });
  // The lid: a collar, a dome with a rolled edge, and a twisted thorn finial.
  put(lathe([[.066, .15], [.072, .156], [.072, .164], [.066, .168], [.058, .17], [0, .17]], 28),
    (x, y, z, c) => { aged(x, y, z, c);if (y < .158) c.lerp(VERDIGRIS, .55); });
  put(lathe([[0, .168], [.058, .168], [.056, .18], [.044, .198], [.024, .21], [.012, .214], [0, .215]], 28));
  const thorn = new THREE.ConeGeometry(.014, .085, 5, 6);thorn.translate(0, .0425, 0);
  { const p = thorn.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i);const k = v.y / .085, a = k * 2.4;
      p.setXYZ(i, v.x * Math.cos(a) - v.z * Math.sin(a) + k * k * .018, v.y, v.x * Math.sin(a) + v.z * Math.cos(a)); } }
  thorn.translate(0, .21, 0);put(thorn, (x, y, z, c) => { aged(x, y, z, c);c.lerp(TARNISH, .35); });
  put(new THREE.TorusGeometry(.016, .004, 6, 16).rotateX(Math.PI / 2).translate(0, .215, 0));
  // The spout: a tapered tube that leaves the bowl's nose low and lifts to the mouth.
  const path = new THREE.CatmullRomCurve3([[.12, .085, 0], [.2, .1, 0], [.28, .135, 0], [.335, .175, 0], [SPOUT_MOUTH.x, SPOUT_MOUTH.y, 0]].map(p => new THREE.Vector3(...p)));
  const tube = new THREE.TubeGeometry(path, 24, 1, 14, false), tp = tube.attributes.position;
  // Re-scale each ring of the tube about the path: .05 at the bowl down to .014 at the mouth.
  { const v = new THREE.Vector3(), rings = 25, per = 15;
    for (let r = 0; r < rings; r++) { const u = r / (rings - 1), centre = path.getPointAt(u), rad = .05 * (1 - u) ** 1.4 + .014;
      for (let j = 0; j < per; j++) { const i = r * per + j;v.fromBufferAttribute(tp, i).sub(centre).multiplyScalar(rad).add(centre);tp.setXYZ(i, v.x, v.y, v.z * (u < .2 ? .9 : 1)); } }
    tube.computeVertexNormals(); }
  put(tube, (x, y, z, c) => { aged(x, y, z, c);const u = Math.max(0, (x - .3) / .07);c.lerp(SOOT, Math.min(.9, u * u)); });
  // A rolled lip at the mouth, black with soot, and the charred wick standing in it.
  const tangent = path.getTangentAt(1), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
  const lip = new THREE.TorusGeometry(.015, .004, 6, 16);lip.rotateX(Math.PI / 2);lip.applyQuaternion(q);lip.translate(SPOUT_MOUTH.x, SPOUT_MOUTH.y, 0);
  put(lip, (x, y, z, c) => c.copy(SOOT).lerp(TARNISH, .3 * noise(x * 50, y * 50, z * 50)));
  const wick = new THREE.CylinderGeometry(.006, .008, .02, 6);wick.translate(0, .006, 0);wick.applyQuaternion(q);wick.translate(SPOUT_MOUTH.x, SPOUT_MOUTH.y, 0);
  put(wick, (x, y, z, c) => c.copy(SOOT).lerp(new THREE.Color(0x3a2a1a), y < SPOUT_MOUTH.y + .004 ? .5 : 0));
  // The handle: out from the bowl's tail, up and over in a curl, and down into a barbed hook.
  const curl = new THREE.CatmullRomCurve3([[-.155, .125, 0], [-.22, .165, 0], [-.285, .15, 0], [-.3, .1, 0], [-.27, .065, 0], [-.225, .07, 0], [-.215, .1, 0]].map(p => new THREE.Vector3(...p)));
  const handle = new THREE.TubeGeometry(curl, 40, 1, 8, false), hp = handle.attributes.position;
  { const v = new THREE.Vector3(), rings = 41, per = 9;
    for (let r = 0; r < rings; r++) { const u = r / (rings - 1), centre = curl.getPointAt(u), rad = .014 * (1 - u * .65);
      for (let j = 0; j < per; j++) { const i = r * per + j;v.fromBufferAttribute(hp, i).sub(centre);v.z *= 1.4;v.multiplyScalar(rad).add(centre);hp.setXYZ(i, v.x, v.y, v.z); } }
    handle.computeVertexNormals(); }
  put(handle);
  // The barb: a short hooked spike off the end of the curl, pointing back up.
  const barb = new THREE.ConeGeometry(.007, .03, 5);barb.rotateZ(-.7);barb.translate(-.21, .115, 0);put(barb, (x, y, z, c) => { aged(x, y, z, c);c.lerp(TARNISH, .3); });
  // Rivets where the handle and spout meet the bowl.
  for (const [x, y, z] of [[-.16, .128, .012], [-.16, .128, -.012], [.13, .09, .03], [.13, .09, -.03]])
    put(new THREE.SphereGeometry(.0055, 6, 4).translate(x, y, z), (x2, y2, z2, c) => c.copy(POLISH).lerp(TARNISH, .4));
  const geo = mergeGeometries(parts);parts.forEach(p => p.dispose());
  const brassMat = new THREE.MeshStandardMaterial({vertexColors: true, metalness: .72, roughness: .4});
  const brass = new THREE.Mesh(geo, brassMat);brass.name = 'lamp-brass';brass.castShadow = brass.receiveShadow = true;g.add(brass);
  const owned = [geo, brassMat];
  if (/\blit\b/i.test(name)) {
    const c = new THREE.Color(), edge = new THREE.Color(0xff7a22);
    const fg = new THREE.LatheGeometry([[0, 0], [.012, .005], [.017, .018], [.014, .034], [.007, .052], [0, .066]].map(([r, y]) => new THREE.Vector2(r, y)), 14), fp = fg.attributes.position, cols = [];
    for (let i = 0; i < fp.count; i++) { c.set(0xfff4d0).lerp(edge, Math.min(1, fp.getY(i) / .06 + Math.hypot(fp.getX(i), fp.getZ(i)) * 20));cols.push(c.r, c.g, c.b); }
    fg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const fm = new THREE.MeshBasicMaterial({vertexColors: true, toneMapped: false});
    const flame = new THREE.Mesh(fg, fm);flame.position.set(SPOUT_MOUTH.x + .004, SPOUT_MOUTH.y + .012, 0);flame.userData.part = 'flame';flame.name = 'lamp-flame';
    g.add(flame);owned.push(fg, fm);
  }
  g.userData.dispose = () => owned.forEach(o => o.dispose());
  return g;
}
