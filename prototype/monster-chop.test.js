import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose, ACTION_TIME, STRIKE_U} from './actions.js';
import {chopPose, chops, thrusts, CHOP_STRIKE_U} from './monster-chop.js';

test('the chop is finite, starts and ends at rest, and strikes when the generic attack does', () => {
  assert.equal(CHOP_STRIKE_U, STRIKE_U);
  for (const result of ['hit', 'miss']) {
    for (let i = 0; i <= 100; i++) for (const v of Object.values(chopPose(i / 100, result))) assert(Number.isFinite(v));
    for (const u of [0, 1]) for (const [k, v] of Object.entries(chopPose(u, result))) assert(Math.abs(v) < 1e-9, `${result} ${k} at ${u}`);
  }
  for (const v of Object.values(chopPose(NaN))) assert(Number.isFinite(v));
  // raised overhead in the windup, brought down by the strike
  assert(chopPose(.3).arm < -2.3 && chopPose(CHOP_STRIKE_U).arm > -.9);
});

test('a missed chop overswings and wobbles the arm, a hit does not', () => {
  const reversals = result => { let n = 0, prev = null, dir = 0;
    for (let i = 0; i <= 400; i++) { const a = chopPose(CHOP_STRIKE_U + (1 - CHOP_STRIKE_U) * i / 400, result).arm;
      if (prev !== null && Math.abs(a - prev) > 1e-9) { const d = Math.sign(a - prev); if (dir && d !== dir) n++; dir = d; } prev = a; } return n; };
  assert(reversals('miss') >= reversals('hit') + 2, 'the miss wobbles');
  for (let i = 0; i <= 100; i++) assert(Math.abs(chopPose(i / 100, 'miss').arm) < 2.6);
});

// The weapon's far end (the vertex furthest from the socket), in the attacker's own frame.
function tipOf(a) {
  let far = null, best = -1;
  a.weaponSocket.traverse(m => { if (!m.isMesh) return; const p = m.geometry.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); m.updateMatrix();
      const w = v.clone().applyMatrix4(m.matrix); if (w.length() > best) { best = w.length(); far = w; } } });
  return far && (() => { a.g.updateMatrixWorld(true);
    const inv = a.g.matrixWorld.clone().invert(); return far.clone().applyMatrix4(a.weaponSocket.matrixWorld).applyMatrix4(inv); })();
}

test('armed monsters without an elbow chop down through the target and come back to rest', () => {
  const dt = 1 / 60, strikeAt = Math.round(ACTION_TIME.attack * STRIKE_U / dt);
  let tried = 0;
  for (const name of ['goblin', 'hobgoblin', 'Woodland-elf', 'aligned priest', 'soldier', 'watchman']) {
    const a = createCreature({name});
    if (!chops(a) || !tipOf(a)) continue;
    tried++;
    for (const result of ['hit', 'miss']) {
      const snap = () => { const r = []; a.g.traverse(o => r.push(...o.position.toArray(), o.rotation.x, o.rotation.y, o.rotation.z, ...o.scale.toArray())); return r.map(n => +n.toFixed(9)); };
      const rest = snap(), restTip = tipOf(a);
      const q = createActionQueue();
      enqueueAction(q, {kind: 'attack', attack: 'weapon', result, dir: [0, 1]});
      let frames = 0, high = -Infinity, atStrike = null;
      while (frames < 80) {
        clearActionPose(a, q);
        if (updateActions(a, q, frames ? dt : 0) === 'idle') break;
        const t = tipOf(a);
        for (const n of t.toArray()) assert(Number.isFinite(n), name);
        assert(t.y > -.02, `${name} ${result}: the weapon goes through the floor (${t.y.toFixed(3)})`);
        high = Math.max(high, t.y);
        if (frames === strikeAt) atStrike = t;
        frames++;
      }
      // cocked well above where it rests, then down and in front at the strike
      assert(high > restTip.y + .3, `${name} never raises the weapon`);
      assert(atStrike.y < high - .15, `${name} ${result}: still raised at the strike`);
      assert(atStrike.z > restTip.z + .1, `${name} ${result}: the strike isn't in front (${atStrike.z.toFixed(2)})`);
      assert.deepEqual(snap(), rest, `${name} ${result} back to rest`);
    }
  }
  assert(tried >= 3, `only ${tried} armed rigs found`);
});

test('upright polearms, the hero and centaurs keep their own attacks', () => {
  for (const name of ['soldier', 'watchman']) { const a = createCreature({name}); assert(a.weaponSocket && !chops(a), name); }
  for (const name of ['goblin', 'Woodland-elf', 'hobbit']) assert(chops(createCreature({name})), name);
  assert(!chops({arm: {}, weaponSocket: {}, elbow: {}}) && !chops({arm: {}, weaponSocket: {}, centaur: 'bow'}) && !chops({arm: {}, weaponSocket: {}, centaur: null}) && !chops(null));
});

test('soldiers and the watch drop their upright spears and halberds level and thrust them at the target', () => {
  const dt = 1 / 60, strikeAt = Math.round(ACTION_TIME.attack * STRIKE_U / dt);
  for (const name of ['goblin', 'Woodland-elf', 'aligned priest']) assert(!thrusts(createCreature({name})), `${name} thrusts`);
  for (const name of ['soldier', 'guard', 'prison guard', 'watchman', 'sergeant', 'captain', 'watch captain']) {
    const a = createCreature({name});
    assert(thrusts(a) && !chops(a), `${name} doesn't thrust`);
    for (const result of ['hit', 'miss']) {
      const snap = () => { const r = []; a.g.traverse(o => r.push(...o.position.toArray(), o.rotation.x, o.rotation.y, o.rotation.z, ...o.scale.toArray())); return r.map(n => +n.toFixed(9)); };
      const rest = snap(), restTip = tipOf(a);
      const q = createActionQueue();
      enqueueAction(q, {kind: 'attack', attack: 'weapon', result, dir: [0, 1]});
      let frames = 0, atStrike = null, last = null, jump = 0;
      while (frames < 80) {
        clearActionPose(a, q);
        if (updateActions(a, q, frames ? dt : 0) === 'idle') break;
        const t = tipOf(a);
        for (const n of t.toArray()) assert(Number.isFinite(n), name);
        assert(t.y > -.02, `${name} ${result}: the weapon goes through the floor (${t.y.toFixed(3)})`);
        if (last) jump = Math.max(jump, t.distanceTo(last));
        last = t;
        if (frames === strikeAt) atStrike = t;
        frames++;
      }
      // upright at rest; at the strike the point is out in front about waist to chest high, not overhead
      assert(restTip.y > restTip.z + .5, `${name} isn't upright at rest`);
      assert(atStrike.z > restTip.z + .5, `${name} ${result}: the thrust doesn't reach forward (${atStrike.z.toFixed(2)})`);
      assert(atStrike.y > .5 && atStrike.y < 1.4, `${name} ${result}: the point is at ${atStrike.y.toFixed(2)} at the strike`);
      assert(jump < .45, `${name} ${result}: the point jumps ${jump.toFixed(2)} in a frame`);
      assert.deepEqual(snap(), rest, `${name} ${result} back to rest`);
    }
  }
});
