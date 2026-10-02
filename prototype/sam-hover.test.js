import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, clearActionPose, updateActions} from './actions.js';
import {updateGait} from './gait.js';
import {updateFidget} from './fidget.js';
import * as H from './sam-hover.js';

const dt = 1 / 60;
const sam = () => createCreature({name: 'one-eyed sam', symbol: 64});
const parts = a => [a.body.position, a.body.rotation, a.legs[0].rotation, a.legs[1].rotation];
const snap = a => parts(a).map(v => [v.x, v.y, v.z]);

// One frame in live.js order: take the action pose off, live.js's leg swing and body bob, the gait,
// the motion (through fidget.js), then the action pose back on.
function frame(a, t, look, walking = false) {
  if (a.actions) clearActionPose(a, a.actions);
  a.legs.forEach((l, i) => l.rotation.x = walking ? Math.sin(t * 22 + i * 2) * .4 : 0);
  a.body.position.y = Math.sin(t * (walking ? 22 : 2.5)) * .015;
  updateGait(a, dt, walking);
  const busy = walking || !!a.actions?.current || !!a.actions?.queue.length;
  updateFidget(a, dt, t, busy, look);
  if (a.actions) updateActions(a, a.actions, dt);
  for (const v of snap(a).flat()) assert.ok(Number.isFinite(v));
}

test('only One-eyed Sam hovers', () => {
  for (const name of ['human', 'wizard', 'croesus', 'miner']) assert.equal(H.updateSamHover(createCreature({name, symbol: 64}), dt, 0, false, null), null, name);
  assert.ok(H.updateSamHover(sam(), dt, 0, false, null));
});

test('alone she floats off the floor, bobbing slowly, legs dangling back', () => {
  const a = sam();
  let lo = Infinity, hi = -Infinity, leg = Infinity;
  for (let i = 0; i < 60 * 20; i++) {
    frame(a, i * dt, null);
    const y = a.body.position.y;
    lo = Math.min(lo, y); hi = Math.max(hi, y);
    leg = Math.min(leg, a.legs[0].rotation.x, a.legs[1].rotation.x);
  }
  assert.ok(lo > .03 && hi < .12 && hi - lo > .02, `hover ${lo}..${hi}`);
  assert.ok(leg > 0, `the feet hang back ${leg}`);
});

test('moving she glides: the stride is mostly taken back, the legs trail, she leans and rides higher', () => {
  const a = sam(), b = createCreature({name: 'human', symbol: 64});
  let swing = 0, humanSwing = 0, trail = Infinity, lean = Infinity, lift = Infinity;
  for (let i = 0; i < 60 * 4; i++) {
    const t = i * dt;
    frame(a, t, null, true);
    b.legs.forEach((l, k) => l.rotation.x = Math.sin(t * 22 + k * 2) * .4);
    updateGait(b, dt, true);
    if (i > 60) {
      swing = Math.max(swing, Math.abs(a.legs[0].rotation.x - a.legs[1].rotation.x));
      humanSwing = Math.max(humanSwing, Math.abs(b.legs[0].rotation.x - b.legs[1].rotation.x));
      trail = Math.min(trail, (a.legs[0].rotation.x + a.legs[1].rotation.x) / 2);
      lean = Math.min(lean, a.body.rotation.x);
      lift = Math.min(lift, a.body.position.y);
    }
  }
  assert.ok(swing < humanSwing * .4, `stride ${swing} vs a walker's ${humanSwing}`);
  assert.ok(trail > .2, `legs trail ${trail}`);
  assert.ok(lean > .1, `lean ${lean}`);
  assert.ok(lift > .06, `rides higher ${lift}`);
});

test('near the hero she looms; she swoops into her attacks', () => {
  const a = sam();
  for (let i = 0; i < 60 * 5; i++) frame(a, i * dt, {x: 2, z: 2});
  assert.ok(a.samHover.loom > .95, 'looms');
  a.actions = createActionQueue();
  enqueueAction(a.actions, {kind: 'attack', attack: 'weapon', result: 'hit', dir: [0, 1]});
  let high = -Infinity, highAt = -1, low = Infinity, lowAt = -1, pitch = 0;
  for (let i = 0; i < 120 && (a.actions.current || a.actions.queue.length || i < 2); i++) {
    frame(a, 5, {x: 2, z: 2});
    if (a.actions.current?.kind !== 'attack') continue;
    const y = a.body.position.y;
    if (y > high) { high = y; highAt = i; }
    if (highAt >= 0 && y < low) { low = y; lowAt = i; }
    pitch = Math.max(pitch, a.body.rotation.x);
  }
  assert.ok(high - low > .07 && highAt < lowAt, `rise ${high}@${highAt} drop ${low}@${lowAt}`);
  assert.ok(pitch > H.GLIDE_LEAN, `pitches into the cut ${pitch}`);
  for (const u of [0, 1, -1, 2, NaN]) assert.deepEqual(H.swoopCurve(u), {rise: 0, drop: 0});
});

test('a blow knocks her back; after a long fight she drops to exact rest; stone holds', () => {
  const a = sam(), rest = snap(a);
  a.actions = createActionQueue();
  for (let i = 0; i < 30; i++) frame(a, i * dt, {x: 1, z: 1});
  enqueueAction(a.actions, {kind: 'hit', attack: 'weapon', result: 'hit', dir: [0, -1]});
  frame(a, 30 * dt, {x: 1, z: 1}); frame(a, 31 * dt, {x: 1, z: 1});
  assert.ok(a.samHover.jolt > .9, 'jolt');
  for (let i = 0; i < 60 * 20; i++) {
    if (i % 30 === 0) enqueueAction(a.actions, {kind: i % 60 ? 'hit' : 'attack', attack: 'weapon', result: 'hit', dir: [0, 1]});
    frame(a, (31 + i) * dt, {x: 1 + (i % 120 < 60 ? 0 : 9), z: 1}, i % 200 < 40);
  }
  while (a.actions.current || a.actions.queue.length) frame(a, 0, {x: 1, z: 1});
  a.actions.dead = true;
  for (let i = 0; i < 60 * 6; i++) frame(a, 0, {x: 1, z: 1});
  snap(a).forEach((v, i) => v.forEach((x, j) => assert.ok(Math.abs(x - rest[i][j]) < 1e-6, `part ${i} axis ${j}: ${x} vs ${rest[i][j]}`)));

  const b = sam();
  for (let i = 0; i < 60 * 8; i++) H.updateSamHover(b, dt, i * dt, false, {x: 1, z: 1});
  b.stone = true;
  const held = snap(b);
  for (let i = 0; i < 120; i++) H.updateSamHover(b, dt, 8 + i * dt, false, {x: 3, z: 1});
  snap(b).forEach((v, i) => v.forEach((x, j) => assert.ok(Math.abs(x - held[i][j]) < 1e-12, 'stone holds')));
});
