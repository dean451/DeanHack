// Family K stage 1 step 2: each Kop's arms and legs are on three bones (shoulder or hip, elbow or knee, wrist or
// ankle), the sleeve and trouser skinned along them, the glove, boot and truncheon carried by the last bone. Since
// step 3 the limbs' skins are merged with the trunk into one hide; the bones stay under each limb's joint group.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const MEMBERS = ['keystone kop', 'kop sergeant', 'kop lieutenant', 'kop kaptain'];
const LIMBS = ['lfore', 'rfore', 'lleg1', 'rleg1'];
const build = name => createCreature({name, symbol: 75, color: 4});
const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
const hideOf = a => { const m = []; a.g.traverse(o => { if (o.isSkinnedMesh) m.push(o); }); assert.equal(m.length, 1, 'one hide'); return m[0]; };
// each vertex's weight on bones under `root`
const shareOn = (m, root) => { const bones = m.skeleton.bones, si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
  return Array.from({length: si.count}, (_, i) => { let w = 0; for (let k = 0; k < 4; k++) if (under(bones[si.getComponent(i, k)], root)) w += sw.getComponent(i, k); return w; }); };
// every vertex of a skinned mesh, posed, in world space
const verts = (m, root) => { root.updateMatrixWorld(true); const p = m.geometry.attributes.position, v = new THREE.Vector3(); return Array.from({length: p.count}, (_, i) => m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld).clone()); };
const meshCount = a => { let n = 0; a.g.traverse(o => { if (o.isMesh) n++; }); return n; };

test('every limb of every kop has three bones in its joint group, named in joints', () => {
  for (const name of MEMBERS) {
    const a = build(name), j = a.joints, skin = hideOf(a);
    for (const limb of LIMBS) {
      for (let i = 0; i < 3; i++) {
        const b = j[`${limb}_${i}`];
        assert(b?.isBone && skin.skeleton.bones.includes(b), `${name} ${limb}_${i}: a bone of the hide, in joints`);
        assert(under(b, j[limb]) && b.parent === (i ? j[`${limb}_${i - 1}`] : j[limb]), `${name} ${limb}_${i} chained under the joint`);
      }
    }
  }
});

test('bending an elbow or a knee bends the limb below it and leaves the part above', () => {
  for (const name of MEMBERS) {
    const a = build(name), j = a.joints;
    for (const limb of LIMBS) {
      const skin = hideOf(a), share = shareOn(skin, j[`${limb}_1`]);
      const rest = verts(skin, a.g), ends = j[`${limb}_2`].children.filter(o => o.isMesh || o.isGroup);
      assert(ends.length > 0, `${name} ${limb}: a glove or boot rides the last bone`);
      const endAt = ends.map(o => o.getWorldPosition(new THREE.Vector3()));
      j[`${limb}_1`].rotation.x += .9;
      const now = verts(skin, a.g), endNow = ends.map(o => o.getWorldPosition(new THREE.Vector3()));
      j[`${limb}_1`].rotation.x -= .9;
      let still = 0, bent = 0;
      for (let i = 0; i < rest.length; i++) {
        const d = rest[i].distanceTo(now[i]);
        if (share[i] === 0) { assert(d < 1e-6, `${name} ${limb}: a vertex not on the lower bones moved`); still++; }
        else if (share[i] > .5 && d > .01) bent++;
      }
      assert(still > 0 && bent > 0, `${name} ${limb}: ${still} still, ${bent} bent`);
      endAt.forEach((p, k) => assert(p.distanceTo(endNow[k]) > .03, `${name} ${limb}: the end piece follows the bend`));
    }
  }
});

test('the truncheon rides the right wrist, so a bent elbow swings it', () => {
  for (const name of MEMBERS) {
    const a = build(name), j = a.joints;
    assert.equal(a.tail.parent, j.rfore_2, name + ': the truncheon hangs on rfore_2');
    a.g.updateMatrixWorld(true);
    const fist = j.rfore_2.getWorldPosition(new THREE.Vector3()), at = a.tail.getWorldPosition(new THREE.Vector3());
    assert(fist.distanceTo(at) < 1e-6, name + ': gripped at the fist');
    const tip = new THREE.Vector3(-.06, .2, -.03), before = a.tail.localToWorld(tip.clone());
    j.rfore_1.rotation.z += .6; a.g.updateMatrixWorld(true);
    const after = a.tail.localToWorld(tip.clone()); j.rfore_1.rotation.z -= .6;
    assert(after.distanceTo(before) > .05, name + ': the truncheon follows the elbow');
  }
});

test('the sergeant\'s chevrons ride the upper arm bones', () => {
  const a = build('kop sergeant'), j = a.joints;
  for (const side of ['l', 'r']) {
    // (the three chevrons share the brass, so the build merges them into one mesh on the bone)
    const bone = j[side + 'fore_0'], chevrons = bone.children.filter(o => o.isMesh);
    assert(chevrons.length >= 1, side + ': the chevrons hang on the upper arm bone');
    assert(chevrons.every(c => under(c, j[side + 'fore'])), side + ': on the arm');
    a.g.updateMatrixWorld(true);
    const box = new THREE.Box3(); for (const c of chevrons) box.expandByObject(c, true);
    assert(box.max.y - box.min.y > .05, side + ': all three chevrons, stacked down the sleeve');
    const before = box.getCenter(new THREE.Vector3());
    bone.rotation.z += .5; a.g.updateMatrixWorld(true);
    const after = new THREE.Box3(); for (const c of chevrons) after.expandByObject(c, true); bone.rotation.z -= .5;
    assert(after.getCenter(new THREE.Vector3()).distanceTo(before) > .02, side + ': the chevrons follow the shoulder bone');
  }
});

test('the limbs and trunk on bones cost no more meshes than the joints alone (step 1: at most 25; one hide since step 3: at most 22)', () => {
  for (const name of MEMBERS) assert(meshCount(build(name)) <= 22, `${name}: ${meshCount(build(name))} meshes`);
});
