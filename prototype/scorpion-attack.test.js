import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose, ACTION_TIME, STRIKE_U} from './actions.js';
import {scorpionAttackPose} from './scorpion-attack.js';

test('scorpion attack poses are finite and start and end at rest', () => {
  for (const attack of ['claw', 'sting', 'bite', undefined]) for (const result of ['hit', 'miss']) {
    for (let i = 0; i <= 50; i++) for (const v of Object.values(scorpionAttackPose(attack, i / 50, result))) assert(Number.isFinite(v), attack);
    for (const u of [0, 1]) for (const [k, v] of Object.entries(scorpionAttackPose(attack, u, result))) assert(Math.abs(v) < 1e-9, `${attack} ${k} at ${u}`);
  }
  for (const v of Object.values(scorpionAttackPose('claw', NaN))) assert(Number.isFinite(v));
});

test('a stinging scorpion pumps its tail once more after a hit, but not after a miss', () => {
  const tail = (result, u) => scorpionAttackPose('sting', u, result).tail;
  assert(tail('hit', .54) < tail('hit', .44) - .1, 'eases back');
  assert(tail('hit', .64) > tail('hit', .54) + .1, 'drives in again');
  for (let u = .46; u < 1; u += .02) assert(tail('miss', u + .02) <= tail('miss', u) + 1e-9, `miss only withdraws at ${u}`);
  for (let i = 0; i <= 100; i++) assert(Math.abs(tail('hit', i / 100)) < .8, 'stays in bounds');
});

// Bounds in the scorpion's own frame (after its lunge and turn), so the numbers read as its left/right.
const box = (o, a) => {
  a.g.updateMatrixWorld(true);
  const inv = a.g.matrixWorld.clone().invert(), b = new THREE.Box3(), v = new THREE.Vector3();
  o.traverse(m => { if (!m.isMesh) return; const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) b.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld).applyMatrix4(inv)); });
  return b;
};

test('a scorpion snaps its pincers shut in front and jabs its tail over its head, then comes back to rest', () => {
  const dt = 1 / 60, strikeAt = Math.round(ACTION_TIME.attack * STRIKE_U / dt);
  for (const name of ['scorpion', 'Scorpius']) for (const attack of ['claw', 'sting']) for (const result of ['hit', 'miss']) {
    const a = createCreature({name, symbol: 115, color: 1});
    const snap = () => { const r = []; a.g.traverse(o => r.push(...o.position.toArray(), o.rotation.x, o.rotation.y, o.rotation.z, ...o.scale.toArray())); return r; };
    const rest = snap(), restTail = box(a.tail, a), restClaw = box(a.claws[0], a), shell = box(a.head, a);
    const q = createActionQueue();
    enqueueAction(q, {kind: 'attack', attack, result, dir: [0, 1]});
    let frames = 0, widest = 0, atStrike = null, lowTail = Infinity, maxPitch = 0;
    while (frames < 80) {
      clearActionPose(a, q);
      if (updateActions(a, q, frames ? dt : 0) === 'idle') break;
      const r = box(a.claws[0], a), l = box(a.claws[1], a);
      for (const n of [...r.min.toArray(), ...r.max.toArray()]) assert(Number.isFinite(n), name);
      // the two pincers never pass through each other or the floor
      assert(r.min.x > 0 && l.max.x < 0, `${name} ${attack} pincers cross`);
      assert(box(a.claws[0], a).min.y > -.01, `${name} ${attack} pincer below the floor`);
      assert(Math.abs(a.g.rotation.y) < .05, `${name} ${attack} strikes straight ahead`);
      widest = Math.max(widest, r.max.x);
      maxPitch = Math.max(maxPitch, Math.abs(a.g.rotation.x));
      // the stinger stays above the carapace
      lowTail = Math.min(lowTail, box(a.tail, a).max.y);
      if (frames === strikeAt) atStrike = {claw: r, tail: box(a.tail, a)};
      frames++;
    }
    clearActionPose(a, q);
    const back = snap();
    rest.forEach((v, i) => assert(Math.abs(v - back[i]) < 1e-9, `${name} ${attack} ${result} back at rest`));
    assert(maxPitch < .2, `${name} ${attack} stays low (${maxPitch})`);
    assert(lowTail > shell.max.y * 1.5, `${name} ${attack} tail stays arched (${lowTail})`);
    if (attack === 'claw') {
      assert(widest > restClaw.max.x + .02, `${name} spreads the pincers`);
      assert(atStrike.claw.min.x < restClaw.min.x - .01, `${name} pincers snap in at the strike`);
    } else {
      assert(atStrike.tail.max.z > restTail.max.z + .08, `${name} tail jabs forward at the strike`);
    }
  }
});

test('other creatures ignore the scorpion poses', () => {
  const a = createCreature({name: 'cave spider', symbol: 115, color: 7});
  assert.equal(a.claws, undefined);
});

test('a wraith attacks without the pincer pose: its claws are hands of finger bones, not pincers', () => {
  const dt = 1 / 60;
  for (const name of ['wraith', 'barrow wight']) {
    const a = createCreature({name, symbol: 87, color: 0}), q = createActionQueue();
    assert(Array.isArray(a.claws?.[0]), `${name} claws are hands`);
    enqueueAction(q, {kind: 'attack', attack: 'touch', result: 'hit', dx: 1, dz: 0});
    for (let i = 0; i < Math.ceil(ACTION_TIME.attack / dt) + 2; i++) assert.doesNotThrow(() => updateActions(a, q, dt), name);
    clearActionPose(a, q);
  }
});
