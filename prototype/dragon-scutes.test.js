import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const D = 'D'.charCodeAt(0);
const verts = a => { let n = 0; a.g.traverse(o => { if (o.isMesh) n += o.geometry.attributes.position.count; }); return n; };

test('four-legged dragons and wyverns wear a crust of armour scutes on the back, kept cheap (the draken about 13k vertices)', () => {
  // the scutes are 15 plain boxes (24 vertices each) merged into one mesh: the dragon is plated but stays light
  for (const name of ['draken', 'wyvern', 'sirrush']) { const n = verts(createCreature({name, symbol: D, color: 1})); assert(n > 11500 && n < 15000, `${name} ${n}`); }
});

test('the tail spade is barbed with two backswept hooks on dragons and wyverns; a sirrush keeps its scorpion sting instead', () => {
  // the tail's segments are skinned into meshes at the dragon's root: count the vertices weighted to tail bones
  const tailVerts = name => {
    const a = createCreature({name, symbol: D, color: 1}); let n = 0;
    a.tail.traverse(o => { if (o.isMesh) n += o.geometry.attributes.position.count; });
    a.g.traverse(o => { if (!o.isSkinnedMesh) return; const id = o.geometry.attributes.skinIndex; for (let i = 0; i < id.count; i++) if (o.skeleton.bones[id.getX(i)].name.startsWith('tail')) n++; });
    return n;
  };
  // two 4-sided cones (19 vertices each) join the spade; the sirrush tail is left at its old count
  // (the tail's hide and belly are smooth tubes now, cheaper than the spheres they replaced)
  assert.equal(tailVerts('draken'), 1620);
  assert.equal(tailVerts('wyvern'), 2085); // plus a venom bead on the stinger
  assert.equal(tailVerts('sirrush'), 1586);
});

test('serpent dragons rear behind a hood of two dark angular blades at the neck base', () => {
  // the two six-sided prisms add 80 vertices: guivre 9077 -> 9157, leviathan 9054 -> 9134
  const verts = name => { let n = 0; createCreature({name, symbol: D, color: 1}).g.traverse(o => { if (o.isMesh) n += o.geometry.attributes.position.count; }); return n; };
  assert.equal(verts('guivre'), 9157);
  assert.equal(verts('leviathan'), 9134);
});
