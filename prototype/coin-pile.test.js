import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createCoinPile} from './coin-pile.js';
import {liveSource} from './live-source.js';

const pieces = [[-.108,-.066,0,.2,0,.05],[-.042,-.09,0,-.4,0,0],[.036,-.084,0,.7,.04,-.03],[-.06,.006,1,-.6,.08,0],[-.024,-.024,2,.6,0,0]];
const mats = n => Array.from({length: n}, () => new THREE.MeshStandardMaterial());
const yOf = (mesh, n) => { const m = new THREE.Matrix4();mesh.getMatrixAt(n, m);return new THREE.Vector3().setFromMatrixPosition(m).y; };

test('a pile is one instanced draw per coin and stamp material, not two meshes a coin', () => {
  const parent = new THREE.Group(), coinMats = mats(3), stampMats = mats(2);
  const pile = createCoinPile(THREE, parent, {pieces, coinMats, stampMats});
  assert.equal(parent.children.length, 5);
  assert.ok(parent.children.every(o => o.isInstancedMesh && o.castShadow));
  assert.deepEqual(parent.children.map(o => o.count), [2, 2, 1, 3, 2], 'every coin has a disk and a stamp, each in its own material');
  assert.deepEqual(parent.children.map(o => o.material), [...coinMats, ...stampMats]);
  pile.dispose();
});

test('the coins fall, bounce and settle at their layer, the stamp just above the disk', () => {
  const parent = new THREE.Group(), pile = createCoinPile(THREE, parent, {pieces, coinMats: mats(3), stampMats: mats(2)});
  const [disk0, , , stamp0] = parent.children;
  assert.ok(yOf(disk0, 0) > .4, 'it starts in the air');
  let steps = 0;while (!pile.settled && steps++ < 2000) pile.update(1 / 60);
  assert.ok(pile.settled, 'every coin comes to rest');
  assert.ok(Math.abs(yOf(disk0, 0) - .016) < 1e-6, 'a bottom-layer coin rests on the floor');
  assert.ok(Math.abs(yOf(stamp0, 0) - (.016 + .0115)) < 1e-6, 'its stamp sits on its face');
  assert.ok(Math.abs(yOf(parent.children[1], 1) - (.016 + 2 * .017)) < 1e-6, 'the top-layer coin (the fifth: second of the second material) rests two layers up');
  assert.equal(pile.update(1 / 60), false, 'a settled pile writes nothing more');
});

test('live.js builds its gold piles with coin-pile.js and steps them each frame', () => {
  const live = liveSource();
  assert.match(live, /icon\.userData\.coinPile=createCoinPile\(THREE,icon,\{pieces,coinMats,stampMats:coinStampMats\}\)/);
  assert.match(live, /for\(const item of groundItems\.values\(\)\)item\.userData\.coinPile\?\.update\(dt\);/);
  assert.doesNotMatch(live, /new THREE\.CylinderGeometry\(\.046,\.046,\.02,16\)/, 'no mesh per coin');
});
