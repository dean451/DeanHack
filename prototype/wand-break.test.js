import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {breakMessage, fizzleMessage, forceMessage, breakPose, bowAt, createWandBreak, SNAP_AT, SNAP_MS, BREAK_TIME, HALVES_LIFE} from './wand-break.js';
import {liveSource} from './live-source.js';

const BREAK = 'Raising the oak wand high above your head, you break it in two!';

test('the lines apply.c prints when a wand is broken', () => {
  assert.ok(breakMessage(BREAK));
  assert.ok(breakMessage('Raising the wand of fire high above your head, you snap it in two!'));
  assert.ok(!breakMessage('You break the wand.'));
  assert.ok(fizzleMessage('But nothing else happens...'));
  assert.ok(fizzleMessage('Suddenly, and without warning, nothing happens.'));
  assert.ok(fizzleMessage('You really wish you hadn\'t done that.'));
  assert.ok(forceMessage('A wall of force smashes down around you!'));
  assert.ok(!forceMessage('You feel a wrenching sensation.'));
});

test('the arms go up, strain, are thrown apart at the snap and come back to rest', () => {
  for (const v of Object.values(breakPose(0))) assert.equal(v, 0);
  for (const v of Object.values(breakPose(BREAK_TIME))) assert.equal(v, 0);
  const up = breakPose(.45);assert.ok(up.arm < -2.5 && up.offArm < -2.5, 'both hands overhead');
  assert.ok(breakPose(SNAP_AT + .12).arm > up.arm, 'the snap throws the hands down a little');
  assert.equal(bowAt(.2), 0);assert.ok(bowAt(.55) > 0 && bowAt(.55) < 1);assert.equal(bowAt(SNAP_AT + .1), 1);
});

// a stand-in hero with the swing.js rig parts
function hero() {
  const g = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group(), arm = new THREE.Group(), elbow = new THREE.Group(), wrist = new THREE.Group(), socket = new THREE.Group(), shieldArm = new THREE.Group(), shieldElbow = new THREE.Group();
  g.add(body);body.add(head, arm, shieldArm);arm.add(elbow);elbow.add(wrist);wrist.add(socket);shieldArm.add(shieldElbow);head.position.y = 1.6;
  return {g, body, head, arm, elbow, wrist, weaponSocket: socket, shieldArm, shieldElbow, actions: {}};
}
let seed = 3;const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

test('the wand is held over the head, snaps into two halves that land on the floor, and the explosion waits for the snap', () => {
  const scene = new THREE.Group(), h = hero(), wb = createWandBreak(THREE, scene, {rnd});
  assert.equal(wb.holdMs(), 0);
  assert.equal(wb.message(BREAK, h), true);
  assert.equal(wb.holdMs(), SNAP_MS, 'an explosion arriving now is held back until the snap');
  const root = scene.getObjectByName('wandBreak');assert.ok(root);
  const wand = root.children[0];assert.ok(wand.position.y > 1.9, 'over the head');
  const arm0 = h.arm.rotation.x;
  wb.update(.1, h);wb.update(.1, h);wb.update(.1, h);wb.update(.1, h);
  assert.ok(h.arm.rotation.x < arm0 - 1.5, 'the arm is up');
  assert.ok(wb.holdMs() > 0 && wb.holdMs() < SNAP_MS);
  for (let i = 0; i < 8; i++) wb.update(.1, h);
  assert.equal(wb.holdMs(), 0, 'past the snap');
  const [l, r] = wand.children;assert.ok(r.position.x - l.position.x > .5, 'the halves fly apart');
  for (let i = 0; i < 8; i++) wb.update(.1, h);
  assert.ok(l.userData.landed && r.userData.landed, 'and land');
  assert.ok(Math.abs(h.arm.rotation.x - arm0) < 1e-9, 'the arm is back at rest');
  for (let i = 0; i < 12; i++) wb.update(.1, h);
  assert.ok(wb.age === null && scene.children.length === 0, `gone after ${HALVES_LIFE}s`);
});

test('nothing else happening is a grey puff; a wall of force is a ring slamming down', () => {
  const scene = new THREE.Group(), h = hero(), wb = createWandBreak(THREE, scene, {rnd});
  assert.equal(wb.message('But nothing else happens...', h), false, 'only after a break');
  wb.message(BREAK, h);assert.equal(wb.message('But nothing else happens...', h), true);
  for (let i = 0; i < 9; i++) wb.update(.1, h);
  const puff = scene.getObjectByName('wandBreak').children.find(o => o.isSprite && o.material.color.getHexString() === '8a8a86');
  assert.ok(puff.material.opacity > 0, 'the puff after the snap');
  wb.clear(h);assert.equal(scene.children.length, 0);
  wb.message(BREAK, h);assert.equal(wb.message('A wall of force smashes down around you!', h), true);
  const ring = scene.getObjectByName('wandBreak').children.find(o => o.isMesh && o.geometry.type === 'CylinderGeometry');
  for (let i = 0; i < 7; i++) wb.update(.1, h);const high = ring.position.y;
  for (let i = 0; i < 3; i++) wb.update(.1, h);assert.ok(ring.position.y < high, 'it comes down');
  wb.clear(h);
});

test('the live game breaks the wand from the message line, holds the explosion for the snap, and clears it with the level', () => {
  const src = liveSource();
  assert.match(src, /createWandBreak\(THREE,group\)/);
  assert.match(src, /wandBreak\.message\(text,hero\)/);
  assert.match(src, /wandBreak\.update\(dt,hero\)/);
  assert.match(src, /wandBreak\.clear\(hero\)/);
  assert.match(src, /const breakHold=L\.wandBreak\?\.holdMs\(\)\|\|0;const shown=breakHold\?delayTimeline\(shown0,breakHold\):shown0;/);
});
