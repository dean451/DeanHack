import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('the warhorse is a barded destrier of its own: bigger than a horse, armoured, on the floor, few draws', () => {
  const war = createCreature({name: 'warhorse', symbol: 117, color: 3}), horse = createCreature({name: 'horse', symbol: 117, color: 3});
  assert.equal(war.g.name, 'warhorse');
  assert.equal(war.legs.length, 4); assert.equal(war.quirk, 'unicorn'); assert(war.tail && war.head);
  let draws = 0, steel = 0;
  war.g.traverse(o => { if (o.isMesh) { draws++; if (o.material.metalness > .5) steel++; for (const v of o.geometry.attributes.position.array) assert(Number.isFinite(v)); } });
  assert(draws <= 16 && steel >= 3, `${draws} draws, ${steel} steel`);
  const box = g => { g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(g); };
  const w = box(war.g), h = box(horse.g), ws = w.getSize(new THREE.Vector3()), hs = h.getSize(new THREE.Vector3());
  assert(Math.abs(w.min.y) < .01, `hooves on the floor (${w.min.y})`);
  assert(ws.y > hs.y && ws.x > hs.x, 'bigger and broader than a horse');
  assert(ws.z < 1.7, `fits near its tile (${ws.z})`);
  assert.equal(createCreature({name: 'pony', symbol: 117, color: 3}).g.name, 'horse', 'ponies keep the horse body');
});
