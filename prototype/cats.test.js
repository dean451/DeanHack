import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {catSize, catMove, isPrey, catLength, catAttackPose, CAT_TIME} from './cats.js';
import {createActionQueue, updateActions, clearActionPose, findActor, queueCombat} from './actions.js';
import {foreLegs} from './monster-attacks.js';

const KEYS = ['lunge', 'dy', 'twist', 'pitch', 'roll', 'head', 'fore', 'paw', 'pawSide', 'tail', 'stretch', 'scale'];
const rest = p => KEYS.every(k => Math.abs(p[k] - (k === 'stretch' || k === 'scale' ? 1 : 0)) < 1e-9);

test('cats are told apart by species and choose a pounce on prey, a swipe on the rest', () => {
  assert.equal(catSize('kitten'), .75);
  assert.equal(catSize('Large Cat'), 1.2);
  assert.equal(catSize('tiger'), 1.5);
  assert.equal(catSize('jackal'), null);
  assert.equal(catSize('displacer beast'), null);
  assert.equal(catSize(null), null);
  assert.equal(catMove('kitten', 'bite', 'sewer rat'), 'pounce');
  assert.equal(catMove('housecat', 'bite', 'newt'), 'pounce');
  assert.equal(catMove('housecat', 'bite', 'jackal'), 'swipe');
  assert.equal(catMove('tiger', 'claw', 'jackal'), 'pounce', 'large cats take bigger prey');
  assert.equal(catMove('housecat', 'bite', null), 'swipe', 'the hero or an unseen target');
  assert.equal(catMove('housecat', 'weapon', 'newt'), null);
  assert.equal(catMove('jackal', 'bite', 'newt'), null);
  assert.ok(isPrey('giant rat') && !isPrey('ratling') && !isPrey('soldier ant'));
  assert.ok(catLength('pounce', .75) < catLength('pounce', 1.5));
});

test('pounce and swipe are finite, bounded, rest at both ends and reach where they should', () => {
  for (const size of [.75, 1, 1.2, 1.5]) for (const result of ['hit', 'miss']) {
    for (const move of ['pounce', 'swipe']) {
      assert.ok(rest(catAttackPose(move, 0, result, size)) && rest(catAttackPose(move, 1, result, size)), `${move} rest`);
      assert.ok(rest(catAttackPose(move, -1, result, size)) && rest(catAttackPose(move, 2, result, size)));
      let maxL = 0, minL = 0, maxY = 0, maxPaw = 0;
      for (let u = 0; u <= 1; u += .005) {
        const p = catAttackPose(move, u, result, size);
        for (const k of KEYS) assert.ok(Number.isFinite(p[k]), `${move} ${k} at ${u}`);
        assert.ok(Math.abs(p.pitch) < .6 && Math.abs(p.roll) < .3 && p.stretch > .7 && p.stretch < 1.3);
        maxL = Math.max(maxL, p.lunge); minL = Math.min(minL, p.lunge);
        maxY = Math.max(maxY, p.dy); maxPaw = Math.max(maxPaw, -p.paw);
      }
      assert.ok(minL > -.1, `${move} backs off only a little`);
      if (move === 'pounce') {
        assert.ok(maxL > .6 && maxL < 1, `pounce reach ${maxL}`);
        assert.ok(maxY > .12 && maxY < .4, `pounce height ${maxY}`);
        assert.equal(maxPaw, 0);
      } else {
        assert.ok(maxL > .05 && maxL < .3, `swipe reach ${maxL}`);
        assert.ok(maxPaw > 1, 'paw raised');
      }
    }
    // Missing prey overshoots.
    const reach = r => Math.max(...Array.from({length: 201}, (_, i) => catAttackPose('pounce', i / 200, r, size).lunge));
    assert.ok(reach('miss') > reach('hit'));
  }
});

test('live wiring: a kitten pounces on a rat and swipes at the hero, posing one paw, then rests', () => {
  const kitten = createCreature({name: 'kitten'}), rat = createCreature({name: 'sewer rat'});
  kitten.species = 'kitten'; rat.species = 'sewer rat';
  kitten.g.position.set(0, 0, 0); rat.g.position.set(1, 0, 0);
  const actors = new Map([['10,10:1', kitten], ['11,10:2', rat]]), origin = {x: 10, z: 10};
  const find = s => findActor(actors, s.x, s.z, {name: s.name, origin});
  const k = {seen: true, x: 10, z: 10, name: 'kitten'}, r = {seen: true, x: 11, z: 10, name: 'sewer rat'};
  const you = {g: new THREE.Group()};
  assert.equal(queueCombat({attack: 'bite', result: 'hit', dir: [1, 0], attacker: k, defender: r}, {hero: you, find}), 2);
  assert.equal(queueCombat({attack: 'bite', result: 'miss', dir: [-1, 0], attacker: k, defender: {you: true}}, {hero: you, find}), 1);
  assert.deepEqual(kitten.actions.queue.map(a => a.cat), ['pounce', 'swipe']);
  assert.equal(kitten.actions.queue[0].size, .75);

  const paw = foreLegs(kitten)[0], other = foreLegs(kitten)[1];
  assert.ok(paw && other);
  const snap = () => [kitten.g.position.x, kitten.g.position.y, kitten.g.position.z, kitten.g.rotation.x, kitten.g.rotation.z,
    ...kitten.g.scale.toArray(), paw.rotation.x, paw.rotation.z, other.rotation.x, kitten.tail?.rotation.x ?? 0];
  const start = snap();
  let maxX = 0, maxY = 0, pawZ = 0, otherZ = 0;
  for (let t = 0; t < catLength('pounce', .75) + catLength('swipe', .75) + .3; t += 1 / 60) {
    clearActionPose(kitten, kitten.actions);
    updateActions(kitten, kitten.actions, 1 / 60);
    for (const v of snap()) assert.ok(Number.isFinite(v));
    maxX = Math.max(maxX, kitten.g.position.x); maxY = Math.max(maxY, kitten.g.position.y);
    pawZ = Math.max(pawZ, Math.abs(paw.rotation.z)); otherZ = Math.max(otherZ, Math.abs(other.rotation.z));
  }
  assert.ok(maxX > .55 && maxX < .9, `landed on the rat's tile ${maxX}`);
  assert.ok(maxY > .1, `leapt ${maxY}`);
  assert.ok(pawZ > .4 && otherZ === 0, 'only one paw swipes');
  assert.equal(kitten.actions.current, null);
  const end = snap();
  end.forEach((v, i) => assert.ok(Math.abs(v - start[i]) < 1e-6, `back at rest (${i}: ${start[i]} → ${v})`));
  // Other animals keep their own attacks.
  const jackal = createCreature({name: 'jackal'}); jackal.species = 'jackal';
  actors.set('12,10:3', jackal); jackal.g.position.set(2, 0, 0);
  queueCombat({attack: 'bite', result: 'hit', dir: [-1, 0], attacker: {seen: true, x: 12, z: 10, name: 'jackal'}, defender: r}, {hero: you, find});
  assert.equal(jackal.actions.queue[0].cat, undefined);
  assert.equal(CAT_TIME.pounce > CAT_TIME.swipe, true);
});
