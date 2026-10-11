import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

test('mummies show a rotted cheek and a bone splinter and keep their mesh count', () => {
  for (const name of ['human mummy', 'giant mummy']) {
    const c = createCreature({name, symbol: 77, color: 7});
    let n = 0, verts = 0;
    c.g.traverse(o => { if (o.isMesh) { n++; verts += o.geometry.attributes.position.count; } });
    assert.equal(n, 7, name + ' meshes');
    assert(verts < 52000, name + ' vertices ' + verts);
    c.arms.forEach(a => a.updateMatrixWorld(true));
  }
});
