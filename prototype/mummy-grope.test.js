import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as M from './mummy-grope.js';

const dt = 1 / 60;
const mon = name => { const a = createCreature({name, symbol: 'M'.charCodeAt(0), color: 1}); a.species = name; return a; };

test('grope poses stay in bounds, end at zero and look both ways', () => {
  let lo = 0, hi = 0;
  for (let u = -.1; u <= 1.1; u += .002) {
    const p = M.gropePose(u);
    assert.ok(Math.abs(p.turn) <= 1 && p.sweep >= 0 && p.sweep <= 1 && p.clutch >= 0 && p.clutch <= 1, `${u}`);
    lo = Math.min(lo, p.turn); hi = Math.max(hi, p.turn);
  }
  assert.deepEqual(M.gropePose(0), {turn: 0, sweep: 0, clutch: 0});
  assert.deepEqual(M.gropePose(1), {turn: 0, sweep: 0, clutch: 0});
  assert.ok(lo < -.5 && hi > .5, 'turns each way');
});

test('a standing mummy gropes now and then, stays in bounds and ends exactly at rest', () => {
  const a = mon('human mummy'), y = a.head.rotation.y, z = a.arms.map(r => r.rotation.z), x = a.arms.map(r => r.rotation.x);
  let seen = 0;
  for (let i = 0; i < 60 * 40; i++) {
    updateFidget(a, dt, i * dt, false, null);
    if (a.mummyGrope?.s != null) seen++;
    assert.ok(Math.abs(a.head.rotation.y - y) <= M.TURN + 1e-9);
    a.arms.forEach((r, k) => assert.ok(Math.abs(r.rotation.z - z[k]) <= M.SWEEP + 1e-9 && Math.abs(r.rotation.x - x[k]) <= M.CLUTCH + 1e-9));
  }
  assert.ok(seen > 60, 'it groped');
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
  assert.ok(Math.abs(a.head.rotation.y - y) < 1e-9);
  a.arms.forEach((r, k) => assert.ok(Math.abs(r.rotation.z - z[k]) < 1e-9 && Math.abs(r.rotation.x - x[k]) < 1e-9));
});

test('only mummies grope', () => {
  assert.equal(M.updateMummyGrope(mon('jackal'), dt, 0, false), null);
  assert.ok(M.gropes(mon('ettin mummy')));
});
