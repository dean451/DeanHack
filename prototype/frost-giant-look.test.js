import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const make = n => createCreature({name: n, symbol: 72, color: 1});
const lum = c => {let n = 0, sum = 0, tri = 0;c.g.traverse(o => {if (o.isMesh) {tri += o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3;const m = o.material;if (m && m.color) {n++;sum += m.color.r * .3 + m.color.g * .59 + m.color.b * .11;}}});return {avg: sum / n, tri};};

test('frost giants are a dark worn grey-blue, not a pale toy, with fingered hands', () => {
  const c = make('frost giant');
  assert.equal(c.g.userData.frostbitten, true);
  assert(lum(c).avg < 0.45, 'palette stays dark (the pale toy palette averaged higher)');
  // faceted limbs and five-digit hands cost more triangles than the old rounded boxes and balls
  assert(lum(c).tri > lum(make('fire giant')).tri * 0.8);
});

test('frost giant geometry stays inside the draw budget', () => {
  let meshes = 0;make('frost giant').g.traverse(o => {if (o.isMesh) meshes++;});
  assert(meshes < 40, 'merged: ' + meshes);
});

test('frost giants are faceted: flat-shaded head, chest and hood, fewer rounded blocks', () => {
  const c = make('frost giant');
  let flat = 0, round = 0;c.g.traverse(o => {if (o.isMesh) {if (o.material.flatShading) flat++;if (o.geometry.type === 'RoundedBoxGeometry') round++;}});
  assert(flat >= 3, 'flat-shaded skull, chest and hood: ' + flat);
  assert(round <= 14, 'rounded boxes: ' + round);
});
