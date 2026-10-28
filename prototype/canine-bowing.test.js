import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {updateCanineBow, bowFor, BOWING} from './canine-bowing.js';
import {BOW_POSES} from './canine-bow-poses.js';
import {bowPose, bows} from './canine-bow.js';
import {rolesOf} from './body-roles.js';

const FAMILY = ['jackal', 'werejackal', 'coyote', 'fox', 'wolf', 'warg', 'little dog', 'dog', 'large dog', 'dingo', 'werewolf', 'winter wolf cub', 'winter wolf', 'hell hound pup', 'hell hound'];
const make = name => { const a = createCreature({name, symbol: 100, color: 11}); a.species = name; a.g.updateMatrixWorld(true); return a; };
const snap = a => JSON.stringify([Object.values(a.joints).map(o => o.rotation.toArray().slice(0, 3)), a.body.position.toArray()]);
const FPS = 30, dt = 1 / FPS;
// runs `secs` of frames with the hero at `hero` (null: unseen); returns the largest bow reached
const run = (a, secs, t0, hero, busy = false) => { let p = 0; for (let i = 0; i < secs * FPS; i++) p = Math.max(p, updateCanineBow(a, dt, t0 + i * dt, busy, hero)); return p; };
const near = a => ({x: a.g.position.x + 1.2, z: a.g.position.z + .6}), far = a => ({x: a.g.position.x + 9, z: a.g.position.z});

test('every canine but Cerberus has a baked play bow that met every goal, so none is solved mid-play', () => {
  for (const name of FAMILY) { assert(BOW_POSES[name]?.ok, `${name} is baked and ok (node tools/bake-canine-bow.mjs): worst ${BOW_POSES[name]?.worst}`); assert(bowFor(make(name)), name); }
  assert(!bows(make('cerberus')), 'Cerberus (rigid side heads) does not bow');
});

test('the baked jackal and dog bows still match a fresh solve (re-bake after changing a canine\'s body or the bow goals)', () => {
  for (const name of ['jackal', 'dog']) {
    const fresh = bowPose(make(name)).pose, baked = BOW_POSES[name].pose;
    for (const [n, o] of Object.entries(fresh)) if (typeof o === 'object') for (const [ax, v] of Object.entries(o)) assert(Math.abs(v - (baked[n]?.[ax] ?? 0)) < 2e-3, `${name} ${n}.${ax}: baked ${baked[n]?.[ax]}, fresh ${v}`);
  }
});

test('standing still, the hero coming close sets off the bow: chest down, rump up, turned to face them, then it springs back up exactly', () => {
  for (const name of ['jackal', 'dog', 'wolf', 'hell hound']) {
    const a = make(name), P = rolesOf(a), standing = snap(a);
    const shoulder0 = P['shoulder:l']().y, hip0 = P['hip:l']().y;
    assert.equal(run(a, 2, 0, far(a)), 0, `${name}: no bow while the hero is far`);
    // the hero comes close: down within the drop, held
    a.g.rotation.y = 2; const hero = near(a);
    let t = 2; for (let i = 0; i < (BOWING.DOWN + .3) * FPS; i++, t += dt) updateCanineBow(a, dt, t, false, hero);
    assert.equal(a.canineBow.phase, 'hold', `${name}: down and holding`);
    a.g.updateMatrixWorld(true);
    assert(P['shoulder:l']().y < shoulder0 - .05 * a.g.scale.x, `${name}: the chest went down`);
    assert(P['hip:l']().y > P['shoulder:l']().y, `${name}: the rump over the chest`);
    const facing = Math.atan2(hero.x - a.g.position.x, hero.z - a.g.position.z);
    assert(Math.abs(Math.atan2(Math.sin(a.g.rotation.y - facing), Math.cos(a.g.rotation.y - facing))) < .15, `${name}: turned to face the hero`);
    // held, then up and exactly back (the heading it turned to is kept)
    run(a, BOWING.HOLD + BOWING.UP + .5, t, hero); t += BOWING.HOLD + BOWING.UP + .5;
    assert.equal(a.canineBow.phase, 'idle', `${name}: back up`);
    updateCanineBow(a, dt, t, false, hero);
    assert.equal(snap(a), standing, `${name}: every joint and the body exactly back`);
    assert(Math.abs(hip0 - P['hip:l']().y) < 1e-9, name);
  }
});

test('the tail beats while the bow is held', () => {
  const a = make('dog'), hero = near(a);
  run(a, 1.5, 0, far(a)); run(a, BOWING.DOWN + .2, 1.5, hero);
  const ys = []; for (let i = 0; i < 20; i++) { updateCanineBow(a, dt, 2.2 + i * dt, false, hero); ys.push(a.joints.tail2.rotation.y); }
  assert(Math.max(...ys) - Math.min(...ys) > .3, `the tail swings ${(Math.max(...ys) - Math.min(...ys)).toFixed(2)} rad`);
});

test('once per approach: staying close it does not bow again; stepping back out and in again it does, after the gap', () => {
  const a = make('wolf'), hero = near(a);
  run(a, 1.5, 0, far(a));
  assert.equal(run(a, 3, 1.5, hero), 1, 'the first bow');
  assert.equal(run(a, BOWING.GAP + 2, 4.5, hero), 0, 'no second bow while the hero stays close');
  run(a, 1.5, 20, far(a));
  assert.equal(run(a, 3, 21.5, hero), 1, 'the hero came back: another bow');
});

test('no bow without a lull, while walking or acting, for an unseen hero, or once dead; walking breaks off a bow at once, exactly back', () => {
  const a = make('jackal'), hero = near(a), standing = snap(a);
  assert.equal(run(a, .5, 0, hero), 0, 'not before it has stood still a moment');
  const b = make('jackal'); run(b, 2, 0, far(b));
  assert.equal(run(b, 2, 2, near(b), true), 0, 'not while walking or acting');
  const c = make('jackal'); run(c, 2, 0, far(c)); assert.equal(run(c, 2, 2, null), 0, 'not for an unseen hero');
  const d = make('jackal'); run(d, 2, 0, far(d)); d.actions = {dead: true}; assert.equal(run(d, 2, 2, near(d)), 0, 'not once dead');
  // into a bow, then it walks: down and out within the break
  run(a, 2, .5, far(a)); run(a, BOWING.DOWN + .2, 2.5, hero);
  assert(a.canineBow.p > .9, 'bowing');
  run(a, BOWING.BREAK + .1, 3.2, hero, true);
  assert.equal(a.canineBow.p, 0, 'broken off');
  updateCanineBow(a, dt, 4, true, hero);
  assert.equal(snap(a), standing, 'exactly back');
});
