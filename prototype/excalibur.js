import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {softDot} from './fx-textures.js';

// Excalibur, the king's blade, when wielded: a broad, long blade of bright steel with a hollow-ground
// edge, a fuller that burns gold-white down its middle and runes cut into both faces; a wide gold
// cross-guard whose quillons sweep down to points, round a boss set with a sapphire on each side; a
// grip wound in gold wire over dark leather; and a wheel pommel with a ruby. The fuller and runes
// breathe slowly, and now and then a spark of light lifts off the edge. Not a plain long sword.
//
// Built in the held frame of equipment.js: the grip at the origin, the blade up +y (the long sword
// reaches y .91, Excalibur a little further).

const BLADE = {base: .14, length: .82, half: .042, thick: .02};

// The blade: a flattened diamond section tapering to a point, with a ricasso near the guard.
function bladeGeometry() {
  const {base, length, half, thick} = BLADE, tip = base + length + .12;
  const ring = (y, w, t) => [-w, y, 0, 0, y, t, w, y, 0, 0, y, -t];
  const v = [...ring(base, half * .82, thick), ...ring(base + .06, half, thick), ...ring(base + length * .6, half * .9, thick * .85), ...ring(base + length, half * .55, thick * .6), 0, tip, 0];
  const idx = [];
  for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) {
    const a = r * 4 + i, b = r * 4 + (i + 1) % 4, c = a + 4, d = b + 4;
    idx.push(a, c, d, a, d, b);
  }
  for (let i = 0; i < 4; i++) idx.push(12 + i, 16, 12 + (i + 1) % 4);
  idx.push(0, 1, 2, 0, 2, 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g.toNonIndexed();
}

const plain = g => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k); return n; };
const box = (w, h, d, x, y, z, rz = 0) => { const b = new THREE.BoxGeometry(w, h, d); if (rz) b.rotateZ(rz); return plain(b.translate(x, y, z)); };

export function excaliburGeometry() {
  const steel = [bladeGeometry()], gold = [], leather = [], light = [], gems = [], ruby = [];
  const {base, length, thick} = BLADE;
  // The burning fuller, both faces, and runes crossing the blade below it.
  for (const s of [1, -1]) {
    light.push(box(.012, length * .72, .003, 0, base + .1 + length * .36, s * (thick * .78)));
    for (let i = 0; i < 6; i++) {
      const y = base + .12 + i * .075;
      light.push(box(.004, .026, .003, -.022, y, s * (thick * .72), i % 2 ? .45 : -.45), box(.004, .026, .003, .022, y + .02, s * (thick * .72), i % 2 ? -.45 : .45));
    }
  }
  // Cross-guard: a broad bar, quillons sweeping down to points, a round boss with a sapphire each side.
  gold.push(box(.3, .03, .05, 0, .115, 0));
  for (const s of [-1, 1]) {
    gold.push(box(.07, .026, .042, s * .175, .1, 0, s * -.5));
    const point = new THREE.ConeGeometry(.018, .06, 6).rotateZ(s * (Math.PI / 2 + .9)).translate(s * .215, .075, 0);
    gold.push(plain(point));
  }
  gold.push(plain(new THREE.CylinderGeometry(.04, .04, .06, 16).rotateX(Math.PI / 2).translate(0, .12, 0)));
  for (const s of [1, -1]) gems.push(plain(new THREE.SphereGeometry(.022, 10, 6).scale(1, 1, .45).translate(0, .12, s * .031)));
  // Grip: dark leather wound in a gold wire spiral, a hand-and-a-half long.
  leather.push(plain(new THREE.CylinderGeometry(.027, .031, .2, 10).translate(0, -.005, 0)));
  for (let i = 0; i < 9; i++) gold.push(plain(new THREE.TorusGeometry(.03, .0035, 4, 14).rotateX(Math.PI / 2 + .25).translate(0, -.09 + i * .021, 0)));
  // Wheel pommel: a gold disc on edge with a ruby set in each face.
  gold.push(plain(new THREE.CylinderGeometry(.05, .05, .03, 20).rotateX(Math.PI / 2).translate(0, -.15, 0)));
  for (const s of [1, -1]) ruby.push(plain(new THREE.SphereGeometry(.018, 10, 6).scale(1, 1, .4).translate(0, -.15, s * .016)));
  return {steel: steel.map(plain), gold, leather, light, gems, ruby};
}

