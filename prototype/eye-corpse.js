import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The floating eye's corpse. Eating one grants telepathy, the most useful thing a new character can find on
// the first levels, so it must never pass for one more dead thing. It used to be the live eyeball tipped
// over, a whole ball in a blood pool, and looked like any round corpse. Now it is a burst eye:
// - the sac: the ball collapsed into a flattened, wrinkled skin, split open down one side with a dark, wet
//   tear, lying in a milky puddle of the fluid that ran out of it (not blood: an eye has none to lose);
// - the iris: still whole, lying face up on the sagging skin, stretched oval, its pupil blown wide, and it
//   still glows faintly from within;
// - the nerve: a few limp, tapering strands flopped across the floor behind it;
// - the effect: a soft violet halo on the floor that slowly breathes, and a few pale motes rising from the
//   iris and fading, a hint of the mind-sight it holds.
// No lights: the halo is one additive disc and the motes one instanced mesh. update(t) is driven by the ground
// items loop in live.js (`corpseFx`), so only a visible eye corpse costs anything per frame.
// Six draws: skin and nerves (vertex-coloured), iris, pupil, puddle, halo, motes. The geometry is built once
// and shared; each corpse has its own materials, which userData.dispose frees.

export const EYE_CORPSE = /^floating eyes?$/;
export const MOTES = 5;
const HALO = '#8a6cff', MOTE = '#b49cff';
const R = .15, BELLY = R * .12;   // the belly is lifted so it rests on the floor
const hash = (a, b = 0) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };
const col = hex => new THREE.Color(hex);
const bare = geo => { geo.deleteAttribute('uv'); return geo.index ? geo.toNonIndexed() : geo; };
function paint(geo, fn) {
  const p = geo.attributes.position, c = new Float32Array(p.count * 3), out = new THREE.Color();
  for (let i = 0; i < p.count; i++) { fn(p.getX(i), p.getY(i), p.getZ(i), out); out.toArray(c, i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}

// The tear runs down the side facing -x, +z a little: where the skin is split and folded in.
const TEAR = new THREE.Vector3(-.8, .25, .55).normalize();
let shared = null;
// Height of the slumped skin's top at (x, z), so the iris lies on it instead of floating over its rim.
export const skinTop = (x, z) => BELLY + R * .34 * Math.sqrt(Math.max(0, 1 - (x / (R * 1.18)) ** 2 - (z / (R * 1.05)) ** 2));
function conform(geo, lift) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, skinTop(p.getX(i), p.getZ(i)) + lift);
  geo.computeVertexNormals();
}
function build(iris) {
  // the collapsed skin: a ball squashed flat, slumped and creased, dented in along the tear
  const skin = new THREE.SphereGeometry(R, 36, 22), p = skin.attributes.position, v = new THREE.Vector3(), d = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); d.copy(v).normalize();
    const a = Math.atan2(d.z, d.x), up = Math.max(0, d.y);
    let r = R * (1 + .07 * Math.sin(a * 5 + 1.3) * up + .05 * (hash(Math.round(a * 9), Math.round(d.y * 9)) - .5));
    const tear = Math.max(0, d.dot(TEAR) - .55) / .45;   // 0 away from the split, 1 at its heart
    r *= 1 - tear * .55;
    v.copy(d).multiplyScalar(r);
    v.x *= 1.18; v.z *= 1.05;
    v.y = (v.y > 0 ? v.y * .34 - up * (1 - up) * .05 * Math.sin(a * 7) : v.y * .12) + BELLY;   // a sagging top over a flat belly
    p.setXYZ(i, v.x, v.y, v.z);
  }
  skin.computeVertexNormals();
  const sac = paint(bare(skin), (x, y, z, out) => {
    const dd = new THREE.Vector3(x / 1.18, (y - BELLY) / .34, z / 1.05).normalize(), tear = Math.max(0, dd.dot(TEAR) - .5) / .5;
    out.copy(col('#bca482')).lerp(col('#7e6044'), THREE.MathUtils.clamp(.25 - (y - BELLY) * 3, 0, .6));
    out.lerp(col('#b2564a'), .25 * hash(Math.round(x * 70), Math.round(z * 70)));          // blotches of old blood
    if (tear > 0) out.lerp(col('#3a0f12'), Math.min(1, tear * 1.6));                          // the wet, dark split
  });
  // veins across the slumped top, dried dark
  const parts = [sac];
  for (let i = 0; i < 12; i++) {
    const a0 = i * .53 + hash(i) * .4, pts = [];
    if (Math.cos(a0) * TEAR.x + Math.sin(a0) * TEAR.z > .6) continue;   // the split has no skin to carry a vein
    for (let k = 0; k <= 6; k++) {
      const t = k / 6, a = a0 + (hash(i, k) - .5) * .25, rr = R * (.92 - t * .45);
      const x = Math.cos(a) * rr * 1.18, z = Math.sin(a) * rr * 1.05; pts.push(new THREE.Vector3(x, skinTop(x, z) + .003, z));
    }
    parts.push(paint(bare(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, .0035, 4, false)), (x, y, z, out) => out.copy(col('#6a1416'))));
  }
  // the nerve: limp strands flopped across the floor from the back (-z), narrowing to threads
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * 1.5 + (i - 2) * .32 + (hash(i * 3) - .5) * .2, len = .16 + hash(i * 7) * .12, pts = [];
    for (let k = 0; k <= 4; k++) {
      const t = k / 4, rr = R * .85 + len * t, aa = a + Math.sin(t * 3 + i) * .18;
      pts.push(new THREE.Vector3(Math.cos(aa) * rr, k === 0 ? .016 : .009, Math.sin(aa) * rr));
    }
    const curve = new THREE.CatmullRomCurve3(pts), segs = 10, radial = 5, tube = new THREE.TubeGeometry(curve, segs, i === 2 ? .016 : .01, radial, false);
    const tp = tube.attributes.position, c = new THREE.Vector3(), w = new THREE.Vector3();
    for (let s = 0; s <= segs; s++) {
      curve.getPointAt(s / segs, c); const k = 1 - .7 * s / segs;
      for (let j = 0; j <= radial; j++) { const n = s * (radial + 1) + j; w.fromBufferAttribute(tp, n).sub(c).multiplyScalar(k).add(c); w.y = Math.max(w.y, .001); tp.setXYZ(n, w.x, w.y, w.z); }
    }
    parts.push(paint(bare(tube), (x, y, z, out) => out.copy(col('#9a5048')).lerp(col('#4a1a1a'), hash(i, Math.round(x * 40)) * .6)));
  }
  const body = mergeGeometries(parts); parts.forEach(g => g.dispose());

  // the iris: a domed disc face up on the skin, stretched oval and a little tilted toward the tear
  const irisGeo = bare(new THREE.RingGeometry(.0001, .082, 36, 7));
  const base = col(iris), pale = base.clone().lerp(col('#e8f0ff'), .55), deep = base.clone().multiplyScalar(.35);
  paint(irisGeo, (x, y, z, out) => {
    const rr = Math.hypot(x, y) / .082, a = Math.atan2(y, x), fibre = .5 + .5 * Math.sin(a * 20 + Math.sin(a * 4) * 2);
    out.copy(deep).lerp(base, Math.min(1, rr * 1.4)).lerp(pale, fibre * rr * rr * .5);
    if (rr > .9) out.lerp(col('#0a1028'), .8);
  });
  irisGeo.rotateX(-Math.PI / 2); irisGeo.scale(1.15, 1, .85); irisGeo.rotateY(.12); irisGeo.translate(.012, 0, .01); conform(irisGeo, .013);
  // the pupil: blown wide, the dead eye's
  const pupilGeo = bare(new THREE.CircleGeometry(.038, 20)); pupilGeo.rotateX(-Math.PI / 2); pupilGeo.scale(1.12, 1, .9); pupilGeo.rotateY(.12);
  pupilGeo.translate(.014, 0, .01); conform(pupilGeo, .016);

  // the puddle: the fluid that ran out, milky and thin, spreading furthest from the tear
  const s = new THREE.Shape(), n = 30;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, toward = Math.max(0, Math.cos(a - Math.atan2(TEAR.z, TEAR.x)));
    const r = .16 * (.85 + .25 * hash(i, 4) + .1 * Math.sin(a * 3 + 1)) + toward * toward * .1;
    s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, -Math.sin(a) * r);
  }
  s.closePath();
  const puddle = new THREE.ShapeGeometry(s); puddle.rotateX(-Math.PI / 2); puddle.translate(0, .003, 0); puddle.deleteAttribute('uv');

  // the halo: a disc that fades to nothing at its rim (additive, so black is clear)
  const halo = new THREE.RingGeometry(.001, .44, 36, 5); halo.rotateX(-Math.PI / 2); halo.translate(0, .006, 0); halo.deleteAttribute('uv');
  paint(halo, (x, y, z, out) => { const k = Math.max(0, 1 - Math.hypot(x, z) / .44); out.setRGB(k * k, k * k, k * k); });

  const mote = new THREE.OctahedronGeometry(.011, 0); mote.deleteAttribute('uv');
  return {body, irisGeo, pupilGeo, puddle, halo, mote};
}

