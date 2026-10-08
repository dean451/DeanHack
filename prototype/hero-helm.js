import * as THREE from 'three';

// The hero's war-helm: a faceted iron cap (flat-shaded, low-poly, never a smooth dome), a raised
// fin-crest running front to back, a brow band, a nasal guard that stops above the eyes so the face
// stays visible, swept raven-wing blades at the temples and angled cheek plates. +z is the face; the
// group sits on the head group, whose origin is the centre of the skull.
// `m` supplies materials: {iron, steel, trim}. Everything is a handful of cheap meshes.

function finGeometry() {
  // side profile in (z, y): a hooked prow over the brow, a ragged spine, a cut-off tail
  const pts = [[.19, .1], [.17, .165], [.12, .222], [.075, .232], [.045, .282], [.0, .262], [-.04, .31], [-.09, .255], [-.15, .21], [-.2, .12], [-.2, .08]];
  const s = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
  const geo = new THREE.ExtrudeGeometry(s, {depth: .018, bevelEnabled: false});
  geo.translate(0, 0, -.009);
  geo.rotateY(-Math.PI / 2); // shape x -> head +z, extrusion -> head x
  return geo;
}

export function buildHelm(helmet, m) {
  const add = (geo, mat, name, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, mat); o.name = name; o.position.set(x, y, z); helmet.add(o); return o; };
  const cap = add(new THREE.SphereGeometry(.222, 10, 5, 0, Math.PI * 2, 0, Math.PI * .5), m.iron, 'HelmCap', 0, .03, -.015);
  cap.geometry = cap.geometry.toNonIndexed(); cap.geometry.computeVertexNormals();
  cap.scale.set(.98, 1.06, 1);
  // brow band: a ribbed, faceted ring just above the eyes, with a heavy lip at the front
  const band = add(new THREE.CylinderGeometry(.212, .222, .034, 10, 1, true), m.trim, 'HelmBrow', 0, .082, -.015);
  band.material = m.trim.clone(); band.material.side = THREE.DoubleSide; band.material.flatShading = true;
  add(new THREE.BoxGeometry(.1, .016, .02), m.trim, 'HelmBrowLip', 0, .098, .21).rotation.x = -.35;
  add(finGeometry(), m.steel, 'HelmCrest', 0, 0, -.015);
  // nasal guard: a flat tapered blade down the forehead, ending above the eyes (eyes sit at y ~ .016)
  add(new THREE.BoxGeometry(.024, .05, .012), m.steel, 'HelmNasal', 0, .115, .205).rotation.x = -.18;
  const tip = add(new THREE.ConeGeometry(.016, .05, 4), m.steel, 'HelmNasalTip', 0, .07, .212);
  tip.rotation.set(Math.PI - .18, Math.PI / 4, 0); tip.scale.z = .45;
  for (const side of [-1, 1]) {
    // cheek plates: angled slabs that hang from the band and cut in towards the jaw
    const plate = add(new THREE.BoxGeometry(.03, .15, .105), m.iron, 'HelmCheek', side * .168, -.03, .03);
    plate.rotation.set(0, side * .22, side * .16);
    add(new THREE.ConeGeometry(.026, .06, 4), m.iron, 'HelmCheekPoint', side * .163, -.148, .045).rotation.set(Math.PI, 0, side * .16);
    // raven-wing blades swept back from the temple, longest on top
    for (let i = 0; i < 4; i++) {
      const blade = add(new THREE.ConeGeometry(.034 - i * .003, .36 - i * .05, 4), i % 2 ? m.iron : m.steel, 'HelmWing', side * .205, .12 - i * .032, -.02 - i * .05);
      blade.scale.z = .26; blade.rotation.set(-1 - i * .2, 0, -side * (.62 + i * .14), 'YXZ');
    }
  }
  return helmet;
}
