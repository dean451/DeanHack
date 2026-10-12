import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const size = (name, symbol) => { const a = createCreature({name, symbol, color: 0}); a.g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.g, true).getSize(new THREE.Vector3()); };

test('the black pudding is a larger mass than a brown pudding', () => {
  const black = size('black pudding', 80), brown = size('brown pudding', 80);
  assert(black.y > brown.y * 1.3 && black.x > brown.x * 1.3);
});

test('the green slime glows and reaches up in tendrils and drips, unlike a plain blob', () => {
  const count = name => { let n = 0; createCreature({name, symbol: 80, color: 0}).g.traverse(o => { if (o.isMesh) n++; }); return n; };
  assert(count('green slime') >= count('blue slime') + 7);
  const glow = name => { let e = 0; createCreature({name, symbol: 80, color: 0}).g.traverse(o => { if (o.isMesh) if (o.material.transparent) e = Math.max(e, o.material.emissiveIntensity || 0); }); return e; };
  assert(glow('green slime') > glow('blue slime') + .15);
});

test('the black pudding carries a half-eaten skull and pitch ridges that a plain ooze lacks, and stays on its tile', () => {
  const count = name => { let n = 0; createCreature({name, symbol: 80, color: 0}).g.traverse(o => { if (o.isMesh) n++; }); return n; };
  assert(count('black pudding') >= count('gray ooze') + 8);
  const bp = createCreature({name: 'black pudding', symbol: 80, color: 0});
  bp.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(bp.g, true);
  assert(b.min.y > -0.05 && Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.5);
});

test('the brown pudding blooms grey mould and sheds rotten strands that a plain jelly lacks', () => {
  const count = name => { let n = 0; createCreature({name, symbol: 80, color: 0}).g.traverse(o => { if (o.isMesh) n++; }); return n; };
  assert(count('brown pudding') >= count('gray ooze') + 7);
});
