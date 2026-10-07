import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const count = name => { let n = 0; createCreature({name, symbol: 76, color: 7}).g.traverse(o => { if (o.isMesh) n += (o.geometry.index?.count ?? o.geometry.attributes.position.count); }); return n; };

test('lich robes grow finer with each tier', () => {
  const [lich, demi, master, arch] = ['lich', 'demilich', 'master lich', 'arch-lich'].map(count);
  assert(demi > lich && master > demi && arch > master);
});
