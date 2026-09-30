import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateGait} from './gait.js';
import {STRIDE, strides, stridePose, updateStride, clearStride} from './stride.js';

test('jabberwocks stalk on slow opposed strides, balance with the tail and settle exactly to rest', () => {
  for (const name of ['jabberwock', 'vorpal jabberwock']) {
    const a = createCreature({name, symbol: 'J'});
    assert.ok(strides(a), name);
    const rest = {bx: a.body.rotation.x, bz: a.body.rotation.z, ty: a.tail.rotation.y, tx: a.tail.rotation.x};
    // live.js's frame: generic leg swing, body bob and tail roll, then the gait (and an action
    // layer offset on the tail that comes off again the next frame)
    let t = 0, prev = null, maxStep = 0, legMax = 0, yawMin = 0, yawMax = 0, opposed = true;
    const step = (dt, walking) => {
      t += dt;
      a.legs.forEach((l, i) => l.rotation.x = walking ? Math.sin(t * 22 + i * 2) * .4 : 0);
      a.body.position.y = Math.sin(t * (walking ? 22 : 2.5)) * .035;
      a.tail.rotation.z = Math.sin(t * 3) * .24;
      a.tail.rotation.x -= .05 * Math.sin(t - dt);
      updateGait(a, dt, walking);
      a.tail.rotation.x += .05 * Math.sin(t);
      const v = [...a.legs.map(l => l.rotation.x), a.body.position.y, a.body.rotation.x, a.body.rotation.z, a.tail.rotation.y, a.tail.rotation.x];
      for (const x of v) assert.ok(Number.isFinite(x));
      if (prev) maxStep = Math.max(maxStep, ...v.map((x, i) => i === 2 ? 0 : Math.abs(x - prev[i])));
      prev = v;
      legMax = Math.max(legMax, ...a.legs.map(l => Math.abs(l.rotation.x)));
      if (Math.abs(a.legs[0].rotation.x + a.legs[1].rotation.x) > 1e-9) opposed = false;
      if (walking) { yawMin = Math.min(yawMin, a.tail.rotation.y - rest.ty); yawMax = Math.max(yawMax, a.tail.rotation.y - rest.ty); }
      assert.ok(Math.abs(a.body.rotation.x - rest.bx) <= STRIDE.lean + 1e-9);
      assert.ok(Math.abs(a.body.rotation.z - rest.bz) <= STRIDE.roll + 1e-9);
      assert.ok(Math.abs(a.body.position.y) < .06);
    };
    for (let i = 0; i < 120; i++) step(1 / 60, false);
    for (let i = 0; i < 240; i++) step(1 / 60, true);
    for (let i = 0; i < 120; i++) step(1 / 60, false);
    assert.ok(opposed, `${name}: legs a half cycle apart`);
    assert.ok(legMax <= STRIDE.thigh + 1e-9 && legMax > .3, `${name}: stride ${legMax}`);
    assert.ok(maxStep < .06, `${name}: step ${maxStep}`);
    assert.ok(yawMin < -.15 && yawMax > .15, `${name}: tail sway ${yawMin}..${yawMax}`);
    // standing: legs back at 0, the lean gone, only the slow lash left on the tail
    a.legs.forEach(l => assert.ok(l.rotation.x === 0));
    assert.ok(Math.abs(a.body.rotation.x - rest.bx) < 1e-12 && Math.abs(a.body.rotation.z - rest.bz) < 1e-12);
    assert.ok(Math.abs(a.tail.rotation.y - rest.ty) <= STRIDE.lash + 1e-9);
    // death: the tail goes slack to its exact rest pose
    a.actions = {dead: true};
    for (let i = 0; i < 120; i++) step(1 / 60, false);
    a.tail.rotation.x -= .05 * Math.sin(t);
    assert.ok(Math.abs(a.tail.rotation.y - rest.ty) < 1e-12 && Math.abs(a.tail.rotation.x - rest.tx) < 1e-12, name);
    clearStride(a);
    assert.ok(Math.abs(a.tail.rotation.y - rest.ty) < 1e-12);
  }
  // the pose itself is at rest with no walk and no life
  const p = stridePose(1.3, 0, 0, 5);
  for (const v of [...p.legs, p.bob, p.roll, p.lean, p.tailYaw, p.tailLift]) assert.equal(Math.abs(v), 0);
  // nothing else strides
  for (const name of ['jackal', 'hill giant', 'red dragon']) assert.equal(updateStride(createCreature({name}), 1 / 60, true), null);
});

