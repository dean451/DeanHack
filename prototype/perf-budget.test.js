import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createCreature} from './creatures.js';
import {createGroundModel} from './ground-models.js';
import {sceneCounts} from './render-stats.js';
import {createAltar} from './altar.js';
import {createFountain} from './fountain.js';
import {createThrone} from './throne.js';
import {createSink} from './sink.js';
import {createGrave} from './grave.js';
import {createTree} from './tree.js';
import {createDoor, createBrokenDoor} from './door.js';
import {createStairs} from './stairs.js';
import {createLadder} from './ladder.js';
import {createBars} from './bars.js';
import {createBog} from './bog.js';
import {createDrawbridge} from './drawbridge.js';
import {createBoulder} from './boulder.js';
import {createTrap} from './trap.js';

// A budget for what the models themselves add to a busy level, so detail and effects cannot slowly
// drag the frame rate down. Models carry no lights and no particle layers of their own (lights are
// the live scene's, a few shared torches); draw calls follow meshes and unique materials.
const BUDGET = {
  meshesPerModel: 70, // the heaviest model today has 53
  materialsPerModel: 24, // the heaviest has 18
  busyMeshes: 700, // today 567, // a screenful of 30 mixed monsters
  busyMaterials: 180, // today 142
  meshesPerItem: 16, // the heaviest floor item today has 8
  materialsPerItem: 8, // the heaviest has 5
  meshesPerFeature: 56, // the heaviest terrain feature today (the altar) has 42
  materialsPerFeature: 20, // the heaviest has 14
  instancesPerFeature: 160, // the fountain's droplets: 104
  busyFeatures: 320, // today about 210, // a room of every feature, and every trap once
  busyItems: 160, // today about 80, // a floor strewn with two of each sample item
};

const busy = ['rabid rat', 'wood nymph', 'xan', 'rock mole', 'red dragon', 'balrog', 'goblin', 'hill orc', 'gnome lord',
  'dwarf king', 'soldier ant', 'giant spider', 'cobra', 'jackal', 'kitten', 'floating eye', 'gas spore', 'lich',
  'ghoul', 'zombie', 'wraith', 'vampire lord', 'troll', 'ogre king', 'minotaur', 'cockatrice', 'owlbear',
  'shopkeeper', 'watchman', 'Medusa'];

function build(name) {
  const actor = createCreature({name, symbol: name.charCodeAt(0)});
  const scene = new THREE.Scene();
  scene.add(actor.g);
  let points = 0;
  scene.traverse(o => { if (o.isPoints) points++; });
  return {scene, counts: sceneCounts(scene), points};
}

test('no monster model carries its own lights or particle layers', () => {
  for (const name of busy) {
    const {counts, points} = build(name);
    assert.equal(counts.lights, 0, `${name} adds ${counts.lights} lights`);
    assert.equal(points, 0, `${name} adds ${points} particle layers`);
  }
});

