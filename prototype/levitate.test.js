import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {levitationFromStatus, levitatePose, easeLevitation, createLevitation, LIFT, BOB, SWAY, RIPPLE_ALPHA} from './levitate.js';

test('the status line says when the hero levitates; the stats line says nothing', () => {
  assert.equal(levitationFromStatus('Dlvl:3 $:12 HP:14(14) Pw:5(5) AC:6 Xp:2/31 T:812 Lev'), true);
  assert.equal(levitationFromStatus('Dlvl:3 $:12 HP:14(14) Pw:5(5) AC:6 Xp:2/31 T:812 Burdened Lv Hungry'), true);
  assert.equal(levitationFromStatus('Dlvl:3 $:12 HP:14(14) Pw:5(5) AC:6 Xp:2/31 T:812'), false);
  assert.equal(levitationFromStatus('Dlvl:3 $:12 HP:14(14) Pw:5(5) AC:6 Xp:2/31 T:812 Levelled'), false);
  assert.equal(levitationFromStatus('Wanderer the Stripling St:17 Dx:14 Co:18 In:8 Wi:10 Ch:9 Lawful'), null);
  assert.equal(levitationFromStatus(null), null);
});

test('the float stays subtle and bounded, and is nothing at all on the floor', () => {
  for (let t = 0; t < 20; t += .01) for (const moving of [false, true]) {
    const p = levitatePose(1, t, moving);
    assert.ok(p.lift >= LIFT - BOB - 1e-9 && p.lift <= LIFT + BOB + 1e-9);
    assert.ok(Math.abs(p.sway) <= SWAY + 1e-9);
    for (const l of p.legs) assert.ok(Number.isFinite(l) && l >= 0 && l < .45);
    for (const r of p.ripples) assert.ok(r.alpha >= 0 && r.alpha <= RIPPLE_ALPHA && r.scale >= .55 && r.scale <= 1.35);
    const rest = levitatePose(0, t, moving);
    assert.equal(rest.lift, 0); assert.equal(rest.sway, 0);
    assert.ok(rest.legs.every(l => l === 0) && rest.ripples.every(r => r.alpha === 0));
  }
});

test('it eases up, settles back down, and hands the hero back as it found it', () => {
  let k = 0;
  for (let i = 0; i < 30; i++) k = easeLevitation(k, true, 1 / 60);
  assert.ok(k > .5 && k < 1, 'about half a second to rise');
  for (let i = 0; i < 240; i++) k = easeLevitation(k, true, 1 / 60);
  assert.equal(k, 1);
  for (let i = 0; i < 90; i++) k = easeLevitation(k, false, 1 / 60);
  assert.equal(k, 0);

  const parent = new THREE.Group();
  const lev = createLevitation(THREE, parent);
  const hero = {g: new THREE.Group(), body: new THREE.Group(), legs: [new THREE.Group(), new THREE.Group()]};
  lev.status('Wanderer St:18');
  assert.equal(lev.levitating, false);
  lev.status('Dlvl:1 $:0 HP:16(16) Pw:2(2) AC:6 Xp:1/0 T:40 Lev');
  let lift = 0, seen = 0;
  for (let i = 0; i < 180; i++) {
    hero.legs.forEach(l => { l.rotation.x = 0; }); hero.body.position.y = .01;
    lift = lev.update(hero, 1 / 60, i / 60);
    seen = Math.max(seen, lift);
    assert.ok(Number.isFinite(lift) && Number.isFinite(hero.body.rotation.z));
  }
  assert.ok(seen > LIFT - BOB && lev.rings.every(r => r.visible));
  assert.ok(hero.legs[0].rotation.x > 0, 'legs hang');
  lev.status('Dlvl:1 $:0 HP:16(16) Pw:2(2) AC:6 Xp:1/0 T:90');
  for (let i = 0; i < 120; i++) lift = lev.update(hero, 1 / 60, 3 + i / 60);
  assert.equal(lift, 0);
  assert.ok(lev.rings.every(r => !r.visible));
  lev.dispose();
  assert.equal(parent.children.length, 0);
});
