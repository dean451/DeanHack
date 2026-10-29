import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('the floating eye is a bloodshot, wet, lidless eyeball with an iris and trailing nerves, in few draws', () => {
  const e = createCreature({name: 'floating eye', symbol: 101, color: 4});
  assert.equal(e.quirk, 'hover');
  assert.ok(e.head && e.pupil, 'glance.js rolls `head` and the pupil dilates');
  const parts = []; e.g.traverse(o => { if (o.isMesh) parts.push(o.userData.part); });
  for (const need of ['ball', 'iris', 'pupil', 'flesh']) assert(parts.includes(need), need);
  assert(parts.length <= 6, `${parts.length} draws`);
  let verts = 0; e.g.traverse(o => { if (o.isMesh) verts += o.geometry.attributes.position.count; });
  assert(verts > 3000, 'veins and nerves are real geometry');
  const b = new THREE.Box3().setFromObject(e.g), size = b.getSize(new THREE.Vector3());
  assert(Number.isFinite(size.x) && size.x < 1 && size.y < 1.1 && size.z < 1, JSON.stringify(size));
});

test('nothing sits on the floating eye\'s crown: no lids, caps or rims read as a hat', () => {
  const e = createCreature({name: 'floating eye', symbol: 101, color: 4});
  const meshes = []; e.g.traverse(o => { if (o.isMesh) meshes.push(o); });
  assert(!meshes.some(m => /lid|cap|rim|crest|hat/.test(m.userData.part || '')), meshes.map(m => m.userData.part).join());
  const ball = meshes.find(m => m.userData.part === 'ball'), flesh = meshes.find(m => m.userData.part === 'flesh');
  ball.geometry.computeBoundingBox(); flesh.geometry.computeBoundingBox();
  const centre = ball.geometry.boundingBox.getCenter(new THREE.Vector3()).y, radius = ball.geometry.boundingBox.max.y - centre;
  // The nerve stump and its strands hang from the back and underside, well below the ball's middle.
  assert(flesh.geometry.boundingBox.max.y < centre - radius * .3, `flesh reaches ${flesh.geometry.boundingBox.max.y}, ball centre ${centre}`);
  // So the top of the model is the bare ball itself.
  e.g.updateMatrixWorld(true);
  const top = new THREE.Box3().setFromObject(e.g).max.y, ballTop = new THREE.Box3().setFromObject(ball).max.y;
  assert(top <= ballTop + .01, `something stands ${top - ballTop} over the ball`);
  // The strands trail behind (-z) the iris, which looks forward (+z).
  assert(flesh.geometry.boundingBox.min.z < -.2 && flesh.geometry.boundingBox.max.z < .1);
});
