import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const count = name => { let n = 0; createCreature({name, symbol: 76, color: 7}).g.traverse(o => { if (o.isMesh) n += (o.geometry.index?.count ?? o.geometry.attributes.position.count); }); return n; };

test('lich robes grow finer with each tier', () => {
  const [lich, demi, master, arch] = ['lich', 'demilich', 'master lich', 'arch-lich'].map(count);
  assert(demi > lich && master > demi && arch > master);
});

test('master and arch-liches stand before a ring of cold light', () => {
  const rings = name => { let n = 0; createCreature({name, symbol: 76, color: 7}).g.traverse(o => { if (o.isMesh && o.geometry.type === 'TorusGeometry') n++; }); return n; };
  assert.equal(rings('demilich'), 0);
  assert(rings('master lich') >= 1);
});

test('master and arch-liches wear a crown that rises above the circlet', () => {
  const top = name => { const c = createCreature({name, symbol: 76, color: 7}); c.g.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(c.g); return b.max.y / c.g.scale.y; };
  assert(top('master lich') > top('demilich'));
  assert(top('arch-lich') > top('master lich'));
});
