import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as S from './hezrou-slime.js';

const dt = 1 / 60;
function hezrou() { const a = createCreature({name: 'hezrou'}); a.species = 'hezrou'; return a; }
const alphas = p => [...p.geometry.attributes.color.array].filter((_, k) => k % 4 === 3);
const finite = p => p.geometry.attributes.position.array.every(Number.isFinite) && p.geometry.attributes.color.array.every(Number.isFinite);

test('only the hezrou slimes', () => {
  for (const name of ['nalfeshnee', 'ochre jelly', 'giant toad']) assert.equal(S.updateHezrouSlime(createCreature({name}), dt, 0, false, false), null, name);
  assert.ok(S.updateHezrouSlime(hezrou(), dt, 0, false, false));
});

test('helpers stay in bounds', () => {
  for (let u = 0; u <= 1; u += .01) { const b = S.belchPuff(u); assert.ok(b >= 0 && b <= 1); }
  assert.equal(S.belchPuff(.3), 0); assert.ok(S.belchPuff(.7) > .9);
  for (let T = 0; T < 30; T += .37) {
    const h = S.hazeAt([.3, .7, .5, .9], T);
    assert.ok(Math.hypot(h.x, h.z) < .6 && h.y > .2 && h.y < 1.15 && h.size > .3, JSON.stringify(h));
  }
});

test('the hezrou drips gobs that splat into a puddle, hangs in a haze, belches and sprays at a blow; rests after death', () => {
  const hz = hezrou();
  let t = 0, maxGobs = 0, landed = 0, haze = 0, belch = 0, maxWet = 0;
  for (let i = 0; i < 60 * 20; i++) {
    t += dt; updateFidget(hz, dt, t, false);
    const st = hz.hezrouSlime;
    assert.ok(finite(st.gobPts) && finite(st.hazePts));
    for (const o of st.gobs) if (o) { assert.ok(o.y >= .012 - 1e-9 && o.y < 1.5 && Math.hypot(o.x, o.z) < .8, JSON.stringify(o)); if (o.landed !== null) landed++; }
    maxGobs = Math.max(maxGobs, st.gobs.filter(Boolean).length);
    haze = Math.max(haze, ...alphas(st.hazePts));
    belch = Math.max(belch, st.belch);
    maxWet = Math.max(maxWet, st.wet);
    assert.ok(st.wet >= S.WET_MIN && st.wet <= 1);
    assert.ok(st.pool.scale.x > 0 && st.pool.scale.x <= S.POOL_R);
  }
  assert.ok(maxGobs > 0 && landed > 0, 'gobs fall and land');
  assert.ok(maxWet > S.WET0, `landing gobs spread the puddle (${maxWet})`);
  assert.ok(haze > S.HAZE_ALPHA * .7 && haze <= S.BELCH_ALPHA + 1e-6, `haze ${haze}`);
  assert.ok(belch > .5, `a gurgle's belch spews haze (${belch})`);

  // walking dries the puddle back fast
  const st = hz.hezrouSlime;
  st.wet = 1;
  for (let i = 0; i < 60 * 3; i++) { t += dt; updateFidget(hz, dt, t, true); }
  assert.ok(st.wet < .3, `walking dries it (${st.wet})`);

  // a blow travelling +x flings gobs on toward +x (the group isn't turned)
  st.gobs.fill(null);
  hz.actions = {current: {kind: 'hit', dir: [1, 0]}, age: 0, queue: [], dead: false};
  t += dt; updateFidget(hz, dt, t, true);
  const spray = st.gobs.filter(Boolean);
  assert.ok(spray.length >= S.SPRAY);
  hz.actions = {current: null, age: 0, queue: [], dead: false};
  for (let i = 0; i < 20; i++) { t += dt; updateFidget(hz, dt, t, false); }
  const mx = spray.reduce((s, o) => s + o.x, 0) / spray.length;
  assert.ok(mx > .1, `the spray flies away from the attacker (${mx})`);

  // death: nothing new drips, the haze thins away, the puddle stays
  hz.actions = {current: null, age: 0, queue: [], dead: true};
  for (let i = 0; i < 60 * 4; i++) { t += dt; updateFidget(hz, dt, t, false); }
  const wet = st.wet;
  for (let i = 0; i < 60 * 4; i++) { t += dt; updateFidget(hz, dt, t, false); }
  assert.equal(st.gobs.filter(Boolean).length, 0, 'no gobs after death');
  assert.equal(Math.max(...alphas(st.hazePts)), 0, 'the haze is gone');
  assert.equal(st.wet, wet, 'the puddle stays');
});
