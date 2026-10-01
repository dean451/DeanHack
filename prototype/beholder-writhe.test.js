import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import {STALKS} from './beholder.js';
import {aimAt} from './glance.js';
import * as W from './beholder-writhe.js';

const dt = 1 / 60;
function beast(name) { const a = createCreature({name}); a.species = name; return a; }
const lift = a => a.head.parent;
const mesh = (a, part) => lift(a).children.find(c => c.isMesh && c.userData.part === part);

test('only the beholder writhes, and every stalk and stalk eye is found', () => {
  for (const name of ['floating eye', 'evil eye', 'cobra']) assert.equal(W.updateBeholderWrithe(beast(name), dt, 0, false), null, name);
  const a = beast('beholder'), shared = mesh(a, 'hide').geometry, st = W.updateBeholderWrithe(a, dt, 0, false);
  assert.ok(st);
  // its own copies, so other beholders don't writhe along; released with the actor
  assert.notEqual(mesh(a, 'hide').geometry, shared);
  assert.equal(mesh(beast('beholder'), 'hide').geometry, shared);
  assert.equal(typeof mesh(a, 'hide').userData.dispose, 'function');
  const [hide, eyes] = st.parts;
  for (let k = 0; k < STALKS.length; k++) {
    const on = hide.verts.filter(q => q.k === k), hs = on.map(q => q.h);
    assert.ok(on.length > 150, `stalk ${k}: ${on.length} vertices`);
    assert.ok(Math.min(...hs) < .1 && Math.max(...hs) > .95, `stalk ${k} spans root to tip`);
    assert.ok(eyes.verts.some(q => q.k === k), `stalk ${k} has an eye`);
  }
  // the eyes split evenly, one ball per stalk
  const per = STALKS.map((_, k) => eyes.verts.filter(q => q.k === k).length);
  assert.ok(per.every(n => n === per[0]), per.join());
  // the orb itself stays put: well under half the hide's vertices are on stalks
  assert.ok(hide.verts.length < hide.geo.attributes.position.count / 2);
});

test('the beholder writhes, eyes the hero, lashes, flinches and droops dead; all finite and bounded', () => {
  const a = beast('beholder'), st0 = W.updateBeholderWrithe(a, dt, 0, false);
  const [hide] = st0.parts, rest = hide.rest.slice();
  let t = 0, maxOff = 0;
  // the largest move of any stalk vertex from rest, and the mean tip offset toward +x
  const measure = () => {
    const arr = hide.geo.attributes.position.array;
    let m = 0;
    hide.verts.forEach((q, j) => {
      const d = Math.hypot(arr[q.i * 3] - rest[j * 3], arr[q.i * 3 + 1] - rest[j * 3 + 1], arr[q.i * 3 + 2] - rest[j * 3 + 2]);
      assert.ok(Number.isFinite(d));
      if (d > m) m = d;
    });
    return m;
  };
  const run = (secs, look) => { for (let i = 0; i < secs * 60; i++) { t += dt; updateFidget(a, dt, t, !!a.actions?.current, look); maxOff = Math.max(maxOff, measure()); } };
  run(10, null);
  assert.ok(maxOff > .01 && maxOff < .15, `alone ${maxOff}`);
  // the hero 2 tiles to its right (+x): the tips lean that way on average
  run(4, {x: 2, y: 0, z: 0});
  const meanX = a.writhe.tips.reduce((s, tp) => s + tp.s.x, 0) / STALKS.length;
  assert.ok(meanX > .015, `aim ${meanX}`);
  assert.ok(a.writhe.near > .6);
  // the great eye watches the hero too (glance.js)
  assert.ok(aimAt(a, {x: 2, y: 0, z: 2}));
  // an attack lashes the tips forward (+z)
  const atk = {kind: 'attack', attack: 'gaze', dir: [0, 1]};
  let fwd = 0;
  for (let i = 0; i <= 40; i++) {
    a.actions = {current: atk, age: 1, u: i / 40, queue: [], dead: false};
    t += dt; updateFidget(a, dt, t, true, {x: 0, y: 0, z: 2});
    fwd = Math.max(fwd, a.writhe.tips.reduce((s, tp) => s + tp.s.z, 0) / STALKS.length);
  }
  assert.ok(fwd > .04, `lash ${fwd}`);
  // a blow kicks every tip up and out and agitates the writhe
  a.actions = {current: {kind: 'hit', attack: 'claw', dir: [1, 0]}, age: 1, u: .1, queue: [], dead: false};
  t += dt; updateFidget(a, dt, t, true, null);
  assert.ok(a.writhe.agit > .9 && a.writhe.tips.reduce((s, tp) => s + tp.v.y, 0) / STALKS.length > .2);
  a.actions = {current: null, age: 0, u: 0, queue: [], dead: false};
  maxOff = 0; run(3, null);
  assert.ok(maxOff < .2, `after blow ${maxOff}`);
  // death: the writhe stops and the stalks hang limp, the tips below rest
  a.actions = {current: null, age: 0, u: 0, queue: [], dead: true};
  run(6, {x: 1, y: 0, z: 0});
  assert.ok(a.writhe.A < 1e-4 && a.writhe.life < 1e-4);
  for (const tp of a.writhe.tips) {
    assert.ok(Math.abs(tp.s.y + W.DROOP.down) < .005, `droop ${tp.s.y}`);
    assert.ok(tp.v.length() < 1e-3);
  }
  const p0 = hide.geo.attributes.position.array.slice();
  run(1, null);
  const p1 = hide.geo.attributes.position.array;
  assert.ok(p0.every((v, i) => Math.abs(v - p1[i]) < 1e-4), 'dead stalks are still');
});

test('alone and unbothered, the tips settle back to their rest bend (only the gentle wave left)', () => {
  const a = beast('beholder');
  let t = 0;
  W.updateBeholderWrithe(a, dt, t, false);
  a.writhe.tips.forEach(tp => tp.v.set(1, 1, 1));
  a.writhe.wait = 1e9;// no twitches
  for (let i = 0; i < 4 * 60; i++) { t += dt; W.updateBeholderWrithe(a, dt, t, false, null); }
  for (const tp of a.writhe.tips) assert.ok(tp.s.length() < 1e-3 && tp.v.length() < 1e-3);
  const w = W.wave(3, 1, 5, W.WAVE);
  assert.ok(w.every(v => Math.abs(v) <= W.WAVE + 1e-9));
});
