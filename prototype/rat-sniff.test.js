import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as M from './rat-sniff.js';

const dt = 1 / 60;
const mon = name => { const a = createCreature({name, symbol: 'r'.charCodeAt(0), color: 1}); a.species = name; return a; };

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .002) {
    const p = M.sniffPose(u);
    for (const k of Object.keys(p)) assert.ok(Math.abs(p[k]) <= 1 + 1e-9, `${k} at ${u}`);
  }
  for (const u of [0, 1]) for (const v of Object.values(M.sniffPose(u))) assert.equal(v, 0);
});

test('a standing sewer rat does it now and then, stays in bounds and ends exactly at rest', () => {
  const a = mon('sewer rat'), x = a.head.rotation.x, y = a.head.rotation.y, z = a.tail?.rotation.z ?? 0;
  assert.ok(M.sniffs(a));
  let seen = 0;
  for (let i = 0; i < 60 * 40; i++) {
    updateFidget(a, dt, i * dt, false, null);
    if (a.ratSniff?.s != null) seen++;
    assert.ok(Math.abs(a.head.rotation.x - x) <= M.DIP + 1e-9 && Math.abs(a.head.rotation.y - y) <= M.HUNT + 1e-9);
  }
  assert.ok(seen > 60, 'it moved');
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
  assert.ok(Math.abs(a.head.rotation.x - x) < 1e-9 && Math.abs(a.head.rotation.y - y) < 1e-9);
  if (a.tail) assert.ok(Math.abs(a.tail.rotation.z - z) < 1e-9);
});

test('only the right species does it', () => {
  assert.equal(M.updateRatSniff(mon('newt'), dt, 0, false), null);
  assert.equal(M.sniffs(mon('newt')), false);
});
