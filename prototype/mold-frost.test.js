import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as M from './mold-frost.js';

const dt = 1 / 60;
function mold(name) { const a = createCreature({name, symbol: 'F'}); a.species = name; return a; }
const alphas = p => [...p.geometry.attributes.color.array].filter((_, k) => k % 4 === 3);
const finite = p => p.geometry.attributes.position.array.every(Number.isFinite) && p.geometry.attributes.color.array.every(Number.isFinite);

test('only the brown mold chills', () => {
  for (const name of ['yellow mold', 'green mold', 'red mold', 'blue jelly', 'lichen']) assert.equal(M.updateMoldFrost(mold(name), dt, 0, false), null, name);
  const b = mold('brown mold');
  assert.ok(M.updateMoldFrost(b, dt, 0, false));
  assert.ok(b.moldFrost.colony && b.moldFrost.rime, 'it finds the colony and the rime');
});

test('helpers stay in bounds', () => {
  for (let u = 0; u <= 1; u += .01) {
    const e = M.sighEnvelope(u), w = M.wispAt(u, .1, 1), f = M.fogAt(u, 2, .04);
    assert.ok(e >= 0 && e <= 1);
    assert.ok(w.y >= .02 && w.y < .3 && Math.hypot(w.x, w.z) < .6 && w.alpha >= 0 && w.alpha <= M.WISP_ALPHA);
    assert.ok(f.y >= .025 && f.y < .07 && Math.hypot(f.x, f.z) <= M.FOG_R1 + 1e-9 && f.alpha >= 0 && f.alpha <= M.FOG_ALPHA);
  }
  assert.equal(M.sighEnvelope(0), 0); assert.equal(M.sighEnvelope(1), 0);
});

test('the brown mold breathes, sighs out freezing fog, glints, bursts frost at a blow and rests after death', () => {
  const b = mold('brown mold');
  let t = 0, sighs = 0, wasSighing = false, mist = 0, fog = 0, glint = 0, minS = 1, maxS = 1;
  for (let i = 0; i < 60 * 25; i++) {
    t += dt; updateFidget(b, dt, t, false);
    const st = b.moldFrost;
    if (st.sigh && !wasSighing) sighs++;
    wasSighing = !!st.sigh;
    const al = alphas(st.mist);
    mist = Math.max(mist, ...al.slice(0, M.WISPS));
    fog = Math.max(fog, ...al.slice(M.WISPS, M.WISPS + M.FOG));
    glint = Math.max(glint, ...alphas(st.glints));
    assert.ok(finite(st.mist) && finite(st.glints));
    const s = st.colony.m.scale;
    minS = Math.min(minS, s.x, s.y, s.z); maxS = Math.max(maxS, s.x, s.y, s.z);
    assert.equal(st.rime.m.scale.x, s.x);
  }
  assert.ok(sighs >= 2, `it sighs (${sighs})`);
  assert.ok(mist > M.WISP_ALPHA * .8, `mist ${mist}`);
  assert.ok(fog > M.FOG_ALPHA * .5, `fog rolls out ${fog}`);
  assert.ok(glint > .8, `glints ${glint}`);
  assert.ok(minS > .88 && minS < .96 && maxS < 1.05, `scale ${minS}..${maxS}`);

  // a blow from the west (+x travel): frost blows back toward the attacker (-x)
  const st = b.moldFrost;
  b.actions = {current: {kind: 'hit', dir: [1, 0]}, age: 0, queue: [], dead: false};
  t += dt; updateFidget(b, dt, t, true);
  assert.equal(st.burst.length, M.BURST);
  assert.ok(st.shudder, 'it shudders');
  b.actions = {current: null, age: 0, queue: [], dead: false};
  for (let i = 0; i < 30; i++) { t += dt; updateFidget(b, dt, t, false); for (const p of st.burst) assert.ok(p.y >= .015 && Math.hypot(p.x, p.z) < 1); }
  const mx = st.burst.reduce((s, p) => s + p.x, 0) / st.burst.length;
  assert.ok(mx < -.1, `frost blows toward the attacker (${mx})`);

  // death: back to rest, every point faded out
  b.actions = {current: null, age: 0, queue: [], dead: true};
  for (let i = 0; i < 60 * 6; i++) { t += dt; updateFidget(b, dt, t, true); }
  for (const p of [st.colony, st.rime]) assert.ok(p.m.scale.equals(p.scale), 'at rest');
  assert.ok([...alphas(st.mist), ...alphas(st.glints)].every(x => x === 0), 'faded out');
});

test('two brown molds sigh on their own clocks', () => {
  const a = mold('brown mold'), b = mold('brown mold');
  let t = 0, differ = 0;
  for (let i = 0; i < 60 * 10; i++) {
    t += dt; updateFidget(a, dt, t, false); updateFidget(b, dt, t, false);
    if (Math.abs(a.moldFrost.colony.m.scale.x - b.moldFrost.colony.m.scale.x) > .005) differ++;
  }
  assert.ok(differ > 60, `they differ (${differ})`);
});
