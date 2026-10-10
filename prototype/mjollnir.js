import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Mjollnir, Thor's hammer: a squat double-faced head of dark forged iron, each striking block
// framed in raised silver knotwork with a diamond inlay; a collar where the haft meets it, with a
// ring set into each side; a short haft wound in three braided leather strands between silver
// bands, a capped butt and a wrist loop. Runes cut into the end faces, the collar and the bands
// burn storm blue.
//
// Built in the held frame of equipment.js: the haft stands up y with the grip at the origin, the
// head across x at HEAD_Y. On the floor (mjollnirFloorParts) it stands upright on one side of its
// head with the haft pointing straight up, the way it waits for someone worthy to lift it.

export const HEAD_Y = .5;
const CORE = {x: .11, y: .062, z: .062};    // half-sizes of the central block of the head
const END = {x: .055, y: .088, z: .082};    // half-sizes of each striking block
const END_X = CORE.x + END.x;               // centre of a striking block along x
const COLLAR = {x: .045, y: .082, z: .074};
const HAFT = {r: .026, bottom: -.17, top: HEAD_Y - CORE.y};

const bar = (w, h, d, x, y, z, rz = 0, ry = 0) => {
  const b = new THREE.BoxGeometry(w, h, d);
  if (rz) b.rotateZ(rz);
  if (ry) b.rotateY(ry);
  return b.translate(x, y, z);
};

// A raised rectangular frame on one face, inset from its edges. `axis` is the face normal.
function frame(out, cx, cy, cz, axis, sign, a, b, inset = .014, w = .011, t = .006) {
  const n = sign * t / 2, ia = a - inset, ib = b - inset;
  if (axis === 'z') {
    out.push(bar(ia * 2, w, t, cx, cy + ib, cz + n), bar(ia * 2, w, t, cx, cy - ib, cz + n),
      bar(w, ib * 2, t, cx + ia, cy, cz + n), bar(w, ib * 2, t, cx - ia, cy, cz + n));
  } else if (axis === 'y') {
    out.push(bar(ia * 2, t, w, cx, cy + n, cz + ib), bar(ia * 2, t, w, cx, cy + n, cz - ib),
      bar(w, t, ib * 2, cx + ia, cy + n, cz), bar(w, t, ib * 2, cx - ia, cy + n, cz));
  } else {
    out.push(bar(t, w, ib * 2, cx + n, cy + ia, cz), bar(t, w, ib * 2, cx + n, cy - ia, cz),
      bar(t, ia * 2, w, cx + n, cy, cz + ib), bar(t, ia * 2, w, cx + n, cy, cz - ib));
  }
}

// A diamond of four bars on a z face (front or back), the interlace at the heart of the knotwork.
function diamond(out, cx, cy, cz, sign, r, w = .009, t = .006) {
  const n = sign * t / 2, s = r * Math.SQRT1_2, len = r * Math.SQRT2;
  for (const [dx, dy, rot] of [[s / 2, s / 2, -Math.PI / 4], [-s / 2, s / 2, Math.PI / 4], [s / 2, -s / 2, Math.PI / 4], [-s / 2, -s / 2, -Math.PI / 4]])
    out.push(bar(len, w, t, cx + dx, cy + dy, cz + n, rot));
}

// A helical leather strand around the haft.
function strand(phase, turns, r, y0, y1, tube = .0095) {
  const pts = [];
  for (let i = 0; i <= 64; i++) {
    const u = i / 64, a = phase + u * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * r, y0 + (y1 - y0) * u, Math.sin(a) * r));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, tube, 6, false);
}

