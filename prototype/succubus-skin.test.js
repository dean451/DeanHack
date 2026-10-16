import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

// The succubus and incubus used to be pale pink flesh, which read as a toy next to the other demons.
// Their skin is now bruised ash, so the self-lit fissure and eyes are the brightest things on them.
const skinLuma = name => {
  const a = createCreature({name, symbol: 38, color: 1});
  let best = null, n = 0;
  a.g.traverse(o => { if (o.isMesh && o.material.color && !o.material.emissiveIntensity) { const c = o.material.color; const l = .3 * c.r + .59 * c.g + .11 * c.b; if (!best || o.geometry.attributes.position.count > n) { best = l; n = o.geometry.attributes.position.count; } } });
  return best;
};

test('succubus and incubus have dark, bruised skin, not pale flesh', () => {
  for (const name of ['succubus', 'incubus']) assert(skinLuma(name) < .3, `${name} skin is dark`);
});

test('the succubus keeps her glowing chest fissure', () => {
  let glow = 0;
  createCreature({name: 'succubus', symbol: 38, color: 1}).g.traverse(o => { if (o.isMesh && o.material.name === 'evil-glow') glow++; });
  assert(glow >= 1);
});
