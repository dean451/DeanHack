import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {arrowPoints, forwardOf, createOrientationOverlay, liveEntries, COLORS, MAX_ARROWS} from './orientation-overlay.js';
import {yawToward} from './orientation.js';

test('an arrow is a shaft along the facing with two barbs at the tip and a tick at the tail', () => {
  const pts = arrowPoints(new THREE.Vector3(1, 0, 2), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), .5, .14);
  assert.equal(pts.length, 8);
  assert.deepEqual([pts[0].x, pts[0].z], [1, 2], 'shaft starts at the origin');
  assert.ok(Math.abs(pts[1].z - 2.5) < 1e-9 && Math.abs(pts[1].x - 1) < 1e-9, 'tip is length along the facing');
  assert.ok(pts[3].z < pts[1].z && pts[5].z < pts[1].z, 'both barbs lie behind the tip');
  assert.ok(Math.sign(pts[3].x - 1) !== Math.sign(pts[5].x - 1), 'barbs on opposite sides');
  assert.ok(Math.abs(pts[6].z - 2) < 1e-9 && Math.abs(pts[7].z - 2) < 1e-9, 'the tail tick sits at the origin');
  for (const p of pts) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z));
});

test('forward follows the convention: +z at yaw 0, east at +PI/2, and a held weapon points along its own +y', () => {
  const o = new THREE.Object3D();
  let f = forwardOf(o); assert.ok(Math.abs(f.z - 1) < 1e-9 && Math.abs(f.x) < 1e-9, 'authored front is +z');
  o.rotation.y = yawToward(1, 0); f = forwardOf(o); assert.ok(Math.abs(f.x - 1) < 1e-9 && Math.abs(f.z) < 1e-9, 'east');
  o.rotation.y = yawToward(0, -1); f = forwardOf(o); assert.ok(Math.abs(f.z + 1) < 1e-9, 'north');
  const parent = new THREE.Object3D(); parent.rotation.y = Math.PI / 2; const child = new THREE.Object3D(); parent.add(child);
  f = forwardOf(child); assert.ok(Math.abs(f.x - 1) < 1e-9, 'a child inherits its parent\'s yaw (world facing, not local)');
  const w = new THREE.Object3D(); w.rotation.z = -Math.PI / 2; f = forwardOf(w, 'y'); assert.ok(Math.abs(f.x - 1) < 1e-9, 'a weapon tipped over points along +x');
});

test('the overlay draws one coloured arrow per entry, nothing when off, and never more than its buffer', () => {
  const parent = new THREE.Group(), overlay = createOrientationOverlay(parent);
  assert.equal(overlay.enabled, false); assert.equal(parent.children[0], overlay.lines); assert.equal(overlay.lines.visible, false);
  const hero = new THREE.Object3D(), pet = new THREE.Object3D(); pet.position.set(2, 0, 0); pet.rotation.y = Math.PI;
  assert.equal(overlay.update([{object: hero, kind: 'hero'}]), 0, 'off: draws nothing');
  overlay.set(true);
  assert.equal(overlay.update([{object: hero, kind: 'hero'}, {object: pet, kind: 'pet'}, {object: null}]), 2);
  assert.equal(overlay.lines.visible, true); assert.equal(overlay.lines.geometry.drawRange.count, 2 * 8);
  const c = overlay.lines.geometry.attributes.color, col = new THREE.Color(COLORS.pet);
  assert.ok(Math.abs(c.getX(8) - col.r) < 1e-6 && Math.abs(c.getY(8) - col.g) < 1e-6, 'the second arrow carries the pet colour');
  const pos = overlay.lines.geometry.attributes.position;
  assert.ok(pos.getZ(9) < pos.getZ(8), 'the pet faces north, so its tip is at smaller z');
  const hidden = new THREE.Object3D(); hidden.visible = false;
  assert.equal(overlay.update([{object: hidden, kind: 'monster'}]), 0, 'hidden objects get no arrow');
  const many = Array.from({length: MAX_ARROWS + 20}, () => ({object: new THREE.Object3D(), kind: 'monster'}));
  assert.equal(overlay.update(many), MAX_ARROWS, 'capped at the buffer');
  overlay.set(false); assert.equal(overlay.lines.visible, false); assert.equal(overlay.lines.geometry.drawRange.count, 0);
  overlay.dispose(); assert.equal(parent.children.length, 0);
});

test('a live scene offers the hero, actors, their held weapons, doors, axis features and flying boulders', () => {
  const socket = new THREE.Group(); const sword = new THREE.Object3D(); socket.add(sword);
  const hero = {g: new THREE.Group(), weaponSocket: socket};
  const pet = {g: new THREE.Group()}; pet.g.userData.disposition = 'pet';
  const orc = {g: new THREE.Group(), disposition: 'hostile'};
  const doorTile = {userData: {door: new THREE.Group()}}, bridgeTile = {userData: {axisFeature: new THREE.Group()}}, plain = {userData: {}};
  const boulder = {outer: new THREE.Group(), shape: 'boulder'}, arrow = {outer: new THREE.Group(), shape: 'arrow'};
  const entries = liveEntries({hero, actors: [pet, orc, null], tiles: [doorTile, bridgeTile, plain], flights: [boulder, arrow]});
  assert.deepEqual(entries.map(e => e.kind), ['hero', 'weapon', 'pet', 'monster', 'door', 'feature', 'boulder']);
  assert.equal(entries[1].object, sword); assert.equal(entries[1].axis, 'y');
  assert.equal(entries[6].object, boulder.outer, 'only boulders among the flights');
  assert.deepEqual(liveEntries(), [], 'nothing without a scene');
});

test('the live game wires the overlay: ?orient turns it on, the debug hook toggles it, and it updates last in the loop', async () => {
  const {readFileSync} = await import('node:fs');
  const src = readFileSync(new URL('./live.js', import.meta.url), 'utf8');
  assert.match(src, /const orientOverlay=createOrientationOverlay\(group\);if\(new URLSearchParams\(location\.search\)\.has\('orient'\)\)orientOverlay\.set\(true\)/);
  assert.match(src, /if\(orientOverlay\.enabled\)orientOverlay\.update\(liveEntries\(\{hero,actors:actors\.values\(\),tiles:tiles\.values\(\),flights:flights\.active\}\)\);/);
  assert.match(src, /orient\(on\)\{return orientOverlay\.set\(on\);\}/);
  const flights = readFileSync(new URL('./flights.js', import.meta.url), 'utf8');
  assert.match(flights, /get active\(\) \{ return flights\.map\(x => \(\{outer: x\.outer, shape: x\.f\.shape\}\)\); \}/);
});
