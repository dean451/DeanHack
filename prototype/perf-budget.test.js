import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createCreature} from './creatures.js';
import {sceneCounts} from './render-stats.js';

// A budget for what the models themselves add to a busy level, so detail and effects cannot slowly
// drag the frame rate down. Models carry no lights and no particle layers of their own (lights are
// the live scene's, a few shared torches); draw calls follow meshes and unique materials.
const BUDGET = {
  meshesPerModel: 70, // the heaviest model today has 53
  materialsPerModel: 24, // the heaviest has 18
  busyMeshes: 700, // today 567, // a screenful of 30 mixed monsters
  busyMaterials: 180, // today 142
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
