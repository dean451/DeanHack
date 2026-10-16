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
