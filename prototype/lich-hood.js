// The lich's cowl (review finding 2026-11-16): a faceted, peaked hood seated on the robe's shoulders, the skull in
// its opening. It was a smooth sphere, which in the stoop read as a big round ball over a cone. Built as a stack of
// seven-sided rings in the body's space (y up, the face toward +z), each ring open across the front by `open`
// (radians either side of +z), so the opening narrows to a pointed arch over the brow; the top ring closes and a
// peak rakes back behind the skull. Flat shaded and double sided, so the inside of the cowl shows in the opening.
import * as THREE from 'three';

// [y, rx, rz, cz, open]: height, half-width, half-depth, centre's depth, half-angle of the front opening.
// The rim (first ring) sits on the robe's shoulder edge: the robe's top is a rounded box, .34 x .24 with .06 corners,
// its top at .98, so the rim's points lie on its four rounded corners (`RIM`), two to a corner, the front pair at the
// edges of the opening; its row here is the ellipse the rim approximates.
export const COWL = [
  [.96, .155, .105, 0, 1],
  [1.04, .205, .2, -.03, 1.0],
  [1.15, .2, .205, -.045, .82],
  [1.25, .175, .19, -.05, .42],
  [1.33, .13, .15, -.08, 0],
  [1.4, .075, .09, -.14, 0],
];
export const PEAK = [.01, 1.49, -.25];
const SIDES = 7;
// the rim's angles from +z (front pair, sides, back pair; mirrored), and the robe top's corner centres and radius
const RIM = [1, 1.3, 1.85, 2.6];
const RIM_ANGLES = [...RIM, ...RIM.map(a => 2 * Math.PI - a).reverse()], CORNER = [.11, .06], BEND = .045;

// the rim ring's points in the body's space, as the test seats them
export const cowlRim = () => ring(COWL[0], 0);

function ring([y, rx, rz, cz, open], k) {
  if (k === 0) return RIM_ANGLES.map(a => new THREE.Vector3(Math.sign(Math.sin(a)) * CORNER[0] + Math.sin(a) * BEND, y,
    Math.sign(Math.cos(a)) * CORNER[1] + Math.cos(a) * BEND));
  const pts = [];
  for (let j = 0; j <= SIDES; j++) {
    const a = open + j * (2 * Math.PI - 2 * open) / SIDES;
    // worn and lopsided: the left side (-x) of the upper rings sags out and down a little, the right pinched in
    const lean = Math.sin(a) < 0 ? 1.06 : .97, sag = k > 1 && Math.sin(a) < -.5 ? -.012 : 0;
    pts.push(new THREE.Vector3(Math.sin(a) * rx * lean, y + sag, cz + Math.cos(a) * rz));
  }
  return pts;
}

