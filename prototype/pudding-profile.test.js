import test from 'node:test';
import assert from 'node:assert/strict';
import {createPudding, brownProfile} from './pudding.js';

const skinOf = kind => createPudding({kind}).body.children.find(m => m.userData.part === 'skin');

test('the brown pudding skin is lumpy and lopsided, not a sphere', () => {
  const p = skinOf('brown').geometry.attributes.position, r = [];
  for (let i = 0; i < p.count; i++) r.push(Math.hypot(p.getX(i), p.getY(i), p.getZ(i)));
  assert.ok(Math.max(...r) - Math.min(...r) > .06);
  assert.ok(brownProfile(-.8, .2, .6) > brownProfile(.8, .2, -.6) + .1);
});

test('the black pudding skin keeps its sphere', () => {
  const p = skinOf('black').geometry.attributes.position, r0 = Math.hypot(p.getX(0), p.getY(0), p.getZ(0));
  for (let i = 0; i < p.count; i++) assert.ok(Math.abs(Math.hypot(p.getX(i), p.getY(i), p.getZ(i)) - r0) < 1e-4);
});
