import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateGnomeTug, tugPose, tugs, RAISE, IN, YANK, SKEW, DUCK, GLANCE, FIRST_MIN, FIRST_SPAN} from './gnome-tug.js';

const make = (name, symbol) => {
  const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 3});
  a.species = name; a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateGnomeTug(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [a.head.rotation.x, a.head.rotation.y, a.hat.rotation.z, a.arms[0].rotation.x, a.arms[0].rotation.z, a.arms[1].rotation.x];

test('the tug pose stays in bounds, moves smoothly and starts and ends at rest', () => {
  const n = 6000;
  let prev = tugPose(0), glanceL = 0, glanceR = 0;
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = tugPose(u);
    for (const v of Object.values(p)) assert(Number.isFinite(v));
    assert(p.raise >= 0 && p.raise <= RAISE + 1e-12 && p.across >= 0 && p.across <= IN + 1e-12);
    assert(p.yank >= 0 && p.yank <= YANK + 1e-12 && p.skew >= 0 && p.skew <= SKEW + 1e-12);
    assert(p.duck >= 0 && p.duck <= DUCK + 1e-12 && Math.abs(p.glance) <= GLANCE + 1e-12);
    for (const k of Object.keys(p)) assert(Math.abs(p[k] - prev[k]) < .03, `${k} jumps at ${u}`);
    prev = p; glanceL = Math.max(glanceL, p.glance); glanceR = Math.min(glanceR, p.glance);
  }
  assert(Object.values(tugPose(0)).every(v => v === 0) && Object.values(tugPose(1)).every(v => v === 0));
  assert(Object.values(tugPose(.5, 0)).every(v => v === 0) && Object.values(tugPose(NaN)).every(v => v === 0));
  assert(tugPose(.3).raise > RAISE * .99 && tugPose(.3).yank > YANK * .99, 'hand up, cap yanked down');
  assert(glanceL > GLANCE * .99 && glanceR < -GLANCE * .5, 'the head jerks both ways');
  assert(tugPose(.95).raise < RAISE * .01 && tugPose(.95).skew < SKEW * .01, 'hand dropped and cap sprung back');
});

test('an idle gnome tugs its cap now and then, and returns exactly to rest', () => {
  const a = make('gnome', 'G'), dt = 1 / 60, rest = snap(a);
  let count = 0, first = null, high = 0;
  for (let k = 0; k < 60 * 60; k++) {
    const p = frame(a, dt);
    const t = k * dt;
    if (p && first == null) first = t;
    if (p && !a.gnomeTug.counted) { a.gnomeTug.counted = true; count++; }
    if (!p && a.gnomeTug) a.gnomeTug.counted = false;
    for (const v of snap(a)) assert(Number.isFinite(v));
    high = Math.max(high, rest[3] - a.arms[0].rotation.x);
    assert.equal(a.arms[1].rotation.x, rest[5], 'the weapon arm stays put');
    if (!p) snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `drift at ${t}`));
  }
  assert(first >= FIRST_MIN && first <= FIRST_MIN + FIRST_SPAN + dt, `first at ${first}`);
  assert(count >= 2, `tugged ${count} times`);
  assert(high > RAISE * .8, `hand raised ${high}`);
});

test('walking fades a tug out and an attack blocks one', () => {
  const a = make('gnome', 'G'), dt = 1 / 60;
  const rest = snap(a);
  let i = 0;
  while (!frame(a, dt) && i++ < 60 * 14);
  for (let k = 0; k < 40; k++) frame(a, dt);
  assert(a.gnomeTug.cur && a.gnomeTug.applied.raise > .1);
  for (let k = 0; k < 30; k++) frame(a, dt, true);
  assert(!a.gnomeTug.cur, 'faded out within half a second');
  snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9));
  const b = make('gnome', 'G');
  for (let k = 0; k < 60 * 14; k++) {
    if (!b.actions.current && !b.actions.queue.length) enqueueAction(b.actions, {kind: 'attack', dir: {x: 1, z: 0}});
    assert.equal(frame(b, dt), null);
  }
});

test('other monsters do not tug', () => {
  for (const [n, s] of [['dwarf', 'h'], ['bugbear', 'h'], ['kobold', 'k']]) assert(!tugs(make(n, s)), n);
  assert(tugs(make('gnome lord', 'G')));
});
