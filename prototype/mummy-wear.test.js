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

test('the giant and ettin mummies wear a tarnished gold circlet that rises above the wrappings', () => {
  const top = name => {
    const c = createCreature({name, symbol: 77, color: 7});
    const head = c.head.children.find(m => m.userData.part === 'head');
    const pos = head.geometry.attributes.position, col = head.geometry.attributes.color;
    let maxY = -Infinity, gold = 0, meshes = 0;
    for (let i = 0; i < pos.count; i++) {
      maxY = Math.max(maxY, pos.getY(i));
      if (col.getX(i) > col.getZ(i) * 1.8 && col.getX(i) > .25) gold++;
    }
    c.g.traverse(o => { if (o.isMesh) meshes++; });
    return {maxY, gold, meshes};
  };
  const plain = top('human mummy');
  for (const name of ['giant mummy', 'ettin mummy']) {
    const k = top(name);
    assert(k.maxY > plain.maxY + .03, name + ' crown rises ' + k.maxY);
    assert(k.gold > plain.gold + 20, name + ' gold ' + k.gold);
  }
  assert.equal(top('giant mummy').meshes, 7, 'no extra draws');
  assert.equal(top('ettin mummy').meshes, 9, 'no extra draws');
});
