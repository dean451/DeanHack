import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updatePrisonerRock, rocks, flinchAt, flinchLength, heroFrom, ROCK, COWER, SHAKE, SNAP, HOLD_MIN, HOLD_SPAN, RECOVER, SETTLE, RISE, REARM, FLINCH} from './prisoner-rock.js';

const DT = 1 / 60;
const make = name => {
  const a = createCreature({name, symbol: 64, color: 1});
  a.species = name; a.actions = createActionQueue();
  return a;
};
function frame(a, look = null, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, DT);
  return updatePrisonerRock(a, DT, 0, walking || !!a.actions.current || !!a.actions.queue.length, look);
}
const parts = a => [a.head.rotation, a.body.rotation, ...a.arms.map(r => r.rotation)];
const snap = a => parts(a).flatMap(r => [r.x, r.y, r.z]);
const run = (a, secs, look, walking) => { const out = []; for (let i = 0; i < Math.round(secs * 60); i++) out.push(frame(a, look, walking)); return out; };
const far = new THREE.Vector3(0, 0, 20);

test('only the prisoner rocks', () => {
  assert.ok(rocks(make('prisoner')));
  for (const name of ['convict', 'charon', 'human', 'jackal']) assert.ok(!rocks(make(name)), name);
  const c = make('convict'), before = snap(c);
  assert.equal(updatePrisonerRock(c, DT, 0, false, null), null);
  assert.deepEqual(snap(c), before);
});

test('the flinch envelope jerks up, holds and creeps back down', () => {
  const hold = HOLD_MIN + HOLD_SPAN / 2, T = flinchLength(hold);
  assert.equal(flinchAt(0, hold).k, 0); assert.equal(flinchAt(T, hold).k, 0); assert.equal(flinchAt(NaN, hold).k, 0);
  assert.equal(flinchAt(SNAP + hold / 2, hold).k, 1);
  assert.ok(flinchAt(SNAP / 2, hold).k > .8, 'the jerk is fast');
  assert.ok(flinchAt(SNAP + hold + RECOVER / 2, hold).k > .4, 'the recovery is slow');
});

test('a lone prisoner rocks gently once still, bounded and smooth, and stops when it walks', () => {
  const a = make('prisoner'), rest = snap(a);
  run(a, SETTLE * .9, far);
  assert.deepEqual(snap(a), rest, 'no rock before the still spell');
  let maxStep = 0, prev = snap(a), maxBx = 0;
  for (let i = 0; i < (RISE + 8) * 60; i++) {
    const p = frame(a, far), now = snap(a);
    for (const v of now) assert.ok(Number.isFinite(v));
    for (let i = 0; i < now.length; i++) maxStep = Math.max(maxStep, Math.abs(now[i] - prev[i]));
    prev = now; maxBx = Math.max(maxBx, Math.abs(p.bx));
    assert.ok(Math.abs(p.bx) <= ROCK.a + 1e-9 && p.by === 0, 'no twist without the hero');
  }
  assert.ok(maxBx > ROCK.a * .9, `rocks ${maxBx}`);
  assert.ok(maxStep < .01, `smooth ${maxStep}`);
  // walking fades it out fast (85% in .15 s) and leaves the rest pose
  run(a, .3, far, true);
  const after = snap(a);
  for (let i = 0; i < rest.length; i++) assert.ok(Math.abs(after[i] - rest[i]) < 2e-3, `part ${i}`);
});

test('the hero coming close sets off one flinch, away from their side, that returns to rest', () => {
  for (const sideX of [-1, 1]) {
    const a = make('prisoner');
    run(a, SETTLE + RISE + 1, far);
    // hero steps in at 1.5 tiles, ahead and to one side (+x is the model's left)
    const look = new THREE.Vector3(sideX, 0, 1.2);
    assert.equal(heroFrom(a, look).right, sideX > 0 ? -1 : 1);
    let peak = null;
    for (const p of run(a, .5, look)) if (!peak || Math.abs(p.by) > Math.abs(peak.by)) peak = p;
    assert.ok(Math.abs(peak.by) > COWER.by * .9, 'twists away');
    assert.ok(Math.sign(peak.by) === -Math.sign(sideX), `turns away from the hero on ${sideX}`);
    assert.ok(peak.lx < COWER.rx * .8 && peak.rx < COWER.rx * .8, 'arms up');
    assert.ok(peak.hx > COWER.hx * .7, 'ducks');
    // the hero stays: it cowers, recovers, and doesn't flinch again
    let maxBy = 0;
    for (const p of run(a, HOLD_MIN + HOLD_SPAN + RECOVER + 4, look)) {
      for (const v of Object.values(p)) assert.ok(Number.isFinite(v));
      assert.ok(Math.abs(p.hy) <= COWER.hy + SHAKE + .05 && p.lx >= COWER.rx - SHAKE - .05);
      maxBy = Math.max(maxBy, Math.abs(p.by));
    }
    const tail = run(a, 1, look);
    assert.ok(tail.every(p => Math.abs(p.by) < 1e-9), 'no second flinch while the hero stays');
    // the hero leaves and comes back after REARM: a fresh flinch
    run(a, REARM + .2, far);
    const again = run(a, .4, look);
    assert.ok(again.some(p => Math.abs(p.by) > COWER.by * .9), 'flinches again after the hero comes back');
    // an action breaks it off fast and it ends at rest
    enqueueAction(a.actions, {kind: 'attack'});
    run(a, .15, look);
    const rest = make('prisoner');
    run(a, 3, look, true);
    const s = snap(a), r = snap(rest);
    for (let i = 0; i < s.length; i++) assert.ok(Math.abs(s[i] - r[i]) < 1e-6, `part ${i} back at rest`);
  }
});

test('no flinch while busy, dead, or with the hero invisible', () => {
  const a = make('prisoner'), near = new THREE.Vector3(0, 0, 1);
  run(a, SETTLE + 1, far);
  assert.ok(run(a, 1, near, true).every(p => p.by === 0), 'busy');
  const b = make('prisoner');
  run(b, SETTLE + 1, far);
  assert.ok(run(b, 1, null).every(p => p.by === 0), 'unseen hero');
  assert.ok(FLINCH < 6);
});