test('walking jabberwocks fold their wings back along the flanks and spread them again at rest', () => {
  const a = createCreature({name: 'jabberwock', symbol: 'J'});
  assert.equal(a.wings.length, 2);
  const restX = a.wings.map(w => w.rotation.x);
  let t = 0, prev = null, maxStep = 0, foldMin = Infinity, droopMax = 0;
  const step = (dt, walking) => {
    t += dt;
    // live.js's dragon wing flutter (absolute) and an action-layer flare on z
    a.wings.forEach((w, i) => { w.rotation.y = (i ? 1 : -1) * (-.18 + Math.sin(t * 5) * .12); w.rotation.z = 0; });
    a.legs.forEach((l, i) => l.rotation.x = walking ? Math.sin(t * 22 + i * 2) * .4 : 0);
    updateGait(a, dt, walking);
    const v = a.wings.flatMap(w => [w.rotation.x, w.rotation.y]);
    for (const x of v) assert.ok(Number.isFinite(x));
    if (prev) maxStep = Math.max(maxStep, ...v.map((x, i) => Math.abs(x - prev[i])));
    prev = v;
    // mirrored: both wings sweep the same way about their own side
    assert.ok(Math.abs(a.wings[0].rotation.y + a.wings[1].rotation.y) < 1e-9);
    a.wings.forEach((w, i) => {
      assert.ok(w.rotation.x - restX[i] <= 1e-12 && w.rotation.x - restX[i] >= -(STRIDE.droop + STRIDE.jolt) - 1e-9);
      assert.ok(Math.abs(w.rotation.y) <= STRIDE.fold + 1e-9);
    });
    if (walking && t > 2.4) {
      foldMin = Math.min(foldMin, a.wings[1].rotation.y);
      droopMax = Math.max(droopMax, restX[1] - a.wings[1].rotation.x);
    }
  };
  for (let i = 0; i < 60; i++) step(1 / 60, false);
  assert.ok(a.wings[1].rotation.y < 0, 'standing: half spread, forward');
  for (let i = 0; i < 180; i++) step(1 / 60, true);
  assert.ok(foldMin > STRIDE.fold - .01, `folded ${foldMin}`);
  assert.ok(droopMax > STRIDE.droop, `droop ${droopMax}`);
  for (let i = 0; i < 120; i++) step(1 / 60, false);
  assert.ok(maxStep < .15, `step ${maxStep}`);
  // back at rest: live.js's flutter owns the sweep again and the droop is gone exactly
  a.wings.forEach((w, i) => {
    assert.ok(Math.abs(w.rotation.x - restX[i]) < 1e-12);
    assert.ok(Math.abs(w.rotation.y - (i ? 1 : -1) * (-.18 + Math.sin(t * 5) * .12)) < 1e-12);
  });
  clearStride(a);
  a.wings.forEach((w, i) => assert.ok(Math.abs(w.rotation.x - restX[i]) < 1e-12));
  const p = stridePose(2, 0, 1, 3);
  assert.equal(Math.abs(p.fold) + Math.abs(p.droop), 0);
});

test('a dead jabberwock stops fluttering and crumples its wings, and lifts them again when revived', () => {
  const a = createCreature({name: 'jabberwock', symbol: 'J'});
  const restX = a.wings.map(w => w.rotation.x);
  const flutter = (i, t) => (i ? 1 : -1) * (-.18 + Math.sin(t * 5) * .12);
  let t = 0, prev = null, maxStep = 0;
  const step = (dt, walking) => {
    t += dt;
    a.wings.forEach((w, i) => { w.rotation.y = flutter(i, t); });
    a.legs.forEach((l, i) => l.rotation.x = walking ? Math.sin(t * 22 + i * 2) * .4 : 0);
    updateGait(a, dt, walking);
    const v = a.wings.flatMap(w => [w.rotation.x, w.rotation.y]);
    for (const x of v) assert.ok(Number.isFinite(x));
    if (prev) maxStep = Math.max(maxStep, ...v.map((x, i) => Math.abs(x - prev[i])));
    prev = v;
    a.wings.forEach((w, i) => {
      assert.ok(Math.abs(w.rotation.y) <= STRIDE.fold + 1e-9);
      assert.ok(w.rotation.x - restX[i] <= 1e-12);
      assert.ok(w.rotation.x - restX[i] >= -(STRIDE.droop + STRIDE.jolt + STRIDE.slump * (1 + STRIDE.slumpSkew)) - 1e-9);
    });
  };
  // struck down mid-stride
  for (let i = 0; i < 90; i++) step(1 / 60, true);
  a.actions = {dead: true};
  for (let i = 0; i < 120; i++) step(1 / 60, true);
  // crumpled and still: the flutter no longer shows, the second wing slumps further than the first
  const y0 = a.wings.map(w => w.rotation.y);
  step(1 / 60, false);
  a.wings.forEach((w, i) => {
    assert.ok(Math.abs(w.rotation.y - y0[i]) < 1e-9, 'no flutter');
    assert.ok(Math.abs(Math.abs(w.rotation.y) - STRIDE.crumple) < 1e-9);
  });
  assert.equal(Math.sign(a.wings[0].rotation.y), -Math.sign(a.wings[1].rotation.y));
  const slump = a.wings.map((w, i) => restX[i] - w.rotation.x);
  assert.ok(Math.abs(slump[0] - STRIDE.slump * (1 - STRIDE.slumpSkew)) < 1e-9 && Math.abs(slump[1] - STRIDE.slump * (1 + STRIDE.slumpSkew)) < 1e-9, `${slump}`);
  // revived: back into the flutter exactly
  a.actions = {};
  for (let i = 0; i < 180; i++) step(1 / 60, false);
  assert.ok(maxStep < .15, `step ${maxStep}`);
  a.wings.forEach((w, i) => {
    assert.ok(Math.abs(w.rotation.x - restX[i]) < 1e-12);
    assert.ok(Math.abs(w.rotation.y - flutter(i, t)) < 1e-12);
  });
  // born dead (a corpse seen for the first time): crumpled from the first frame, and clearStride puts it back
  const b = createCreature({name: 'jabberwock', symbol: 'J'});
  b.actions = {dead: true};
  updateGait(b, 1 / 60, false);
  assert.ok(Math.abs(Math.abs(b.wings[1].rotation.y) - STRIDE.crumple) < 1e-9);
  clearStride(b);
  b.wings.forEach((w, i) => assert.ok(Math.abs(w.rotation.x - restX[i]) < 1e-12));
});
