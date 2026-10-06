import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const height = name => { const a = createCreature({name, symbol: 89, color: 7}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g).max.y; };

test('the sasquatch and yeti stand over a plain ape', () => {
  assert(height('sasquatch') > height('ape') * 1.4);
  assert(height('yeti') > height('ape') * 1.3);
});

test('the owlbear towers over a plain ape', () => {
  assert(height('owlbear') > height('ape') * 1.3);
});
