import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {itemsUnderMonsters, takerOf, takenSquares} from './held-items.js';

const items = ['3,4:2001:', '3,4:2002:', '7,1:2003:', '5,5:2004:'];

test('the items on squares a monster or pet now stands on are held, with who stands there', () => {
  const cells = [
    {x: 3, z: 4, kind: 'pet', name: 'kitten', visible: true},
    {x: 7, z: 1, kind: 'monster', name: 'Hill orc', visible: false, remembered: true},
    {x: 5, z: 5, kind: 'object'},
    {x: 9, z: 9, kind: 'pet', name: 'little dog', visible: true},
  ];
  const u = itemsUnderMonsters(cells, items);
  assert.deepEqual([...u.keys()].sort(), ['3,4', '7,1']);
  assert.deepEqual(u.get('3,4'), {name: 'kitten', pet: true, keys: ['3,4:2001:', '3,4:2002:'], visible: true});
  assert.equal(u.get('7,1').name, 'hill orc'); assert.equal(u.get('7,1').visible, false, 'only remembered: not shown');
  assert.equal(u.has('5,5'), false, 'an item shown as itself is not held');
  assert.equal(itemsUnderMonsters(null, items).size, 0);
});

test('the hero\'s own square is never held: squeezing onto a boulder leaves no boulder drawn round the hero', () => {
  // the hero's cell carries a monster glyph; what lies under the hero is not drawn
  const cells = [{x: 3, z: 4, kind: 'monster', name: 'valkyrie', visible: true}, {x: 7, z: 1, kind: 'pet', name: 'kitten', visible: true}];
  const u = itemsUnderMonsters(cells, items, {x: 3, z: 4});
  assert.deepEqual([...u.keys()], ['7,1']);
});

test('a pickup or a meal by a monster names it; the hero\'s own does not', () => {
  assert.equal(takerOf('The kitten picks up a dagger.'), 'kitten');
  assert.equal(takerOf('Miso picks up 3 gold pieces.'), 'miso');
  assert.equal(takerOf('The little dog eats a tripe ration.'), 'little dog');
  for (const t of ['You see here a dagger.', 'd - a dagger.', 'You pick up a dagger.', 'You eat the food ration.', 'The kitten moves only reluctantly.', null])
    assert.equal(takerOf(t), null, String(t));
});

test('the taker takes the items under it: by name, or under the pets for a pet the player named', () => {
  const u = itemsUnderMonsters([{x: 3, z: 4, kind: 'pet', name: 'kitten', visible: true}, {x: 7, z: 1, kind: 'monster', name: 'hill orc', visible: true}], items);
  assert.deepEqual(takenSquares('hill orc', u), ['7,1']);
  assert.deepEqual(takenSquares('kitten', u), ['3,4']);
  assert.deepEqual(takenSquares('miso', u), ['3,4'], 'a named pet: the pet\'s square');
  assert.deepEqual(takenSquares(null, u), []);
});

test('live.js keeps held items through the release sweep and drops them on a pickup message', () => {
  const src = readFileSync(new URL('./live.js', import.meta.url), 'utf8');
  const keep = src.indexOf('heldUnder.map=itemsUnderMonsters(frame.cells,groundItems.keys(),frame.player)'), sweep = src.indexOf('for(const [id,item] of groundItems)if(!seenActors.has(id))');
  assert.ok(keep > 0 && sweep > keep, 'held before the sweep');
  assert.ok(/takenSquares\(taker,heldUnder\.map\)/.test(src));
});
