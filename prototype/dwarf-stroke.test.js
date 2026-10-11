import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateDwarfStroke, strokePose, strokes, RAISE, IN, STROKE, NOD, GLARE, FIRST_MIN, FIRST_SPAN} from './dwarf-stroke.js';

const make = (name, symbol) => {
  const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 3});
  a.species = name; a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateDwarfStroke(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [a.head.rotation.x, a.head.rotation.y, a.arms[0].rotation.x, a.arms[0].rotation.z, a.arms[1].rotation.x];

test('the stroke pose stays in bounds, moves smoothly and starts and ends at rest', () => {
  const n = 6000;
  let prev = strokePose(0), draws = 0, glare = 0;
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = strokePose(u);
    for (const v of Object.values(p)) assert(Number.isFinite(v));
    assert(p.raise >= 0 && p.raise <= RAISE + 1e-12 && p.across >= 0 && p.across <= IN + 1e-12);
    assert(p.draw >= 0 && p.draw <= STROKE + 1e-12 && p.nod >= 0 && p.nod <= NOD + 1e-12);
    assert(p.glare >= 0 && p.glare <= GLARE + 1e-12);
    for (const k of Object.keys(p)) assert(Math.abs(p[k] - prev[k]) < .02, `${k} jumps at ${u}`);
    prev = p; glare = Math.max(glare, p.glare);
    if (i > 0 && strokePose((i - 1) / n).draw < p.draw && p.draw > STROKE * .99) draws++;
  }
  assert(Object.values(strokePose(0)).every(v => v === 0) && Object.values(strokePose(1)).every(v => v === 0));
  assert(Object.values(strokePose(.5, 0)).every(v => v === 0) && Object.values(strokePose(NaN)).every(v => v === 0));
  assert(strokePose(.4).raise > RAISE * .99 && strokePose(.4).nod > NOD * .5, 'hand up, head down');
  assert(glare > GLARE * .99, 'the head jerks aside');
  assert(strokePose(.37).draw > STROKE * .99 && strokePose(.6).draw > STROKE * .99, 'two strokes');
  assert(strokePose(.485).draw < STROKE * .2, 'the hand comes back up between strokes');
  assert(strokePose(.95).raise < RAISE * .01, 'hand dropped before the end');
});

test('a standing dwarf strokes its beard now and then and goes back exactly to rest', () => {
  for (const name of ['dwarf', 'dwarf lord', 'dwarf king']) {
    const a = make(name, 'h');
    assert(strokes(a), name);
    const rest = snap(a), dt = 1 / 60;
    let t = 0, first = null, count = 0, high = 0;
    for (let i = 0; i < 60 * 45; i++) {
      t += dt;
      const p = frame(a, dt);
      if (p && first == null) first = t;
      if (p && !a.dwarfStroke.counted) { a.dwarfStroke.counted = true; count++; }
      if (!p && a.dwarfStroke) a.dwarfStroke.counted = false;
      for (const v of snap(a)) assert(Number.isFinite(v));
      high = Math.max(high, rest[2] - a.arms[0].rotation.x);
      assert.equal(a.arms[1].rotation.x, rest[4], 'the weapon arm stays put');
      if (!p) snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9, `drift at ${t}`));
    }
    assert(first >= FIRST_MIN && first <= FIRST_MIN + FIRST_SPAN + dt, `first at ${first}`);
    assert(count >= 2, `stroked ${count} times`);
    assert(high > RAISE * .8, `hand raised ${high}`);
  }
});

test('walking fades a stroke out and an attack blocks one', () => {
  const a = make('dwarf', 'h'), dt = 1 / 60;
  const rest = snap(a);
  let i = 0;
  while (!frame(a, dt) && i++ < 60 * 14);
  for (let k = 0; k < 120; k++) frame(a, dt);
  assert(a.dwarfStroke.cur && a.dwarfStroke.applied.raise > .1);
  for (let k = 0; k < 30; k++) frame(a, dt, true);
  assert(!a.dwarfStroke.cur, 'faded out within half a second');
  snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9));
  const b = make('dwarf', 'h');
  for (let k = 0; k < 60 * 14; k++) {
    if (!b.actions.current && !b.actions.queue.length) enqueueAction(b.actions, {kind: 'attack', dir: {x: 1, z: 0}});
    assert.equal(frame(b, dt), null);
  }
});

test('other monsters do not stroke', () => {
  for (const [n, s] of [['gnome', 'G'], ['bugbear', 'h'], ['kobold', 'k']]) assert(!strokes(make(n, s)), n);
});
