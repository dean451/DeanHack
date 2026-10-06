import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const height = name => { const a = createCreature({name, symbol: 76, color: 7}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g).max.y; };

test('liches rise in order of dread', () => {
  const [lich, demi, master, arch] = ['lich', 'demilich', 'master lich', 'arch-lich'].map(height);
  assert(lich < demi && demi < master && master < arch);
});
