import test from 'node:test';
import assert from 'node:assert/strict';
import {squareAt, farlookText, createFarlook} from './farlook.js';

test('a ground point maps to the nearest map square', () => {
  assert.deepEqual(squareAt({x: 2.4, z: -1.6}, {x: 10, z: 5}), {x: 12, z: 3});
});

test('monsters say hostile or peaceful, pets say pet', () => {
  assert.equal(farlookText({visible: true, kind: 'monster', name: 'jackal'}), 'jackal (hostile)');
  assert.equal(farlookText({visible: true, kind: 'monster', name: 'watchman', peaceful: true}), 'watchman (peaceful)');
  assert.equal(farlookText({visible: true, kind: 'pet', name: 'kitten'}), 'kitten (pet)');
});

test('items are named, bare floor and unseen squares say nothing', () => {
  assert.equal(farlookText({visible: true, object: {name: 'rusty dagger'}}), 'rusty dagger');
  assert.equal(farlookText({visible: true, object: {name: 'a cursed dagger'}}), '✖ a cursed dagger');
  assert.equal(farlookText({visible: true, object: {name: 'an uncursed dagger'}}), 'an uncursed dagger');
  assert.equal(farlookText({visible: true, terrain: 'floor'}), '');
  assert.equal(farlookText({visible: false, kind: 'monster', name: 'jackal'}), '');
  assert.equal(farlookText(undefined), '');
});

test('the tooltip shows, moves and hides', () => {
  const style = {};
  const el = {style, hidden: true, setAttribute() {}};
  const farlook = createFarlook({createElement: () => el});
  farlook.show('jackal (hostile)', 100, 50);
  assert.equal(el.hidden, false);
  assert.equal(el.textContent, 'jackal (hostile)');
  assert.equal(style.left, '114px');
  farlook.show('', 0, 0);
  assert.equal(el.hidden, true);
});

test('furniture and hazards are named, plain floor and walls are not', () => {
  assert.equal(farlookText({visible: true, terrain: 'altar'}), 'altar');
  assert.equal(farlookText({visible: true, terrain: 'down'}), 'stairs down');
  assert.equal(farlookText({visible: true, terrain: 'lava'}), 'lava');
  assert.equal(farlookText({visible: true, terrain: 'wall'}), '');
  assert.equal(farlookText({visible: true, terrain: 'unknown'}), '');
});

test('floor items show a known enchantment shape after the blessed or cursed one', () => {
  assert.equal(farlookText({visible: true, object: {name: 'a +2 dagger'}}), '▲ a +2 dagger');
  assert.equal(farlookText({visible: true, object: {name: 'a cursed -1 dagger'}}), '✖▼ a cursed -1 dagger');
  assert.equal(farlookText({visible: true, object: {name: 'a +0 dagger'}}), 'a +0 dagger');
});

test('traps and doors are named by their state', () => {
  assert.equal(farlookText({visible: true, kind: 'terrain', terrain: 'floor', trap: 'Bear trap'}), 'bear trap');
  assert.equal(farlookText({visible: true, terrain: 'door', door: 'open'}), 'open door');
  assert.equal(farlookText({visible: true, terrain: 'floor', door: 'broken'}), 'broken door');
  assert.equal(farlookText({visible: true, terrain: 'door'}), 'closed door');
});

test('a wounded monster says how badly', () => {
  assert.equal(farlookText({visible: true, kind: 'monster', name: 'orc', health: 80}), 'orc (hostile, wounded)');
  assert.equal(farlookText({visible: true, kind: 'monster', name: 'orc', health: 40}), 'orc (hostile, badly wounded)');
  assert.equal(farlookText({visible: true, kind: 'pet', name: 'kitten', health: 10}), 'kitten (pet, near death)');
  assert.equal(farlookText({visible: true, kind: 'monster', name: 'orc'}), 'orc (hostile)');
});

test('detected things out of sight are named as sensed, with no health detail', () => {
  assert.equal(farlookText({visible: false, sensed: true, object: {name: 'wand of digging'}}), 'wand of digging (sensed)');
  assert.equal(farlookText({visible: false, sensed: true, kind: 'monster', name: 'newt', health: 10}), 'newt (hostile) (sensed)');
  assert.equal(farlookText({visible: false, sensed: true, terrain: 'altar'}), '');
  assert.equal(farlookText({visible: false, remembered: true, object: {name: 'dagger'}}), '');
});

test('an engraving the hero has read is named, with Elbereth called out', () => {
  assert.equal(farlookText({visible: true, terrain: 'floor', engraving: {type: 'dust', elbereth: false}}), 'dust engraving');
  assert.equal(farlookText({visible: true, terrain: 'floor', engraving: {type: 'burn', elbereth: true}}), 'Elbereth, burn');
  assert.equal(farlookText({visible: true, terrain: 'altar', engraving: {type: 'dust'}}), 'altar (dust engraving)');
  assert.equal(farlookText({visible: true, terrain: 'floor'}), '');
});
