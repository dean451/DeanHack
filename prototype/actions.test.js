import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {ACTION_TIME, actionsForCombat, createActionQueue, enqueueAction, updateActions,
  clearActionPose, holdBackMs, actionState, remainingTime} from './actions.js';

// Records every transform the action layer can touch.
const snap = a => JSON.stringify([a.g.position.toArray(), a.g.rotation.toArray().slice(0, 3), a.g.scale.toArray(),
  a.body?.position.y, a.head?.rotation.x, a.arm?.rotation.x, a.wrist?.rotation.x, a.weaponSocket?.rotation.z,
  a.legs?.[0]?.rotation.x, a.tail?.rotation.x].map(v => Array.isArray(v) ? v.map(n => +n.toFixed(6)) : v == null ? null : +v.toFixed(6)));

function hero() {
  const g = new THREE.Group(), part = () => { const o = new THREE.Object3D(); g.add(o); return o; };
  return {g, body: part(), head: part(), arm: part(), wrist: part(), weaponSocket: part(), legs: [part(), part()], tail: part()};
}

// Steps a frame the way live.js will: take off last frame's offsets, (frame loop), re-pose.
function run(actor, q, seconds, dt = 1 / 60, each) {
  const states = [];
  for (let t = 0; t < seconds; t += dt) {
    clearActionPose(actor, q);
    states.push(updateActions(actor, q, dt));
    each?.(actor);
  }
  return states;
}

test('combat events split into attacker and defender actions', () => {
  const hit = actionsForCombat({attack: 'bite', result: 'hit', dir: [1, 0], attacker: {seen: true, x: 1, z: 1}, defender: {you: true, x: 2, z: 1}});
  assert.equal(hit.attacker.kind, 'attack');
  assert.equal(hit.attacker.attack, 'bite');
  assert.deepEqual(hit.defender, {kind: 'hit', dir: [1, 0]});
  const miss = actionsForCombat({attack: 'claw', result: 'miss', dir: [1, 1], attacker: {you: true}, defender: {seen: true, x: 3, z: 3}});
  assert.equal(miss.defender, null);
  assert.ok(Math.abs(Math.hypot(...miss.attacker.dir) - 1) < 1e-9);
  const unseen = actionsForCombat({attack: 'weapon', result: 'hit', dir: null, attacker: {seen: false}, defender: {you: true}});
  assert.equal(unseen.attacker, null);
  assert.equal(unseen.defender.kind, 'hit');
  assert.deepEqual(actionsForCombat(null), {attacker: null, defender: null});
});

test('every attack type and a hit play, stay finite and bounded, and return to rest', () => {
  for (const make of [hero, () => createCreature({name: 'jackal'}), () => createCreature({name: 'dwarf'})]) {
    for (const attack of ['claw', 'bite', 'weapon', 'kick', 'butt', 'sting', 'touch', 'engulf', 'other']) {
      const a = make(), q = createActionQueue();
      a.g.position.set(4, 0, 7); a.g.rotation.y = .3;
      const rest = snap(a);
      assert.ok(enqueueAction(q, {kind: 'attack', attack, result: 'hit', dir: [0, -1]}));
      assert.ok(enqueueAction(q, {kind: 'hit', dir: [1, 0]}));
      let peak = 0;
      const states = run(a, q, ACTION_TIME.attack + ACTION_TIME.hit + .2, 1 / 60, x => {
        for (const n of JSON.parse(snap(x)).flat()) assert.ok(n === null || Number.isFinite(n), attack);
        peak = Math.max(peak, Math.hypot(x.g.position.x - 4, x.g.position.z - 7));
      });
      assert.ok(states.includes('attack') && states.includes('hit'), attack);
      assert.equal(states.at(-1), 'idle');
      assert.ok(peak > .02 && peak < .45, `${attack} lunge ${peak}`);
      // Back at rest, except that the attacker now faces where it struck (−z).
      const end = JSON.parse(snap(a)), start = JSON.parse(rest);
      assert.ok(Math.abs(Math.cos(end[1][1]) - Math.cos(Math.PI)) < 1e-6, `${attack} faces target`);
      end[1][1] = start[1][1];
      assert.deepEqual(end, start, attack);
    }
  }
});

test('a frame that moves the actor mid-action does not snap it', () => {
  const a = hero(), q = createActionQueue();
  enqueueAction(q, {kind: 'attack', attack: 'weapon', result: 'miss', dir: [1, 0]});
  // Sampled finely, a continuous pose moves a little each step; a snap shows up as a jump.
  let prev = null, maxStep = 0;
  run(a, q, .6, 1 / 240, x => {
    // The frame loop glides toward a new tile the whole time, as live.js does.
    x.g.position.x += .0025;
    if (prev) maxStep = Math.max(maxStep, x.g.position.distanceTo(prev));
    prev = x.g.position.clone();
  });
  assert.ok(maxStep < .03, `largest per-frame step ${maxStep}`);
});

test('deaths hold their pose, block later actions and hold back the map', () => {
  const a = createCreature({name: 'newt'}), q = createActionQueue();
  enqueueAction(q, {kind: 'hit', dir: [0, 1]});
  enqueueAction(q, {kind: 'die', dir: [0, 1]});
  assert.equal(enqueueAction(q, {kind: 'attack', attack: 'bite', dir: [1, 0]}), false);
  const hold = holdBackMs([q, createActionQueue()]);
  assert.ok(hold > 0 && hold <= 1000, `hold ${hold}`);
  assert.ok(Math.abs(remainingTime(q) * 1000 - hold) <= 1);
  run(a, q, 1.5);
  assert.equal(actionState(q), 'die');
  assert.ok(q.finished);
  assert.equal(holdBackMs([q]), 0);
  assert.ok(Math.abs(a.g.rotation.z) > 1.2, 'toppled');
  assert.ok(a.g.position.y < -.05 && a.g.position.y > -.2, 'sunk');
});

test('a backlog plays faster so the actor keeps up', () => {
  const q = createActionQueue(), a = hero();
  for (let i = 0; i < 5; i++) enqueueAction(q, {kind: 'attack', attack: 'claw', result: 'hit', dir: [1, 0]});
  const alone = 5 * ACTION_TIME.attack;
  assert.ok(remainingTime(q) < alone);
  const states = run(a, q, alone);
  assert.equal(states.at(-1), 'idle');
  assert.equal(enqueueAction(q, {kind: 'dance'}), false);
});
