import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const T = 'T'.charCodeAt(0);
const make = name => createCreature({name, symbol: T, color: 1});
const meshCount = a => { let n = 0; a.g.updateMatrixWorld(true); a.g.traverse(p => { if (p.isMesh) { n++; for (const v of p.geometry.attributes.position.array) assert(Number.isFinite(v), name(a)); } }); return n; };
const name = a => a.g.name;

test('olog-hai wear a horned black iron helm; other trolls go bare-headed', () => {
  assert.equal(make('olog-hai').g.userData.helmed, true);
  for (const n of ['troll', 'ice troll', 'rock troll', 'water troll']) assert(!make(n).g.userData.helmed, n);
  assert(meshCount(make('olog-hai')) <= 30);
});

test('rock trolls carry dull magma veins and no other troll does', () => {
  assert.equal(make('rock troll').g.userData.veined, true);
  for (const n of ['troll', 'ice troll', 'water troll', 'olog-hai']) assert(!make(n).g.userData.veined, n);
  assert(meshCount(make('rock troll')) <= 30);
});

test('ettins wear spiked iron collars and other giants do not', () => {
  assert.equal(createCreature({name: 'ettin', symbol: 'H'.charCodeAt(0), color: 1}).g.userData.collared, true);
  for (const n of ['giant', 'hill giant', 'stone giant']) assert(!createCreature({name: n, symbol: 'H'.charCodeAt(0), color: 1}).g.userData.collared, n);
  assert(meshCount(createCreature({name: 'ettin', symbol: 'H'.charCodeAt(0), color: 1})) <= 30);
});

test('fire giants are cracked like cooling slag and no other giant is', () => {
  const H = n => createCreature({name: n, symbol: 'H'.charCodeAt(0), color: 1});
  assert.equal(H('fire giant').g.userData.cracked, true);
  for (const n of ['giant', 'frost giant', 'stone giant', 'lord surtur']) assert(!H(n).g.userData.cracked, n);
  assert(meshCount(H('fire giant')) <= 30);
});

test('water trolls carry a spine of barnacle shells and no other troll does', () => {
  assert.equal(make('water troll').g.userData.barnacled, true);
  for (const n of ['troll', 'ice troll', 'rock troll', 'olog-hai']) assert(!make(n).g.userData.barnacled, n);
  assert(meshCount(make('water troll')) <= 30);
});

test('plain trolls wear a cord of fangs and knucklebones and no other troll does', () => {
  assert.equal(make('troll').g.userData.trophied, true);
  for (const n of ['ice troll', 'rock troll', 'water troll', 'olog-hai']) assert(!make(n).g.userData.trophied, n);
  assert(meshCount(make('troll')) <= 30);
});

test('ice trolls hang icicle fangs and no other troll does', () => {
  assert.equal(make('ice troll').g.userData.rimed, true);
  for (const n of ['troll', 'rock troll', 'water troll', 'olog-hai']) assert(!make(n).g.userData.rimed, n);
  assert(meshCount(make('ice troll')) <= 30);
});

test('frost giants wear a beard of icicles and hill giants a belt of skulls', () => {
  const H = n => createCreature({name: n, symbol: 'H'.charCodeAt(0), color: 1});
  assert.equal(H('frost giant').g.userData.icicled, true);
  assert.equal(H('hill giant').g.userData.skulled, true);
  for (const n of ['giant', 'stone giant', 'fire giant', 'ettin']) { assert(!H(n).g.userData.icicled, n); assert(!H(n).g.userData.skulled, n); }
  assert(!H('hill giant').g.userData.icicled);
  assert(!H('frost giant').g.userData.skulled);
  assert(meshCount(H('frost giant')) <= 30);
  assert(meshCount(H('hill giant')) <= 30);
});
