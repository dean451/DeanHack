import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as P from './pudding-heave.js';

const dt = 1 / 60;
function pudding(name) { const a = createCreature({name}); a.species = name; return a; }
const meshes = a => a.body.children.filter(m => m.isMesh);
const snap = a => meshes(a).map(m => [m.scale.clone(), m.position.clone(), m.rotation.clone(), Float32Array.from(m.geometry.attributes.position.array)]);
const skinOf = a => a.puddingHeave.skin.m;

test('only the puddings heave', () => {
  for (const name of ['ochre jelly', 'blue jelly', 'gray ooze', 'acid blob']) assert.equal(P.updatePuddingHeave(pudding(name), dt, 0, false, false), null, name);
  for (const name of Object.keys(P.PUDDINGS)) {
    const a = pudding(name), st = P.updatePuddingHeave(a, dt, 0, false, false);
    assert.ok(st?.skin && st.nucleus && st.lobes.length === 5, name);
  }
});

test('envelopes stay in 0..1 and are 0 at the ends', () => {
  for (let u = 0; u <= 1.0001; u += .01) {
    const h = P.heaveEnvelope(u), b = P.budEnvelope(u);
    for (const v of [h.sink, h.surge, h.lurch, h.ripple, b]) assert.ok(v >= 0 && v <= 1, `${u} ${v}`);
  }
  for (const u of [0, 1]) { assert.deepEqual(P.heaveEnvelope(u), {sink: 0, surge: 0, lurch: 0, ripple: 0}); assert.equal(P.budEnvelope(u), 0); }
  // the sink comes before the surge
  let sinkAt = 0, surgeAt = 0, best = [0, 0];
  for (let u = 0; u < 1; u += .01) { const h = P.heaveEnvelope(u); if (h.sink > best[0]) { best[0] = h.sink; sinkAt = u; } if (h.surge > best[1]) { best[1] = h.surge; surgeAt = u; } }
  assert.ok(sinkAt < surgeAt && best[0] > .9 && best[1] > .9);
});

test('the black pudding writhes, heaves and lurches, stays on the floor and within bounds', () => {
  const bp = pudding('black pudding');
  const rest = snap(bp);
  let t = 0, heaved = false, maxOff = 0, minY = 1, maxY = 0, maxLurch = 0, maxSy = 0, minSy = 9;
  for (let i = 0; i < 60 * 20; i++) {
    t += dt; updateFidget(bp, dt, t, false);
    const st = bp.puddingHeave, skin = skinOf(bp);
    if (st.heave) heaved = true;
    const arr = skin.geometry.attributes.position.array;
    assert.ok(arr.every(Number.isFinite) && skin.geometry.attributes.normal.array.every(Number.isFinite));
    skin.updateMatrix();
    const v = new (skin.position.constructor)();
    for (let k = 0; k < arr.length; k += 3) {
      v.set(arr[k], arr[k + 1], arr[k + 2]).applyMatrix4(skin.matrix);
      minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
      maxOff = Math.max(maxOff, Math.hypot(v.x, v.z));
    }
    maxLurch = Math.max(maxLurch, skin.position.z - rest[0][1].z);
    maxSy = Math.max(maxSy, skin.scale.y / rest[0][0].y); minSy = Math.min(minSy, skin.scale.y / rest[0][0].y);
    for (const m of meshes(bp)) for (const k of ['x', 'y', 'z']) assert.ok(Number.isFinite(m.position[k]) && Number.isFinite(m.scale[k]) && m.scale[k] > 0);
  }
  assert.ok(heaved, 'it heaved');
  assert.ok(minY > -.03, `the foot stays on the floor (${minY})`);
  assert.ok(maxY < .55, `the crown stays low (${maxY})`);
  assert.ok(maxOff < .45, `stays on its tile (${maxOff})`);
  assert.ok(maxLurch > .03, `it lurches forward (${maxLurch})`);
  assert.ok(maxSy > 1.12 && minSy < .92, `it sinks and surges (${minSy}..${maxSy})`);
});

test('a blow sends a bud out on the far side, then it is sucked back in', () => {
  const bp = pudding('black pudding');
  let t = 0;
  for (let i = 0; i < 30; i++) { t += dt; updateFidget(bp, dt, t, false); }
  // a blow travelling +x (attacker to the west): the bud strains out to the east (+x)
  bp.actions = {current: {kind: 'hit', dir: [1, 0]}, age: 0, queue: [], dead: false};
  t += dt; updateFidget(bp, dt, t, true);
  const st = bp.puddingHeave;
  assert.ok(st.bud && st.hit, 'bud and ripple');
  assert.ok(st.bud.x > .9, `bud points away from the attacker (${st.bud.x})`);
  bp.actions = {current: null, age: 0, queue: [], dead: false};
  let east = 0, west = 0;
  for (let i = 0; i < 40; i++) {
    t += dt; updateFidget(bp, dt, t, false);
    const arr = skinOf(bp).geometry.attributes.position.array;
    for (let k = 0; k < arr.length; k += 3) { east = Math.max(east, arr[k]); west = Math.min(west, arr[k]); }
  }
  assert.ok(east > -west + .03, `the bud bulges east (${east} vs ${-west})`);
  for (let i = 0; i < 60 * 2; i++) { t += dt; updateFidget(bp, dt, t, false); }
  assert.equal(st.bud, null, 'the bud is drawn back in');
  assert.equal(st.hit, null);
});

test('after death everything is exactly at rest and stays still', () => {
  for (const name of Object.keys(P.PUDDINGS)) {
    const a = pudding(name), rest = snap(a);
    let t = 0;
    for (let i = 0; i < 60 * 4; i++) { t += dt; updateFidget(a, dt, t, false); }
    a.actions = {current: {kind: 'hit', dir: [0, 1]}, age: 0, queue: [], dead: false};
    t += dt; updateFidget(a, dt, t, true);
    a.actions = {current: null, age: 0, queue: [], dead: true};
    for (let i = 0; i < 60 * 6; i++) { t += dt; updateFidget(a, dt, t, true); }
    const now = snap(a);
    now.forEach(([s, p, r, g], k) => {
      assert.ok(s.equals(rest[k][0]) && p.equals(rest[k][1]) && r.equals(rest[k][2]), `${name} mesh ${k} transform`);
      assert.deepEqual(g, rest[k][3], `${name} mesh ${k} vertices`);
    });
    assert.equal(a.puddingHeave.heave, null);
  }
});

test('two puddings are out of step', () => {
  const a = pudding('black pudding'), b = pudding('black pudding');
  let t = 0, diff = 0;
  for (let i = 0; i < 60 * 3; i++) {
    t += dt; updateFidget(a, dt, t, false); updateFidget(b, dt, t, false);
    diff = Math.max(diff, Math.abs(skinOf(a).scale.y - skinOf(b).scale.y));
  }
  assert.ok(diff > .005, `out of step (${diff})`);
});
