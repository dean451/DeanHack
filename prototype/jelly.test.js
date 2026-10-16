import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createJelly} from './jelly.js';
import {createCreature} from './creatures.js';

const meshes = g => { const out = []; g.traverse(o => { if (o.isMesh) out.push(o); }); return out; };

test('blue jelly: at most 6 meshes, on its tile, not a sphere with bumps', () => {
  const {g} = createJelly({kind: 'blue'});
  assert.ok(meshes(g).length <= 6);
  const box = new THREE.Box3().setFromObject(g);
  assert.ok(box.min.y >= -1e-3 && box.min.y < .05, 'sits on the floor');
  assert.ok(box.max.x <= .5 && box.min.x >= -.5 && box.max.z <= .5 && box.min.z >= -.5, 'stays on its tile');
  assert.ok(box.max.y < .33, 'low');
});

test('blue jelly keeps the parts jelly-frost.js finds', () => {
  const {body} = createJelly({kind: 'blue'});
  const kids = body.children.filter(m => m.isMesh);
  assert.ok(kids.find(m => m.geometry.type === 'SphereGeometry' && m.material.transparent), 'skin');
  assert.ok(kids.find(m => m.geometry.type === 'SphereGeometry' && !m.material.transparent), 'nucleus');
  assert.ok(kids.some(m => m.geometry.type === 'TubeGeometry'), 'tendril');
});

test('the creature factory builds the blue jelly from jelly.js, not the shared blob', () => {
  const a = createCreature({name: 'blue jelly'});
  assert.ok(a.body.children.some(m => m.userData.part === 'crust'));
});

test('spotted jelly: at most 6 meshes, low, on its tile, with the parts acid-fizz.js finds', () => {
  const {g, body} = createJelly({kind: 'spotted'});
  assert.ok(meshes(g).length <= 6);
  const box = new THREE.Box3().setFromObject(g);
  assert.ok(box.min.y >= -1e-3 && box.min.y < .05 && box.max.y < .33);
  assert.ok(box.max.x <= .5 && box.min.x >= -.5 && box.max.z <= .5 && box.min.z >= -.5);
  const kids = body.children.filter(m => m.isMesh);
  assert.ok(kids.find(m => m.geometry.type === 'SphereGeometry' && m.material.transparent), 'skin');
  assert.ok(kids.find(m => m.geometry.type === 'SphereGeometry' && !m.material.transparent), 'nucleus');
  assert.ok(kids.some(m => m.geometry.type === 'TubeGeometry'), 'tendril');
  assert.ok(kids.some(m => m.userData.part === 'pits') && !kids.some(m => m.userData.part === 'crust'), 'pitted, not iced');
});

test('the creature factory builds the spotted jelly from jelly.js', () => {
  const a = createCreature({name: 'spotted jelly'});
  assert.ok(a.body.children.some(m => m.userData.part === 'pits'));
});

test('spotted jelly: pits differ in size and depth, some run together, with a stain on the floor', () => {
  const {g, body} = createJelly({kind: 'spotted'});
  const pits = g.userData.pits;
  assert.ok(new Set(pits.map(p => p.s)).size === pits.length && Math.max(...pits.map(p => p.s)) > 2.5 * Math.min(...pits.map(p => p.s)));
  assert.ok(new Set(pits.map(p => p.d)).size >= 5, 'depths vary');
  let joined = 0; pits.forEach((a, i) => pits.forEach((b, j) => { if (i < j && Math.hypot(a.x - b.x, a.z - b.z) < a.s + b.s) joined++; }));
  assert.ok(joined >= 2, 'some run together');
  assert.equal(g.userData.slick, 2, 'a slick on the floor');
  const floor = body.children.find(m => m.userData.part === 'pits').geometry.attributes.position;
  let low = 0; for (let i = 0; i < floor.count; i++) if (floor.getY(i) < .01) low++;
  assert.ok(low > 60, 'flat stain geometry lies on the floor');
});
