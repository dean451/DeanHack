import test from 'node:test';
import assert from 'node:assert/strict';
import {combatAction, deathAction} from './combat-events.js';

test('hero weapon hits face the defender and keep the blow type', () => {
  const a = combatAction({type: 'combat', attack: 'weapon', result: 'hit',
    attacker: {you: true, x: 10, z: 5}, defender: {seen: true, x: 11, z: 4, name: 'jackal', pet: false},
    weapon: {otyp: 28, class: 2, material: 11, blow: 'slash'}});
  assert.deepEqual(a.dir, [1, -1]);
  assert.equal(a.heroAttacks, true);
  assert.equal(a.heroDefends, false);
  assert.equal(a.blow, 'slash');
  assert.equal(a.defender.name, 'jackal');
});

test('unseen attackers have no position or direction', () => {
  const a = combatAction({type: 'combat', attack: 'bite', result: 'miss',
    attacker: {seen: false}, defender: {you: true, x: 3, z: 3}});
  assert.equal(a.dir, null);
  assert.equal(a.heroDefends, true);
  assert.deepEqual(a.attacker, {seen: false});
});

test('pet fights and hallucinated names pass through safely', () => {
  const a = combatAction({type: 'combat', attack: 'claw', result: 'hit',
    attacker: {seen: true, x: 4, z: 4, name: 'kitten', pet: true}, defender: {seen: true, x: 4, z: 5, name: null}});
  assert.deepEqual(a.dir, [0, 1]);
  assert.equal(a.attacker.pet, true);
  assert.equal(a.defender.name, null);
  assert.equal(combatAction({type: 'combat', attack: 'nonsense', result: 'odd', attacker: {seen: false}, defender: {you: true, x: 1, z: 1}}).attack, 'other');
  assert.equal(combatAction({type: 'frame'}), null);
});

test('deaths keep position and name', () => {
  assert.deepEqual(deathAction({type: 'death', x: 7, z: 2, name: 'newt', pet: false}), {x: 7, z: 2, name: 'newt', pet: false});
  assert.equal(deathAction({type: 'death', x: 'a', z: 2}), null);
});
import './deaths.test.js';