export function cowlGeometry() {
  const rings = COWL.map(ring), pos = [], tri = (a, b, c) => pos.push(...a.toArray(), ...b.toArray(), ...c.toArray());
  for (let k = 0; k + 1 < rings.length; k++) for (let j = 0; j < SIDES; j++) {
    const a = rings[k][j], b = rings[k][j + 1], c = rings[k + 1][j + 1], d = rings[k + 1][j];
    tri(a, b, c); tri(a, c, d);
  }
  const peak = new THREE.Vector3(...PEAK), top = rings.at(-1);
  for (let j = 0; j < SIDES; j++) tri(top[j], top[j + 1], peak);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

// the cowl as a mesh on `parent` (the lich's body); `material` should be double sided
export function lichCowl(parent, material) {
  const m = new THREE.Mesh(cowlGeometry(), material);
  m.name = 'hood'; m.castShadow = m.receiveShadow = true; parent.add(m);
  return m;
}

// The cowl's ellipse at height `y` in the body's space, as the rings above draw it: rows interpolated, the left side
// (-x) leaning out by 1.06 and the right pinched to .97 (`ring`), so the ellipse's centre sits a little to the left.
export function cowlAt(y) {
  const i = COWL.findIndex((r, j) => j + 1 < COWL.length && COWL[j + 1][0] >= y), k = i < 0 ? COWL.length - 2 : i;
  const [y0, ...a] = COWL[k], [y1, ...b] = COWL[k + 1], t = Math.min(1, Math.max(0, (y - y0) / (y1 - y0)));
  const [rx, rz, cz] = a.map((v, j) => v + (b[j] - v) * t);
  return {cx: (.97 - 1.06) / 2 * rx, rx: (1.06 + .97) / 2 * rx, rz, cz};
}

// Master and arch-lich crowns (review finding 2026-11-17): worn over the cowl, not on the skull inside it, so no
// piece cuts the cowl's walls. A faceted band hugs the cowl's lopsided ellipse at the brow, `CLEAR` off its shell,
// and a row of thorn points rise from it, alternating tall and short, leaning out over the tapering hood and raked
// back; a glowing gem on each tall tip and a stone at the brow. The arch-lich's is gilt with more points, a high
// central spire and a stone hanging under the brow. Built in the body's space as one group `crown` hung where the
// hood hangs (the chest bone, rigLichTrunk), so the stoop carries both together.
export const CROWN_BAND = [1.28, 1.33], CLEAR = .02;
const BAND_T = .014, BAND_SEGS = 14;
const at = (y, a, off) => { const e = cowlAt(y);
  return new THREE.Vector3(e.cx + Math.sin(a) * (e.rx + off), y, e.cz + Math.cos(a) * (e.rz + off)); };

function bandGeometry() {
  const [y0, y1] = CROWN_BAND, pos = [], quad = (a, b, c, d) => pos.push(...[a, b, c, a, c, d].flatMap(v => v.toArray()));
  for (let i = 0; i < BAND_SEGS; i++) {
    const a = i / BAND_SEGS * 2 * Math.PI, b = (i + 1) / BAND_SEGS * 2 * Math.PI;
    const c = (y, ang, o) => at(y, ang, CLEAR + o);
    quad(c(y0, a, BAND_T), c(y0, b, BAND_T), c(y1, b, BAND_T), c(y1, a, BAND_T)); // outer face
    quad(c(y1, a, BAND_T), c(y1, b, BAND_T), c(y1, b, 0), c(y1, a, 0)); // top
    quad(c(y1, a, 0), c(y1, b, 0), c(y0, b, 0), c(y0, a, 0)); // inner face
    quad(c(y0, a, 0), c(y0, b, 0), c(y0, b, BAND_T), c(y0, a, BAND_T)); // bottom
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  // an index that shares no vertex (the facets stay flat) and a blank uv, so the band merges with the points into one mesh
  geo.setIndex([...Array(pos.length / 3).keys()]);
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
  geo.computeVertexNormals();
  return geo;
}

// `arch`: the arch-lich's gilt crown; `metal` the band's and points' material, `jewel` the gems' and the brow stone's
export function lichCrown(parent, {arch, metal, jewel}) {
  const crown = new THREE.Group(), [y0, y1] = CROWN_BAND, e0 = cowlAt(y0);
  crown.name = 'crown'; crown.position.set(e0.cx, y0, e0.cz); parent.add(crown);
  const put = (geo, m, p) => { const mesh = new THREE.Mesh(geo, m); mesh.castShadow = mesh.receiveShadow = true;
    if (p) mesh.position.copy(p); mesh.position.sub(crown.position); crown.add(mesh); return mesh; };
  put(bandGeometry(), metal);
  const n = arch ? 9 : 5, up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const a = (i / (n - 1) - .5) * Math.PI * 1.3, tall = i % 2 === 0, mid = arch && i === (n - 1) / 2;
    const H = mid ? .3 : (arch ? .12 : .1) + (tall ? (arch ? .08 : .09) : 0);
    // the base sunk into the band's top, on its middle; leaning out along the band's normal and raked back
    const base = at(y1 - .012, a, CLEAR + BAND_T / 2), out = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    const dir = up.clone().addScaledVector(out, mid ? .08 : .26 + (i % 3) * .04).add(new THREE.Vector3(0, 0, -.16)).normalize();
    const geo = new THREE.ConeGeometry(.02, H, 4); geo.translate(0, H / 2, 0);
    put(geo, metal, base).quaternion.setFromUnitVectors(up, dir);
    if (tall) { const gem = put(new THREE.SphereGeometry(.011, 16, 12), jewel, base.clone().addScaledVector(dir, H * .72).addScaledVector(out, .012)); gem.castShadow = false; }
  }
  // the brow stone on the band's front (cut from the gems' stone, so the crown stays two meshes), and the arch-lich's
  // drop hanging under it
  const brow = at((y0 + y1) / 2, 0, CLEAR + BAND_T + .012);
  put(new THREE.SphereGeometry(.026, 16, 12), jewel, brow).castShadow = false;
  if (arch) put(new THREE.ConeGeometry(.014, .05, 4), metal, brow.clone().add(new THREE.Vector3(0, -.05, 0))).rotation.x = Math.PI;
  return crown;
}