export function excaliburMaterials() {
  return {
    steel: new THREE.MeshStandardMaterial({color: 0xe6edf2, metalness: .95, roughness: .14, emissive: 0x2a2a20, emissiveIntensity: .4}),
    gold: new THREE.MeshStandardMaterial({color: 0xe0b450, metalness: .95, roughness: .22}),
    leather: new THREE.MeshStandardMaterial({color: 0x2a1a12, roughness: .85}),
    light: new THREE.MeshStandardMaterial({color: 0xfff4d0, emissive: 0xffe7a1, emissiveIntensity: 3, roughness: .4}),
    gems: new THREE.MeshStandardMaterial({color: 0x1f4fd8, emissive: 0x2a5cff, emissiveIntensity: 1.4, metalness: .2, roughness: .1}),
    ruby: new THREE.MeshStandardMaterial({color: 0xb0122a, emissive: 0xc0142c, emissiveIntensity: 1.1, metalness: .2, roughness: .12}),
  };
}

export function buildExcalibur(g) {
  const geo = excaliburGeometry(), mats = excaliburMaterials();
  for (const key of Object.keys(geo)) {
    const m = new THREE.Mesh(mergeGeometries(geo[key]), mats[key]);
    m.castShadow = true; m.name = `excalibur ${key}`;
    // The lit parts keep their own light: the artifact glint (artifact-twist.js) leaves them be.
    if (key === 'light' || key === 'gems' || key === 'ruby') m.userData.magicShell = true;
    g.add(m);
  }
  g.userData.excalibur = true;
  g.userData.fuller = mats.light;
  return g;
}

// While wielded: the fuller and runes breathe, and sparks of light now and then lift off the edge.
const SPARKS = 10;
export function createExcaliburGlow(sword, {seed = 5} = {}) {
  let s = seed;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const pos = new Float32Array(SPARKS * 3), life = new Float32Array(SPARKS), vel = new Float32Array(SPARKS * 3);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({color: new THREE.Color(0xfff0c0).multiplyScalar(2.5), map: softDot(THREE), size: .03, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false});
  const sparks = new THREE.Points(geo, mat); sparks.frustumCulled = false; sparks.userData.magicShell = true; sword.add(sparks);
  let next = .3;
  return {
    update(dt, t) {
      dt = Math.min(Math.max(dt || 0, 0), .1);
      const fuller = sword.userData.fuller;
      if (fuller) fuller.emissiveIntensity = 2.6 + .9 * Math.sin(t * 1.7) + .3 * Math.sin(t * 5.3);
      next -= dt;
      if (next <= 0) {
        next = .25 + rand() * .5;
        let i = life.findIndex(l => l <= 0); if (i < 0) i = 0;
        const side = rand() < .5 ? -1 : 1, y = BLADE.base + .1 + rand() * BLADE.length * .8;
        pos.set([side * BLADE.half * .7, y, (rand() - .5) * .02], i * 3);
        vel.set([side * (.05 + rand() * .08), .12 + rand() * .15, (rand() - .5) * .05], i * 3);
        life[i] = .6 + rand() * .5;
      }
      for (let i = 0; i < SPARKS; i++) {
        if (life[i] <= 0) { pos[i * 3 + 1] = -99; continue; }
        life[i] -= dt;
        for (let k = 0; k < 3; k++) pos[i * 3 + k] += vel[i * 3 + k] * dt;
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = .9;
    },
    dispose() { geo.dispose(); mat.dispose(); sword.remove(sparks); },
  };
}

export function updateHeldExcalibur(hero, dt, t) {
  const sword = hero?.weaponSocket?.children?.find(c => c.userData.excalibur);
  if (!sword) return null;
  if (!sword.userData.glow) {
    sword.userData.glow = createExcaliburGlow(sword);
    const dispose = sword.userData.dispose;
    sword.userData.dispose = () => { sword.userData.glow.dispose(); dispose?.(); };
  }
  sword.userData.glow.update(dt, t);
  return sword.userData.glow;
}
