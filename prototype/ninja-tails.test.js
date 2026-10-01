import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, clearActionPose, updateActions} from './actions.js';
import {TAIL_REST} from './ninja.js';
import * as N from './ninja-tails.js';

const dt = 1 / 60;
const ninja = () => { const a = createCreature({name: 'ninja', symbol: 64, color: 4}); a.g.updateMatrixWorld(true); return a; };
const off = a => a.hoodTails.flatMap((g, i) => [g.rotation.x - TAIL_REST[i].rot[0], g.rotation.y - TAIL_REST[i].rot[1], g.rotation.z - TAIL_REST[i].rot[2]]);
const most = v => Math.max(...v.map(Math.abs));

// One frame as live.js runs it: take the action pose off, fidget, then the actions.
function frame(a, t, busy = false) {
  if (a.actions) clearActionPose(a, a.actions);
  const st = N.updateNinjaTails(a, dt, t, busy || !!a.actions?.current || !!a.actions?.queue.length);
  if (a.actions) updateActions(a, a.actions, dt);
  return st;
}

test('only the ninja is moved; its two hood tails are their own groups at the knot, at rest', () => {
  for (const name of ['samurai', 'rogue', 'jackal']) assert.equal(N.updateNinjaTails(createCreature({name}), dt, 0, false), null, name);
  const a = ninja();
  assert.ok(N.isNinja(a));
  assert.equal(a.hoodTails.length, 2);
  for (const g of a.hoodTails) { assert.equal(g.parent, a.head); assert.ok(g.children.some(c => c.isMesh && c.userData.part === 'hoodTail')); }
  assert.deepEqual(off(a), [0, 0, 0, 0, 0, 0]);
});

test('the curves are zero outside their spans and bounded inside', () => {
  for (const v of [-1, 0, 1, 2, NaN]) { assert.equal(N.whipCurve(v), 0); assert.equal(N.draughtCurve(v), 0); }
  for (let u = 0; u < 1; u += .01) {
    for (const f of [N.whipCurve, N.draughtCurve]) { const v = f(u); assert.ok(v >= 0 && v <= 1 + 1e-9, `${u} ${v}`); }
  }
});

test('running forward streams them out behind and fluttering; sideways throws them aside; a stop settles them', () => {
  const a = ninja();
  let t = 0;
  for (let i = 0; i < 60; i++) frame(a, t += dt);
  // run along +z (its facing) at 4 tiles/s for 2 s
  const lifts = [];
  for (let i = 0; i < 120; i++) {
    a.g.position.z += 4 * dt;
    frame(a, t += dt, true);
    if (i > 40) lifts.push(off(a)[0]);
  }
  const mean = lifts.reduce((s, v) => s + v, 0) / lifts.length;
  assert.ok(mean > .8 && mean < N.SWING_X, `streams back ${mean}`);
  assert.ok(Math.max(...lifts) - Math.min(...lifts) > .1, 'flutters');
  // the two tails do not move together
  assert.ok(Math.abs(off(a)[0] - off(a)[3]) > 1e-3 || Math.abs(off(a)[2] - off(a)[5]) > 1e-3);
  // stop: they swing down and settle against the back
  let prev = off(a), worst = 0;
  for (let i = 0; i < 300; i++) { frame(a, t += dt); const o = off(a); worst = Math.max(worst, most(o.map((v, j) => v - prev[j]))); prev = o; }
  assert.ok(off(a)[0] >= 0 && off(a)[0] < .2, `settled ${off(a)}`);
  assert.ok(worst < .2, `per-frame change ${worst}`);
  // strafe toward +x: the tips are thrown toward -x (negative z rotation)
  const b = ninja();
  for (let i = 0; i < 90; i++) { b.g.position.x += 3 * dt; frame(b, i * dt, true); }
  assert.ok(off(b)[2] < -.2 && off(b)[5] < -.2, `${off(b)}`);
});

test('a teleport does not stream them; a cut whips them back; a blow kicks them up; death settles them at rest', () => {
  const a = ninja();
  let t = 0;
  frame(a, t += dt);
  a.g.position.x += 20;
  for (let i = 0; i < 5; i++) frame(a, t += dt);
  assert.ok(most(off(a)) < .15, `teleport ${off(a)}`);
  a.actions = createActionQueue();
  let peak = 0;
  enqueueAction(a.actions, {kind: 'attack', attack: 'weapon', dir: [0, 1], result: 'hit'});
  for (let i = 0; i < 60; i++) { frame(a, t += dt); peak = Math.max(peak, off(a)[0]); }
  assert.ok(peak > .4, `whip ${peak}`);
  for (let i = 0; i < 200; i++) frame(a, t += dt);
  peak = 0;
  enqueueAction(a.actions, {kind: 'hit', result: 'hit'});
  for (let i = 0; i < 40; i++) { frame(a, t += dt); peak = Math.max(peak, off(a)[0], off(a)[3]); }
  assert.ok(peak > .2, `blow ${peak}`);
  a.actions.dead = true; a.actions.current = null; a.actions.queue.length = 0;
  for (let i = 0; i < 600; i++) frame(a, t += dt);
  assert.deepEqual(off(a).map(v => Math.abs(v) < 1e-9 ? 0 : v), [0, 0, 0, 0, 0, 0]);
});

test('every value stays finite and in bounds over a long wander; stone holds the pose', () => {
  const a = ninja();
  let t = 0;
  for (let i = 0; i < 60 * 90; i++) {
    t += dt;
    const moving = Math.sin(t * .4) > 0;
    if (moving) { a.g.position.x += Math.cos(t) * 3 * dt; a.g.position.z += Math.sin(t * .7) * 3 * dt; a.g.rotation.y = t * .9; }
    a.head.rotation.y = Math.sin(t * 1.3) * .6;
    frame(a, t, moving);
    for (const [j, v] of off(a).entries()) {
      assert.ok(Number.isFinite(v), `${t} ${j}`);
      if (j % 3 === 0) assert.ok(v >= 0 && v <= N.SWING_X + 1e-9, `x ${t} ${v}`);
      if (j % 3 === 2) assert.ok(Math.abs(v) <= N.SWING_Z + 1e-9, `z ${t} ${v}`);
    }
  }
  a.g.position.z += 1; frame(a, t += dt, true); frame(a, t += dt, true);
  a.stone = true;
  const held = off(a);
  for (let i = 0; i < 60; i++) { a.g.position.z += .05; frame(a, t += dt, true); }
  assert.deepEqual(off(a), held);
  a.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(a.g, true);
  assert.ok([b.min.x, b.min.y, b.max.x, b.max.y].every(Number.isFinite));
});
