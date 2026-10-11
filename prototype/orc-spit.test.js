import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateOrcSpit, spitPose, spits, RAISE, IN, HEAVE, HUNCH, SPIT, FIRST_MIN, FIRST_SPAN} from './orc-spit.js';

const make = (name, symbol) => {
  const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 2});
  a.species = name; a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateOrcSpit(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [a.head.rotation.x, a.head.rotation.y, a.arms[0].rotation.x, a.arms[0].rotation.z, a.arms[1].rotation.x];

test('the spit pose stays in bounds, moves smoothly and starts and ends at rest', () => {
  const n = 6000;
  let prev = spitPose(0), aside = 0, back = 0;
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = spitPose(u);
    for (const v of Object.values(p)) assert(Number.isFinite(v));
    assert(p.raise >= 0 && p.raise <= RAISE + 1e-12 && p.across >= 0 && p.across <= IN + 1e-12);
    assert(p.heave >= 0 && p.heave <= HEAVE + 1e-12 && p.hunch >= 0 && p.hunch <= HUNCH + 1e-12);
    assert(Math.abs(p.spit) <= SPIT + 1e-12);
    for (const k of Object.keys(p)) assert(Math.abs(p[k] - prev[k]) < (k === 'spit' ? .15 : .03), `${k} jumps at ${u}`);
    prev = p; aside = Math.max(aside, p.spit); back = Math.min(back, p.spit);
  }
  assert(Object.values(spitPose(0)).every(v => v === 0) && Object.values(spitPose(1)).every(v => v === 0));
  assert(Object.values(spitPose(.5, 0)).every(v => v === 0) && Object.values(spitPose(NaN)).every(v => v === 0));
  assert(aside > SPIT * .99, 'the head snaps aside');
  assert(back < -.05, 'and glares back the other way');
  assert(spitPose(.2).heave > 0 && spitPose(.4).heave > 0 && spitPose(.31).heave < .01, 'two separate hawks');
});

test('an idle orc spits now and then, and returns exactly to rest', () => {
  const a = make('hill orc', 'o'), dt = 1 / 60, rest = snap(a);
  assert(spits(a));
  let count = 0, first = null, high = 0;
  for (let k = 0; k < 60 * 80; k++) {
    const p = frame(a, dt), t = k * dt;
    if (p && first == null) first = t;
    if (p && !a.orcSpit.counted) { a.orcSpit.counted = true; count++; }
    if (!p && a.orcSpit) a.orcSpit.counted = false;
    for (const v of snap(a)) assert(Number.isFinite(v));
    high = Math.max(high, rest[2] - a.arms[0].rotation.x);
    assert.equal(a.arms[1].rotation.x, rest[4], 'the weapon arm stays put');
    if (!p) snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `drift at ${t}`));
  }
  assert(first >= FIRST_MIN && first <= FIRST_MIN + FIRST_SPAN + dt, `first at ${first}`);
  assert(count >= 2, `spat ${count} times`);
  assert(high > RAISE * .8, `arm raised ${high}`);
});

test('walking fades a spit out and an attack blocks one', () => {
  const a = make('hill orc', 'o'), dt = 1 / 60, rest = snap(a);
  let i = 0;
  while (!frame(a, dt) && i++ < 60 * 20);
  for (let k = 0; k < 60; k++) frame(a, dt);
  assert(a.orcSpit.cur && a.orcSpit.applied.hunch > .05);
  for (let k = 0; k < 30; k++) frame(a, dt, true);
  assert(!a.orcSpit.cur, 'faded out within half a second');
  snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9));
  const b = make('hill orc', 'o');
  for (let k = 0; k < 60 * 20; k++) {
    if (!b.actions.current && !b.actions.queue.length) enqueueAction(b.actions, {kind: 'attack', dir: {x: 1, z: 0}});
    assert.equal(frame(b, dt), null);
  }
});

test('other monsters do not spit', () => {
  for (const [n, s] of [['dwarf', 'h'], ['gnome', 'G'], ['kobold', 'k'], ['troll', 'T']]) assert(!spits(make(n, s)), n);
});
