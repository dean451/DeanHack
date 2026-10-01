import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue} from './actions.js';
import {updateCockatriceHiss, hisses, hissWeight, hissLength, snapCurve, moteAt, aimAt, RISE_S, HISS_S, YAW_MAX, PITCH_MAX, WING_LIFT, SHIVER, IDLE_GLOW, LOOKS} from './cockatrice-hiss.js';

const C = 'c'.charCodeAt(0);
const bird = (name = 'cockatrice') => { const a = createCreature({name, symbol: C, color: 3}); a.actions = createActionQueue(); a.species = name; return a; };
const snap = a => [a.head.rotation.x, a.head.rotation.y, a.head.position.y, a.head.position.z, a.body.rotation.x, a.tail.rotation.x, ...a.wingParts.flatMap(w => [w.rotation.y, w.rotation.z])];

test('the hiss rises fast, holds and folds; a head snap is a jerk, not a turn', () => {
  let prev = 0;
  for (let i = 0; i <= 2000; i++) {
    const s = hissLength() * i / 2000, v = hissWeight(s);
    assert(v >= 0 && v <= 1 && Math.abs(v - prev) < .03, `${s} ${v}`);
    prev = v;
  }
  assert.equal(hissWeight(RISE_S + HISS_S / 2), 1);
  assert.equal(hissWeight(hissLength()), 0);
  assert.equal(hissWeight(NaN), 0);
  assert(snapCurve(.3) > .7, 'most of the snap is done in the first third');
  assert.equal(snapCurve(0), 0); assert.equal(snapCurve(1), 1);
  for (let i = 0; i <= 100; i++) assert(snapCurve(i / 100) <= 1.05);
  for (let i = 0; i <= 50; i++) {
    const m = moteAt([i / 50, .5, .3, .7], i / 50);
    for (const v of [m.x, m.y, m.z, m.alpha, m.size]) assert(Number.isFinite(v));
    assert(Math.abs(m.x) < .06 && m.z > .15 && m.z < .25 && m.alpha <= 1, JSON.stringify(m));
  }
});

test('only cockatrice() birds hiss; chickatrice and pyrolisk too, nothing else', () => {
  for (const name of ['cockatrice', 'chickatrice', 'pyrolisk']) assert(hisses(bird(name)), name);
  assert(!hisses(createCreature({name: 'jackal', symbol: 'd'.charCodeAt(0), color: 3})));
  assert.equal(updateCockatriceHiss(createCreature({name: 'newt', symbol: ':'.charCodeAt(0), color: 3}), .016, 0, false), null);
  const p = bird('pyrolisk'); updateCockatriceHiss(p, .016, 0, false);
  const c = bird('cockatrice'); updateCockatriceHiss(c, .016, 0, false);
  assert.equal(c.hissing.style.color, LOOKS.stone.color); assert.equal(p.hissing.style.color, LOOKS.ember.color);
});

test('its head jerks round to stare at a hero in range', () => {
  const a = bird(); a.g.position.set(0, 0, 0); a.g.rotation.y = 0;
  const hero = new THREE.Vector3(2, 0, 2), want = Math.atan2(2, 2);
  assert(Math.abs(aimAt(a, hero).yaw - want) < 1e-9);
  assert.equal(aimAt(a, new THREE.Vector3(9, 0, 0)), null, 'out of range');
  let near = 0, n = 0;
  for (let i = 0; i < 1200; i++) {
    updateCockatriceHiss(a, 1 / 60, i / 60, true, false, hero);
    if (i > 120) { n++; if (Math.abs(a.head.rotation.y - want) < .2) near++; }
  }
  assert(near / n > .6, `stares ${near}/${n}`);
});

test('sixty seconds of each: finite, bounded, hisses, and death settles it exactly', () => {
  for (const name of ['cockatrice', 'chickatrice', 'pyrolisk']) {
    const a = bird(name), rest = snap(a), dt = 1 / 60;
    let hisses = 0, was = false, maxLift = 0, maxJump = 0, prevY = a.head.rotation.y;
    for (let i = 0; i < 3600; i++) {
      const t = i * dt, walking = t > 20 && t < 25, look = t > 30 ? new THREE.Vector3(1.5, 0, 2) : null;
      if (t >= 50 && !a.actions.dead) a.actions.dead = true;
      const r = updateCockatriceHiss(a, dt, t, walking, walking, look);
      const on = !!a.hissing.hiss;
      if (on && !was) hisses++;
      was = on;
      for (const v of [r.hiss, r.glow, ...snap(a)]) assert(Number.isFinite(v), `${name} ${t}`);
      assert(Math.abs(a.head.rotation.y) <= YAW_MAX + .06, `${name} yaw ${a.head.rotation.y}`);
      assert(Math.abs(a.head.rotation.x) <= PITCH_MAX + .25, `${name} pitch ${a.head.rotation.x}`);
      assert(r.glow >= 0 && r.glow <= 1 && a.hissing.style.alpha <= 1, `${name} glow`);
      if (walking && t > 21) assert(r.hiss < 1e-6, `${name} no hiss while walking`);
      for (const w of a.wingParts) maxLift = Math.max(maxLift, Math.abs(w.rotation.z));
      maxJump = Math.max(maxJump, Math.abs(a.head.rotation.y - prevY)); prevY = a.head.rotation.y;
      if (t > 10 && t < 20 && !on) assert(r.glow >= IDLE_GLOW * .99, 'a faint shimmer at rest');
    }
    assert(hisses >= 2, `${name} hissed ${hisses}×`);
    assert(maxLift > WING_LIFT * .9 && maxLift <= WING_LIFT + SHIVER + 1e-9, `${name} wing lift ${maxLift}`);
    assert(maxJump > .05, `${name} head jerks (${maxJump})`);
    const end = snap(a);
    end.forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9, `${name} part ${k} back at rest: ${v} vs ${rest[k]}`));
    assert(!a.hissing.layer.points.visible, `${name} shimmer gone in death`);
  }
});
