import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const make = n => createCreature({name: n, symbol: 79, color: 1});
const stats = c => {let n = 0, sum = 0, flat = 0, round = 0;c.g.traverse(o => {if (o.isMesh) {const m = o.material;if (m && m.color) {n++;sum += m.color.r * .3 + m.color.g * .59 + m.color.b * .11;}if (m && m.flatShading) flat++;if (o.geometry.type === 'RoundedBoxGeometry') round++;}});return {avg: sum / n, flat, round};};

test('ogre lords are faceted and worn: flat-shaded torso and limbs, a darker palette than a plain ogre', () => {
  const lord = make('ogre lord'), plain = make('ogre');
  assert(stats(lord).flat >= 4, 'flat-shaded torso and arm parts');
  assert(stats(lord).round < stats(plain).round, 'fewer smooth rounded boxes than a plain ogre');
  assert(stats(lord).avg < stats(plain).avg, 'darker than a plain ogre');
  assert.equal(lord.g.userData.bloodyClub, true);
});

test('ogre lord stays inside the draw budget', () => {
  let meshes = 0;make('ogre lord').g.traverse(o => {if (o.isMesh) meshes++;});
  assert(meshes < 60, 'meshes: ' + meshes);
});
