import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as S from './spore-puff.js';

const dt = 1 / 60;
function mold(name) { const a = createCreature({name, symbol: 'F'}); a.species = name; return a; }
const alphas = p => [...p.geometry.attributes.color.array].filter((_, k) => k % 4 === 3);
const finite = p => p.geometry.attributes.position.array.every(Number.isFinite) && p.geometry.attributes.color.array.every(Number.isFinite);

test('only the yellow mold puffs spores', () => {
  for (const name of ['brown mold', 'green mold', 'red mold', 'blue jelly', 'lichen']) assert.equal(S.updateSporePuff(mold(name), dt, 0, false), null, name);
  const y = mold('yellow mold');
  assert.ok(S.updateSporePuff(y, dt, 0, false));
  assert.ok(y.sporePuff.colony && y.sporePuff.heads, 'it finds the colony and the sporangia');
  assert.ok(y.sporePuff.tips.length > 10 && y.sporePuff.tips.every(p => p[1] > .06), 'puffs come off the heads, not the floor dust');
});

test('helpers stay in bounds', () => {
  for (let u = 0; u <= 1; u += .01) {
    const e = S.twitchEnvelope(u), p = S.pallAt(u, .15, 1), m = S.moteAlpha(u);
    assert.ok(e >= 0 && e <= 1);
    assert.ok(p.y >= .09 && p.y <= S.PALL_TOP + 1e-9 && Math.hypot(p.x, p.z) < .45 && p.alpha >= 0 && p.alpha <= S.PALL_ALPHA);
    assert.ok(m >= 0 && m <= S.MOTE_ALPHA);
  }
  assert.equal(S.twitchEnvelope(0), 0); assert.equal(S.twitchEnvelope(1), 0);
});

test('the yellow mold breathes, hangs a pall, coughs puffs, blasts spores at a blow and rests after death', () => {
  const y = mold('yellow mold');
  let t = 0, pall = 0, puffA = 0, minS = 1, maxS = 1, runs = 0, lastPuffs = 0, lastT = -9;
  for (let i = 0; i < 60 * 30; i++) {
    t += dt; updateFidget(y, dt, t, false);
    const st = y.sporePuff;
    if (st.puffs > lastPuffs) { if (t - lastT < .6) runs++; lastPuffs = st.puffs; lastT = t; }
    const al = alphas(st.cloud);
    pall = Math.max(pall, ...al.slice(0, S.PALL));
    puffA = Math.max(puffA, ...al.slice(S.PALL));
    assert.ok(finite(st.cloud));
    for (const p of st.pool) if (p) assert.ok(p.y >= .01 && p.y < 1.2 && Math.hypot(p.x, p.z) < 1.2, 'puffs stay near');
    const s = st.colony.m.scale;
    minS = Math.min(minS, s.x, s.y, s.z); maxS = Math.max(maxS, s.x, s.y, s.z);
    assert.equal(st.heads.m.scale.x, s.x);
  }
  const st = y.sporePuff;
  assert.ok(st.puffs >= 4, `it puffs (${st.puffs})`);
  assert.ok(pall > S.PALL_ALPHA * .8, `pall ${pall}`);
  assert.ok(puffA > S.MOTE_ALPHA * .7, `puffs show ${puffA}`);
  assert.ok(minS > .9 && minS < .98 && maxS < 1.03, `scale ${minS}..${maxS}`);

  // a blow from the west (+x travel): spores blast back toward the attacker (-x)
  y.actions = {current: {kind: 'hit', dir: [1, 0]}, age: 0, queue: [], dead: false};
  t += dt; updateFidget(y, dt, t, true);
  const blasted = st.pool.filter(p => p && p.age < 2 * dt);
  assert.ok(blasted.length >= S.BLAST, `blast ${blasted.length}`);
  assert.ok(st.recoil, 'it recoils');
  y.actions = {current: null, age: 0, queue: [], dead: false};
  for (let i = 0; i < 40; i++) { t += dt; updateFidget(y, dt, t, true); }
  const mx = blasted.reduce((s, p) => s + p.x, 0) / blasted.length;
  assert.ok(mx < -.15, `spores blast toward the attacker (${mx})`);
  assert.ok(blasted.every(p => p.y >= .01), 'above the floor');

  // death: back to rest, every mote faded out
  y.actions = {current: null, age: 0, queue: [], dead: true};
  for (let i = 0; i < 60 * 6; i++) { t += dt; updateFidget(y, dt, t, true); }
  for (const p of [st.colony, st.heads]) assert.ok(p.m.scale.equals(p.scale), 'at rest');
  assert.ok(alphas(st.cloud).every(x => x === 0), 'faded out');
  const n = st.puffs;
  for (let i = 0; i < 60 * 10; i++) { t += dt; updateFidget(y, dt, t, false); }
  assert.equal(st.puffs, n, 'no puffs after death');
});

test('yellow molds cough puffs in quick runs', () => {
  let runs = 0, puffs = 0;
  for (let k = 0; k < 4; k++) {
    const y = mold('yellow mold');
    let t = 0, last = 0, lastT = -9;
    for (let i = 0; i < 60 * 30; i++) {
      t += dt; updateFidget(y, dt, t, false);
      if (y.sporePuff.puffs > last) { if (t - lastT < S.COUGH_MIN + S.COUGH_SPAN + .05) runs++; last = y.sporePuff.puffs; lastT = t; }
    }
    puffs += last;
  }
  assert.ok(runs >= 2 && runs < puffs / 2, `runs ${runs} of ${puffs} puffs`);
});

test('two yellow molds puff on their own clocks', () => {
  const a = mold('yellow mold'), b = mold('yellow mold');
  let t = 0, differ = 0;
  for (let i = 0; i < 60 * 10; i++) {
    t += dt; updateFidget(a, dt, t, false); updateFidget(b, dt, t, false);
    if (Math.abs(a.sporePuff.colony.m.scale.x - b.sporePuff.colony.m.scale.x) > .004) differ++;
  }
  assert.ok(differ > 60, `they differ (${differ})`);
});
