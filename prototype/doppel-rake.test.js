import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, clearActionPose, updateActions} from './actions.js';
import * as D from './doppel-rake.js';

const dt = 1 / 60;
const doppel = () => createCreature({name: 'doppelganger', symbol: 64, color: 7});
const parts = a => [a.body.rotation, a.body.scale, a.head.rotation, a.arms[0].rotation, a.arms[1].rotation];
const snap = a => parts(a).map(v => [v.x, v.y, v.z]);

// One frame in live.js order: take the action pose off, the motion, then the action pose back on.
function frame(a, t, look) {
  if (a.actions) clearActionPose(a, a.actions);
  const busy = !!a.actions?.current || !!a.actions?.queue.length;
  D.updateDoppelRake(a, dt, t, busy, look);
  if (a.actions) updateActions(a, a.actions, dt);
  for (const v of snap(a).flat()) assert.ok(Number.isFinite(v));
}

test('only the doppelganger is moved, and it owns its attack arms while unarmed', () => {
  for (const name of ['human', 'Woodland-elf', 'imp', 'xorn']) assert.equal(D.updateDoppelRake(createCreature({name}), dt, 0, false, null), null, name);
  const a = doppel();
  assert.ok(D.updateDoppelRake(a, dt, 0, false, null));
  assert.equal(a.ownsAttackArms, true);
  a.weaponSocket.add(createCreature({name: 'xorn'}).g);
  D.updateDoppelRake(a, dt, dt, false, null);
  assert.equal(a.ownsAttackArms, false, 'armed: the right arm swings the weapon');
});

test('alone, its flesh swells unevenly, the talons flex and its shape slips now and then', () => {
  const a = doppel(), rest = snap(a), flexes = new Set();
  let slips = 0, was = false, swell = 0, wrench = 0, yaw = 0;
  for (let i = 0; i < 60 * 40; i++) {
    frame(a, i * dt, null);
    const s = !!a.doppelRake.slip;
    if (s && !was) slips++;
    was = s;
    swell = Math.max(swell, Math.abs(a.body.scale.x - 1));
    wrench = Math.max(wrench, Math.abs(a.head.rotation.z - rest[2][2]));
    yaw = Math.max(yaw, Math.abs(a.head.rotation.y - rest[2][1]));
    if (i % 20 === 0) flexes.add(a.doppelRake.flexTo.toFixed(4));
  }
  assert.ok(slips >= 3 && slips <= 8, `slips ${slips}`);
  assert.ok(swell > .03 && swell < .1, `swell ${swell}`);
  assert.ok(wrench > .25 && wrench < .5, `head wrench ${wrench}`);
  assert.ok(yaw < 1e-9, 'no hero, no study');
  assert.ok(flexes.size >= 8, `talon flexes ${flexes.size}`);
});

test('near the hero it studies them in snaps and echoes their steps', () => {
  const a = doppel(), rest = snap(a);
  // the hero off to its right (+x) and ahead: bearing atan2(2, 2)
  const hero = {x: 2, z: 2};
  let jumps = 0, prev = a.head.rotation.y;
  for (let i = 0; i < 60 * 3; i++) {
    frame(a, i * dt, hero);
    if (Math.abs(a.head.rotation.y - prev) > .05) jumps++;
    prev = a.head.rotation.y;
  }
  assert.ok(Math.abs(a.head.rotation.y - rest[2][1] - Math.PI / 4) < .02, `turned to the hero ${a.head.rotation.y}`);
  assert.ok(jumps >= 1, 'the first look is a snap');
  // the hero steps away to its right; after a beat it leans that way (roll toward +x is negative z)
  hero.x += 1;
  let lean = 0, early = 0;
  for (let i = 0; i < 60 * 1.2; i++) {
    frame(a, 3 + i * dt, hero);
    const z = a.body.rotation.z - rest[0][2] - .04 * D.slipCurve(a.doppelRake.slip?.v ?? 0) * (a.doppelRake.slip?.dir ?? 0);
    if (i * dt < D.ECHO_DELAY * .9) early = Math.max(early, Math.abs(z));
    lean = Math.min(lean, z);
  }
  assert.ok(early < 1e-6, `no echo before the beat ${early}`);
  assert.ok(lean < -.06, `leans the way the hero went ${lean}`);
  assert.equal(a.doppelRake.echo, null, 'the echo is over');
});

