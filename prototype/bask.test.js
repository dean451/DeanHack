import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {JAW_GAPE} from './jaw.js';
import {updateBask, baskPose, baskLength, basks, BASK_GAPE, BASK_BREATH, SNOUT_LIFT, OPEN_S, FIRST_MIN, FIRST_SPAN, GAP_MIN, GAP_SPAN, HOLD_MIN, HOLD_SPAN} from './bask.js';

const COLON = ':'.charCodeAt(0);
const croc = (name = 'crocodile') => { const a = createCreature({name, symbol: COLON, color: 2}); a.actions = createActionQueue(); return a; };

// One frame as live.js runs it for the jaw: clear the action pose, run the actions, then bask.
function frame(a, dt, t, busy = !!a.actions.current || !!a.actions.queue.length) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateBask(a, dt, t, busy);
}

test('the basking gape opens slowly, holds, breathes and shuts back to rest', () => {
  const hold = 6, n = 2400, len = baskLength(hold);
  let prev = 0;
  for (let i = 0; i <= n; i++) {
    const s = len * i / n, v = baskPose(s, hold, s);
    assert(Number.isFinite(v) && v >= 0 && v <= BASK_GAPE + BASK_BREATH + 1e-9, `${s} ${v}`);
    assert(Math.abs(v - prev) < .01, `no jumps at ${s}`);
    prev = v;
  }
  assert.equal(baskPose(0, hold), 0);
  assert(baskPose(len, hold) < 1e-9, 'ends shut');
  assert(Math.abs(baskPose(2 + hold / 2, hold, 0) - BASK_GAPE) < 1e-9, 'held wide in the middle');
  assert.equal(baskPose(NaN, hold), 0);
});

test('a still crocodile basks, and walking, a bite or death closes its mouth', () => {
  const a = croc(), rest = a.jaw.rotation.x, dt = 1 / 60;
  assert(basks(a) && basks(croc('baby crocodile')));
  assert(!basks(createCreature({name: 'newt', symbol: COLON, color: 3})), 'jawless lizards do not');
  // Lying still: it starts within the first wait and opens wide.
  let t = 0, widest = 0, started = -1;
  for (; t < FIRST_MIN + FIRST_SPAN + 4; t += dt) {
    const v = frame(a, dt, t);
    assert(Math.abs(a.jaw.rotation.x - rest - v) < 1e-9, 'the offset is exactly what it reports');
    if (v > 0 && started < 0) started = t;
    widest = Math.max(widest, v);
  }
  assert(started >= FIRST_MIN - dt && started <= FIRST_MIN + FIRST_SPAN + dt, `started at ${started}`);
  assert(widest > BASK_GAPE * .95, 'opens wide');
  // A bite mid-bask: the bask fades out, the sum never passes the widest gape, and the jaw is
  // back at rest once it's over.
  enqueueAction(a.actions, {kind: 'attack', attack: 'bite', result: 'hit', dir: [1, 0]});
  let bask = 1;
  for (let k = 0; k < 120; k++, t += dt) {
    bask = frame(a, dt, t);
    const open = a.jaw.rotation.x - rest;
    assert(open >= -1e-9 && open <= JAW_GAPE + 1e-9, `gape ${open}`);
  }
  assert.equal(bask, 0, 'closed after the bite');
  assert.equal(a.bask.cur, null);
  // Walking keeps it shut; a full gape later returns exactly to rest.
  for (let k = 0; k < 600; k++, t += dt) assert.equal(frame(a, dt, t, true), 0);
  let seen = false, done = false;
  for (let k = 0; k < (GAP_MIN + GAP_SPAN + HOLD_MIN + HOLD_SPAN + 4) * 60 && !done; k++, t += dt) {
    frame(a, dt, t);
    if (a.bask.cur) seen = true;
    else if (seen) done = true;
  }
  assert(done, 'a full bask ran');
  assert.equal(a.bask.applied, 0);
  assert(Math.abs(a.jaw.rotation.x - rest) < 1e-9, 'back at rest after a full bask');
  // Death: whatever was showing fades out and it never basks again; the death slack is jaw.js's.
  enqueueAction(a.actions, {kind: 'die', style: 'topple', dir: [1, 0]});
  for (let k = 0; k < 60 * 30; k++, t += dt) {
    const v = frame(a, dt, t);
    if (k > 12) assert.equal(v, 0);
  }
});

