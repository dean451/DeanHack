import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fxTimeline, delayTimeline} from './fx.js';
import {flightsFromFx} from './flights.js';
import {throwLaunches, throwPose, throwStyle, THROW_TIME, RELEASE_U, THROW_WINDUP_MS, MAX_THROWS, MAX_THROW_LEAD_MS} from './throw-motion.js';
import {queueThrows, updateActions, clearActionPose, createActionQueue, enqueueAction} from './actions.js';

// A flash-mode throw from (2, 2) towards +x, one cell per tick; `seqs` volleys in a row.
const throwTo = (endX, effect, seqs = 1) => {
  const steps = [];
  for (let n = 0; n < seqs; n++) {
    steps.push({op: 'start', mode: 'flash', effect});
    for (let x = 3; x <= endX; x++) steps.push({op: 'draw', x, z: 2}, {op: 'tick'});
    steps.push({op: 'end'});
  }
  return fxTimeline({type: 'fx', steps});
};
const ARROW = {kind: 'object', class: 2, material: 11, shape: 'arrow'};
const DAGGER = {kind: 'object', class: 2, material: 11, shape: 'dagger'};

const rig = (extra = {}) => {
  const g = new THREE.Group(), arm = new THREE.Object3D(), wrist = new THREE.Object3D(), weaponSocket = new THREE.Object3D();
  g.add(arm); arm.add(wrist); wrist.add(weaponSocket);
  return {g, arm, wrist, weaponSocket, ...extra};
};
const snapshot = a => [a.g.position.toArray(), a.g.rotation.toArray().slice(0, 3), a.arm.rotation.toArray().slice(0, 3),
  a.wrist.rotation.toArray().slice(0, 3), a.arms?.[0]?.rotation.toArray().slice(0, 3), a.offHand?.rotation.toArray().slice(0, 3)];

test('a launch is the thrower cell and first step of each flight', () => {
  assert.deepEqual(throwLaunches(throwTo(6, DAGGER)), [{x: 2, z: 2, dir: [1, 0], at: 0, style: 'hurl'}]);
  assert.equal(throwLaunches(throwTo(6, ARROW))[0].style, 'shoot');
  assert.equal(throwStyle('bolt'), 'shoot');
  assert.equal(throwStyle('flask'), 'hurl');
  const volley = throwLaunches(throwTo(4, ARROW, 5));
  assert.equal(volley.length, MAX_THROWS, 'a volley is capped');
  assert.ok(volley[1].at > volley[0].at);
  assert.deepEqual(throwLaunches({sprites: []}), []);
});

test('throw poses rest at both ends and release on the forward whip', () => {
  assert.equal(THROW_WINDUP_MS, Math.round(THROW_TIME * RELEASE_U * 1000));
  for (const [style, c] of [['hurl', null], ['shoot', null], ['shoot', 'bow'], ['hurl', 'spear']]) {
    const values = u => { const {swing, ...p} = throwPose(style, u, c); return [...Object.values(p), ...Object.values(swing ?? {})]; };
    for (const u of [0, 1]) for (const v of values(u)) assert.ok(Math.abs(v) < 1e-9, `${style}/${c} at ${u}`);
    for (let u = 0; u <= 1; u += .01) for (const v of values(u)) assert.ok(Number.isFinite(v) && Math.abs(v) < 3.2);
  }
  // The hurl goes up and back, then comes forward over the top through the release.
  assert.ok(throwPose('hurl', .24).arm < -2.4);
  assert.ok(throwPose('hurl', RELEASE_U).arm > -1.5 && throwPose('hurl', RELEASE_U).pitch > 0);
  // The bow is up and drawn at the release; the draw hand snaps forward just after.
  const loose = throwPose('shoot', RELEASE_U, 'bow');
  assert.ok(loose.off < -1.3 && loose.arm < -.3);
  assert.ok(throwPose('shoot', RELEASE_U + .05, 'bow').arm > loose.arm);
});

