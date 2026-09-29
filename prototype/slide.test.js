import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {slideTo, heavySlide, HEAVY, EASE_RATE} from './slide.js';

const COLON = ':'.charCodeAt(0);
const turtle = () => createCreature({name: 'giant turtle', symbol: COLON, color: 2});
const dog = () => createCreature({name: 'jackal', symbol: 'd'.charCodeAt(0), color: 3});

// Steps an actor at 60 Hz until it reaches its target; returns per-frame positions.
function run(a, to, seconds = 4) {
  a.target = new THREE.Vector3(...to);
  const dt = 1 / 60, out = [];
  for (let i = 0; i < seconds * 60; i++) {
    slideTo(a, dt);
    out.push(a.g.position.clone());
  }
  return out;
}
const walking = (a) => a.g.position.distanceTo(a.target) > .025;

test('the giant turtle slides heavily; other monsters keep the ordinary ease', () => {
  assert.equal(heavySlide(turtle()), HEAVY.turtle);
  assert.equal(heavySlide(dog()), null);
  const d = dog();
  run(d, [1, 0, 0], 1 / 60);
  assert(Math.abs(d.g.position.x - (1 - Math.exp(-EASE_RATE / 60))) < 1e-12);
});

test('one cell: pulls away, cruises, brakes and lands exactly, in about a second', () => {
  for (const to of [[1, 0, 0], [1, 0, -1], [0, 0, -1]]) {
    const a = turtle();
    const path = run(a, to);
    const dist = Math.hypot(...to);
    let prev = new THREE.Vector3(), arrived = -1, maxStep = 0, firstStep = null;
    path.forEach((p, i) => {
      for (const v of p.toArray()) assert(Number.isFinite(v));
      const step = p.distanceTo(prev);
      if (firstStep == null) firstStep = step;
      maxStep = Math.max(maxStep, step);
      // it never overshoots and never moves backward along the line
      assert(p.length() <= dist + 1e-9);
      assert(p.length() >= prev.length() - 1e-12);
      prev = p;
      a.g.position.copy(p);
      if (arrived < 0 && !walking(a)) arrived = i / 60;
    });
    assert(firstStep < .2 / 60, 'starts from rest');
    assert(maxStep <= HEAVY.turtle.cruise / 60 + 1e-9, 'never faster than cruise');
    assert(arrived > .7 && arrived < 1.6, `walking for ${arrived} s over ${dist}`);
    assert.deepEqual(a.g.position.toArray(), to.map(Number), 'lands exactly');
    assert.equal(a.slideSpeed, 0);
  }
});

test('a new move mid-slide keeps going smoothly; a far target catches up with the ease', () => {
  const a = turtle();
  run(a, [1, 0, 0], .5);
  const speed = a.slideSpeed;
  assert(speed > 0);
  // the next move arrives before it has landed: no stop or jump
  a.target.set(2, 0, 0);
  const before = a.g.position.x;
  slideTo(a, 1 / 60);
  assert(a.g.position.x > before && a.g.position.x - before <= HEAVY.turtle.cruise / 60 + 1e-9);
  run(a, [2, 0, 0]);
  assert.equal(a.g.position.x, 2);
  // a teleport five cells off eases in quickly and then lands
  const path = run(a, [7, 0, 0], 3);
  assert(path[0].x - 2 > .5, 'catches up fast');
  assert.equal(a.g.position.x, 7);
});
