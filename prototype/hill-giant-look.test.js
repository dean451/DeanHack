import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

// Review 2026-11-12: the hill giant read as a smooth capsule doll (capsule arms, mitten fists, ball shoulders,
// brick boots, a pastel kilt, glowing disc eyes). These pin the faceted brute.
const make = () => createCreature({name: 'hill giant', symbol: 72, color: 3});
const meshes = o => { const m = []; o.traverse(x => { if (x.isMesh) m.push(x); }); return m; };
const SKIN = new THREE.Color('#a88060');

test('the hill giant\'s skin is flat shaded everywhere: trunk, arms, legs and head', () => {
  const a = make(), skin = meshes(a.g).filter(m => m.material.color?.equals(SKIN));
  assert(skin.length > 0, 'skin meshes');
  for (const m of skin) assert(m.material.flatShading, 'skin is faceted');
  for (const n of ['lfore', 'rfore', 'lleg1', 'rleg1', 'head']) assert(meshes(a.joints[n]).some(m => m.material.color?.equals(SKIN)), `${n} has skin`);
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
