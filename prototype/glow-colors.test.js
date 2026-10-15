import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css = readFileSync(new URL('style.css', import.meta.url), 'utf8');
const hexes = body => [...body.matchAll(/#([0-9a-f]{6})\b/gi)].map(m => m[1].match(/../g).map(h => parseInt(h, 16)));
const keyframes = name => css.match(new RegExp(`@keyframes ${name}\\{(.*?)\\}\\}`, 's'))[1];

test('pack row glow-blessed is green like the blessed rows', () => {
  const colours = hexes(keyframes('glow-blessed'));
  assert.ok(colours.length);
  for (const [r, g, b] of colours) assert.ok(g > r && g > b, `rgb(${r},${g},${b}) should lean green`);
  const row = css.match(/\.engine-menu-row\.buc-blessed\{color:#([0-9a-f]{6})/i)[1].match(/../g).map(h => parseInt(h, 16));
  assert.ok(row[1] > row[0] && row[1] > row[2], 'buc-blessed row text is green');
});

test('pack row glow-cursed is red like the cursed rows', () => {
  const colours = hexes(keyframes('glow-cursed'));
  assert.ok(colours.length);
  for (const [r, g, b] of colours) assert.ok(r > g && r > b, `rgb(${r},${g},${b}) should lean red`);
  const row = css.match(/\.engine-menu-row\.buc-cursed\{color:#([0-9a-f]{6})/i)[1].match(/../g).map(h => parseInt(h, 16));
  assert.ok(row[0] > row[1] && row[0] > row[2], 'buc-cursed row text is red');
});
