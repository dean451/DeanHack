// Family K stage 1 step 2: each Kop's arms and legs are on three bones (shoulder or hip, elbow or knee, wrist or
// ankle), the sleeve and trouser skinned along them, the glove, boot and truncheon carried by the last bone.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const MEMBERS = ['keystone kop', 'kop sergeant', 'kop lieutenant', 'kop kaptain'];
const LIMBS = ['lfore', 'rfore', 'lleg1', 'rleg1'];
const build = name => createCreature({name, symbol: 75, color: 4});
const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
const skinOf = joint => joint.children.find(o => o.isSkinnedMesh);
// every vertex of a skinned mesh, posed, in world space
const verts = (m, root) => { root.updateMatrixWorld(true); const p = m.geometry.attributes.position, v = new THREE.Vector3(); return Array.from({length: p.count}, (_, i) => m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld).clone()); };
const meshCount = a => { let n = 0; a.g.traverse(o => { if (o.isMesh) n++; }); return n; };

test('every limb of every kop has three bones in its joint group, named in joints', () => {
  for (const name of MEMBERS) {
    const a = build(name), j = a.joints;
    for (const limb of LIMBS) {
      const skin = skinOf(j[limb]);
      assert(skin, `${name} ${limb}: one skinned mesh on the joint`);
      assert.deepEqual(skin.skeleton.bones.map(b => b.name), [0, 1, 2].map(i => `${limb}_${i}`), `${name} ${limb} bones`);
      for (let i = 0; i < 3; i++) assert.equal(j[`${limb}_${i}`], skin.skeleton.bones[i], `${name} ${limb}_${i} in joints`);
    }
  }
});

test('bending an elbow or a knee bends the limb below it and leaves the part above', () => {
  for (const name of MEMBERS) {
    const a = build(name), j = a.joints;
    for (const limb of LIMBS) {
      const skin = skinOf(j[limb]), w = skin.geometry.attributes.skinWeight, si = skin.geometry.attributes.skinIndex;
      const rest = verts(skin, a.g), ends = j[`${limb}_2`].children.filter(o => o.isMesh || o.isGroup);
      assert(ends.length > 0, `${name} ${limb}: a glove or boot rides the last bone`);
      const endAt = ends.map(o => o.getWorldPosition(new THREE.Vector3()));
      j[`${limb}_1`].rotation.x += .9;
      const now = verts(skin, a.g), endNow = ends.map(o => o.getWorldPosition(new THREE.Vector3()));
      j[`${limb}_1`].rotation.x -= .9;
      let still = 0, bent = 0;
      for (let i = 0; i < rest.length; i++) {
        const onlyFirst = [0, 1, 2, 3].every(k => w.getComponent(i, k) < 1e-6 || si.getComponent(i, k) === 0);
        const d = rest[i].distanceTo(now[i]);
        if (onlyFirst) { assert(d < 1e-6, `${name} ${limb}: a vertex on the upper bone moved`); still++; }
        else if (d > .01) bent++;
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

test('the limbs on bones cost no more meshes than the joints alone (step 1: at most 25)', () => {
  for (const name of MEMBERS) assert(meshCount(build(name)) <= 25, `${name}: ${meshCount(build(name))} meshes`);
});
