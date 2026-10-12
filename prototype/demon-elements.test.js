import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const named = (name, mat) => {
  let n = 0;
  createCreature({name, symbol: 38, color: 1}).g.traverse(o => { if (o.isMesh && o.material.name === mat) n += o.geometry.attributes.position.count; });
  return n;
};

test('the lava demon is crusted with black slag split by glowing veins', () => {
  assert(named('lava demon', 'demon-slag') > 0, 'slag');
  assert(named('lava demon', 'demon-slag-glow') > 0, 'veins');
});

test('the water demon is crusted with barnacles and trails drowned weed', () => {
  assert(named('water demon', 'demon-barnacle') > 0, 'barnacles');
  assert(named('water demon', 'demon-weed') > 0, 'weed');
});

test('the elemental marks stay on their own demons and fit the tile', () => {
  assert.equal(named('barbed devil', 'demon-slag') + named('water demon', 'demon-slag') + named('lava demon', 'demon-barnacle'), 0);
  for (const name of ['lava demon', 'water demon']) {
    const c = createCreature({name, symbol: 38, color: 1});
    c.g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(c.g, true);
    assert(b.min.y > -0.05, `${name} stands on the floor`);
    assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.6, `${name} fits its tile`);
  }
});
