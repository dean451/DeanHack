import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createFadePrewarm, fadeTwin} from './fade-prewarm.js';
import {applyFade} from './deaths.js';

test('each new piece gets a see-through stand-in once, sharing its geometry and skeleton', () => {
  const root = new THREE.Group(), mat = new THREE.MeshStandardMaterial(), geo = new THREE.BoxGeometry();
  const a = new THREE.Mesh(geo, mat), b = new THREE.Mesh(geo, mat), keep = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());keep.userData.keepOpaque = true;
  const bone = new THREE.Bone(), skinned = new THREE.SkinnedMesh(geo, new THREE.MeshStandardMaterial());skinned.add(bone);skinned.bind(new THREE.Skeleton([bone]));
  root.add(a, b, keep, skinned);a.receiveShadow = true;
  const warm = createFadePrewarm(), group = warm.stage([root]);
  assert.equal(group.children.length, 2, 'one per material, none for a piece that never fades');
  const [s, sk] = group.children;
  assert.equal(s.geometry, geo);assert.ok(s.material.transparent);assert.notEqual(s.material, mat);assert.equal(s.receiveShadow, true);
  assert.ok(sk.isSkinnedMesh && sk.skeleton === skinned.skeleton, 'a skinned piece compiles as skinned');
  assert.equal(warm.stage([root]), null, 'nothing new the second time');
  assert.ok(warm.has(mat));
});

test('the death fade makes exactly the copy that was compiled', () => {
  const m = new THREE.MeshStandardMaterial({color: 0x884422, roughness: .3}), twin = fadeTwin(m);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), m), actor = {g: new THREE.Group()};actor.g.add(mesh);
  applyFade(actor, .5);
  const keyOf = x => JSON.stringify({type: x.type, transparent: x.transparent, side: x.side, vertexColors: x.vertexColors, map: !!x.map, flatShading: x.flatShading, blending: x.blending, alphaTest: x.alphaTest, depthWrite: x.depthWrite});
  assert.equal(keyOf(mesh.material), keyOf(twin), 'same shader settings, so three reuses the compiled program');
});

test('live.js prewarms the fade copies in its warm-up, and deaths.js and ghosting.js use fadeTwin', () => {
  const read = f => readFileSync(new URL(f, import.meta.url), 'utf8');
  assert.match(read('./live.js'), /const fades=fadePrewarm\.stage\(\[hero\.g,\.\.\.\[\.\.\.actors\.values\(\)\]\.map\(a=>a\.g\)\]\);if\(fades\)compileFor\(renderer,warmTarget,\(\)=>renderer\.compileAsync\(fades,camera,scene\)\)/);
  assert.match(read('./deaths.js'), /const m = fadeTwin\(o\.material\);/);
  assert.match(read('./ghosting.js'), /const m = fadeTwin\(o\.material\);/);
});
