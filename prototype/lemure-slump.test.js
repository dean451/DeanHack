import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateLemureSlump, slumpPose, slumps, SAG, LOLL, NOD, REACH, SHAKE, FIRST_MIN, FIRST_SPAN} from './lemure-slump.js';

const make = (name = 'lemure') => {
  const a = createCreature({name, symbol: 'i'.charCodeAt(0), color: 3});
  a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateLemureSlump(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [a.body.position.y, ...[a.head, ...a.arms].flatMap(o => [o.rotation.x, o.rotation.y, o.rotation.z])];

test('the slump pose stays in bounds, moves smoothly and starts and ends at rest', () => {
  const n = 6000;
  let prev = slumpPose(0), sag = 0, loll = 0, reach = 0, shake = 0;
  for (let i = 0; i <= n; i++) {
    const p = slumpPose(i / n);
    for (const v of Object.values(p)) assert(Number.isFinite(v));
    assert(p.sag >= 0 && p.sag <= 1 + 1e-12 && p.loll >= 0 && p.loll <= 1 + 1e-12 && p.reach >= 0 && p.reach <= 1 + 1e-12 && Math.abs(p.shake) <= 1 + 1e-12);
    for (const k of ['sag', 'loll', 'reach']) assert(Math.abs(p[k] - prev[k]) < .02, `${k} jumps at ${i / n}`);
    prev = p; sag = Math.max(sag, p.sag); loll = Math.max(loll, p.loll); reach = Math.max(reach, p.reach); shake = Math.max(shake, Math.abs(p.shake));
  }
  assert(Object.values(slumpPose(0)).every(v => v === 0) && Object.values(slumpPose(1)).every(v => v === 0));
  assert(Object.values(slumpPose(.5, 0)).every(v => v === 0) && Object.values(slumpPose(NaN)).every(v => v === 0));
  assert(sag > .95 && loll > .95 && reach > .95, 'the mound sinks, the head lolls and the arm reaches');
  assert(shake > .5, 'the raised arm trembles');
  assert(SAG > 0 && LOLL > 0 && NOD > 0 && REACH > 0 && SHAKE > 0);
});

test('an idle lemure slumps now and then, and returns exactly to rest', () => {
  const a = make(), dt = 1 / 60, rest = snap(a);
  assert(slumps(a));
  let count = 0, first = null;
  for (let k = 0; k < 60 * 90; k++) {
    const p = frame(a, dt), t = k * dt;
    if (p && first == null) first = t;
    if (p && !a.lemureSlump.counted) { a.lemureSlump.counted = true; count++; }
    if (!p && a.lemureSlump) a.lemureSlump.counted = false;
    for (const v of snap(a)) assert(Number.isFinite(v));
    if (!p) snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `drift at ${t}`));
  }
  assert(first >= FIRST_MIN && first <= FIRST_MIN + FIRST_SPAN + dt, `first at ${first}`);
  assert(count >= 2, `slumped ${count} times`);
});

test('walking fades a slump out and an attack blocks one', () => {
  const a = make(), dt = 1 / 60, rest = snap(a);
  let i = 0;
  while (!frame(a, dt) && i++ < 60 * 20);
  for (let k = 0; k < 90; k++) frame(a, dt);
  assert(a.lemureSlump.cur);
  for (let k = 0; k < 30; k++) frame(a, dt, true);
  assert(!a.lemureSlump.cur, 'faded out within half a second');
  snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9));
  const b = make();
  for (let k = 0; k < 60 * 20; k++) {
    if (!b.actions.current && !b.actions.queue.length) enqueueAction(b.actions, {kind: 'attack', dir: {x: 1, z: 0}});
    assert.equal(frame(b, dt), null);
  }
});

test('other minor demons do not slump', () => {
  assert(!slumps(createCreature({name: 'imp', symbol: 'i'.charCodeAt(0), color: 1})));
  assert(!slumps(createCreature({name: 'giant spider', symbol: 's'.charCodeAt(0), color: 5})));
});

test('the arm jerks up a little again after it has dropped, then rests exactly', () => {
  assert.ok(slumpPose(.9).reach < .05, 'dropped');
  assert.ok(slumpPose(.93).reach > .2 && slumpPose(.93).reach <= .3, 'the late jerk');
  assert.ok(slumpPose(.99).reach < 1e-3);
});