test('updateBask ignores other creatures and bad input', () => {
  const rothe = createCreature({name: 'rothe', symbol: 'q'.charCodeAt(0), color: 3});
  const r = rothe.jaw?.rotation.x;
  assert.equal(updateBask(rothe, 1, 0, false), 0);
  assert.equal(rothe.jaw?.rotation.x, r);
  assert.equal(updateBask(null, 1, 0, false), 0);
  const a = croc();
  for (let k = 0; k < 100; k++) assert(Number.isFinite(frame(a, NaN, k)));
});

test('the snout tips up with the gape, holds steady and settles back to rest', async () => {
  const THREE = await import('three');
  const a = croc(), dt = 1 / 60, headRest = a.head.rotation.x, jawRest = a.jaw.rotation.x;
  // The snout tip, in the head's space: the forward-most point of the head mesh.
  const box = new THREE.Box3().setFromObject(a.head); a.g.updateMatrixWorld(true);
  const tip = () => { a.g.updateMatrixWorld(true); return a.head.localToWorld(new THREE.Vector3(0, 0, .2)).y; };
  const tip0 = tip();
  let t = 0, widest = 0, highest = -Infinity, prevLift = 0, maxStep = 0, holdLifts = [];
  let seen = false, done = false;
  for (; t < 60 && !done; t += dt) {
    frame(a, dt, t);
    const lift = headRest - a.head.rotation.x;
    assert(Number.isFinite(lift) && lift >= -1e-9 && lift <= SNOUT_LIFT + 1e-9, `lift ${lift}`);
    maxStep = Math.max(maxStep, Math.abs(lift - prevLift)); prevLift = lift;
    widest = Math.max(widest, lift); highest = Math.max(highest, tip());
    if (a.bask.cur) { seen = true; const c = a.bask.cur; if (c.s > OPEN_S + .1 && c.s < OPEN_S + c.hold - .1) holdLifts.push(lift); }
    else if (seen) done = true;
  }
  assert(done && box.max.z > .1, 'a full bask ran');
  assert(widest > SNOUT_LIFT * .99, `lifts ${widest}`);
  assert(highest > tip0 + .01, `the snout rises (${tip0} -> ${highest})`);
  assert(maxStep < .01, `no head jumps (${maxStep})`);
  assert(holdLifts.length > 60 && Math.max(...holdLifts) - Math.min(...holdLifts) < 1e-3, 'steady while the jaw breathes');
  assert(Math.abs(a.head.rotation.x - headRest) < 1e-9 && Math.abs(a.jaw.rotation.x - jawRest) < 1e-9, 'back at rest');
  // A bite mid-bask drops the head back with the jaw.
  for (seen = false; t < 120 && !(seen && a.jaw.rotation.x - jawRest > .3); t += dt) { frame(a, dt, t); seen = seen || !!a.bask.cur; }
  enqueueAction(a.actions, {kind: 'attack', attack: 'bite', result: 'hit', dir: [1, 0]});
  for (let k = 0; k < 120; k++, t += dt) frame(a, dt, t);
  assert.equal(a.bask.lift, 0);
  assert(Math.abs(a.head.rotation.x - headRest) < 1e-9, 'head back at rest after the bite');
});

test('a gallery crocodile, with no action queue, basks on its own and settles back to rest', () => {
  // The gallery in main.js builds creatures by name alone and never gives them actions.
  const a = createCreature({name: 'crocodile', kind: 'monster'});
  assert(basks(a));
  const jaw0 = a.jaw.rotation.x, head0 = a.head.rotation.x, dt = 1 / 60;
  let opened = 0, prevJaw = jaw0, t = 0;
  for (let i = 0; i < 60 * 60; i++, t += dt) {
    updateBask(a, dt, t, false);
    const g = a.jaw.rotation.x - jaw0, l = head0 - a.head.rotation.x;
    assert(Number.isFinite(g) && Number.isFinite(l));
    assert(g >= -1e-12 && g <= Math.min(JAW_GAPE, BASK_GAPE + BASK_BREATH) + 1e-9, `gape ${g}`);
    assert(l >= -1e-12 && l <= SNOUT_LIFT + 1e-9, `lift ${l}`);
    assert(Math.abs(a.jaw.rotation.x - prevJaw) < .01, `no jumps at ${t}`);
    prevJaw = a.jaw.rotation.x;
    opened = Math.max(opened, g);
  }
  assert(opened > BASK_GAPE * .9, 'it gaped at least once in a minute');
  // Made busy, it closes all the way back to rest.
  for (let i = 0; i < 60; i++, t += dt) updateBask(a, dt, t, true);
  assert(Math.abs(a.jaw.rotation.x - jaw0) < 1e-12 && Math.abs(a.head.rotation.x - head0) < 1e-12);
});
