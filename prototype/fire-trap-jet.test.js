import test from 'node:test';
import assert from 'node:assert/strict';
import {columnPose, tonguePose, flashPose, scorchPose, emberPose, isFireTrapMessage, JET} from './fire-trap-jet.js';

test('only the tower of flame message triggers it', () => {
  assert.ok(isFireTrapMessage('A tower of flame bursts from the floor!'));
  assert.ok(isFireTrapMessage('A tower of flame erupts from the floor!'));
  for (const t of ['You are enveloped in flames.', 'A cascade of steamy bubbles erupts from the fountain!', null]) assert.ok(!isFireTrapMessage(t), String(t));
});

test('every part starts and ends invisible', () => {
  for (const t of [0, JET.total]) {
    assert.equal(columnPose(t).alpha, 0); assert.equal(flashPose(t).alpha, 0); assert.equal(scorchPose(t).alpha, 0);
    for (let i = 0; i < JET.tongues; i++) assert.equal(tonguePose(i, t).alpha, 0);
    for (let i = 0; i < JET.embers; i++) assert.equal(emberPose(i, t).alpha, 0);
  }
});

test('the column climbs past head height and stays in bounds', () => {
  let peak = 0;
  for (let t = 0; t <= JET.total; t += .005) {
    const c = columnPose(t); peak = Math.max(peak, c.height);
    assert.ok(c.height > 0 && c.height <= 1.5 && c.width > 0 && c.width <= .25 && c.alpha >= 0 && c.alpha <= .85 + 1e-9, String(t));
    for (let i = 0; i < JET.tongues; i++) { const p = tonguePose(i, t); assert.ok(p.height <= 1.5 && p.alpha >= 0 && p.alpha <= 1 && Math.hypot(p.x, p.z) <= .25, `${i} ${t}`); }
  }
  assert.ok(peak > 1.1);
});

test('the flash comes first and the embers rise and stay bounded', () => {
  assert.ok(flashPose(.02).alpha > .5 && flashPose(JET.flash).alpha === 0);
  for (let i = 0; i < JET.embers; i++) {
    let prev = -1;
    for (let t = 0; t <= JET.total; t += .01) { const p = emberPose(i, t); assert.ok(p.y >= prev - 1e-9 && p.y <= 1.85 && Math.hypot(p.x, p.z) < .4 && p.alpha <= .9 + 1e-9, `${i} ${t}`); prev = p.y; }
  }
});
