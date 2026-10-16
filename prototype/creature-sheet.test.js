import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCreature} from './creatures.js';

// tools/creature-names.json is the bestiary from src/monst.c (name, class letter, colour index), the
// list tools/creature-sheet.html and tools/creature-sheet.mjs render to contact sheets.
const names = JSON.parse(readFileSync(new URL('./tools/creature-names.json', import.meta.url), 'utf8'));

test('the bestiary list covers monst.c: hundreds of entries, each with a name, a class letter and a colour', () => {
  assert.ok(names.length > 400, String(names.length));
  for (const m of names) {
    assert.ok(typeof m.name === 'string' && m.name.length > 0);
    assert.equal(typeof m.letter, 'string'); assert.equal(m.letter.length, 1);
    assert.ok(Number.isInteger(m.color) && m.color >= 0 && m.color < 16, `${m.name}: colour ${m.color}`);
  }
  const byName = new Map(names.map(m => [m.name, m]));
  assert.deepEqual(byName.get('jackal'), {name: 'jackal', letter: 'd', color: 3});
  assert.deepEqual(byName.get('water demon'), {name: 'water demon', letter: '&', color: 4});
  assert.equal(byName.get('chromatic dragon').letter, 'D');
});

test('a sample of the list builds through createCreature the way the sheet does', () => {
  for (const m of names.filter((_, i) => i % 37 === 0)) {
    const c = createCreature({name: m.name, symbol: m.letter.charCodeAt(0), color: m.color});
    assert.ok(c?.g, m.name);
  }
});

test('the sheet page and script agree on the list and the grid', () => {
  const html = readFileSync(new URL('./tools/creature-sheet.html', import.meta.url), 'utf8'), mjs = readFileSync(new URL('./tools/creature-sheet.mjs', import.meta.url), 'utf8');
  assert.match(html, /fetch\('\/tools\/creature-names\.json'\)/);
  assert.match(html, /setScissorTest\(true\)/, 'one renderer, one cell per creature');
  assert.match(html, /window\.__done=true/);
  assert.match(mjs, /creature-names\.json/); assert.match(mjs, /waitForFunction\(\(\)=>window\.__done/);
});
