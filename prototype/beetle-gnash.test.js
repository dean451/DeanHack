import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateBeetleGnash, gnashPose, gnashes, REAR, STAB, CANT, RECOIL, FIRST_MIN, FIRST_SPAN} from './beetle-gnash.js';

const make = (name, symbol) => {
  const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 2});
  a.species = name; a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateBeetleGnash(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [a.head.rotation.x, a.head.rotation.y, a.head.rotation.z];

test('the gnash pose stays in bounds, stabs three times and starts and ends at rest', () => {
  const n = 6000;
  let prev = gnashPose(0), rear = 0, stab = 0, cant = 0, peaks = 0, rising = false;
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = gnashPose(u);
    for (const v of Object.values(p)) assert(Number.isFinite(v));
    assert(p.rear >= -1e-9 && p.rear <= REAR * 1.2 && p.stab >= -1e-9 && p.stab <= STAB * 1.2 && Math.abs(p.cant) <= CANT * 1.4);
    for (const k of Object.keys(p)) assert(Math.abs(p[k] - prev[k]) < .08, `${k} jumps at ${u}`);
    if (u > .36 && u < .72) { const up = p.stab > prev.stab; if (rising && !up && p.stab > STAB * .5) peaks++; rising = up; }
    prev = p; rear = Math.max(rear, p.rear); stab = Math.max(stab, p.stab); cant = Math.max(cant, p.cant);
  }
  assert(Object.values(gnashPose(0)).every(v => v === 0) && Object.values(gnashPose(1)).every(v => v === 0));
  assert(Object.values(gnashPose(.5, 0)).every(v => v === 0) && Object.values(gnashPose(NaN)).every(v => v === 0));
  assert(rear > REAR * .9 && stab > STAB * .9 && cant > CANT * .5, 'rears, stabs and cants');
  assert(gnashPose(.3).stab === 0 && gnashPose(.3).rear > 0, 'the head is reared before the first stab');
  assert(peaks >= 2, `stab peaks ${peaks}`);
});

test('an idle beetle gnashes now and then, and returns exactly to rest', () => {
  const a = make('giant beetle', 'a'), dt = 1 / 60, rest = snap(a);
  assert(gnashes(a));
  let count = 0, first = null;
  for (let k = 0; k < 60 * 90; k++) {
    const p = frame(a, dt), t = k * dt;
    if (p && first == null) first = t;
    if (p && !a.beetleGnash.counted) { a.beetleGnash.counted = true; count++; }
    if (!p && a.beetleGnash) a.beetleGnash.counted = false;
    for (const v of snap(a)) assert(Number.isFinite(v));
    if (!p) snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `drift at ${t}`));
  }
  assert(first >= FIRST_MIN && first <= FIRST_MIN + FIRST_SPAN + dt, `first at ${first}`);
  assert(count >= 2, `gnashed ${count} times`);
});

test('walking fades a gnash out and an attack blocks one', () => {
  const a = make('giant beetle', 'a'), dt = 1 / 60, rest = snap(a);
  let i = 0;
  while (!frame(a, dt) && i++ < 60 * 20);
  for (let k = 0; k < 90; k++) frame(a, dt);
  assert(a.beetleGnash.cur);
  for (let k = 0; k < 30; k++) frame(a, dt, true);
  assert(!a.beetleGnash.cur, 'faded out within half a second');
  snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9));
  const b = make('giant beetle', 'a');
  for (let k = 0; k < 60 * 20; k++) {
    if (!b.actions.current && !b.actions.queue.length) enqueueAction(b.actions, {kind: 'attack', dir: {x: 1, z: 0}});
    assert.equal(frame(b, dt), null);
  }
});

test('ants and other monsters do not gnash', () => {
  for (const [n, s] of [['giant ant', 'a'], ['jackal', 'd'], ['dwarf', 'h']]) assert(!gnashes(make(n, s)), n);
});

test('after the held bite lets go the head flings back, then settles exactly at rest', () => {
  const held = gnashPose(.8), flung = gnashPose(.915);
  assert(held.stab > STAB * .4 && held.rear < 1e-9, 'held down first');
  assert(flung.rear > RECOIL * .95 && flung.stab === 0, 'then thrown back with the bite gone');
  assert(gnashPose(.86).rear < 1e-9 && gnashPose(.97).rear < 1e-9 && gnashPose(.99).rear === 0);
});

test('one small late nibble follows the recoil, then rest exactly', () => {
  const n = gnashPose(.985);
  assert(n.stab > STAB * .25 && n.stab < STAB * .35 && n.rear === 0, 'a small dip once the head is clear');
  assert.equal(gnashPose(.9999).stab, 0);
  for (let u = .97; u < 1; u += .001) assert(gnashPose(u).stab <= STAB * .31, `${u}`);
});
