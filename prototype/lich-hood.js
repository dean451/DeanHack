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