test('every engine monster model stays under the per-model mesh and material caps', () => {
  const src = readFileSync(new URL('../src/monst.c', import.meta.url), 'utf8');
  const names = [...new Set([...src.matchAll(/MON\("([^"]+)",/g)].map(m => m[1]))];
  assert(names.length > 300, 'monst.c should list the engine monsters');
  const over = [];
  for (const name of names) {
    const {counts} = build(name);
    if (counts.meshes > BUDGET.meshesPerModel || counts.materials > BUDGET.materialsPerModel) over.push(`${name} (${counts.meshes} meshes, ${counts.materials} materials)`);
  }
  assert.deepEqual(over, [], 'these models are over the per-model budget; trim them or share materials');
});

test('a busy screenful of monsters stays inside the draw-call budget', () => {
  const scene = new THREE.Scene();
  for (const name of busy) scene.add(createCreature({name, symbol: name.charCodeAt(0)}).g);
  const counts = sceneCounts(scene);
  assert(counts.meshes <= BUDGET.busyMeshes, `${counts.meshes} meshes, budget ${BUDGET.busyMeshes}`);
  assert(counts.materials <= BUDGET.busyMaterials, `${counts.materials} materials, budget ${BUDGET.busyMaterials}`);
  assert.equal(counts.lights, 0);
});

// Floor items: a sample across the classes (weapons are drawn elsewhere, so they are not here).
const items = [['plate mail', 3], ['elven mithril-coat', 3], ['cloak of magic resistance', 3], ['dwarvish iron helm', 3],
  ['small shield', 3], ['ring of fire resistance', 4], ['Amulet of Yendor', 5], ['magic lamp', 6], ['bag of holding', 6],
  ['large box', 6], ['chest', 6], ['unicorn horn', 6], ['crystal ball', 6], ['magic marker', 6], ['drum of earthquake', 6],
  ['Candelabrum of Invocation', 6], ['Bell of Opening', 6], ['food ration', 7], ['slime mold', 7], ['lembas wafer', 7],
  ['tin', 7], ['egg', 7], ['cream pie', 7], ['potion of healing', 8], ['scroll of genocide', 9],
  ['spellbook of force bolt', 10], ['wand of death', 11], ['diamond', 13], ['gray stone', 13], ['wolfsbane', 7]];

test('floor item models stay under the per-item caps and carry no lights or particles', () => {
  for (const [name, cls] of items) {
    const model = createGroundModel({name, class: cls});
    assert(model, `${name} has a ground model`);
    const scene = new THREE.Scene();
    scene.add(model);
    const counts = sceneCounts(scene);
    let points = 0;
    scene.traverse(o => { if (o.isPoints) points++; });
    assert(counts.meshes <= BUDGET.meshesPerItem, `${name}: ${counts.meshes} meshes, budget ${BUDGET.meshesPerItem}`);
    assert(counts.materials <= BUDGET.materialsPerItem, `${name}: ${counts.materials} materials, budget ${BUDGET.materialsPerItem}`);
    assert.equal(counts.lights, 0, `${name} adds lights`);
    assert.equal(points, 0, `${name} adds particle layers`);
  }
});

test('a floor strewn with items stays inside the draw-call budget', () => {
  const scene = new THREE.Scene();
  for (let pass = 0; pass < 2; pass++) for (const [name, cls] of items) scene.add(createGroundModel({name, class: cls}));
  const counts = sceneCounts(scene);
  assert(counts.meshes <= BUDGET.busyItems, `${counts.meshes} meshes, budget ${BUDGET.busyItems}`);
});

// Terrain features: one of each, plus every trap kind, which is more than any screen shows at once.
const TRAPS = ['pit', 'barepit', 'hatch', 'hole', 'arrow', 'dart', 'squeaky', 'gas', 'jaws', 'mine', 'rubble', 'rolling',
  'statue', 'rust', 'fire', 'antimagic', 'polymorph', 'ice', 'portal', 'web', 'magic', 'sleeping', 'teleport'];
const features = {
  altar: createAltar, fountain: createFountain, throne: createThrone, sink: createSink, grave: createGrave,
  tree: createTree, door: createDoor, 'broken door': createBrokenDoor, 'stairs up': () => createStairs('up'),
  'stairs down': () => createStairs('down'), 'ladder up': () => createLadder('up'), 'ladder down': () => createLadder('down'),
  bars: createBars, bog: createBog, 'drawbridge up': () => createDrawbridge(true),
  'drawbridge down': () => createDrawbridge(false), boulder: createBoulder,
};
for (const kind of TRAPS) features[`${kind} trap`] = () => createTrap(kind);

test('terrain feature models stay under the per-feature caps and carry no lights or particles', () => {
  for (const [name, make] of Object.entries(features)) {
    const scene = new THREE.Scene();
    scene.add(make());
    const counts = sceneCounts(scene);
    let points = 0;
    scene.traverse(o => { if (o.isPoints) points++; });
    assert(counts.meshes <= BUDGET.meshesPerFeature, `${name}: ${counts.meshes} meshes, budget ${BUDGET.meshesPerFeature}`);
    assert(counts.materials <= BUDGET.materialsPerFeature, `${name}: ${counts.materials} materials, budget ${BUDGET.materialsPerFeature}`);
    assert(counts.instances <= BUDGET.instancesPerFeature, `${name}: ${counts.instances} instances, budget ${BUDGET.instancesPerFeature}`);
    assert.equal(counts.lights, 0, `${name} adds lights`);
    assert.equal(points, 0, `${name} adds particle layers`);
  }
});

test('a room of every terrain feature stays inside the draw-call budget', () => {
  const scene = new THREE.Scene();
  for (const make of Object.values(features)) scene.add(make());
  const counts = sceneCounts(scene);
  assert(counts.meshes <= BUDGET.busyFeatures, `${counts.meshes} meshes, budget ${BUDGET.busyFeatures}`);
});
