// Magic dragon scales (tatzelworm scales until identified). The heap of loose plates is
// built in ground-models.js like every other dragon's; this adds what marks a magic
// dragon's hide: a pale arcane sigil etched into each plate, glowing and slowly breathing
// in and out of step with its neighbours, and a few motes of spent magic drifting up off
// the heap and winking out.
//
// Both names get the same look (the heap is keyed on the appearance the player sees), so
// nothing here tells an unidentified heap apart from an identified one.
//
// sigilStrokes() and moteAt() are pure; addMagicScales() builds the meshes and animates
// them from onBeforeRender, so ground items need no update hook.

// The sigil's radius on a plate, how wide its lines are, and how high above the plate.
export const SIGIL_R = .022;
export const LINE_W = .0038;
export const SIGIL_LIFT = .0012;
// Seconds per breath of the glow, and its dimmest and brightest opacity.
export const PULSE_S = 3.2;
export const GLOW_MIN = .35, GLOW_MAX = 1;
// Motes rising off the heap: how many, how long each takes to rise (s), and how high.
export const MOTES = 12;
export const MOTE_S = 2.6;
export const MOTE_RISE = .22;

export const SIGIL_COLOR = 0xb6c4ff, MOTE_COLOR = 0xc9b8ff;

const TAU = Math.PI * 2;
const hash = (a, b = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const circle = (r, n, a0 = 0) => Array.from({length: n + 1}, (_, i) => [Math.cos(a0 + i * TAU / n) * r, Math.sin(a0 + i * TAU / n) * r]);

// The strokes of sigil number k (polylines of [x, z] in the plate's own frame, centred on
// the origin): a ring round one of three marks, cycling so neighbouring plates differ.
export function sigilStrokes(k, r = SIGIL_R) {
  const strokes = [circle(r, 28)];
  const kind = ((k % 3) + 3) % 3;
  if (kind === 0) {
    // a triangle, point to the plate's free edge, with a dot-ring in it
    strokes.push(circle(r * .82, 3, Math.PI / 2));
    strokes.push(circle(r * .22, 10));
  } else if (kind === 1) {
    // a four-point star
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const a = i * TAU / 8, rr = i % 2 ? r * .3 : r * .8;
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    strokes.push(pts);
  } else {
    // an eye: two arcs meeting at the ring, and a pupil
    const arc = s => Array.from({length: 13}, (_, i) => {
      const x = (i / 12 * 2 - 1) * r * .8;
      return [x, s * r * .45 * (1 - (x / (r * .8)) ** 2)];
    });
    strokes.push(arc(1), arc(-1), circle(r * .18, 10));
  }
  return strokes;
}

// A flat ribbon of width w along a polyline, laid on the plate's surface: surface(x, z) is
// the plate's height at a point in its frame. Pushes positions and indices into the arrays.
function ribbon(pts, w, surface, pos, idx) {
  const base = pos.length / 3;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
    const nx = -dz / L * w / 2, nz = dx / L * w / 2;
    for (const s of [-1, 1]) {
      const x = pts[i][0] + s * nx, z = pts[i][1] + s * nz;
      pos.push(x, surface(x, z) + SIGIL_LIFT, z);
    }
    if (i) { const p = base + (i - 1) * 2; idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
  }
}

// Mote i at time t (s): {x, y, z, glow} around a heap centred on the origin, reach wide.
// Each rises in a slow spiral from just above the plates, brightens, then winks out.
export function moteAt(i, t, reach = .14) {
  const period = MOTE_S * (.8 + .4 * hash(i, 1));
  const u = ((t / period + hash(i, 2)) % 1 + 1) % 1;
  const a = hash(i, 3) * TAU + u * 1.6 * (hash(i, 4) > .5 ? 1 : -1);
  const r = reach * (.25 + .75 * hash(i, 5)) * (1 - .35 * u);
  const glow = Math.sin(Math.PI * Math.min(1, u * 1.25)) ** 2 * (u < .8 ? 1 : 1 - (u - .8) / .2 * .5);
  return {x: Math.cos(a) * r, y: .025 + MOTE_RISE * u, z: Math.sin(a) * r, glow: Math.max(0, glow)};
}

// Adds the sigils and motes to ground model g. plates: [{x, z, ry, y, surface(x, z)}], each
// plate's placement (the offset and turn applied to its sheet) and its height function in
// its own frame. materials collects what g's dispose() should free.
export function addMagicScales(THREE, g, plates, materials, now = () => performance.now() / 1000) {
  const pos = [], idx = [], col = [], phase = [];
  plates.forEach((p, k) => {
    const start = pos.length / 3;
    for (const stroke of sigilStrokes(k)) ribbon(stroke, LINE_W, p.surface, pos, idx);
    // into the heap's frame: the plate's turn, then its offset
    const c = Math.cos(p.ry), s = Math.sin(p.ry);
    for (let v = start; v < pos.length / 3; v++) {
      const x = pos[v * 3], z = pos[v * 3 + 2];
      pos[v * 3] = x * c + z * s + p.x; pos[v * 3 + 1] += p.y; pos[v * 3 + 2] = -x * s + z * c + p.z;
      phase.push(hash(k, 9) * TAU);
    }
  });
  const sigilGeo = new THREE.BufferGeometry();
  sigilGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  for (let v = 0; v < pos.length / 3; v++) col.push(0, 0, 0);
  const colAttr = new THREE.Float32BufferAttribute(col, 3);
  sigilGeo.setAttribute('color', colAttr);
  sigilGeo.setIndex(idx);
  const sigilMat = new THREE.MeshBasicMaterial({color: 0xffffff, vertexColors: true, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false});
  const sigils = new THREE.Mesh(sigilGeo, sigilMat);
  sigils.userData.part = 'sigils';
  const tint = new THREE.Color(SIGIL_COLOR);
  // Each plate's sigil breathes in its own phase; the colour carries the brightness.
  const breathe = t => {
    for (let v = 0; v < phase.length; v++) {
      const k = GLOW_MIN + (GLOW_MAX - GLOW_MIN) * (.5 + .5 * Math.sin(t * TAU / PULSE_S + phase[v]));
      colAttr.setXYZ(v, tint.r * k, tint.g * k, tint.b * k);
    }
    colAttr.needsUpdate = true;
  };
  breathe(0);
  sigils.onBeforeRender = () => breathe(now());

  const reach = Math.max(.08, ...plates.map(p => Math.hypot(p.x, p.z)));
  const moteGeo = new THREE.BufferGeometry();
  const mp = new Float32Array(MOTES * 3), mc = new Float32Array(MOTES * 3);
  moteGeo.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  moteGeo.setAttribute('color', new THREE.BufferAttribute(mc, 3));
  moteGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, MOTE_RISE / 2, 0), reach + MOTE_RISE);
  const moteMat = new THREE.PointsMaterial({size: .02, vertexColors: true, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false});
  const motes = new THREE.Points(moteGeo, moteMat);
  motes.userData.part = 'motes';
  const mote = new THREE.Color(MOTE_COLOR);
  const drift = t => {
    for (let i = 0; i < MOTES; i++) {
      const m = moteAt(i, t, reach);
      mp[i * 3] = m.x; mp[i * 3 + 1] = m.y; mp[i * 3 + 2] = m.z;
      mc[i * 3] = mote.r * m.glow; mc[i * 3 + 1] = mote.g * m.glow; mc[i * 3 + 2] = mote.b * m.glow;
    }
    moteGeo.attributes.position.needsUpdate = moteGeo.attributes.color.needsUpdate = true;
  };
  drift(0);
  motes.onBeforeRender = () => drift(now());

  g.add(sigils, motes);
  materials.push(sigilMat, moteMat);
  return {sigils, motes, breathe, drift};
}
