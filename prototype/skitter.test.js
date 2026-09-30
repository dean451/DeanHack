import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateSkitter, skitterPose, skitters, SKITTER} from './skitter.js';

const spider = name => { const a = createCreature({name, symbol: 's'.charCodeAt(0), color: 7}); a.actions = createActionQueue(); return a; };

// One frame as live.js runs it: the generic leg swing and body bob, the skitter, then the actions.
function frame(a, t, dt, walking) {
  clearActionPose(a, a.actions);
  a.legs.forEach((l, i) => l.rotation.x = walking ? Math.sin(t * 22 + i * 2) * .4 : 0);
  a.body.position.y = Math.sin(t * (walking ? 22 : 2.5)) * .015;
  const p = updateSkitter(a, dt, walking);
  updateActions(a, a.actions, dt);
  return p;
}
const snap = a => [...a.legs.flatMap(l => [l.rotation.x, l.rotation.y, l.rotation.z]), a.body.position.y];
// Once the skitter has blended out, the legs are at rest and the body has live.js's idle bob only.
const settled = (a, t) => [...a.legs.flatMap(() => [0, 0, 0]), Math.sin(t * 2.5) * .015];

test('the skitter is an alternating tetrapod: four feet down, the other four swinging', () => {
  for (let i = 0; i <= 400; i++) {
    const p = skitterPose(Math.PI * 2 * i / 400);
    for (const v of [...p.yaw, ...p.lift, p.bob]) assert(Number.isFinite(v));
    // R1 R3 L2 L4 share a phase and R2 R4 L1 L3 the opposite one; left legs are mirrored
    for (const [a, b] of [[0, 2], [0, 5], [0, 7], [1, 3], [1, 4], [1, 6]]) {
      assert.equal(Math.abs(p.yaw[a]), Math.abs(p.yaw[b]));
      assert.equal(Math.abs(p.lift[a]), Math.abs(p.lift[b]));
    }
    assert.equal(p.yaw[0], -p.yaw[1]);
    // at most one group is off the floor, and lifts point up on each side
    const up = p.lift.map((v, k) => (k < 4 ? v : -v));
    up.forEach(v => assert(v >= 0 && v <= SKITTER.lift + 1e-12));
    assert(up.filter(v => v > 1e-9).length <= 4);
    p.yaw.forEach(v => assert(Math.abs(v) <= SKITTER.stride + 1e-12));
    assert(p.bob <= 0 && p.bob >= -SKITTER.dip);
    // a leg is lifted only while it swings forward (+z): right legs forward = negative yaw
    const c = Math.cos(Math.PI * 2 * i / 400);
    if (c > .1) assert(p.lift[0] > 0 && p.lift[1] === 0);
  }
  assert.equal(skitterPose(1, 0).bob, 0);
  assert(skitters(spider('cave spider')) && skitters(spider('giant spider')));
  const rat = createCreature({name: 'sewer rat', symbol: 'r'.charCodeAt(0), color: 3});
  assert(!skitters(rat));
  assert.equal(updateSkitter(rat, 1 / 60, true), null);
});

test('a walking spider skitters, then settles back to its exact rest pose', () => {
  for (const name of ['cave spider', 'giant spider']) {
    const a = spider(name), dt = 1 / 60;
    let t = 0, prev = snap(a), worst = 0, maxLift = 0;
    for (let i = 0; i < 240; i++, t += dt) {
      const walking = i < 120;
      frame(a, t, dt, walking);
      const now = snap(a);
      now.forEach(v => assert(Number.isFinite(v)));
      if (i > 30 && walking) {
        // blended in: no generic pitch left, only the skitter's sweep and lift
        a.legs.forEach(l => { assert(Math.abs(l.rotation.x) < .02, `${name} ${i} ${l.rotation.x}`); assert(Math.abs(l.rotation.y) <= SKITTER.stride + 1e-9); });
        maxLift = Math.max(maxLift, ...a.legs.map(l => Math.abs(l.rotation.z)));
      }
      // no snapping between frames, even as the walk starts and stops
      if (i) worst = Math.max(worst, ...now.map((v, k) => Math.abs(v - prev[k])));
      prev = now;
    }
    assert(maxLift > SKITTER.lift * .9, `${name} legs lift`);
    assert(worst < .2, `${name} largest per-frame jump ${worst}`);
    const want = settled(a, t - dt);
    snap(a).forEach((v, k) => assert(Math.abs(v - want[k]) < 1e-9, `${name} ${k} ${v} vs ${want[k]}`));
  }
});

test('a small spider patters faster than a giant one', () => {
  const small = spider('cave spider'), big = spider('giant spider');
  for (let i = 0; i < 60; i++) { updateSkitter(small, 1 / 60, true); updateSkitter(big, 1 / 60, true); }
  const turns = a => a.skitter.phase;
  // one second in: cave spider (×.65) at rate/√.65, giant (×1.5) at rate/√1.5, before wrapping
  assert(Math.abs(turns(small) - (SKITTER.rate / Math.sqrt(.65)) % (Math.PI * 2)) < .3);
  assert(Math.abs(turns(big) - (SKITTER.rate / Math.sqrt(1.5)) % (Math.PI * 2)) < .3);
});

test('a bite mid-stride and death both leave the legs at rest', () => {
  const a = spider('giant spider'), dt = 1 / 60;
  let t = 0;
  for (let i = 0; i < 30; i++, t += dt) frame(a, t, dt, true);
  assert(enqueueAction(a.actions, {kind: 'attack', attack: 'bite', dir: [0, 1]}));
  for (let i = 0; i < 90; i++, t += dt) { frame(a, t, dt, i < 20); snap(a).forEach(v => assert(Number.isFinite(v))); }
  const want = settled(a, t - dt);
  snap(a).forEach((v, k) => assert(Math.abs(v - want[k]) < 1e-9, `${k} ${v}`));
  enqueueAction(a.actions, {kind: 'die', dir: [1, 0]});
  for (let i = 0; i < 20; i++, t += dt) frame(a, t, dt, true);
  for (let i = 0; i < 120; i++, t += dt) frame(a, t, dt, true);
  // dead spiders stop walking even if the frame still says they're moving
  assert.equal(a.skitter.w, 0);
  a.legs.forEach(l => { assert.equal(l.rotation.y, 0); assert.equal(l.rotation.z, 0); });
});
