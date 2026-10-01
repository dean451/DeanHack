import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as F from './acid-fizz.js';

const dt = 1 / 60;
function jelly(name) { const a = createCreature({name}); a.species = name; return a; }
const alphas = p => [...p.geometry.attributes.color.array].filter((_, k) => k % 4 === 3);

test('only the acid jellies fizz', () => {
  for (const name of ['blue jelly', 'acid blob', 'black pudding']) assert.equal(F.updateAcidFizz(jelly(name), dt, 0, false, false), null, name);
  for (const name of F.ACID_JELLIES) assert.ok(F.updateAcidFizz(jelly(name), dt, 0, false, false), name);
});

test('helpers stay in bounds', () => {
  for (let u = 0; u <= 1; u += .01) {
    const e = F.seetheEnvelope(u), b = F.bubbleAt(u, .14, 2), f = F.fumeAt(u, 1, .6);
    assert.ok(e >= 0 && e <= 1);
    assert.ok(Math.hypot(b.x, b.z) < .28 && b.y > .12 && b.y < .25, `bubble ${JSON.stringify(b)}`);
    assert.ok(f.alpha >= 0 && f.alpha <= F.FUME_ALPHA && f.y >= 0 && f.y < .4);
  }
  assert.equal(F.seetheEnvelope(0), 0); assert.equal(F.seetheEnvelope(1), 0);
});

test('the ochre jelly bubbles, seethes, fumes and glows; spatters acid toward a blow; rests after death', () => {
  const oj = jelly('ochre jelly');
  const kids = oj.body.children.filter(m => m.isMesh), rest = kids.map(m => [m.scale.clone(), m.rotation.clone(), m.position.clone()]);
  let t = 0, seethed = false, bubble = 0, fume = 0, pops = 0, rimHot = 0;
  for (let i = 0; i < 60 * 12; i++) {
    t += dt; updateFidget(oj, dt, t, false);
    const st = oj.acidFizz;
    if (st.seethe) seethed = true;
    bubble = Math.max(bubble, ...alphas(st.bubbles));
    fume = Math.max(fume, ...alphas(st.fumes).slice(0, F.FUMES));
    pops = Math.max(pops, st.drops.filter(Boolean).length);
    const rim = st.etch.geometry.attributes.color.getW(2);
    rimHot = Math.max(rimHot, rim);
    for (const g of [st.bubbles, st.fumes, st.etch]) assert.ok(g.geometry.attributes.position.array.every(Number.isFinite) && g.geometry.attributes.color.array.every(Number.isFinite));
    for (const d of st.drops) if (d) assert.ok(d.y >= .012 - 1e-9 && Math.hypot(d.x, d.z) < 1);
    kids.forEach((m, k) => assert.ok(m.scale.x > .85 * rest[k][0].x && m.scale.x < 1.2 * rest[k][0].x && m.scale.y > .8 * rest[k][0].y && m.scale.y < 1.2 * rest[k][0].y));
  }
  assert.ok(seethed, 'it seethed');
  assert.ok(bubble > F.BUBBLE_ALPHA * .6, `bubbles ${bubble}`);
  assert.ok(fume > F.FUME_ALPHA * .8, `fumes ${fume}`);
  assert.ok(pops > 0, 'pops spit droplets');
  assert.ok(rimHot > F.RIM + .1, `the rim heats in a seethe (${rimHot})`);

  // a blow from the west (+x travel): acid spatters back toward the attacker (-x) and fizzes on the floor
  const st = oj.acidFizz;
  st.drops.fill(null);
  oj.actions = {current: {kind: 'hit', dir: [1, 0]}, age: 0, queue: [], dead: false};
  t += dt; updateFidget(oj, dt, t, true);
  const live = st.drops.filter(Boolean);
  assert.equal(live.length, F.SPATTER);
  assert.ok(st.shudder, 'it shudders');
  oj.actions = {current: null, age: 0, queue: [], dead: false};
  for (let i = 0; i < 40; i++) { t += dt; updateFidget(oj, dt, t, false); }
  const mx = live.reduce((s, d) => s + d.x, 0) / live.length;
  assert.ok(mx < -.1, `spatter lands toward the attacker (${mx})`);
  assert.ok(live.some(d => d.landed != null), 'some droplets are fizzing on the floor');

  // die mid-seethe
  st.seethe = {u: .3};
  oj.actions = {current: null, age: 0, queue: [], dead: true};
  for (let i = 0; i < 60 * 8; i++) { t += dt; updateFidget(oj, dt, t, false); }
  kids.forEach((m, i) => {
    assert.ok(m.scale.distanceTo(rest[i][0]) < 1e-9 && m.position.distanceTo(rest[i][2]) < 1e-9, 'body parts at rest');
    assert.ok(Math.abs(m.rotation.x - rest[i][1].x) + Math.abs(m.rotation.y - rest[i][1].y) + Math.abs(m.rotation.z - rest[i][1].z) < 1e-9);
  });
  assert.ok([...alphas(st.bubbles), ...alphas(st.fumes)].every(v => v === 0), 'bubbles, fumes and droplets gone');
  assert.equal(st.etch.geometry.attributes.color.getW(2), 0, 'the rim no longer glows');
  assert.ok(st.etch.geometry.attributes.color.getW(0) > .5, 'the dead etch stays');
  assert.equal(st.etch.scale.x, 1);
});

test('sliding along draws the etch in and stops the seethe', () => {
  const sj = jelly('spotted jelly');
  let t = 0;
  for (let i = 0; i < 60 * 3; i++) { t += dt; updateFidget(sj, dt, t, true); }
  const st = sj.acidFizz;
  assert.ok(st.etch.scale.x < .75, `etch ${st.etch.scale.x}`);
  assert.equal(st.seethe, null);
});
