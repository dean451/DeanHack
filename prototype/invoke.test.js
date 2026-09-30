import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateInvoke, invokePose, invokes, RAISE, PALM, LOOK, SWAY, SHAKE, RATTLE, NOD, FIRST_MIN, FIRST_SPAN} from './invoke.js';

const make = (name, symbol) => {
  const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 4});
  a.species = name; a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateInvoke(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [a.head.rotation.x, a.head.rotation.z, a.arm.rotation.x, a.arm.rotation.z, a.arms[0].rotation.x, a.weaponSocket.rotation.z, a.weaponSocket.rotation.x];

test('the incantation pose stays in bounds, moves smoothly and starts and ends at rest', () => {
  const n = 6000;
  let prev = invokePose(0), swayL = 0, swayR = 0, rattleL = 0, rattleR = 0, nod = 0;
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = invokePose(u);
    for (const v of Object.values(p)) assert(Number.isFinite(v));
    assert(p.raise >= 0 && p.raise <= RAISE + 1e-12 && p.palm >= 0 && p.palm <= PALM + 1e-12);
    assert(p.look >= -LOOK - 1e-12 && p.look <= NOD + 1e-12);
    assert(Math.abs(p.sway) <= SWAY + 1e-12 && Math.abs(p.shake) <= SHAKE + 1e-12 && Math.abs(p.rattle) <= RATTLE + 1e-12);
    for (const k of Object.keys(p)) assert(Math.abs(p[k] - prev[k]) < .02, `${k} jumps at ${u}`);
    prev = p;
    swayL = Math.min(swayL, p.sway); swayR = Math.max(swayR, p.sway);
    rattleL = Math.min(rattleL, p.rattle); rattleR = Math.max(rattleR, p.rattle);
    if (u > .72) nod = Math.max(nod, p.look);
  }
  assert(Object.values(invokePose(0)).every(v => v === 0) && Object.values(invokePose(1)).every(v => v === 0));
  assert(Object.values(invokePose(.5, 0)).every(v => v === 0) && Object.values(invokePose(NaN)).every(v => v === 0));
  const mid = invokePose(.45);
  assert(mid.raise > RAISE * .9 && mid.palm > PALM * .9 && mid.look < -LOOK * .9, 'staff up, hand up, head back');
  assert(swayL < -SWAY * .5 && swayR > SWAY * .5 && rattleL < -RATTLE * .5 && rattleR > RATTLE * .5, 'sways and rattles both ways');
  assert(nod > NOD * .9, 'nods at the thump');
  assert(invokePose(.8).raise < RAISE * .1, 'the staff is down by the nod');
});

for (const [name, symbol] of [['kobold shaman', 'k'], ['orc shaman', 'o']]) {
  test(`a standing ${name} invokes now and then and goes back exactly to rest`, () => {
    const a = make(name, symbol);
    assert(invokes(a));
    const rest = snap(a), dt = 1 / 60;
    let t = 0, first = null, count = 0, peak = 0;
    for (let i = 0; i < 60 * 40; i++) {
      t += dt;
      const p = frame(a, dt);
      if (p && first == null) first = t;
      if (p && !a.invoke.counted) { a.invoke.counted = true; count++; }
      if (!p && a.invoke) a.invoke.counted = false;
      if (p) peak = Math.max(peak, p.raise);
      for (const v of snap(a)) assert(Number.isFinite(v));
      if (!p) snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9, `drift at ${t}`));
    }
    assert(first >= FIRST_MIN && first <= FIRST_MIN + FIRST_SPAN + dt, `first at ${first}`);
    assert(count >= 2, `invoked ${count} times`);
    assert(peak > RAISE * .9);
  });
}

test('walking fades an incantation out and an attack blocks one', () => {
  const a = make('kobold shaman', 'k'), dt = 1 / 60;
  const rest = snap(a);
  let i = 0;
  while (!frame(a, dt) && i++ < 60 * 10);
  for (let k = 0; k < 60; k++) frame(a, dt);
  assert(a.invoke.cur && a.invoke.applied.raise > .1);
  for (let k = 0; k < 30; k++) frame(a, dt, true);
  assert(!a.invoke.cur, 'faded out within half a second');
  snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9));
  // with an attack queued it never starts
  const b = make('orc shaman', 'o');
  for (let k = 0; k < 60 * 10; k++) {
    if (!b.actions.current && !b.actions.queue.length) enqueueAction(b.actions, {kind: 'attack', dir: {x: 1, z: 0}});
    assert.equal(frame(b, dt), null);
  }
});

test('other monsters, including the orc family and plain kobolds, do not invoke', () => {
  for (const [name, symbol] of [['kobold', 'k'], ['kobold lord', 'k'], ['orc', 'o'], ['hill orc', 'o'], ['bugbear', 'h'], ['gnome', 'G'], ['imp', 'i']]) {
    const a = make(name, symbol);
    assert(!invokes(a), name);
    const rest = snap.call(null, {head: a.head || {rotation: {}}, arm: a.arm || {rotation: {}}, arms: a.arms?.length ? a.arms : [{rotation: {}}], weaponSocket: a.weaponSocket || {rotation: {}}});
    for (let k = 0; k < 60 * 12; k++) assert.equal(updateInvoke(a, 1 / 60, 0, false), null);
    assert.deepEqual(snap({head: a.head || {rotation: {}}, arm: a.arm || {rotation: {}}, arms: a.arms?.length ? a.arms : [{rotation: {}}], weaponSocket: a.weaponSocket || {rotation: {}}}), rest);
  }
});
