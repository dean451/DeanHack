import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, clearActionPose, updateActions} from './actions.js';
import {updateFidget} from './fidget.js';
import * as Y from './yendor-hover.js';

const dt = 1 / 60;
const wizard = () => createCreature({name: 'Wizard of Yendor', symbol: 64, color: 13});
const parts = a => [a.body.position, a.body.rotation, a.head.rotation, a.arm.rotation, a.orb.scale];
const snap = a => parts(a).map(v => [v.x, v.y, v.z]);

// One frame in live.js order: take the action pose off, the motion (through fidget.js), then the action pose back on.
function frame(a, t, look, walking = false) {
  if (a.actions) clearActionPose(a, a.actions);
  const busy = walking || !!a.actions?.current || !!a.actions?.queue.length;
  updateFidget(a, dt, t, busy, look);
  if (a.actions) updateActions(a, a.actions, dt);
  for (const v of snap(a).flat()) assert.ok(Number.isFinite(v));
  assert.ok(Number.isFinite(a.orb.material.emissiveIntensity) && a.orb.material.emissiveIntensity > 0);
}

test('only the Wizard of Yendor hovers, with his own orb material, and he owns his attack arm', () => {
  for (const name of ['wizard', 'human', 'lich', 'doppelganger']) assert.equal(Y.updateYendorHover(createCreature({name, symbol: 64}), dt, 0, false, null), null, name);
  const a = wizard(), b = wizard(), shared = a.orb.material;
  assert.equal(a.kind, 'wizard of yendor');
  assert.ok(Y.updateYendorHover(a, dt, 0, false, null));
  assert.equal(a.ownsAttackArms, true);
  assert.notEqual(a.orb.material, shared, 'his own copy');
  assert.equal(b.orb.material, shared, 'the shared material is left alone');
  assert.equal(shared.emissiveIntensity, 2);
});

test('alone he floats off the floor, bobbing slowly, and the orb throbs', () => {
  const a = wizard(), rest = snap(a), base = a.orb.material.emissiveIntensity;
  let lo = Infinity, hi = -Infinity, glo = Infinity, ghi = -Infinity, turn = 0;
  for (let i = 0; i < 60 * 20; i++) {
    frame(a, i * dt, null);
    const y = a.body.position.y - rest[0][1], e = a.orb.material.emissiveIntensity;
    lo = Math.min(lo, y); hi = Math.max(hi, y); glo = Math.min(glo, e); ghi = Math.max(ghi, e);
    turn = Math.max(turn, Math.abs(a.head.rotation.y - rest[2][1]));
  }
  assert.ok(lo > .08 && hi < .16 && hi - lo > .03, `hover ${lo}..${hi}`);
  assert.ok(glo > base * .6 && ghi < base * 1.4 && ghi - glo > base * .3, `throb ${glo}..${ghi}`);
  assert.ok(turn < 1e-9, 'no hero, no turn');
  assert.equal(a.yendorHover.gather, null, 'no gathers alone');
});

test('near the hero he watches them, the orb burns brighter and gathers now and then', () => {
  const a = wizard(), rest = snap(a);
  const hero = {x: -2, z: 2};
  let gathers = 0, was = false, peak = 0, swell = 0;
  for (let i = 0; i < 60 * 20; i++) {
    frame(a, i * dt, hero);
    const g = !!a.yendorHover.gather;
    if (g && !was) gathers++;
    was = g;
    peak = Math.max(peak, a.orb.material.emissiveIntensity);
    swell = Math.max(swell, a.orb.scale.x / rest[4][0] - 1);
  }
  assert.ok(Math.abs(a.head.rotation.y - rest[2][1] + Math.PI / 4) < .01, `turned to the hero ${a.head.rotation.y}`);
  assert.ok(a.arm.rotation.x - rest[3][0] < -.15, 'the staff tips the orb at the hero');
  assert.ok(gathers >= 2 && gathers <= 5, `gathers ${gathers}`);
  assert.ok(peak > 2 * 3.5 && swell > .2, `gather peak ${peak} swell ${swell}`);
});

test('he casts through the staff: raised, then thrust down as the orb flares', () => {
  const a = wizard(), rest = snap(a);
  a.actions = createActionQueue();
  for (let i = 0; i < 10; i++) frame(a, i * dt, null);
  enqueueAction(a.actions, {kind: 'attack', attack: 'magic', result: 'hit', dir: [0, 1]});
  let high = 0, highAt = -1, flare = 0, flareAt = -1;
  for (let i = 0; i < 90 && (a.actions.current || a.actions.queue.length || i < 2); i++) {
    frame(a, (10 + i) * dt, null);
    const x = a.arm.rotation.x - rest[3][0], e = a.orb.material.emissiveIntensity;
    if (x < high) { high = x; highAt = i; }
    if (e > flare) { flare = e; flareAt = i; }
  }
  assert.ok(high < -.9, `staff raised ${high}`);
  assert.ok(flare > 2 * 4, `orb flares ${flare}`);
  assert.ok(highAt < flareAt, 'raised before the flare');
});

test('a blow gutters the orb and jolts him; after a long fight he sinks to exact rest; stone holds', () => {
  const a = wizard(), rest = snap(a);
  a.actions = createActionQueue();
  for (let i = 0; i < 30; i++) frame(a, i * dt, {x: 1, z: 1});
  enqueueAction(a.actions, {kind: 'hit', attack: 'weapon', result: 'hit', dir: [0, -1]});
  frame(a, 30 * dt, {x: 1, z: 1}); frame(a, 31 * dt, {x: 1, z: 1});
  assert.ok(a.yendorHover.gutter > .9 && a.yendorHover.jolt > .9, 'gutter and jolt');
  assert.ok(a.orb.material.emissiveIntensity < 2 * .6, `guttered ${a.orb.material.emissiveIntensity}`);
  for (let i = 0; i < 60 * 20; i++) {
    if (i % 30 === 0) enqueueAction(a.actions, {kind: i % 60 ? 'hit' : 'attack', attack: 'magic', result: 'hit', dir: [0, 1]});
    frame(a, (32 + i) * dt, {x: 1 + (i % 120 < 60 ? 0 : 3), z: 1}, i % 200 < 40);
  }
  while (a.actions.current || a.actions.queue.length) frame(a, 0, {x: 1, z: 1});
  a.actions.dead = true;
  for (let i = 0; i < 60 * 6; i++) frame(a, 60 + i * dt, {x: 1, z: 1});
  snap(a).forEach((v, i) => v.forEach((x, j) => assert.ok(Math.abs(x - rest[i][j]) < 1e-6, `part ${i} axis ${j}: ${x} vs ${rest[i][j]}`)));
  assert.ok(Math.abs(a.orb.material.emissiveIntensity - 2) < 1e-6, 'resting glow');

  const b = wizard();
  for (let i = 0; i < 60 * 8; i++) Y.updateYendorHover(b, dt, i * dt, false, {x: 1, z: 1});
  b.stone = true;
  const held = snap(b), glow = b.orb.material.emissiveIntensity;
  for (let i = 0; i < 120; i++) Y.updateYendorHover(b, dt, 8 + i * dt, false, {x: 3, z: 1});
  snap(b).forEach((v, i) => v.forEach((x, j) => assert.ok(Math.abs(x - held[i][j]) < 1e-12, 'stone holds')));
  assert.equal(b.orb.material.emissiveIntensity, glow);
});
