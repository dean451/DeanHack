import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as S from './spider-probe.js';

const dt = 1 / 60;
const mon = (name, symbol = 's') => { const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 1}); a.species = name; return a; };

test('probe poses stay in bounds, end at zero and the taps come from a raised leg', () => {
  for (let u = -.1; u <= 1.1; u += .002) {
    const p = S.probePose(u);
    assert.ok(p.a >= 0 && p.a <= 1 && p.b >= 0 && p.b <= 1 && Math.abs(p.ta) <= 1 && Math.abs(p.tb) <= 1, `${u}`);
    assert.ok(Math.abs(p.ta) <= p.a + 1e-9 && Math.abs(p.tb) <= p.b + 1e-9, `${u} a tap needs its leg up`);
  }
  assert.deepEqual(S.probePose(0), {a: 0, b: 0, ta: 0, tb: 0});
  assert.deepEqual(S.probePose(1), {a: 0, b: 0, ta: 0, tb: 0});
  let jabs = 0, was = false;
  for (let u = 0; u < 1; u += .001) { const on = S.probePose(u).ta > .5; if (on && !was) jabs++; was = on; }
  assert.equal(jabs, 3, 'three jabs');
  for (let u = 0; u < 1; u += .002) assert.ok(Math.abs(S.probePose(u + .002).ta - S.probePose(u).ta) < .4, `${u}`);
});

test('a standing spider probes now and then, stays finite and in bounds, and ends exactly at rest', () => {
  const a = mon('giant spider'), z = a.legs.map(l => l.rotation.z), y = a.legs.map(l => l.rotation.y), h = a.body.position.y;
  let seen = 0;
  for (let i = 0; i < 60 * 40; i++) {
    updateFidget(a, dt, i * dt, false, null);
    if (a.spiderProbe?.s != null) seen++;
    for (const l of a.legs) assert.ok(Number.isFinite(l.rotation.z) && Math.abs(l.rotation.z - z[0]) <= S.LIFT + 1e-9 && Math.abs(l.rotation.y) <= S.TAP + 1e-9);
    assert.ok(a.body.position.y <= h + 1e-9 && a.body.position.y >= h - S.SINK - 1e-9);
  }
  assert.ok(seen > 60, 'it probed');
  // walking takes it back, then it rests exactly
  for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
  a.legs.forEach((l, i) => { assert.ok(Math.abs(l.rotation.z - z[i]) < 1e-9 && Math.abs(l.rotation.y - y[i]) < 1e-9, `leg ${i}`); });
  assert.ok(Math.abs(a.body.position.y - h) < 1e-9);
});

test('only true spiders probe, not scorpions or other walkers', () => {
  assert.equal(S.updateSpiderProbe(mon('scorpion'), dt, 0, false), null);
  assert.equal(S.updateSpiderProbe(mon('jackal', 'd'), dt, 0, false), null);
  assert.ok(S.probes(mon('cave spider')));
});
