import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateLocustRasp, raspPose, rasps, DIP, COCK, RASP, FIRST_MIN, FIRST_SPAN} from './locust-rasp.js';

const make = (name = 'locust') => {
  const a = createCreature({name, symbol: 'a'.charCodeAt(0), color: 3});
  a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateLocustRasp(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [a.body.rotation.z, a.body.position.y, ...[a.head].flatMap(o => [o.rotation.x, o.rotation.y, o.rotation.z])];

test('the rasp pose stays in bounds, moves smoothly and starts and ends at rest', () => {
  const n = 20000;
  let dip = 0, cock = 0, rasp = 0, prev = raspPose(0);
  for (let i = 0; i <= n; i++) {
    const p = raspPose(i / n);
    for (const v of Object.values(p)) assert(Number.isFinite(v));
    assert(p.dip >= 0 && p.dip <= 1 + 1e-12 && p.cock >= 0 && p.cock <= 1 + 1e-12 && Math.abs(p.rasp) <= 1 + 1e-12);
    assert(Math.abs(p.dip - prev.dip) < .02 && Math.abs(p.cock - prev.cock) < .02, `jump at ${i / n}`);
    prev = p; dip = Math.max(dip, p.dip); cock = Math.max(cock, p.cock); rasp = Math.max(rasp, Math.abs(p.rasp));
  }
  assert(Object.values(raspPose(0)).every(v => v === 0) && Object.values(raspPose(1)).every(v => v === 0));
  assert(Object.values(raspPose(.5, 0)).every(v => v === 0) && Object.values(raspPose(NaN)).every(v => v === 0));
  assert(dip > .95 && cock > .95 && rasp > .9, 'the head dips and cocks and the body shivers');
  assert(DIP > 0 && COCK > 0 && RASP > 0);
});

test('an idle locust rasps now and then, and returns exactly to rest', () => {
  const a = make(), dt = 1 / 60, rest = snap(a);
  assert(rasps(a));
  let count = 0, first = null, was = false;
  for (let k = 0; k < 60 * 90; k++) {
    const p = frame(a, dt), t = k * dt;
    if (p && first == null) first = t;
    if (p && !was) count++;
    was = !!p;
    for (const v of snap(a)) assert(Number.isFinite(v));
    if (!p) snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `drift at ${t}`));
  }
  assert(first >= FIRST_MIN && first <= FIRST_MIN + FIRST_SPAN + dt, `first at ${first}`);
  assert(count >= 2, `rasped ${count} times`);
});

test('walking fades a rasp out and an attack blocks one', () => {
  const a = make(), dt = 1 / 60, rest = snap(a);
  let i = 0;
  while (!frame(a, dt) && i++ < 60 * 20);
  for (let k = 0; k < 90; k++) frame(a, dt);
  assert(a.locustRasp.cur);
  for (let k = 0; k < 30; k++) frame(a, dt, true);
  assert(!a.locustRasp.cur, 'faded out within half a second');
  snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9));
  const b = make();
  for (let k = 0; k < 60 * 20; k++) {
    if (!b.actions.current && !b.actions.queue.length) enqueueAction(b.actions, {kind: 'attack', dir: {x: 1, z: 0}});
    assert.equal(frame(b, dt), null);
  }
});

test('other insects do not rasp', () => {
  assert(!rasps(createCreature({name: 'giant ant', symbol: 'a'.charCodeAt(0), color: 1})));
  assert(!rasps(createCreature({name: 'giant beetle', symbol: 'a'.charCodeAt(0), color: 0})));
});
