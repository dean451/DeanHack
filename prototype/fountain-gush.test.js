import test from 'node:test';
import assert from 'node:assert/strict';
import {jetPose, dropPose, filmPose, isGushMessage, GUSH} from './fountain-gush.js';

test('only the gush message triggers it', () => {
  assert.ok(isGushMessage('Water gushes forth from the overflowing fountain!'));
  for (const t of ['The fountain bubbles furiously for a moment, then calms.', 'An endless stream of snakes pours forth!', null]) assert.ok(!isGushMessage(t), String(t));
});

test('everything returns exactly to rest', () => {
  assert.equal(jetPose(0).alpha, 0);
  assert.equal(jetPose(GUSH.total).height, 0);
  assert.equal(filmPose(0).alpha, 0);
  assert.equal(filmPose(GUSH.total).alpha, 0);
  for (let i = 0; i < GUSH.drops; i++) { assert.equal(dropPose(i, 0).alpha, 0); assert.equal(dropPose(i, GUSH.total).alpha, 0); }
});

test('the jet punches up fast, in bounds, then collapses', () => {
  let peak = 0;
  for (let t = 0; t <= GUSH.total; t += .01) { const p = jetPose(t); assert.ok(p.height >= 0 && p.height <= 1 && p.alpha >= 0 && p.alpha <= 1, String(t)); peak = Math.max(peak, p.height); }
  assert.ok(jetPose(.2).height > .5 && peak > .99 && jetPose(1.5).height === 0);
});

test('drops fly out and land on the floor, never underground', () => {
  for (let i = 0; i < GUSH.drops; i++) {
    let flew = false, farthest = 0;
    for (let t = 0; t <= GUSH.total; t += .01) {
      const p = dropPose(i, t); assert.ok(p.y >= 0 && p.r < 1.6, `${i} ${t}`);
      if (p.alpha > 0) { flew = true; farthest = Math.max(farthest, p.r); }
    }
    assert.ok(flew && farthest > .2, `drop ${i}`);
  }
});

test('the film spreads, never shrinks while visible, and stays modest', () => {
  let prev = 0;
  for (let t = 0; t <= GUSH.total; t += .01) { const p = filmPose(t); assert.ok(p.radius < .9 && p.alpha <= .55 + 1e-9); if (p.alpha > .3) { assert.ok(p.radius >= prev - .035); prev = p.radius; } }
  assert.ok(prev > .6);
});

test('the jet coughs at the top: it dips twice before it collapses', () => {
  const h = t => jetPose(t).height;
  assert.ok(h(GUSH.jet + .0625) < h(GUSH.jet) - .05 && h(GUSH.jet + .125) > h(GUSH.jet + .0625) && h(GUSH.jet + .1875) < h(GUSH.jet + .125));
});