// Where mote i is at time t: rising slowly from the iris and drifting, fading out (scale) near the top.
export function motePose(i, t, out = new THREE.Vector3()) {
  const period = 3.6 + hash(i, 2) * 1.6, k = ((t + hash(i, 5) * period) % period) / period;
  const a = hash(i, 9) * Math.PI * 2 + k * 1.4, r = .03 + k * .06;
  out.set(Math.cos(a) * r + .012, .08 + k * .26, Math.sin(a) * r + .01);
  return {pos: out, scale: Math.sin(Math.PI * k) * (.8 + hash(i, 3) * .5)};
}

export function createEyeCorpse({iris = '#2f6ad0'} = {}) {
  if (!shared || shared.iris !== iris) shared = {...build(iris), iris};
  const S = shared, g = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({vertexColors: true, roughness: .35, side: THREE.DoubleSide});
  const irisMat = new THREE.MeshStandardMaterial({vertexColors: true, roughness: .25, emissive: '#5a48d8', emissiveIntensity: .4});
  const pupilMat = new THREE.MeshStandardMaterial({color: '#050308', roughness: .1});
  const wetMat = new THREE.MeshStandardMaterial({color: '#5c5e4a', roughness: .1, transparent: true, opacity: .62, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1});
  const haloMat = new THREE.MeshBasicMaterial({color: HALO, vertexColors: true, transparent: true, opacity: .4, blending: THREE.AdditiveBlending, depthWrite: false});
  const moteMat = new THREE.MeshBasicMaterial({color: MOTE, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false});
  const add = (geo, mat, part, shadow = false) => { const m = new THREE.Mesh(geo, mat); m.userData.part = part; m.castShadow = shadow; m.receiveShadow = true; g.add(m); return m; };
  add(S.body, skinMat, 'corpse', true);
  add(S.irisGeo, irisMat, 'iris');
  add(S.pupilGeo, pupilMat, 'pupil');
  add(S.puddle, wetMat, 'pool');
  const halo = add(S.halo, haloMat, 'halo'); halo.receiveShadow = false; halo.renderOrder = 2;
  const motes = new THREE.InstancedMesh(S.mote, moteMat, MOTES); motes.userData.part = 'motes'; motes.renderOrder = 3; motes.frustumCulled = false; g.add(motes);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  const fx = new THREE.Object3D();
  // t in seconds. The halo and the iris breathe together, slow (a beat every four seconds or so).
  fx.userData.update = t => {
    const beat = .5 + .5 * Math.sin(t * 1.5);
    haloMat.opacity = .26 + .3 * beat;
    irisMat.emissiveIntensity = .2 + .45 * beat;
    for (let i = 0; i < MOTES; i++) {
      const {scale} = motePose(i, t, pos);
      q.setFromAxisAngle(sc.set(0, 1, 0), t * .8 + i); m4.compose(pos, q, sc.setScalar(Math.max(.001, scale)));
      motes.setMatrixAt(i, m4);
    }
    motes.instanceMatrix.needsUpdate = true;
  };
  fx.userData.update(0);
  return {g, fx, materials: [skinMat, irisMat, pupilMat, wetMat, haloMat, moteMat], dispose: () => motes.dispose()};
}
