import test from 'node:test';
import assert from 'node:assert/strict';
import {createGhoul} from './ghoul.js';
import {updateFidget} from './fidget.js';
import * as M from './ghoul-rake.js';
import * as Z from './zombie-lull.js';

const dt = 1 / 60;

test('poses stay in bounds and end at zero', () => {
  for (let u = -.1; u <= 1.1; u += .001) {
    for (const [k, v] of Object.entries(M.rakePose(u))) assert.ok(v >= 0 && v <= 1 + 1e-9, `${k} at ${u}`);
  }
  for (const u of [0, 1]) for (const v of Object.values(M.rakePose(u))) assert.equal(v, 0);
});

test('two long scrapes, then the head jerks up with the claw still curled', () => {
  assert.ok(M.rakePose(.34).dip > .99 && M.rakePose(.34).rake > .95);
  assert.ok(M.rakePose(.56).rake > .95);
  assert.ok(M.rakePose(.37).rake < .1, 'the claws let go between scrapes');
  assert.ok(M.rakePose(.75).dip < .05 && M.rakePose(.75).curl > .9);
});

test('a standing ghoul does it, stays in bounds and ends exactly at rest', () => {
  const a = createGhoul(), parts = [a.head, ...a.arms];
  const r = parts.map(p => [p.rotation.x, p.rotation.z]);
  assert.ok(M.rakes(a));
  let seen = 0;
  for (let i = 0; i < 60 * 50; i++) {
    updateFidget(a, dt, i * dt, false, null);
    if (a.ghoulRake?.s != null) seen++;
    assert.ok(Math.abs(a.head.rotation.x - r[0][0]) <= M.DIP + Z.NOD + 1e-9);
    for (const j of [1, 2]) assert.ok(Math.abs(a.arms[j - 1].rotation.x - r[j][0]) <= M.RAKE + M.CURL + Z.SPASM + 1e-9);
  }
  assert.ok(seen > 60, 'it moved');
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
  parts.forEach((p, i) => assert.ok(Math.abs(p.rotation.x - r[i][0]) < 1e-9 && Math.abs(p.rotation.z - r[i][1]) < 1e-9));
});

test('only ghouls do it', () => {
  const o = {quirk: 'zombie', kind: 'zombie', body: {}, head: {}, arms: [{}, {}]};
  assert.equal(M.rakes(o), false);
  assert.equal(M.updateGhoulRake(o, dt, 0, false), null);
});
