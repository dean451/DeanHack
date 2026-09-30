import test from 'node:test';
import assert from 'node:assert/strict';
import {levelTitle, lowHealth, parseAttributes} from './hud.js';

test('special levels and branches are named in the header; plain dungeon levels are not announced', () => {
  assert.deepEqual(levelTitle({dungeon: "Vlad's Tower", special: 'tower1', depth: 26}), {title: "Vlad's Tower", place: "VLAD'S TOWER · DEPTH 26", named: true});
  assert.equal(levelTitle({dungeon: 'The Dungeons of Doom', special: 'medusa', depth: 21}).title, "Medusa's Island");
  assert.equal(levelTitle({dungeon: 'Gehennom', special: 'orcus', depth: 38}).title, 'Orcus Town');
  assert.equal(levelTitle({dungeon: 'Gehennom', special: 'juiblex', depth: 32}).title, "Juiblex's Swamp");
  assert.equal(levelTitle({dungeon: 'Gehennom', special: 'asmod', depth: 36}).title, "Asmodeus' Lair");
  assert.equal(levelTitle({dungeon: 'Gehennom', special: 'valley', depth: 30}).title, 'The Valley of the Dead');
  assert.equal(levelTitle({dungeon: 'Sokoban', special: 'soko1', depth: 6}).title, 'Sokoban');
  assert.equal(levelTitle({dungeon: 'Sheol', special: '', depth: 40}).title, 'Sheol');
  assert.equal(levelTitle({dungeon: 'The Dragon Caves', special: 'drgnB', depth: 32}).title, 'The Dragon Caves');
  assert.equal(levelTitle({dungeon: "The Wizard's Tower", special: 'wizard2', depth: 44}).title, "The Wizard's Tower");
  // a Gehennom filler level is just Gehennom, still worth announcing on the way in
  assert.deepEqual(levelTitle({dungeon: 'Gehennom', special: 'heck-b', depth: 33}), {title: 'Gehennom', place: 'GEHENNOM · DEPTH 33', named: true});
  const plain = levelTitle({dungeon: 'The Dungeons of Doom', special: '', depth: 4});
  assert.deepEqual(plain, {title: 'The Dungeons', place: 'THE DUNGEONS OF DOOM · DEPTH 04', named: false});
  // an engine built before the bridge sent names still gets the old header
  assert.equal(levelTitle({depth: 7}).title, 'The Dungeons');
});

test('the vitality bar goes red below 40% of maximum', () => {
  assert.equal(lowHealth(40, 100), false);
  assert.equal(lowHealth(39, 100), true);
  assert.equal(lowHealth(0, 100), true);
  assert.equal(lowHealth(140, 140), false);
  assert.equal(lowHealth(5, 0), false);
});

test('the six attributes and the alignment come from the first status line', () => {
  const a = parseAttributes('[Wanderer the Swashbuckler]  St:18/50 Dx:17 Co:17 In:8 Wi:8 Ch:9  Lawful');
  assert.deepEqual(a.attributes.map(x => `${x.label} ${x.value}`), ['STR 18/50', 'DEX 17', 'CON 17', 'INT 8', 'WIS 8', 'CHA 9']);
  assert.equal(a.alignment, 'Lawful');
  assert.equal(parseAttributes('St:18/** Dx:3 Co:3 In:3 Wi:3 Ch:3 Chaotic').attributes[0].value, '18/**');
  // the second line, and a line cut off mid-update, are not attribute lines
  assert.equal(parseAttributes('Gehennom:30 $:0  HP:140(140) Pw:44(44) AC:-40 Exp:20 T:9628'), null);
  assert.equal(parseAttributes('[Wanderer the Swashbuckler]  St:25 Dx:17'), null);
});
