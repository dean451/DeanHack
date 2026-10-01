import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, clearActionPose, updateActions} from './actions.js';
import * as W from './weeping-lunge.js';

const dt = 1 / 60;
const angel = (name = 'weeping angel') => { const a = createCreature({name}); a.g.updateMatrixWorld(true); return a; };
// everything the module moves, as one flat list
const pose = a => [a.body.rotation, a.head.rotation, ...a.arms.map(x => x.rotation), ...a.stoneWings.map(x => x.rotation)]
  .flatMap(r => [r.x, r.y, r.z]).concat(a.body.position.y);
const far = (p, q) => Math.max(...p.map((v, i) => Math.abs(v - q[i])));
const world = (obj, p) => { obj.updateWorldMatrix(true, false); return new THREE.Vector3(...p).applyMatrix4(obj.matrixWorld); };
const palm = a => world(a.weaponSocket, [0, 0, 0]);
const wingTip = w => world(w, [w.userData.side * .12, .5, -.2]);
// in the body's own frame, so the turn to the hero doesn't count
const wingOut = w => { w.updateMatrix(); return Math.abs(new THREE.Vector3(w.userData.side * .12, .5, -.2).applyMatrix4(w.matrix).x); };

// One frame as live.js runs it: take the action pose off, bob the body, fidget, then the actions.
function frame(a, t, look) {
  if (a.actions) clearActionPose(a, a.actions);
  a.body.position.y = Math.sin(t * 2.5) * .015;
  const busy = !!a.actions?.current || !!a.actions?.queue.length;
  const st = W.updateWeepingLunge(a, dt, t, busy, look);
  if (a.actions) updateActions(a, a.actions, dt);
  return st;
}

test('only weeping angels are moved', () => {
  for (const name of ['Angel', 'dark angel', 'Medusa', 'bat']) assert.equal(W.updateWeepingLunge(createCreature({name}), dt, 0, false), null, name);
  for (const name of ['weeping angel', 'weeping archangel']) assert.ok(W.isWeepingAngel(angel(name)), name);
});

test('it never moves while watched, only snaps a notch nearer at each step, and is back at rest once the hero walks off', () => {
  const a = angel(), rest = pose(a), restPalm = palm(a), restTips = a.stoneWings.map(wingOut);
  rest[rest.length - 1] = 0;
  let t = 0;
  const run = (secs, look) => { for (let i = 0; i < secs * 60; i++) frame(a, t += dt, look); };
  // the hero standing near: dead still, no breath
  const hero = new THREE.Vector3(1.5, 0, 2);
  run(5, hero);
  assert.ok(far(pose(a), rest) < 1e-12, 'still before any step');
  const steps = [];
  for (let k = 1; k <= 5; k++) {
    hero.x -= .8;
    frame(a, t += dt, hero);
    const p = pose(a);
    steps.push(p);
    run(3, hero);
    assert.ok(far(pose(a), p) < 1e-12, `step ${k}: held without moving`);
    assert.ok(p.every(Number.isFinite));
  }
  assert.equal(a.weepingLunge.creep, W.CREEP_STEPS);
  // each of the first steps changed it in a single frame; past the last notch only the cock changes
  assert.ok(far(steps[0], rest) > .1 && far(steps[1], steps[0]) > .05 && far(steps[2], steps[1]) > .05);
  const last = steps[2], headIdx = 3;
  assert.ok(last[headIdx] < rest[headIdx] - W.HEAD_LIFT * .99, 'head lifts out of its bow');
  // the hero is to its left front: it has turned that way
  assert.ok(a.weepingLunge.turn !== 0 && Math.sign(last[1]) === Math.sign(a.weepingLunge.turn));
  assert.ok(palm(a).y < restPalm.y - .02, 'the hands slip down off the face');
  a.stoneWings.forEach((w, j) => assert.ok(wingOut(w) > restTips[j] + .005, 'the wings ease open'));
  // the hero walks off out of range: back to rest at the next step, at once
  hero.set(20, 0, 20);
  frame(a, t += dt, hero);
  assert.ok(far(pose(a), rest) < 1e-9, 'rest');
  assert.equal(a.weepingLunge.creep, 0);
});

test('a claw tears the hands from the face and reaches; a gaze pulls them wide; both snap back', () => {
  for (const kind of ['claw', 'gaze']) {
    const a = angel(); a.actions = createActionQueue();
    let t = 0;
    for (let i = 0; i < 10; i++) frame(a, t += dt, null);
    const rest = pose(a), p0 = palm(a), w0 = a.stoneWings.map(wingTip);
    enqueueAction(a.actions, {kind: 'attack', attack: kind, result: 'hit', dir: [0, 1]});
    let reach = 0, wide = 0, flare = 0, lift = 0;
    for (let i = 0; i < 60; i++) {
      frame(a, t += dt, null);
      const p = pose(a);
      assert.ok(p.every(Number.isFinite));
      const q = palm(a);
      reach = Math.max(reach, (q.z - a.g.position.z) - (p0.z - 0));
      wide = Math.max(wide, Math.abs(q.x - a.g.position.x) - Math.abs(p0.x));
      lift = Math.min(lift, a.head.rotation.x - rest[3]);
      a.stoneWings.forEach((w, j) => { flare = Math.max(flare, Math.abs(wingTip(w).x - a.g.position.x) - Math.abs(w0[j].x)); });
    }
    assert.ok(lift < -.4, `${kind}: head comes up ${lift}`);
    assert.ok(flare > .03, `${kind}: wings flare ${flare}`);
    if (kind === 'claw') assert.ok(reach > .1, `claw reach ${reach}`);
    else assert.ok(wide > .05, `gaze spread ${wide}`);
    // a few frames in, it is already most of the way there: no wind-up
    assert.ok(W.lungeCurve(.08) === 1 && W.lungeCurve(.04) === .5);
    assert.equal(a.actions.current, null);
    frame(a, t += dt, null);
    assert.ok(far(pose(a), rest) < 1e-9, `${kind}: back at rest`);
  }
});

test('a blow sends a tremor through it; in death it eases back to rest; turned to stone it holds', () => {
  const a = angel(); a.actions = createActionQueue();
  const hero = new THREE.Vector3(0, 0, 2);
  let t = 0;
  frame(a, t += dt, hero);
  const rest = pose(a); rest[rest.length - 1] = 0;
  for (let k = 0; k < 2; k++) { hero.x += .7; frame(a, t += dt, hero); }
  enqueueAction(a.actions, {kind: 'hit', attack: 'weapon', result: 'hit', dir: [0, -1]});
  let shook = 0;
  for (let i = 0; i < 20; i++) { frame(a, t += dt, hero); shook = Math.max(shook, Math.abs(a.weepingLunge.tremor)); }
  assert.ok(shook > .5);
  // a stone angel holds its pose
  const a2 = angel(); frame(a2, 0, hero); hero.x += .7; frame(a2, dt, hero);
  const held = pose(a2); a2.stone = true; hero.x += .7;
  for (let i = 0; i < 30; i++) frame(a2, dt * (i + 2), hero);
  assert.ok(far(pose(a2), held) < 1e-12, 'stone holds');
  // death: ease back to rest (the body's own death pose aside) and stay
  for (let i = 0; i < 60; i++) frame(a, t += dt, hero);
  a.actions.dead = true;
  for (let i = 0; i < 4 * 60; i++) frame(a, t += dt, hero);
  const p = pose(a);
  assert.ok(far(p, rest) < 1e-3, `dead at rest ${far(p, rest)}`);
  hero.x += 2; frame(a, t += dt, hero);
  assert.ok(far(pose(a), p) < 1e-3, 'stays');
});
