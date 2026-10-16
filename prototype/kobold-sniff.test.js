import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateKoboldSniff, sniffPose, sniffs, SNIFF, STARE, LASH, CHECK, FIRST_MIN, FIRST_SPAN} from './kobold-sniff.js';

const make = (name, symbol) => {
  const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 2});
  a.species = name; a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateKoboldSniff(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [a.head.rotation.x, a.head.rotation.y, a.tail.rotation.z];

test('the sniff pose stays in bounds, moves smoothly and starts and ends at rest', () => {
  const n = 6000;
  let prev = sniffPose(0), stare = 0, lash = 0, back = 0;
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = sniffPose(u);
    for (const v of Object.values(p)) assert(Number.isFinite(v));
    assert(p.sniff >= 0 && p.sniff <= SNIFF + 1e-12 && p.stare >= -CHECK - 1e-12 && p.stare <= STARE + 1e-12 && Math.abs(p.lash) <= LASH + 1e-12);
    for (const k of Object.keys(p)) assert(Math.abs(p[k] - prev[k]) < (k === 'stare' ? .2 : .06), `${k} jumps at ${u}`);
    prev = p; stare = Math.max(stare, p.stare); lash = Math.max(lash, p.lash); back = Math.min(back, p.lash);
  }
  assert(Object.values(sniffPose(0)).every(v => v === 0) && Object.values(sniffPose(1)).every(v => v === 0));
  assert(Object.values(sniffPose(.5, 0)).every(v => v === 0) && Object.values(sniffPose(NaN)).every(v => v === 0));
  assert(stare > STARE * .99 && lash > LASH * .99, 'the head snaps round and the tail lashes');
  assert(back < -.05, 'the tail kicks back after the lash');
  assert(sniffPose(.125).sniff > 0 && sniffPose(.17).sniff < .01 && sniffPose(.3).sniff > 0, 'separate sniffs');
});

test('an idle kobold sniffs now and then, and returns exactly to rest', () => {
  const a = make('kobold', 'k'), dt = 1 / 60, rest = snap(a);
  assert(sniffs(a));
  let count = 0, first = null;
  for (let k = 0; k < 60 * 80; k++) {
    const p = frame(a, dt), t = k * dt;
    if (p && first == null) first = t;
    if (p && !a.koboldSniff.counted) { a.koboldSniff.counted = true; count++; }
    if (!p && a.koboldSniff) a.koboldSniff.counted = false;
    for (const v of snap(a)) assert(Number.isFinite(v));
    if (!p) snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `drift at ${t}`));
  }
  assert(first >= FIRST_MIN && first <= FIRST_MIN + FIRST_SPAN + dt, `first at ${first}`);
  assert(count >= 2, `sniffed ${count} times`);
});

test('walking fades a sniff out and an attack blocks one', () => {
  const a = make('kobold', 'k'), dt = 1 / 60, rest = snap(a);
  let i = 0;
  while (!frame(a, dt) && i++ < 60 * 20);
  for (let k = 0; k < 60; k++) frame(a, dt);
  assert(a.koboldSniff.cur);
  for (let k = 0; k < 30; k++) frame(a, dt, true);
  assert(!a.koboldSniff.cur, 'faded out within half a second');
  snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9));
  const b = make('kobold', 'k');
  for (let k = 0; k < 60 * 20; k++) {
    if (!b.actions.current && !b.actions.queue.length) enqueueAction(b.actions, {kind: 'attack', dir: {x: 1, z: 0}});
    assert.equal(frame(b, dt), null);
  }
});

test('other monsters do not sniff', () => {
  for (const [n, s] of [['dwarf', 'h'], ['gnome', 'G'], ['hill orc', 'o'], ['troll', 'T']]) assert(!sniffs(make(n, s)), n);
});

test('when the stare breaks the head flicks the other way past rest, then settles exactly', () => {
  assert(sniffPose(.8).stare > STARE * .9, 'staring first');
  assert(sniffPose(.895).stare < -CHECK * .9, 'then checked behind');
  assert(Math.abs(sniffPose(.96).stare) < 1e-9, 'back at rest by .95');
  assert.equal(sniffPose(1).stare, 0);
});

test('the tail twitches once more as the head flicks back', () => {
  assert.ok(sniffPose(.89).lash > .1 && sniffPose(.89).lash < LASH * .3);
  assert.ok(Math.abs(sniffPose(.8).lash) < 1e-9 && Math.abs(sniffPose(.95).lash) < 1e-9);
});
