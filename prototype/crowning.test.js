import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {crownLine, godOf, crownPose, columnAt, ringAt, createCrowning, CROWN_TIME, TITLE_AT} from './crowning.js';
import {createPrayerKneel, KNEEL_TIME} from './prayer-kneel.js';
import {liveSource} from './live-source.js';

test('the three crown lines name the side and the title; the god comes from the voice line', () => {
  assert.deepEqual(crownLine('"I crown thee...  The Hand of Elbereth!"'), {side: 'lawful', title: 'The Hand of Elbereth'});
  assert.deepEqual(crownLine('"Thou shalt be my Envoy of Balance!"'), {side: 'neutral', title: 'Envoy of Balance'});
  assert.deepEqual(crownLine('"Thou art chosen to steal souls for My Glory!"'), {side: 'chaotic', title: 'Chosen to steal souls'});
  assert.deepEqual(crownLine('Thou art chosen to take lives for My Glory!'), {side: 'chaotic', title: 'Chosen to take lives'});
  assert.equal(crownLine('You feel a hopeful feeling.'), null);
  assert.equal(godOf('The voice of Tyr booms out:'), 'Tyr');
  assert.equal(godOf('The voice of Anhur thunders:'), 'Anhur');
  assert.equal(godOf('You hear a voice.'), null);
});

test('the hero rises with arms spread and face up, and comes back down to rest', () => {
  const zero = crownPose(0);assert.ok(Math.abs(zero.lift) < 1e-12);for (const v of Object.values(zero.swing)) assert.ok(Math.abs(v) < 1e-12);
  const mid = crownPose(2);assert.ok(mid.lift > .35, 'off the floor');assert.ok(mid.swing.armZ > .8 && mid.swing.shield < -.8, 'arms spread');assert.ok(mid.head < -.2, 'face up');
  const end = crownPose(CROWN_TIME);assert.ok(Math.abs(end.lift) < 1e-9);for (const v of Object.values(end.swing)) assert.ok(Math.abs(v) < 1e-9);
  assert.equal(columnAt(0).glow, 0);assert.ok(columnAt(2).glow > .9);assert.ok(columnAt(CROWN_TIME).glow < .02);
  assert.ok(ringAt(1).down > .99 && ringAt(2.4).down < .05, 'the ring comes down onto the brow');
});

function hero() {
  const g = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group(), arm = new THREE.Group(), elbow = new THREE.Group(), wrist = new THREE.Group(), socket = new THREE.Group(), shieldArm = new THREE.Group(), shieldElbow = new THREE.Group();
  g.add(body);body.add(head, arm, shieldArm);arm.add(elbow);elbow.add(wrist);wrist.add(socket);shieldArm.add(shieldElbow);head.position.y = 1.6;
  return {g, body, head, arm, elbow, wrist, weaponSocket: socket, shieldArm, shieldElbow, actions: {}};
}

test('it waits for the kneel, crowns, announces the title once, and leaves the hero exactly as it was', () => {
  const scene = new THREE.Group(), h = hero(), titles = [], cr = createCrowning(THREE, scene, {rnd: () => .5, onTitle: t => titles.push(t)});
  assert.equal(cr.message('The voice of Tyr booms out:'), false);
  assert.equal(cr.message('"I crown thee...  The Hand of Elbereth!"', 1), true);
  cr.update(.1, h);assert.equal(scene.getObjectByName('crowning').visible, false, 'still kneeling');
  for (let i = 0; i < 9; i++) cr.update(.1, h);
  let maxLift = 0;const arm0 = h.arm.rotation.z, head0 = h.head.rotation.x;
  for (let i = 0; i < Math.ceil(CROWN_TIME / .1); i++) {
    h.body.position.y = 0; // the loop writes the bob fresh every frame
    cr.update(.1, h);maxLift = Math.max(maxLift, h.body.position.y);
    if (cr.age > 2 && cr.age < 2.2) assert.ok(h.arm.rotation.z - arm0 > .8, 'arms spread');
  }
  assert.ok(maxLift > .35, 'the hero was lifted');
  assert.deepEqual(titles, [{place: 'Crowned by Tyr', title: 'The Hand of Elbereth', side: 'lawful'}]);
  assert.ok(Math.abs(h.arm.rotation.z) < 1e-9 && Math.abs(h.head.rotation.x - head0) < 1e-9, 'back at rest');
  assert.equal(cr.active, false);assert.equal(scene.children.length, 0);
  assert.ok(TITLE_AT < CROWN_TIME);
});

test('the prayer kneel says how long it has left', () => {
  const k = createPrayerKneel();assert.equal(k.remaining, 0);
  k.message('You begin praying to Tyr.');assert.equal(k.remaining, KNEEL_TIME);
});

test('the live game crowns from the message line after the kneel, and clears it with the level', () => {
  const src = liveSource();
  assert.match(src, /createCrowning\(THREE,group,\{onTitle:/);
  assert.match(src, /crowning\.message\(text,prayerKneel\.remaining\)/);
  assert.match(src, /crowning\.update\(dt,hero\)/);
  assert.match(src, /crowning\.clear\(hero\)/);
});
