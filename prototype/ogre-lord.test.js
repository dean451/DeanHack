import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

function meshes(a) {
  const out = [];
  a.g.traverse(o => { if (o.isMesh) out.push(o); });
  return out;
}

test('the ogre lord has no smooth glossy metal: every metal surface is flat-shaded and rough', () => {
  const a = createCreature({name: 'ogre lord', symbol: 79, color: 1});
  const metal = meshes(a).map(m => m.material).filter(m => m.metalness > 0.2 && m.metalness < 0.6);
  const bronze = metal.filter(m => m.color.r > m.color.b * 1.5);
  assert.ok(bronze.length > 0, 'bronze plates exist');
  for (const m of bronze) {
    assert.ok(m.flatShading, 'bronze is flat-shaded');
    assert.ok(m.roughness >= 0.6, 'bronze has no specular hot spot');
  }
});

test('the ogre lord head is a flat-shaded skull, not a smooth dome', () => {
  const a = createCreature({name: 'ogre lord', symbol: 79, color: 1});
  const flat = [];
  a.head.traverse(o => { if (o.isMesh && o.material.flatShading) flat.push(o); });
  assert.ok(flat.length >= 3, 'head built from flat-shaded facets');
});

test('the belt skulls are yellowed bone with sockets, not white discs', () => {
  const a = createCreature({name: 'ogre lord', symbol: 79, color: 1});
  assert.ok(a.g.userData.skullBelt);
  const bone = meshes(a).filter(m => m.material.flatShading && m.material.color.getHex() === 0xa8987a);
  assert.ok(bone.length >= 1, 'flat-shaded skulls in aged bone, not the old bright discs');
  assert.ok(!meshes(a).some(m => m.material.color.getHex() === 0xd8ccb0), 'no bright white skull discs');
});
