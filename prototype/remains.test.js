import test from 'node:test';
import assert from 'node:assert/strict';
import {remainsOf, REMAINS} from './remains.js';

// remains.js: the seen species name picks what a fight leaves on the floor (marks.js).
test('flesh-and-bone creatures leave blood and bones; the default is flesh', () => {
  for (const n of ['jackal', 'gnome lord', 'soldier', 'red dragon', 'horned devil', 'Angel', 'vampire', 'red naga', 'cockatrice', 'leprechaun', 'minotaur', 'human', null, ''])
    assert.equal(remainsOf(n), 'flesh', String(n));
});

test('boneless things bleed but leave no bones', () => {
  for (const n of ['floating eye', 'giant ant', 'killer bee', 'grid bug', 'giant spider', 'scorpion', 'long worm', 'purple worm', 'giant eel', 'electric eel', 'xan', 'small mimic', 'piercer', 'trapper', 'lurker above', 'kraken'])
    assert.equal(remainsOf(n), 'blood', n);
});

test('dry undead leave bone shards and dust, no blood', () => {
  for (const n of ['kobold zombie', 'human zombie', 'skeleton', 'kobold mummy', 'ghoul', 'lich', 'master lich', 'arch-lich', 'wraith', 'barrow wight', 'Nazgul', 'bone devil'])
    assert.equal(remainsOf(n), 'bones', n);
});

test('lights, spheres, spores, vortices, clouds, ghosts, elementals, golems, jellies, oozes and stone things leave nothing', () => {
  for (const n of ['yellow light', 'black light', 'flaming sphere', 'freezing sphere', 'shocking sphere', 'gas spore', 'fog cloud', 'dust vortex', 'energy vortex', 'ghost', 'shade', 'stalker', 'air elemental', 'fire elemental', 'earth elemental', 'water elemental', 'stone golem', 'flesh golem', 'paper golem', 'brown mold', 'lichen', 'shrieker', 'violet fungus', 'xorn', 'gargoyle', 'rock mole'])
    assert.equal(remainsOf(n), 'none', n);
  assert.deepEqual(REMAINS, ['flesh', 'blood', 'bones', 'slick', 'none']);
});

test('jellies, puddings, oozes, blobs and slimes leave an acid slick', () => {
  for (const n of ['blue jelly', 'spotted jelly', 'ochre jelly', 'brown pudding', 'black pudding', 'gray ooze', 'acid blob', 'green slime', 'blue slime'])
    assert.equal(remainsOf(n), 'slick', n);
});
