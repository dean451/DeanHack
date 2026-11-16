// Family R stage 1 step 3: the rust monster's and the disenchanter's tail is one SkinnedMesh on the chain
// `tail0`..`tail4` under the `tail` pivot, the vane riding `tail4`, and the carapace (with the disenchanter's
// glowing seams) is skinned on the spine `spine0` (chest) > `spine1` > `spine2` (loins), the head and fore legs on
// spine0, the hind legs and the tail on spine2. Bending a joint moves what lies past it and nothing before it.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const NAMES = ['rust monster', 'disenchanter'];
const build = name => createCreature({name, symbol: 82, color: 3});
// every vertex of a skinned mesh in the world as drawn now, with the weight it gives the bones in `past`
const verts = (g, mesh, past = []) => {
  g.updateMatrixWorld(true);
  const v = new THREE.Vector3(), si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight, out = [];
  const idx = past.map(b => mesh.skeleton.bones.indexOf(b));
  for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
    mesh.getVertexPosition(i, v);
    let w = 0; for (let k = 0; k < 4; k++) if (idx.includes(si.getComponent(i, k))) w += sw.getComponent(i, k);
    out.push([v.clone().applyMatrix4(mesh.matrixWorld), w]);
  }
  return out;
};
const at = o => { o.updateWorldMatrix(true, false); return o.getWorldPosition(new THREE.Vector3()); };
const skins = a => { const m = []; a.body.children.forEach(o => { if (o.isSkinnedMesh) m.push(o); }); return m; };

test('the tail is one skin on five nested bones under the tail pivot, the vane on the tip', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints, bones = [0, 1, 2, 3, 4].map(i => j['tail' + i]);
    const mesh = a.tail.children.find(o => o.isSkinnedMesh);
    assert(mesh && a.tail.children.filter(o => o.isMesh).length === 1, `${name}: one tail skin under the pivot`);
    assert.deepEqual(mesh.skeleton.bones, bones, `${name}: the skin rides tail0..tail4`);
    bones.forEach((b, i) => { assert(b.isBone && b.name === 'tail' + i); if (i) assert(b.parent === bones[i - 1], `${name} tail${i} nested`); });
    // the chain runs back from the rump, each bone behind the last, the vane just past the tip
    for (let i = 1; i < 5; i++) assert(a.tail.worldToLocal(at(bones[i])).z < a.tail.worldToLocal(at(bones[i - 1])).z - .04, `${name} tail${i} behind`);
    assert(a.vane.parent === bones[4], `${name}: the vane rides tail4`);
  }
});

test('bending a tail joint moves the tail past it and the vane, leaves the tail before it, and returns exactly', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints, mesh = a.tail.children.find(o => o.isSkinnedMesh);
    const joint = j.tail2, past = [j.tail3, j.tail4], vane = at(a.vane), rest = verts(a.g, mesh, [j.tail2, ...past]);
    joint.rotation.y += .8;
    const now = verts(a.g, mesh);
    let tip = 0;
    rest.forEach(([p, w], i) => {
      const d = p.distanceTo(now[i][0]);
      if (w === 0) assert(d < 1e-6, `${name}: a vertex before tail2 moved ${d}`);
      if (w > .99 && d > .01) tip++;
    });
    assert(tip > 10, `${name}: the tail past tail2 moved (${tip})`);
    assert(at(a.vane).distanceTo(vane) > .03, `${name}: the vane followed the bend`);
    joint.rotation.y -= .8;
    verts(a.g, mesh).forEach(([p], i) => assert(p.distanceTo(rest[i][0]) < 1e-9, `${name}: the tail returns exactly`));
    assert(at(a.vane).distanceTo(vane) < 1e-9, `${name}: the vane returns exactly`);
  }
});

test('the carapace rides the spine: the head and fore legs on the chest, the hind legs and tail on the loins', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints, spine = [j.spine0, j.spine1, j.spine2];
    assert(spine[0].parent === a.body && spine[1].parent === spine[0] && spine[2].parent === spine[1], `${name}: spine0 > spine1 > spine2`);
    const hide = skins(a);
    assert.deepEqual(hide.map(m => m.userData.part), name === 'disenchanter' ? ['body', 'seams'] : ['body'], `${name}: the hide's parts`);
    for (const m of hide) assert.deepEqual(m.skeleton.bones, spine, `${name} ${m.userData.part}: on the spine`);
    assert(a.head.parent === spine[0] && j.lleg0.parent === spine[0] && j.rleg0.parent === spine[0], `${name}: head and fore legs on the chest`);
    assert(a.tail.parent === spine[2] && j.lleg1.parent === spine[2] && j.rleg1.parent === spine[2], `${name}: tail and hind legs on the loins`);
    // front to back along the body
    assert(a.body.worldToLocal(at(spine[0])).z > a.body.worldToLocal(at(spine[1])).z && a.body.worldToLocal(at(spine[1])).z > a.body.worldToLocal(at(spine[2])).z, `${name}: chest ahead of the loins`);
  }
});

test('bending the back moves the loins, hind legs and tail, leaves the chest, head and fore legs, and returns exactly', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints, hide = skins(a);
    const still = [a.head, j.lleg0, j.rleg0, ...a.feelers], carried = [a.tail, a.vane, j.lleg1, j.rleg1];
    const rest = hide.map(m => verts(a.g, m, [j.spine1, j.spine2])), stillAt = still.map(at), carriedAt = carried.map(at);
    j.spine1.rotation.x += .4;
    let back = 0;
    hide.forEach((m, k) => verts(a.g, m).forEach(([p], i) => {
      const [p0, w] = rest[k][i], d = p.distanceTo(p0);
      if (w === 0) assert(d < 1e-6, `${name} ${m.userData.part}: a vertex on the chest alone moved ${d}`);
      if (w > .99 && d > .01) back++;
    }));
    assert(back > 50, `${name}: the back half of the carapace moved (${back})`);
    still.forEach((o, i) => assert(at(o).distanceTo(stillAt[i]) < 1e-9, `${name}: bending the back moved ${o.name || o.userData.part}`));
    carried.forEach((o, i) => assert(at(o).distanceTo(carriedAt[i]) > .01, `${name}: bending the back left ${o.name} behind`));
    j.spine1.rotation.x -= .4;
    hide.forEach((m, k) => verts(a.g, m).forEach(([p], i) => assert(p.distanceTo(rest[k][i][0]) < 1e-9, `${name}: the carapace returns exactly`)));
    carried.forEach((o, i) => assert(at(o).distanceTo(carriedAt[i]) < 1e-9, `${name}: ${o.name} returns exactly`));
  }
});