// Geometry per part in the held frame: iron, silver trim, leather and the lit runes.
export function mjollnirGeometry() {
  const iron = [], trim = [], leather = [], runes = [];
  // Head: the central block and the two striking blocks.
  iron.push(bar(CORE.x * 2, CORE.y * 2, CORE.z * 2, 0, HEAD_Y, 0));
  for (const s of [-1, 1]) {
    const x = s * END_X;
    iron.push(bar(END.x * 2, END.y * 2, END.z * 2, x, HEAD_Y, 0));
    // Chamfered rims round each striking face, so the blocks read forged, not cut from a box.
    trim.push(bar(.012, END.y * 2 + .006, END.z * 2 + .006, x + s * (END.x - .004), HEAD_Y, 0));
    // Raised knotwork frames on the four long faces of the block, and a diamond front and back.
    frame(trim, x, HEAD_Y, END.z, 'z', 1, END.x, END.y);
    frame(trim, x, HEAD_Y, -END.z, 'z', -1, END.x, END.y);
    frame(trim, x, HEAD_Y + END.y, 0, 'y', 1, END.x, END.z);
    frame(trim, x, HEAD_Y - END.y, 0, 'y', -1, END.x, END.z);
    diamond(trim, x, HEAD_Y, END.z, 1, .045);
    diamond(trim, x, HEAD_Y, -END.z, -1, .045);
    // The striking face: a square plate with a lit cross and ring cut into it.
    const fx = x + s * (END.x + .004);
    trim.push(bar(.008, END.y * 1.6, END.z * 1.6, fx, HEAD_Y, 0));
    const face = s * (END.x + .009);
    runes.push(bar(.004, .1, .012, x + face, HEAD_Y, 0), bar(.004, .012, .1, x + face, HEAD_Y, 0));
    const ring = new THREE.TorusGeometry(.03, .004, 4, 18);
    ring.rotateY(Math.PI / 2); ring.translate(x + face, HEAD_Y, 0); runes.push(ring);
  }
  // The collar where the haft meets the head, with a ring set into each side and rune strokes.
  trim.push(bar(COLLAR.x * 2, COLLAR.y * 2, COLLAR.z * 2, 0, HEAD_Y, 0));
  for (const s of [-1, 1]) {
    const ring = new THREE.TorusGeometry(.04, .009, 6, 24);
    ring.translate(0, HEAD_Y, s * (COLLAR.z + .003)); trim.push(ring);
    runes.push(bar(.006, .05, .004, 0, HEAD_Y, s * (COLLAR.z + .004)));
    for (const dx of [-.014, .014]) runes.push(bar(.004, .022, .004, dx, HEAD_Y + (dx > 0 ? .008 : -.008), s * (COLLAR.z + .004), dx > 0 ? .5 : -.5));
  }
  // The haft: a core wound in three braided strands, silver bands top, middle and butt.
  leather.push(new THREE.CylinderGeometry(HAFT.r, HAFT.r * 1.08, HAFT.top - HAFT.bottom, 10).translate(0, (HAFT.top + HAFT.bottom) / 2, 0));
  for (let i = 0; i < 3; i++) leather.push(strand(i * Math.PI * 2 / 3, 4.5, HAFT.r, HAFT.bottom + .05, HAFT.top - .06));
  for (const [y, r, h] of [[HAFT.top - .03, .038, .05], [.14, .034, .022], [HAFT.bottom + .02, .038, .05]]) {
    trim.push(new THREE.CylinderGeometry(r, r, h, 12).translate(0, y, 0));
    runes.push(new THREE.TorusGeometry(r + .001, .0025, 4, 20).rotateX(Math.PI / 2).translate(0, y, 0));
  }
  // The butt: a squared pommel cap and a leather wrist loop hanging from it.
  trim.push(bar(.06, .03, .06, 0, HAFT.bottom - .015, 0));
  leather.push(new THREE.TorusGeometry(.032, .006, 6, 18).translate(0, HAFT.bottom - .06, 0));
  return {iron, trim, leather, runes};
}

const merged = list => mergeGeometries(list);

export function mjollnirMaterials() {
  return {
    iron: new THREE.MeshStandardMaterial({color: 0x4e555d, metalness: .88, roughness: .38}),
    trim: new THREE.MeshStandardMaterial({color: 0xb3bcc6, metalness: .95, roughness: .26}),
    leather: new THREE.MeshStandardMaterial({color: 0x3a291e, roughness: .82}),
    runes: new THREE.MeshStandardMaterial({color: 0x1d3346, emissive: 0x8fd0ff, emissiveIntensity: 2.4, roughness: .5}),
  };
}

// The held model, added into the war hammer group equipment.js gives it (merged per material).
export function buildMjollnir(g) {
  const geo = mjollnirGeometry(), mats = mjollnirMaterials();
  for (const key of ['iron', 'trim', 'leather', 'runes']) {
    const m = new THREE.Mesh(merged(geo[key]), mats[key]);
    m.castShadow = true; m.name = `mjollnir ${key}`;
    if (key === 'runes') m.userData.mjollnirRunes = true;
    g.add(m);
  }
  g.userData.mjollnir = true;
  g.userData.runes = mats.runes;
  return g;
}

// Held frame to floor frame: stood upright on one side of its head with the haft straight up,
// the head's long axis lying along the floor. Turned 180 degrees about x and lifted so the head
// sits on the floor at y 0. FLOOR_SCALE keeps it a hammer, not a statue, beside the hero.
export const FLOOR_SCALE = .8;
export const FLOOR_MATRIX = new THREE.Matrix4().makeScale(FLOOR_SCALE, FLOOR_SCALE, FLOOR_SCALE)
  .multiply(new THREE.Matrix4().makeRotationX(Math.PI).setPosition(0, HEAD_Y + END.y, 0));

// The floor model's parts: [geometry, key] in the floor frame, runes left to artifact-twist.js.
export function mjollnirFloorParts() {
  const geo = mjollnirGeometry();
  return ['iron', 'trim', 'leather'].map(key => [merged(geo[key]).applyMatrix4(FLOOR_MATRIX), key]);
}
export function mjollnirFloorRunes() {
  return mjollnirGeometry().runes.map(g => g.applyMatrix4(FLOOR_MATRIX));
}
