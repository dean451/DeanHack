import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createCorpse} from './corpse.js';
import {createCreature} from './creatures.js';

// tools/corpse-shot.html and tools/corpse-shot.mjs render a creature's corpse the way the floor shows
// it, so corpses can be looked at (the daily review and the routines had no way to render one).
test('the corpse shot page builds the corpse through createCorpse with the creature factory and offers three views', () => {
  const html = readFileSync(new URL('./tools/corpse-shot.html', import.meta.url), 'utf8'), mjs = readFileSync(new URL('./tools/corpse-shot.mjs', import.meta.url), 'utf8');
  assert.match(html, /createCorpse\(name,[\s\S]*?creatureFactory:o=>createCreature\(o\)/);
  assert.match(html, /view==='top'/); assert.match(html, /view==='side'/); assert.match(html, /window\.__done=true/);
  assert.match(mjs, /\['three','top','side'\]/); assert.match(mjs, /corpse-shot\.html\?name=/);
});

test('the corpses the page renders by default build and lie on the floor', () => {
  for (const name of ['soldier', 'jackal', 'red naga']) {
    const c = createCorpse(name, 7, 3, {creatureFactory: o => createCreature(o), symbol: 64});
    c.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(c);
    assert.ok(b.min.y > -.02, `${name} on the floor`);
    c.userData.dispose?.();
  }
});
