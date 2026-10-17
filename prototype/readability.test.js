import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
// readability.js paints its disposition rings on a canvas at import; a stand-in context is enough here.
globalThis.document ??= {createElement: () => ({width: 0, height: 0, getContext: () => new Proxy({}, {get: (t, k) => k in t ? t[k] : () => {}, set: (t, k, v) => { t[k] = v; return true; }})})};
const {stageCreature, addOutlines} = await import('./readability.js');
const {createSkinnedFeline} = await import('./feline-skin.js');

test('a skinned mesh gets a skinned outline hull on its own skeleton, so the ink follows the animation instead of standing in the bind pose', () => {
  const a = createSkinnedFeline('kitten');
  stageCreature(a.g, {disposition: 'pet'});
  const hulls = [];
  a.g.traverse(o => { if (o.userData.outline) hulls.push(o); });
  assert.ok(hulls.length >= 1, 'the fur is outlined');
  for (const hull of hulls) {
    assert.ok(hull.parent.isSkinnedMesh, 'the hull hangs off the skinned mesh');
    assert.ok(hull.isSkinnedMesh, 'and is skinned itself');
    assert.equal(hull.skeleton, hull.parent.skeleton, 'on the same bones');
    assert.equal(hull.bindMode, hull.parent.bindMode);
    assert.ok(hull.bindMatrix.equals(hull.parent.bindMatrix), 'with the same bind matrix');
    assert.match(hull.material.vertexShader, /skinning_vertex/, 'the outline shader skins its vertices');
  }
});

test('a rigid mesh keeps a plain hull', () => {
  const g = new THREE.Group(), m = new THREE.Mesh(new THREE.SphereGeometry(.2, 8, 6), new THREE.MeshStandardMaterial()); g.add(m);
  addOutlines(g);
  const hull = m.children.find(c => c.userData.outline);
  assert.ok(hull && !hull.isSkinnedMesh);
});
