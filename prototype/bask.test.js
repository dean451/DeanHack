import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {JAW_GAPE} from './jaw.js';
import {updateBask, baskPose, baskLength, basks, BASK_GAPE, BASK_BREATH, FIRST_MIN, FIRST_SPAN, GAP_MIN, GAP_SPAN, HOLD_MIN, HOLD_SPAN} from './bask.js';

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
