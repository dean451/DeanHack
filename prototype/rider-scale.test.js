import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const scale = name => createCreature({name, symbol: 100, color: 1}).g.scale.x;

test('Death towers over his fellow Riders, and every Rider over a wraith', () => {
  assert(scale('Death') >= 1.3);
  assert(scale('Death') > scale('Pestilence'));
  for (const rider of ['Famine', 'Pestilence', 'War']) assert(scale(rider) >= 1.2, rider);
});

test('the weeping angel looms larger than a plain stone statue', () => {
  assert(scale('weeping angel') >= 1.15);
  assert(scale('weeping archangel') > scale('weeping angel'));
});

test('Death carries a scythe and Famine hangs a pair of scales, both inside their tile', async () => {
  const {Box3, Vector3} = await import('three');
  const verts = a => { let n = 0; a.g.traverse(o => { if (o.isMesh) n += o.geometry.attributes.position.count; }); return n; };
  const make = name => createCreature({name, symbol: 100, color: 1});
  const pest = make('Pestilence');
  for (const name of ['Death', 'Famine']) {
    const a = make(name);
    assert(verts(a) >= verts(pest) + 1000, `${name} carries a prop`);
    a.g.updateMatrixWorld(true);
    const b = new Box3().setFromObject(a.g, true), sz = b.getSize(new Vector3());
    assert(b.min.y > -.05 && sz.x < 1.2 && sz.z < 1.2, `${name} fits its tile (${sz.x.toFixed(2)} x ${sz.z.toFixed(2)})`);
  }
});
