import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, clearActionPose, updateActions} from './actions.js';
import * as E from './eye-flare.js';

const dt = 1 / 60;
const make = name => { const a = createCreature({name}); a.actions = createActionQueue(); a.g.updateMatrixWorld(true); return a; };

function frame(a, t, look) {
  clearActionPose(a, a.actions);
  const busy = !!a.actions.current || !!a.actions.queue.length;
  const st = E.updateEyeFlare(a, dt, t, busy, look);
  updateActions(a, a.actions, dt);
  return st;
}
const glow = a => a.eyes.material.emissiveIntensity;

test('only the Executioner and Croesus are lit, each with its own glow material', () => {
  for (const name of ['jackal', 'minotaur', 'ninja']) assert.equal(E.updateEyeFlare(createCreature({name}), dt, 0, false), null, name);
  const a = make('executioner'), b = make('executioner'), shared = a.eyes.material;
  assert.ok(shared === b.eyes.material);
  E.updateEyeFlare(a, dt, 0, false); E.updateEyeFlare(b, dt, 0, false);
  assert.ok(a.eyes.material !== shared && a.eyes.material !== b.eyes.material);
  assert.equal(shared.emissiveIntensity, 1.8);
  assert.ok(E.hasEyes(make('croesus')));
});

test('the curves are bounded and quiet outside their spans', () => {
  for (const v of [-1, 0, 1, 2, NaN]) { assert.equal(E.attackCurve(v), 0); assert.equal(E.blinkCurve(v), 1); assert.equal(E.holdCurve(v), 0); }
  let hi = 0, lo = 1;
  for (let v = 0; v <= 1; v += .005) {
    hi = Math.max(hi, E.attackCurve(v)); lo = Math.min(lo, E.blinkCurve(v));
    for (const x of [E.attackCurve(v), E.blinkCurve(v), E.holdCurve(v)]) assert.ok(x >= 0 && x <= 1);
  }
  assert.ok(hi > .95 && lo < .15);
});

test('idle, near the hero and in an attack: finite, eyes stay put, and the attack blazes', () => {
  for (const name of ['executioner', 'croesus']) {
    const a = make(name), hero = new THREE.Vector3(1, 0, 2), far = new THREE.Vector3(30, 0, 30);
    const centre = () => { a.g.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(a.eyes); return b.getCenter(new THREE.Vector3()); };
    const c0 = centre();
    let t = 0, idleMax = 0, nearMean = 0, farMean = 0, glints = 0, was = false;
    for (let i = 0; i < 20 * 60; i++) { const st = frame(a, t += dt, far); farMean += glow(a); idleMax = Math.max(idleMax, glow(a)); if (st.glint !== null && !was) glints++; was = st.glint !== null; }
    const farGlints = glints; glints = 0;
    for (let i = 0; i < 20 * 60; i++) {
      const st = frame(a, t += dt, hero); nearMean += glow(a);
      if (st.glint !== null && !was) glints++; was = st.glint !== null;
      assert.ok(Number.isFinite(glow(a)) && [a.eyes.scale.x, a.eyes.scale.y, a.eyes.position.x].every(Number.isFinite));
      assert.ok(centre().distanceTo(c0) < .02, `${name} eyes stay in their sockets`);
    }
    assert.ok(nearMean > farMean, `${name} brighter near the hero`);
    if (name === 'croesus') assert.ok(glints > farGlints, `glints ${farGlints} → ${glints}`);
    enqueueAction(a.actions, {kind: 'attack', attack: 'weapon', dir: [0, 1]});
    let peak = 0;
    for (let i = 0; i < 60; i++) { frame(a, t += dt, hero); peak = Math.max(peak, glow(a)); }
    assert.ok(peak > idleMax * 1.2 && peak > 2.5 * farMean / (20 * 60), `${name} attack ${peak} vs idle ${idleMax}`);
  }
});

test('a blow blinks then angers; the eyes come back to rest', () => {
  const a = make('executioner'), far = new THREE.Vector3(30, 0, 30);
  let t = 0;
  for (let i = 0; i < 60; i++) frame(a, t += dt, far);
  enqueueAction(a.actions, {kind: 'hit', dir: [0, 1], attack: 'weapon'});
  let shut = 1, angry = 0;
  for (let i = 0; i < 90; i++) { frame(a, t += dt, far); shut = Math.min(shut, a.eyes.scale.y); angry = Math.max(angry, a.eyeFlare.anger); }
  assert.ok(shut < .2 && angry > .5);
  for (let i = 0; i < 10 * 60; i++) frame(a, t += dt, far);
  assert.ok(a.eyeFlare.anger === 0 && Math.abs(a.eyes.scale.x - 1) < 1e-9);
});

test('death gutters the eyes out; stone holds them', () => {
  const a = make('croesus');
  let t = 0;
  for (let i = 0; i < 60; i++) frame(a, t += dt, null);
  enqueueAction(a.actions, {kind: 'die', dir: null, style: 'fall'});
  for (let i = 0; i < 8 * 60; i++) frame(a, t += dt, null);
  assert.equal(glow(a), 0);
  assert.ok(Math.abs(a.eyes.scale.y - E.DEATH_Y) < 1e-6);
  const b = make('executioner');
  for (let i = 0; i < 30; i++) frame(b, t += dt, null);
  const k = glow(b), s = b.eyes.scale.clone();
  b.stone = {k: 1};
  for (let i = 0; i < 60; i++) E.updateEyeFlare(b, dt, t += dt, false, null);
  assert.ok(glow(b) === k && b.eyes.scale.equals(s));
});
