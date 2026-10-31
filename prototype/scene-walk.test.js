import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {eachObject} from './scene-walk.js';
import {findFlames} from './flame-flicker.js';
import {findGraves} from './grave-mist.js';
import {sitsOut, DungeonAOPass} from './ao-pass.js';

function counted() {
  const scene = new THREE.Scene();let walks = 0;
  const traverse = scene.traverse.bind(scene);scene.traverse = fn => { walks++;traverse(fn); };
  return {scene, walks: () => walks};
}

test('the effects share one walk of the scene per frame', () => {
  const {scene, walks} = counted();
  const flame = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());flame.userData.part = 'flame';
  const grave = new THREE.Group();grave.name = 'Grave';grave.visible = false;
  scene.add(flame, grave);
  assert.deepEqual(findFlames(scene, 1.5), [flame]);
  assert.deepEqual(findGraves(scene, 1.5), [grave], 'a hidden prop is still found, as with a full traverse');
  assert.equal(walks(), 1, 'the second scan of the frame read the first one\'s list');
  findFlames(scene, 2);assert.equal(walks(), 2, 'a new frame walks again');
  const late = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());late.userData.part = 'flame';scene.add(late);
  assert.deepEqual(findFlames(scene, 2.5), [flame, late], 'what was added since is found on the next scan');
});

test('without a frame time the walk is fresh every call', () => {
  const {scene, walks} = counted();
  eachObject(scene, undefined, () => {});eachObject(scene, undefined, () => {});
  assert.equal(walks(), 2);
});

test('the occlusion pass skips hidden subtrees and still hides every see-through thing that is drawn', () => {
  const scene = new THREE.Scene();
  const hidden = new THREE.Group();hidden.visible = false;const underHidden = new THREE.Sprite();hidden.add(underHidden);
  const sprite = new THREE.Sprite(), solid = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial());
  scene.add(hidden, sprite, solid);
  const pass = Object.create(DungeonAOPass.prototype);pass.scene = scene;pass._visibilityCache = [];
  pass._overrideVisibility();
  assert.deepEqual(pass._visibilityCache, [sprite]);
  assert.equal(sprite.visible, false);assert.equal(solid.visible, true);assert.equal(underHidden.visible, true, 'never drawn, never touched');
  assert.ok(sitsOut(underHidden), 'it would sit out if it were drawn');
});
