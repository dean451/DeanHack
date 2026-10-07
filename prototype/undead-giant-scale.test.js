import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const height = name => { const a = createCreature({name, symbol: 90, color: 7}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g).max.y; };

test('giant and ettin undead tower over a human one', () => {
  for (const kind of ['zombie', 'mummy']) {
    const human = height(`human ${kind}`);
    assert(height(`ettin ${kind}`) > human * 1.45, `ettin ${kind}`);
    assert(height(`giant ${kind}`) > human * 1.7, `giant ${kind}`);
  }
});

test('ogre and troll undead loom over a human one, under the ettin', () => {
  for (const kind of ['zombie', 'mummy']) {
    const human = height(`human ${kind}`);
    for (const big of ['ogre', 'troll']) {
      const h = height(`${big} ${kind}`);
      assert(h > human * 1.25, `${big} ${kind}`);
      assert(h < height(`ettin ${kind}`), `${big} ${kind} under ettin`);
    }
  }
});
