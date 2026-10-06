import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// live.js is too big to load in a unit test, so a name it uses but forgot to import only shows
// up when Live mode throws in the browser. Check the helpers pulled in from sibling modules.
const live = readFileSync(new URL('./live.js', import.meta.url), 'utf8');

test('every helper live.js calls from camera-view.js is imported', () => {
  for (const name of ['captureView', 'restoreView']) {
    assert.ok(live.includes(`${name}(`), `${name} is used`);
    assert.match(live, new RegExp(`import \\{[^}]*\\b${name}\\b[^}]*\\} from './camera-view.js'`), `${name} is imported`);
  }
});
