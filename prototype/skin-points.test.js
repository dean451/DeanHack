import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createKobold} from './kobold.js';
import {createCreature} from './creatures.js';
import {skinSampler, lowestY} from './skin-points.js';

const skinsOf = a => { const out = [];a.g.traverse(o => { if (o.isSkinnedMesh) out.push(o); });return out; };
// a bent pose, so every bone's matrix is far from its rest
const bend = a => { let k = 0;for (const o of Object.values(a.joints)) { o.rotation.x += .3 * Math.sin(++k);o.rotation.z += .2 * Math.cos(k); }a.g.position.set(.4, -.1, .7);a.g.updateMatrixWorld(true); };

test('the skin samples are exactly three\'s own getVertexPosition, not just close', () => {
  for (const a of [createKobold('kobold shaman'), createCreature({name: 'gnome mummy', symbol: 77, color: 7})]) {
    bend(a);
    const skins = skinsOf(a);assert.ok(skins.length > 0);
    const mine = skinSampler(skins, 5)(), v = new THREE.Vector3(), theirs = [];
    for (const m of skins) { m.updateMatrixWorld(true);m.skeleton.update();for (let i = 0; i < m.geometry.attributes.position.count; i += 5) theirs.push(m.getVertexPosition(i, v).clone().applyMatrix4(m.matrixWorld)); }
    assert.equal(mine.length, theirs.length);
    mine.forEach((p, i) => assert.ok(p.x === theirs[i].x && p.y === theirs[i].y && p.z === theirs[i].z, `sample ${i}`));
  }
});

test('the lowest point is exactly three\'s precise box, for the whole body and for each limb', () => {
  const a = createKobold('large kobold');bend(a);
  for (const g of [a.g, ...Object.values(a.joints)]) assert.equal(lowestY(g), new THREE.Box3().setFromObject(g, true).min.y);
  const box = new THREE.Group();box.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1)));box.position.y = 3;box.updateMatrixWorld(true);
  assert.equal(lowestY(box), 2, 'a plain mesh');assert.equal(lowestY(new THREE.Group()), Infinity, 'nothing in it');
});

test('the pose solvers read the skin through it', async () => {
  const {readFileSync} = await import('node:fs');
  for (const f of ['imp-rest.js', 'mummy-lurch.js', 'gnome-waddle.js', 'goblin-snarl.js', 'humanoid-ambush.js', 'humanoid-brace.js', 'humanoid-rest.js', 'gargoyle-rest.js']) {
    const src = readFileSync(new URL(`./${f}`, import.meta.url), 'utf8');
    assert.match(src, /goal\.clear\(skinSampler\(/, f);assert.doesNotMatch(src, /getVertexPosition\(i, v\)\.clone\(\)|new THREE\.Box3\(\)\.setFromObject\(group, true\)/, f);
  }
});