test('queueThrows turns the thrower, delays the flight to the release and returns to rest', () => {
  const hero = rig();
  const tl = throwTo(6, DAGGER);
  const delay = queueThrows(tl, (x, z) => x === 2 && z === 2 ? hero : null);
  assert.equal(delay, THROW_WINDUP_MS);
  assert.equal(hero.actions.queue[0].kind, 'throw');
  assert.deepEqual(hero.actions.queue[0].dir, [1, 0]);
  const flight = flightsFromFx(delayTimeline(tl, delay))[0];
  assert.equal(flight.start, THROW_WINDUP_MS);
  const rest = snapshot(hero);
  let t = 0, atRelease = null;
  for (let i = 0; i < 40; i++) {
    clearActionPose(hero, hero.actions);
    updateActions(hero, hero.actions, .02); t += .02;
    if (atRelease === null && t * 1000 >= THROW_WINDUP_MS - 1) atRelease = hero.arm.rotation.x;
    for (const v of snapshot(hero).flat().filter(v => v !== undefined)) assert.ok(Number.isFinite(v));
  }
  assert.ok(atRelease < -1.2, 'the arm is coming forward at the release');
  clearActionPose(hero, hero.actions);
  // Facing +x is kept, as after an attack; everything else is back at rest.
  assert.ok(Math.abs(hero.g.rotation.y - Math.PI / 2) < 1e-9);
  hero.g.rotation.y = 0;
  assert.deepEqual(snapshot(hero), rest);
});

test('an elbowed arm folds back behind the head, whips straight at the release, and ends at rest', () => {
  // The hero's arm (main.js): upper arm and forearm .25 each, the elbow resting at -.65.
  const elbow = new THREE.Object3D(), hand = new THREE.Object3D();
  const hero = rig({elbow});
  hero.arm.position.set(.3, 1.2, 0);
  hero.arm.add(elbow); elbow.position.set(0, -.25, 0); elbow.rotation.x = -.65;
  elbow.add(hand); hand.position.set(0, -.25, 0);
  const rest = snapshot(hero);
  queueThrows(throwTo(6, DAGGER), () => hero);
  let t = 0, minElbow = 0, behind = false, atRelease = null;
  const p = new THREE.Vector3();
  for (let i = 0; i < 40; i++) {
    clearActionPose(hero, hero.actions);
    hero.g.rotation.y = 0;
    updateActions(hero, hero.actions, .02); t += .02;
    minElbow = Math.min(minElbow, elbow.rotation.x);
    // The throw turns to face +x; measure in the thrower's own frame.
    const yaw = hero.g.rotation.y; hero.g.rotation.y = 0; hero.g.updateMatrixWorld(true);
    hand.getWorldPosition(p);
    hero.g.rotation.y = yaw;
    for (const v of p.toArray()) assert.ok(Number.isFinite(v) && Math.abs(v) < 2);
    if (p.y > 1.2 && p.z < -.05) behind = true;
    if (atRelease === null && t * 1000 >= THROW_WINDUP_MS - 1) atRelease = {elbow: elbow.rotation.x, z: p.z};
  }
  assert.ok(minElbow < -1.35, 'the forearm folds in the windup');
  assert.ok(behind, 'the hand goes back behind the head');
  assert.ok(atRelease.elbow > -.4 && atRelease.z > .15, 'the arm is nearly straight and forward at the release');
  clearActionPose(hero, hero.actions);
  hero.g.rotation.y = 0;
  assert.deepEqual(snapshot(hero), rest);
  assert.ok(Math.abs(elbow.rotation.x + .65) < 1e-9 && elbow.rotation.y === 0 && elbow.rotation.z === 0);
  // A shot straightens the arm to aim instead.
  assert.ok(throwPose('shoot', RELEASE_U).swing.elbow > .4);
});

test('a busy thrower waits, capped; nobody there means no delay', () => {
  assert.equal(queueThrows(throwTo(6, DAGGER), () => null), 0);
  const busy = rig();
  busy.actions = createActionQueue();
  enqueueAction(busy.actions, {kind: 'hit', attack: 'bite'});
  const d = queueThrows(throwTo(6, DAGGER), () => busy);
  assert.ok(d > THROW_WINDUP_MS && d <= MAX_THROW_LEAD_MS);
  const dead = rig();
  dead.actions = createActionQueue();
  enqueueAction(dead.actions, {kind: 'die'});
  assert.equal(queueThrows(throwTo(6, DAGGER), () => dead), 0);
});

test('a centaur archer draws and looses its bow, and ends at rest', () => {
  const arms = [new THREE.Object3D()], offHand = new THREE.Object3D();
  const c = rig({arms, offHand, centaur: 'bow'});
  c.g.add(arms[0]); arms[0].add(offHand);
  const rest = snapshot(c);
  queueThrows(throwTo(8, ARROW), () => c);
  let minOff = 0;
  for (let i = 0; i < 40; i++) {
    clearActionPose(c, c.actions);
    updateActions(c, c.actions, .02);
    minOff = Math.min(minOff, arms[0].rotation.x);
  }
  assert.ok(minOff < -1.3, 'the bow arm came up');
  clearActionPose(c, c.actions);
  c.g.rotation.y = 0;
  assert.deepEqual(snapshot(c), rest);
});
