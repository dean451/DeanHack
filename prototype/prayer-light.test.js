import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {prayerKind, pillarPose, glowPose, createPrayerLight, TOTAL} from './prayer-light.js';

test('only the prayer messages count', () => {
  assert.equal(prayerKind('You begin praying to Anhur.'), 'begin');
  assert.equal(prayerKind('You are surrounded by a shimmering light.'), 'boon');
  for (const t of ['You hit the newt.', 'You pray.', null]) assert.equal(prayerKind(t), null, String(t));
});

test('pillars stay in bounds, start and end at nothing, and the begin pillar never outshines a boon', () => {
  for (const kind of ['begin', 'boon']) {
    assert.equal(pillarPose(kind, 0).alpha, 0);
    assert.equal(pillarPose(kind, TOTAL[kind]).alpha, 0);
    assert.equal(glowPose(kind, TOTAL[kind]).alpha, 0);
    for (let t = 0; t < TOTAL[kind]; t += .02) {
      const p = pillarPose(kind, t), g = glowPose(kind, t);
      assert.ok(p.alpha >= 0 && p.alpha <= 1 && p.reach >= 0 && p.reach <= 1.001 && p.width >= 0 && p.width <= 1.2, `${kind} ${t}`);
      assert.ok(g.alpha >= 0 && g.alpha <= 1 && g.radius >= 0 && g.radius <= .9);
    }
  }
  assert.equal(glowPose('begin', 1).alpha, 0);
  assert.ok(pillarPose('begin', 1.5).alpha < pillarPose('boon', 1).alpha);
  assert.ok(pillarPose('begin', 1).reach < pillarPose('begin', 2).reach);
});

test('a prayer plays, a boon replaces the begin pillar, and nothing is left behind', () => {
  const parent = new THREE.Group(), fx = createPrayerLight(THREE, parent);
  assert.equal(fx.message('You hit the newt.', 1, 1), null);
  assert.equal(fx.message('You begin praying to Anhur.', Number.NaN, 0), null);
  assert.ok(fx.message('You begin praying to Anhur.', 3, 4));
  fx.update(.5);
  assert.ok(fx.message('You are surrounded by a shimmering light.', 3, 4));
  assert.equal(fx.active, 1);
  for (let i = 0; i < 40; i++) fx.update(.1);
  assert.equal(fx.active, 0);
  assert.equal(parent.children.length, 0);
  fx.message('You begin praying to Anhur.', 0, 0); fx.clear();
  assert.equal(parent.children.length, 0);
  fx.dispose();
});
