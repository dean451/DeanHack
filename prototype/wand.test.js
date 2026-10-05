import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWand, wandAppearance, WAND_APPEARANCES} from './wand.js';
import {createHeldWeapon} from './equipment.js';
import {createGroundModel} from './ground-models.js';

const meshes = g => { const list = []; g.traverse(o => { if (o.isMesh) list.push(o); }); return list; };
const bounds = g => { g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(g); };

test('every wand appearance builds a finite wand of at most three meshes, held and on the floor', () => {
  assert.equal(WAND_APPEARANCES.length, 43);
  for (const look of [...WAND_APPEARANCES, null, 'unknown']) for (const floor of [false, true]) {
    const t0 = performance.now(), wand = createWand(look, {floor}), ms = performance.now() - t0, parts = meshes(wand);
    const name = `${look} ${floor ? 'floor' : 'held'}`;
    assert(parts.length >= 2 && parts.length <= 3, `${name}: ${parts.length} meshes`);
    for (const m of parts) {
      for (const v of m.geometry.attributes.position.array) assert(Number.isFinite(v), name);
      for (const v of m.geometry.attributes.normal.array) assert(Number.isFinite(v), name);
    }
    const b = bounds(wand);
    if (floor) {
      assert(Math.abs(b.min.y) < 1e-6 && b.max.y < .13, `${name} height ${b.min.y}..${b.max.y}`);
      assert(b.max.x - b.min.x > .3 && Math.max(-b.min.x, b.max.x) < .45, `${name} length ${b.min.x}..${b.max.x}`);
      assert(Math.max(-b.min.z, b.max.z) < .15, `${name} width`);
    } else {
      assert(b.min.y > -.12 && b.min.y < -.07, `${name} butt ${b.min.y}`);
      assert(b.max.y > .2 && b.max.y < .7, `${name} tip ${b.max.y}`);
      assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < .12, `${name} thickness`);
    }
    assert(ms < 500, `${name} took ${ms} ms`);
    wand.userData.dispose();
  }
});

test('looks differ by appearance and never need the true name', () => {
  const colour = look => meshes(createWand(look)).find(m => m.userData.part === 'shaft').material.color.getHexString();
  const colours = new Set(['oak', 'ebony', 'silver', 'copper', 'marble', 'glass', 'iron'].map(colour));
  assert.equal(colours.size, 7);
  assert(meshes(createWand('glass'))[0].material.transparent);
  assert(meshes(createWand('runed')).some(m => m.userData.part === 'accent' && m.material.emissiveIntensity > 0));
  assert(meshes(createWand('jeweled')).some(m => m.userData.part === 'accent'));
  const len = look => { const b = bounds(createWand(look)); return b.max.y - b.min.y; };
  assert(len('short') < len('oak') && len('oak') < len('long'));
  const b = bounds(createWand('curved', {floor: true}));
  assert(b.max.z - b.min.z > .08, 'a curved wand bows along the floor');
});

test('the held wand reads its look from the hero-view name only', () => {
  assert.equal(wandAppearance('oak wand'), 'oak');
  assert.equal(wandAppearance('2 runed wands'), 'runed');
  assert.equal(wandAppearance('oak wand named zappy'), 'oak');
  assert.equal(wandAppearance('wand of fire'), null);
  assert.equal(wandAppearance('wand called fire'), null);
  assert.equal(wandAppearance('wand'), null);
  assert.equal(wandAppearance(undefined), null);
  const held = createHeldWeapon({name: 'ebony wand', otyp: 400, class: 11});
  assert.equal(held.userData.look, 'ebony');
  assert(meshes(held).length <= 3);
  assert.equal(createHeldWeapon({name: 'wand of striking', class: 11}).userData.look, 'plain');
  // Weapons are untouched.
  assert.notEqual(createHeldWeapon({name: 'long sword', class: 2}).userData.look, 'plain');
  // The held-wand aura sits 0.3 up the rod: on the shaft for every normal-length wand.
  for (const look of WAND_APPEARANCES.filter(l => l !== 'short')) assert(bounds(createWand(look)).max.y > .32, look);
});

test('a floor wand model uses the appearance and frees its resources', () => {
  const model = createGroundModel({class: 11, name: 'wand of death', appearance: 'bamboo'});
  assert(model);
  const parts = meshes(model);
  assert(parts.length <= 3);
  assert(parts.some(m => m.material.color.getHex() === 0xc8b25e), 'bamboo shaft');
  const disposed = [];
  for (const m of parts) { m.geometry.addEventListener('dispose', () => disposed.push('g')); m.material.addEventListener('dispose', () => disposed.push('m')); }
  model.userData.dispose();
  assert.equal(disposed.filter(d => d === 'g').length, parts.length);
  assert.equal(disposed.filter(d => d === 'm').length, parts.length);
});

test('titanium, electrum, plastic and bone wands each look like their material', () => {
  const shaft = look => meshes(createWand(look)).find(m => m.userData.part === 'shaft').material;
  assert(shaft('titanium').metalness > .7 && shaft('titanium').color.getHexString() !== shaft('iron').color.getHexString());
  assert(shaft('electrum').color.r > shaft('electrum').color.b + .1, 'a warm pale gold');
  assert(shaft('plastic').metalness === 0 && shaft('plastic').roughness < .4 && shaft('plastic').color.r < .1);
  assert(shaft('bone').metalness === 0 && shaft('bone').color.r > .6);
  assert(wandAppearance('a bone wand') === 'bone' && wandAppearance('2 plastic wands') === 'plastic');
});
