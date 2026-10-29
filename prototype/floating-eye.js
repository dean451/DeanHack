import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The floating eye used to be a smooth tan ball with a blue disc and six pink strings: a cartoon. It is now a
// wet, bulging, bloodshot eyeball that hangs in the dark, and it should unsettle you (its gaze paralyses):
// - the ball: yellowed, glossy sclera, shaded darker toward the back, laced with a web of fine red veins that
//   thicken toward the rear;
// - the iris: a domed ring of radial fibres, blue-white at the rim and deep blue toward a black pupil, lit from
//   within so it stares out of the dark, with one hard glint;
// - no lids: it is a bare ball, nothing on its crown (flesh caps there read as a hat);
// - the stump: a thick, ragged bundle of optic nerve tendrils with vessels trailing underneath.
// Handles: `eye` (the iris and pupil pivot at the ball's centre, which glance.js rolls), `pupil` (dilates).
// Five draws: ball and veins, iris, nerve stump, pupil and glint.
const R = .24;
const hash = n => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
const col = hex => new THREE.Color(hex);

function paint(geo, fn) {
  const p = geo.attributes.position, c = new Float32Array(p.count * 3), out = new THREE.Color();
  for (let i = 0; i < p.count; i++) { fn(p.getX(i), p.getY(i), p.getZ(i), out); out.toArray(c, i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}
const bare = geo => { geo.deleteAttribute('uv'); return geo.index ? geo.toNonIndexed() : geo; };

// a vein crawling over the ball's surface from `from` to `to` (directions from the centre), wobbling as it goes
function vein(from, to, seed, r) {
  const pts = [], a = new THREE.Vector3(...from).normalize(), b = new THREE.Vector3(...to).normalize();
  for (let i = 0; i <= 9; i++) {
    const t = i / 9, v = a.clone().lerp(b, t).normalize();
    v.x += (hash(seed + i) - .5) * .07; v.y += (hash(seed + i * 3) - .5) * .07; v.z += (hash(seed + i * 5) - .5) * .07;
    pts.push(v.normalize().multiplyScalar(R * 1.004));
  }
  const geo = bare(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 18, r, 4, false));
  return paint(geo, (x, y, z, out) => out.copy(col('#9a1e1e')).lerp(col('#c8403a'), hash(seed + Math.round(y * 50))));
}

export function createFloatingEye({iris = '#2f6ad0'} = {}) {
  const g = new THREE.Group(), body = new THREE.Group(), lift = new THREE.Group();
  g.add(body); body.add(lift); lift.position.y = .58;
  const add = (parent, geo, mat, name, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.userData.part = name; m.castShadow = true; parent.add(m); return m; };

  // the ball and its veins: one mesh, vertex-coloured
  const ball = bare(new THREE.SphereGeometry(R, 40, 28));
  paint(ball, (x, y, z, out) => {
    const back = THREE.MathUtils.clamp(-z / R, 0, 1), side = Math.abs(x) / R;
    out.copy(col('#dccaa0')).lerp(col('#b08a64'), back * .6 + side * .15);
    // a diffuse pink flush toward the back and a few dark specks
    out.lerp(col('#b8584c'), back * back * .45);
    if (hash(Math.round(x * 90) * 7 + Math.round(y * 90) * 3 + Math.round(z * 90)) > .985) out.lerp(col('#5a2a1a'), .8);
  });
  const parts = [ball];
  for (let i = 0; i < 26; i++) {
    const ang = i * 2.399, el = (hash(i * 4.1) - .5) * 2.0;
    const from = [Math.cos(ang) * Math.cos(el) * .4, Math.sin(el) * .8, -.5 - hash(i) * .6];            // from the back
    const to = [Math.cos(ang) * (.75 + hash(i * 2) * .2), Math.sin(el) * .65 + (hash(i * 7) - .5) * .3, .35 + hash(i * 3) * .35];  // toward the front
    parts.push(vein(from, to, i * 17, .0028 + hash(i * 9) * .0022));
  }
  const ballMat = new THREE.MeshPhysicalMaterial({vertexColors: true, roughness: .22, clearcoat: 1, clearcoatRoughness: .08});
  add(lift, mergeGeometries(parts), ballMat, 'ball');

  // iris and pupil on their own pivot at the ball's centre (glance.js rolls the gaze; the pupil dilates)
  const eye = new THREE.Group(); lift.add(eye);
  const irisGeo = bare(new THREE.SphereGeometry(.132, 32, 14, 0, Math.PI * 2, 0, 1.0));
  irisGeo.rotateX(Math.PI / 2); irisGeo.scale(1, 1, .5); irisGeo.translate(0, 0, R + .02 - .066);
  const base = col(iris), pale = base.clone().lerp(col('#e8f4ff'), .7), deep = base.clone().multiplyScalar(.45);
  paint(irisGeo, (x, y, z, out) => {
    const rr = Math.hypot(x, y) / .11, a = Math.atan2(y, x), fibre = .5 + .5 * Math.sin(a * 22 + Math.sin(a * 5) * 2);
    out.copy(deep).lerp(base, Math.min(1, rr * 1.3)).lerp(pale, fibre * rr * rr * .55);
    if (rr > .93) out.lerp(col('#0a1a3a'), .75);   // the dark limbal ring
  });
  const irisMat = new THREE.MeshStandardMaterial({vertexColors: true, roughness: .2, emissive: iris, emissiveIntensity: .5});
  add(eye, irisGeo, irisMat, 'iris');
  const pupilMat = new THREE.MeshStandardMaterial({color: '#030303', roughness: .08});
  const pupil = add(eye, new THREE.SphereGeometry(.056, 18, 12), pupilMat, 'pupil', 0, 0, R + .026);
  pupil.scale.set(1, 1, .38);
  const glint = new THREE.Mesh(new THREE.SphereGeometry(.0085, 8, 6), new THREE.MeshBasicMaterial({color: '#ffffff'}));
  glint.position.set(-.022, .026, R + .047); glint.userData.part = 'glint'; eye.add(glint);

  // No lids: a floating eye is a bare ball. (It had heavy flesh caps above and below with a swollen rim and
  // a crease fold; from the game camera the upper cap and its rim read as a hat, and the lower one as a collar.)
  // The stump: where the optic nerve tore out at the back and underside, a ragged ring of raw tissue on the
  // ball, then a bundle of tapering nerve strands and vessels trailing down and back as it drifts.
  const flesh = [];
  const exit = new THREE.Vector3(0, -.62, -.78).normalize();
  const stump = bare(new THREE.CylinderGeometry(.05, .068, .03, 9, 1, true));
  stump.translate(0, .004, 0);
  stump.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), exit));
  stump.translate(...exit.clone().multiplyScalar(R * .97).toArray());
  paint(stump, (x, y, z, out) => out.copy(col('#8e3a34')).lerp(col('#4e1a1a'), hash(Math.round(x * 90) + Math.round(z * 90) * 7) * .6));
  flesh.push(stump);
  // a tube from the curve that narrows toward its end (`tip` is the end radius as a share of the root's)
  const strand = (pts, r, tip, seed) => {
    const curve = new THREE.CatmullRomCurve3(pts), segs = 12, radial = 6;
    const t = new THREE.TubeGeometry(curve, segs, r, radial, false), p = t.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
    for (let i = 0; i <= segs; i++) {
      curve.getPointAt(i / segs, c); const k = 1 - (1 - tip) * (i / segs);
      for (let j = 0; j <= radial; j++) { const n = i * (radial + 1) + j; v.fromBufferAttribute(p, n).sub(c).multiplyScalar(k).add(c); p.setXYZ(n, v.x, v.y, v.z); }
    }
    const geo = bare(t);
    return paint(geo, (x, y, z, out) => out.copy(col('#b0685a')).lerp(col('#6a2626'), THREE.MathUtils.clamp((-.2 - y) * 2.4 + hash(seed) * .2, 0, .85)));
  };
  const root = exit.clone().multiplyScalar(R * 1.0);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.399 + hash(i) * .5, spread = .02 + hash(i * 3) * .025, len = .18 + hash(i * 7) * .22;
    const o = new THREE.Vector3(Math.cos(a) * spread, Math.sin(a) * spread * .6, Math.sin(a) * spread * .5);
    const sway = (hash(i * 2) - .5) * .1;
    const pts = [root.clone().add(o),
      root.clone().add(o.clone().multiplyScalar(1.8)).add(new THREE.Vector3(sway * .5, -len * .35, -len * .25)),
      root.clone().add(o.clone().multiplyScalar(3.4)).add(new THREE.Vector3(sway, -len * .75, -len * .38)),
      root.clone().add(o.clone().multiplyScalar(5.2)).add(new THREE.Vector3(sway * 1.4 + (hash(i * 5) - .5) * .05, -len, -len * .42 - hash(i * 5) * .05))];
    flesh.push(strand(pts, i < 3 ? .022 : .011 + hash(i) * .006, .3, i));
  }
  const fleshMat = new THREE.MeshStandardMaterial({vertexColors: true, roughness: .55, side: THREE.DoubleSide});
  add(lift, mergeGeometries(flesh), fleshMat, 'flesh');
  return {g, body, eye, pupil};
}
