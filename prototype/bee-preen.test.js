import test from 'node:test';
import assert from 'node:assert/strict';
import {createBee} from './bee.js';
import {updateFidget} from './fidget.js';
import * as M from './bee-preen.js';

const dt = 1 / 60;

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .001) {
    const p = M.preenPose(u);
    for (const k of ['lift', 'dip']) assert.ok(p[k] >= 0 && p[k] <= 1 + 1e-9, `${k} at ${u}`);
    assert.ok(Math.abs(p.scrub) <= 1 + 1e-9, `scrub at ${u}`);
  }
  for (const u of [0, 1]) for (const v of Object.values(M.preenPose(u))) assert.equal(v, 0);
});

test('the forelegs scrub in both directions and hang up late', () => {
  let lo = 0, hi = 0;
  for (let u = .2; u < .7; u += .002) { const s = M.preenPose(u).scrub; lo = Math.min(lo, s); hi = Math.max(hi, s); }
  assert.ok(lo < -.8 && hi > .8);
  assert.ok(M.preenPose(.8).lift > .95, 'still raised after the scrubbing ends');
});

for (const kind of ['killer bee', 'queen bee']) test(`a standing ${kind} preens, stays in bounds and ends exactly at rest`, () => {
  const a = createBee(kind), L = a.legs[0], R = a.legs[3], h = a.head;
  const r = [L.rotation.x, R.rotation.x, h.rotation.x];
  assert.ok(M.preens(a));
  let seen = 0;
  for (let i = 0; i < 60 * 50; i++) {
    updateFidget(a, dt, i * dt, false, null);
    if (a.beePreen?.s != null) seen++;
    assert.ok(Math.abs(L.rotation.x - r[0]) <= M.LIFT + M.SCRUB + 1e-9);
    assert.ok(Math.abs(R.rotation.x - r[1]) <= M.LIFT + M.SCRUB + 1e-9);
    assert.ok(Math.abs(h.rotation.x - r[2]) <= M.DIP + 1e-9);
  }
  assert.ok(seen > 60, 'it moved');
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
  assert.ok(Math.abs(L.rotation.x - r[0]) < 1e-9 && Math.abs(R.rotation.x - r[1]) < 1e-9 && Math.abs(h.rotation.x - r[2]) < 1e-9);
});

test('only bees do it', () => {
  assert.equal(M.updateBeePreen({quirk: 'idle', kind: 'newt', body: {}, legs: []}, dt, 0, false), null);
});

test('a stray rub follows the head jerking clear, small, and rests exactly', () => {
  const q = M.preenPose(.95);
  assert.ok(q.lift > .3 && q.lift < .4 && q.dip < .01, 'forelegs up, head clear');
  let moved = false;
  for (let u = .93; u < .98; u += .002) if (Math.abs(M.preenPose(u).scrub) > .1) moved = true;
  assert.ok(moved, 'it rubs');
  assert.ok(M.preenPose(.9999).lift < 1e-3 && Math.abs(M.preenPose(.9999).scrub) < 1e-3);
});
