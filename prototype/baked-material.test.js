import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BakedMaterial, bakeable, bakeKey, bakeInto, bakedMaterialFor, withIndex, convertInPlace} from './baked-material.js';
import {createCreature} from './creatures.js';
import {deathLook} from './deaths.js';

// baked-material.js: a model's plain materials bake into vertex colour, roughness and
// metalness so mergeStatic can merge across materials (one draw per body part). The leprechaun
// opted in first: a hall of twenty is a known drag.
test('plain opaque standard materials are bakeable; glow, maps, transparency and vertex colours are not', () => {
  assert.ok(bakeable(new THREE.MeshStandardMaterial({color: '#2f8a3a', roughness: .85})));
  assert.ok(bakeable(new THREE.MeshStandardMaterial({color: '#e0b83a', metalness: .85, roughness: .25})));
  assert.ok(!bakeable(new THREE.MeshStandardMaterial({emissive: '#4ac02a', emissiveIntensity: 1.4})));
  assert.ok(!bakeable(new THREE.MeshStandardMaterial({transparent: true, opacity: .5})));
  assert.ok(!bakeable(new THREE.MeshStandardMaterial({vertexColors: true})));
  assert.ok(!bakeable(new THREE.MeshStandardMaterial({map: new THREE.Texture()})));
  assert.ok(!bakeable(new THREE.MeshBasicMaterial()));
  assert.ok(!bakeable(new BakedMaterial()));
  // flat-shaded and double-sided pieces merge among themselves, not with the rest
  assert.notEqual(bakeKey(new THREE.MeshStandardMaterial({flatShading: true})), bakeKey(new THREE.MeshStandardMaterial()));
  assert.notEqual(bakeKey(new THREE.MeshStandardMaterial({side: THREE.DoubleSide})), bakeKey(new THREE.MeshStandardMaterial()));
  assert.equal(bakedMaterialFor(new THREE.MeshStandardMaterial({color: 'red'})), bakedMaterialFor(new THREE.MeshStandardMaterial({color: 'blue', roughness: .2})));
});

test('baking writes the material colour, roughness and metalness into every vertex', () => {
  const geo = bakeInto(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({color: '#ff0000', roughness: .3, metalness: .7}));
  const color = geo.getAttribute('color'), rm = geo.getAttribute('rm');
  assert.equal(color.count, geo.attributes.position.count); assert.equal(rm.count, color.count);
  assert.deepEqual([color.getX(5), color.getY(5), color.getZ(5)], [1, 0, 0]);
  assert.equal(+rm.getX(5).toFixed(2), .3); assert.equal(+rm.getY(5).toFixed(2), .7);
});

test('the baked material reads roughness and metalness per vertex only while vertex colours are on, and clone() keeps the hook', () => {
  const m = new BakedMaterial(), shader = {vertexShader: '#include <color_pars_vertex>\n#include <color_vertex>', fragmentShader: '#include <color_pars_fragment>\n#include <roughnessmap_fragment>\n#include <metalnessmap_fragment>'};
  m.onBeforeCompile(shader);
  assert.match(shader.vertexShader, /attribute vec2 rm;/); assert.match(shader.vertexShader, /vRM = rm;/);
  assert.match(shader.fragmentShader, /#ifdef USE_COLOR\nroughnessFactor = vRM\.x;/); assert.match(shader.fragmentShader, /#ifdef USE_COLOR\nmetalnessFactor = vRM\.y;/);
  assert.ok(m.vertexColors); assert.equal(m.color.getHexString(), 'ffffff');
  const c = m.clone();
  assert.ok(c.isBakedMaterial); assert.equal(c.onBeforeCompile, BakedMaterial.prototype.onBeforeCompile); assert.equal(c.customProgramCacheKey(), 'baked');
  // a clone that drops vertex colours (petrify.js once stone) is a plain grey, not black metal
  c.vertexColors = false;
  assert.equal(c.metalness, 0); assert.ok(c.roughness > .8);
});

test('the leprechaun bakes to about a dozen meshes and keeps its coat colour for the death burst', () => {
  const a = createCreature({name: 'leprechaun', symbol: 108, color: 2});
  let meshes = 0; const baked = [];
  a.g.traverse(o => { if (o.isMesh) { meshes++; if (o.material.isBakedMaterial) baked.push(o); } });
  assert.ok(meshes <= 12, `leprechaun draws ${meshes}`);
  assert.ok(baked.length >= 5, 'one baked mesh per body part');
  for (const o of baked) {
    assert.ok(o.geometry.getAttribute('color') && o.geometry.getAttribute('rm'), 'baked attributes');
    assert.ok(Array.isArray(o.userData.color), 'the merged mesh remembers its biggest piece\'s colour');
  }
  // the animated parts the coin flip moves are still separate groups
  assert.ok(a.head && a.hat && a.loot && a.body && a.legs.length === 2);
  // glowing eyes and the pipe ember keep their own emissive materials
  assert.ok(baked.every(o => o.material.emissive.getHex() === 0));
  const look = deathLook(a);
  const coat = new THREE.Color('#2f8a3a');
  assert.ok(look.color && Math.abs(look.color[1] - coat.g) < .02 && look.color[1] > look.color[0], 'the burst is coat green, not white');
});

test('an unindexed part gets a plain index, no welding, so it can join a batch cheaply', () => {
  const g = new THREE.BoxGeometry().toNonIndexed(), n = g.attributes.position.count;
  withIndex(g);
  assert.equal(g.index.count, n); assert.equal(g.index.getX(n - 1), n - 1);
  assert.equal(withIndex(g), g, 'already indexed: untouched');
  const mesh = new THREE.Mesh(new THREE.BoxGeometry().toNonIndexed(), new THREE.MeshStandardMaterial({color: 'red'}));
  mesh.castShadow = mesh.receiveShadow = true;
  assert.ok(convertInPlace(mesh)); assert.ok(mesh.geometry.index && mesh.geometry.attributes.rm);
});