test('it rakes with the left talons, raised high then swept across, the right arm left alone', () => {
  const a = doppel(), rest = snap(a);
  a.actions = createActionQueue();
  for (let i = 0; i < 10; i++) frame(a, i * dt, null);
  enqueueAction(a.actions, {kind: 'attack', attack: 'weapon', result: 'hit', dir: [0, 1]});
  let high = 0, across = 0, highAt = -1, acrossAt = -1, right = 0, coil = 0, whip = 0;
  for (let i = 0; i < 60 && (a.actions.current || a.actions.queue.length || i < 2); i++) {
    frame(a, (10 + i) * dt, null);
    const x = a.arms[0].rotation.x - rest[3][0], z = a.arms[0].rotation.z - rest[3][2];
    if (x < high) { high = x; highAt = i; }
    if (z > across) { across = z; acrossAt = i; }
    right = Math.max(right, Math.abs(a.arms[1].rotation.x - rest[4][0]));
    coil = Math.min(coil, a.body.rotation.y - rest[0][1]);
    whip = Math.max(whip, a.body.rotation.y - rest[0][1]);
  }
  assert.ok(high < -1.5, `talons raised ${high}`);
  assert.ok(across > .35, `raked across ${across}`);
  assert.ok(highAt < acrossAt, 'raised before the rake');
  assert.ok(right < .02, `right arm left alone ${right}`);
  assert.ok(coil < -.2 && whip > .2, `coil ${coil} whip ${whip}`);
});

test('a blow makes it slip and flail; after a long fight it dies back to exact rest; stone holds', () => {
  const a = doppel(), rest = snap(a);
  a.actions = createActionQueue();
  for (let i = 0; i < 10; i++) frame(a, i * dt, {x: 1, z: 1});
  enqueueAction(a.actions, {kind: 'hit', attack: 'weapon', result: 'hit', dir: [0, -1]});
  frame(a, 10 * dt, {x: 1, z: 1}); frame(a, 10 * dt, {x: 1, z: 1});
  assert.ok(a.doppelRake.slip?.k > 1 && a.doppelRake.flail > .9, 'a hard slip and a flail');
  for (let i = 0; i < 60 * 20; i++) {
    if (i % 30 === 0) enqueueAction(a.actions, {kind: i % 60 ? 'hit' : 'attack', attack: 'weapon', result: 'hit', dir: [0, 1]});
    frame(a, (11 + i) * dt, {x: 1 + (i % 120 < 60 ? 0 : 1), z: 1});
  }
  while (a.actions.current || a.actions.queue.length) frame(a, 0, {x: 1, z: 1});
  a.actions.dead = true;
  for (let i = 0; i < 60 * 5; i++) frame(a, 40 + i * dt, {x: 1, z: 1});
  const end = snap(a);
  end.forEach((v, i) => v.forEach((x, j) => assert.ok(Math.abs(x - rest[i][j]) < 1e-6, `part ${i} axis ${j}: ${x} vs ${rest[i][j]}`)));

  const b = doppel();
  for (let i = 0; i < 60 * 8; i++) D.updateDoppelRake(b, dt, i * dt, false, {x: 1, z: 1});
  b.stone = true;
  const held = snap(b);
  for (let i = 0; i < 120; i++) D.updateDoppelRake(b, dt, 8 + i * dt, false, {x: 3, z: 1});
  snap(b).forEach((v, i) => v.forEach((x, j) => assert.ok(Math.abs(x - held[i][j]) < 1e-12, 'stone holds')));
});
