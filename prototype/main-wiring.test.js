import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// main.js packs many statements on one line. On 2026-10-14 a `//` comment added mid-line swallowed
// renderer.setSize, the shadow and tone setup and appendChild: the canvas never joined the page, and
// deanhack.online showed a black room with no error. Strip line comments the way the parser does
// (a `//` not inside a URL) and check the renderer is still sized, set up and put on the page.
const code = readFileSync(new URL('./main.js', import.meta.url), 'utf8').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');

test('main.js still sizes the renderer and puts its canvas on the page after comments are stripped', () => {
  for (const call of ['renderer.setSize(innerWidth,innerHeight)', 'renderer.shadowMap.enabled=true', 'renderer.toneMapping=THREE.ACESFilmicToneMapping',
    "document.querySelector('#scene').appendChild(renderer.domElement)", 'renderer.setAnimationLoop('])
    assert(code.includes(call), `${call} is live code, not swallowed by a comment`);
});
