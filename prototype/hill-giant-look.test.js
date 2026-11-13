import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {surfaceGap} from './fit-check.js';

// Review 2026-11-12: the hill giant read as a smooth capsule doll (capsule arms, mitten fists, ball shoulders,
// brick boots, a pastel kilt, glowing disc eyes). These pin the faceted brute.
const make = () => createCreature({name: 'hill giant', symbol: 72, color: 3});
const meshes = o => { const m = []; o.traverse(x => { if (x.isMesh) m.push(x); }); return m; };
const SKIN = new THREE.Color('#a88060');

test('the hill giant\'s skin is flat shaded everywhere: trunk, arms, legs and head', () => {
  const a = make(), skin = meshes(a.g).filter(m => m.material.color?.equals(SKIN));
  assert(skin.length > 0, 'skin meshes');
  for (const m of skin) assert(m.material.flatShading, 'skin is faceted');
  // (the arms' and legs' skin is in the trunk's hide since stage 1 step 3: find it by the hide's weights on their bones)
  const onBones = (m, n) => { if (!m.isSkinnedMesh) return false; const si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
    for (let i = 0; i < si.count; i++) for (let k = 0; k < 4; k++) if (sw.getComponent(i, k) > .5 && m.skeleton.bones[si.getComponent(i, k)].name.startsWith(n + '_')) return true; return false; };
  for (const n of ['lfore', 'rfore', 'lleg1', 'rleg1']) assert(skin.some(m => onBones(m, n)), `${n} has skin`);
  assert(meshes(a.joints.head).some(m => m.material.color?.equals(SKIN)), 'head has skin');
});

test('the hill giant\'s right fist closes round the club\'s haft', () => {
  const a = make(), held = a.g.getObjectByName('held'), fist = held.children.find(c => !c.isMesh);
  assert(fist, 'a fist in the held group');
  const sectors = new Set(), v = new THREE.Vector3();
  a.g.updateMatrixWorld(true); const inv = fist.matrixWorld.clone().invert();
  for (const m of meshes(fist)) { const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld).applyMatrix4(inv);
      if (Math.hypot(v.x, v.z) > .02) sectors.add(Math.floor((Math.atan2(v.z, v.x) + Math.PI) / (Math.PI / 4)) % 8); } }
  assert(sectors.size >= 7, `the fingers and thumb close round the haft (${sectors.size} of 8 sides)`);
  // the haft runs through the fist: the club's axis passes within the fist's grip radius
  const club = meshes(held).find(m => m.geometry.type === 'CylinderGeometry'), c = new THREE.Vector3().setFromMatrixPosition(club.matrixWorld).applyMatrix4(inv);
  const d = new THREE.Vector3(0, 1, 0).transformDirection(club.matrixWorld).transformDirection(inv);
  assert(Math.hypot(c.x - d.x * c.y / d.y, c.z - d.z * c.y / d.y) < .01, 'the haft runs through the fist');
});

test('the hill giant\'s eyes are small glints, not glowing discs, and its kilt is a dull hide', () => {
  const a = make(), glints = meshes(a.head).filter(m => m.material.emissive?.getHex() > 0);
  assert(glints.length, 'the eyes glint');
  // the two glints may share one merged mesh: each is no taller than a small octahedron
  for (const m of glints) { m.geometry.computeBoundingBox(); const s = m.geometry.boundingBox.getSize(new THREE.Vector3()); assert(s.y < .02 && s.z < .02, `a small glint (${s.y.toFixed(3)} tall)`); }
  const kilt = new THREE.Color('#565040'), hsl = {}; kilt.getHSL(hsl, THREE.SRGBColorSpace);
  assert(hsl.s < .2, 'the cloth is desaturated');
  assert(meshes(a.g).some(m => m.material.color?.equals(kilt)), 'the kilt is the hide colour');
});

test('the hill giant still stands on the floor and fits its tile', () => {
  const a = make(); a.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(a.g, true);
  assert(b.min.y > -.05 && Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.8);
});

// Review 2026-11-13: the hill giant's three chest scars sat at the old rounded chest's depth, so on the faceted
// brute trunk they stood off the pectoral slabs as dark bars with their ends in the air. They are now cut into the
// skin (skin-scar.js). surfaceGap measures vertex to vertex, and the hide's facets are wide, so the trunk is
// sampled densely across every triangle (as it stands at rest) before the gap is taken: the old bars measured
// .032 this way, the carved scars .003 (their lift off the skin).
const made = () => { const a = make(); a.g.updateMatrixWorld(true); return a; };
const found = (a, f) => { const r = []; a.g.traverse(o => { if (f(o)) r.push(o); }); return r; };

function denseSkin(mesh, n = 10) {
  const pos = mesh.geometry.attributes.position, ix = mesh.geometry.index, out = [], A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  const tri = ix ? ix.count / 3 : pos.count / 3, at = k => ix ? ix.getX(k) : k;
  for (let t = 0; t < tri; t++) {
    A.fromBufferAttribute(pos, at(3 * t)); B.fromBufferAttribute(pos, at(3 * t + 1)); C.fromBufferAttribute(pos, at(3 * t + 2));
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) {
      const u = i / n, v = j / n; out.push(A.x + (B.x - A.x) * u + (C.x - A.x) * v, A.y + (B.y - A.y) * u + (C.y - A.y) * v, A.z + (B.z - A.z) * u + (C.z - A.z) * v);
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  const m = new THREE.Mesh(g); m.matrixAutoUpdate = false; m.matrixWorld.copy(mesh.matrixWorld); m.updateWorldMatrix = () => {};
  return m;
}

test('the hill giant\'s three chest scars lie in the skin of the trunk, no end standing off it', () => {
  const a = made(), scars = found(a, o => o.userData.scar), trunk = found(a, o => o.isSkinnedMesh && o.userData.part === 'body');
  assert.equal(scars.length, 3, 'three scars');
  assert.equal(trunk.length, 1, 'one trunk hide');
  const skin = denseSkin(trunk[0], 32);
  for (const s of scars) { const gap = surfaceGap(s, skin); assert(gap < .006, `scar lies in the skin (${gap.toFixed(4)})`); }
});

test('the scars are dark slashes across the chest, each as long as before, on the chest\'s front', () => {
  const a = made(), scars = found(a, o => o.userData.scar), box = new THREE.Box3(), s = new THREE.Vector3();
  const body = new THREE.Box3().setFromObject(found(a, o => o.isSkinnedMesh && o.userData.part === 'body')[0]);
  for (const m of scars) {
    box.setFromObject(m).getSize(s);
    assert(Math.hypot(s.x, s.y) > .12 * a.g.scale.x, 'a long slash');
    assert(box.min.z > (body.min.z + body.max.z) / 2, 'on the front of the chest');
    const hsl = {}; m.material.color.getHSL(hsl); assert(hsl.l < .15, 'dark');
  }
});

test('the other scarred giants keep their straight war-scars', () => {
  for (const name of ['giant', 'titan', 'cyclops']) {
    const c = createCreature({name, symbol: 72, color: 1});
    assert.equal(c.g.userData.scarred, true, name);
    assert.equal(found(c, o => o.userData.scar).length, 0, `${name} has no carved scars`);
  }
});
