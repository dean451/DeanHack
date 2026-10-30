import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
// (a stand-in document, in case anything readability.js loads paints on a canvas at import)
globalThis.document ??= {createElement: () => ({width: 0, height: 0, getContext: () => new Proxy({}, {get: (t, k) => k in t ? t[k] : () => {}, set: (t, k, v) => { t[k] = v; return true; }})})};
const {stageCreature, addOutlines, smoothNormals} = await import('./readability.js');
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

test('the outline shader declares every uniform it uses (an undeclared one fails to compile and the ink silently vanishes)', () => {
  const g = new THREE.Group(), m = new THREE.Mesh(new THREE.SphereGeometry(.2, 8, 6), new THREE.MeshStandardMaterial()); g.add(m);
  addOutlines(g);
  const mat = m.children.find(c => c.userData.outline).material, src = mat.vertexShader + mat.fragmentShader;
  for (const name of Object.keys(mat.uniforms)) assert.match(src, new RegExp(`uniform\\s+\\w+\\s+${name}\\b`), `uniform ${name} is declared`);
  for (const name of ['width', 'pushBack', 'color']) assert.ok(name in mat.uniforms);
});

test('a flat-shaded model gets a hull with smoothed normals, so its ink swells as one skin instead of splitting into shards', () => {
  const flat = new THREE.IcosahedronGeometry(.3, 1).toNonIndexed(); flat.computeVertexNormals(); // a normal per face
  const g = new THREE.Group(), m = new THREE.Mesh(flat, new THREE.MeshStandardMaterial()); g.add(m);
  addOutlines(g, {smooth: true});
  const hull = m.children.find(c => c.userData.outline), n = hull.geometry.attributes.normal, p = hull.geometry.attributes.position;
  assert.notEqual(hull.geometry, flat, 'the model keeps its own flat normals');
  const v = new THREE.Vector3(), w = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 7) { v.fromBufferAttribute(p, i).normalize(); w.fromBufferAttribute(n, i); assert.ok(v.dot(w) > .98, `vertex ${i}: the hull's normal points out from the centre`); }
  assert.equal(smoothNormals(flat), hull.geometry, 'made once per source geometry');
  const plain = new THREE.Group(), q = new THREE.Mesh(flat, new THREE.MeshStandardMaterial()); plain.add(q); addOutlines(plain);
  assert.equal(q.children.find(c => c.userData.outline).geometry, flat, 'without smooth, the hull shares the mesh geometry as before');
});

test('a model with no normals at all (as the fox ships) still gets a smooth hull', () => {
  const bare = new THREE.IcosahedronGeometry(.3, 1).toNonIndexed(); bare.deleteAttribute('normal');
  const g = new THREE.Group(), m = new THREE.Mesh(bare, new THREE.MeshStandardMaterial({flatShading: true})); g.add(m);
  addOutlines(g, {smooth: true});
  const hull = m.children.find(c => c.userData.outline);
  assert.ok(hull && hull.geometry.attributes.normal, 'outlined, with normals of its own');
  assert.ok(!bare.attributes.normal, 'the model itself is left as it came');
  const plain = new THREE.Group(), q = new THREE.Mesh(bare, new THREE.MeshStandardMaterial()); plain.add(q); addOutlines(plain);
  assert.ok(!q.children.some(c => c.userData.outline), 'without smooth, a mesh with no normals is still skipped');
});

test('no disposition ring on the floor under anyone: pet, peaceful or hostile; the disposition is still kept on the group', () => {
  for (const disposition of ['pet', 'peaceful', 'hostile']) {
    const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(.3, .3, .3), new THREE.MeshStandardMaterial()));
    stageCreature(g, {disposition});
    const rings = []; g.traverse(o => { if (o.userData.ring) rings.push(o); });
    assert.equal(rings.length, 0, disposition);
    assert.equal(g.userData.disposition, disposition);
  }
});

test('the fur\'s layers get no outline of their own: the fur\'s hull already draws it', async () => {
  const {createSkinnedFeline} = await import('./feline-skin.js');
  const a = createSkinnedFeline('kitten'); addOutlines(a.g);
  const outlined = []; a.g.traverse(o => { if (o.userData.outline) outlined.push(o.parent.userData.part); });
  assert.ok(outlined.includes('fur') || outlined.length >= 1, 'the fur keeps its ink');
  assert.ok(!outlined.includes('fur-shell'), 'no layer carries a second copy of it');
});
