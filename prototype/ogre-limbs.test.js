// Family O stage 1 step 2: each ogre's arms and legs are on three bones (shoulder or hip, elbow or knee, wrist or
// ankle), every piece of the limb skinned along them, and the club carried by the right wrist bone.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const NAMES = ['ogre', 'ogre lord', 'ogre king', 'unknown O'];
const LIMBS = ['lfore', 'rfore', 'lleg1', 'rleg1'];
const build = name => createCreature({name, symbol: 79, color: 1});
const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
const skinsOf = (a, root) => { const m = []; root.traverse(o => { if (o.isSkinnedMesh) m.push(o); }); return m; };
// each vertex's weight on bones under `root`
const shareOn = (m, root) => { const bones = m.skeleton.bones, si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
  return Array.from({length: si.count}, (_, i) => { let w = 0; for (let k = 0; k < 4; k++) if (under(bones[si.getComponent(i, k)], root)) w += sw.getComponent(i, k); return w; }); };
const verts = (m, root) => { root.updateMatrixWorld(true); const p = m.geometry.attributes.position, v = new THREE.Vector3(); return Array.from({length: p.count}, (_, i) => m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld).clone()); };
const boxOf = o => new THREE.Box3().setFromObject(o, true);

test('every limb of every ogre has three bones chained in its joint group, named in joints, and is skinned on them', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints;
    for (const limb of LIMBS) {
      for (let i = 0; i < 3; i++) {
        const b = j[`${limb}_${i}`];
        assert(b?.isBone, `${name} ${limb}_${i} is a bone in joints`);
        // (the root bone hangs under the limb's first skinned mesh, inside the joint group)
        assert(i ? b.parent === j[`${limb}_${i - 1}`] : under(b, j[limb]), `${name} ${limb}_${i} chained under the joint`);
      }
      const skins = skinsOf(a, j[limb]);
      assert(skins.length >= 2, `${name} ${limb}: the skin and the boot or fist are skinned`);
      for (const m of skins) assert(m.skeleton.bones.includes(j[`${limb}_0`]), `${name} ${limb}: on the limb's bones`);
      assert.equal(j[limb].children.filter(o => o.isMesh && !o.isSkinnedMesh).length, 0, `${name} ${limb}: no plain piece left on the joint`);
    }
    // the elbow and knee sit between the shoulder or hip and the wrist or ankle, downward
    for (const limb of LIMBS) assert(j[`${limb}_1`].position.y < 0 && j[`${limb}_2`].position.y < 0, `${name} ${limb}: bones run down the limb`);
  }
});

test('bending an elbow or a knee bends the limb below it and leaves the part above', () => {
  // (skinChain blends each vertex between the two bones of its segment by its place along it, so the upper arm or
  // thigh eases into the bend: vertices with no weight below the elbow or knee stay exactly put, the top of the limb
  // moves far less than the part below)
  for (const name of NAMES) {
    const a = build(name), j = a.joints;
    for (const limb of LIMBS) {
      let still = 0, top = 0, topN = 0, low = 0, lowN = 0;
      for (const skin of skinsOf(a, j[limb])) {
        const share = shareOn(skin, j[`${limb}_1`]), rest = verts(skin, a.g);
        j[`${limb}_1`].rotation.x += .9;
        const now = verts(skin, a.g);
        j[`${limb}_1`].rotation.x -= .9;
        for (let i = 0; i < rest.length; i++) {
          const d = rest[i].distanceTo(now[i]);
          if (share[i] === 0) { assert(d < 1e-6, `${name} ${limb}: a vertex not on the lower bones moved`); still++; }
          if (share[i] < .25) { top += d; topN++; } else if (share[i] > .75) { low += d; lowN++; }
        }
      }
      assert(topN > 0 && lowN > 0, `${name} ${limb}: ${topN} vertices up top, ${lowN} below the joint`);
      assert(low / lowN > .03, `${name} ${limb}: the part below bends (${(low / lowN).toFixed(3)})`);
      assert(top / topN < .4 * (low / lowN), `${name} ${limb}: the top stays (${(top / topN).toFixed(3)} against ${(low / lowN).toFixed(3)})`);
    }
  }
});

test('the club rides the right wrist, so a bent elbow swings it, and at rest it hangs where it did', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints;
    const held = j.rfore_2.children.filter(o => o.isGroup);
    assert.equal(held.length, 1, name + ': one club group on rfore_2');
    const club = held[0];
    assert(club.children.some(o => o.isMesh), name + ': the club is drawn');
    a.g.updateMatrixWorld(true);
    const before = boxOf(club).getCenter(new THREE.Vector3());
    // rest: the club's centre where it was built on the body (x .33, about knee to hip height, ahead of the body)
    assert(before.x > .2 * a.g.scale.x && before.z > 0, `${name}: the club hangs at the right side, ahead`);
    j.rfore_1.rotation.x -= .6; a.g.updateMatrixWorld(true);
    const after = boxOf(club).getCenter(new THREE.Vector3()); j.rfore_1.rotation.x += .6;
    assert(after.distanceTo(before) > .05, name + ': the club follows the elbow');
    j.lfore_1.rotation.x -= .6; a.g.updateMatrixWorld(true);
    assert(boxOf(club).getCenter(new THREE.Vector3()).distanceTo(before) < 1e-9, name + ': the left elbow leaves it');
    j.lfore_1.rotation.x += .6;
  }
});

test('the blood crust and the nails ride the club', () => {
  for (const name of ['ogre lord', 'ogre king']) {
    const a = build(name), j = a.joints, club = j.rfore_2.children.find(o => o.isGroup);
    const mats = new Set(); club.traverse(o => { if (o.isMesh) mats.add(o.material.color.getHexString()); });
    assert(mats.size >= 3, `${name}: wood, crust and nails on the club (${[...mats]})`);
  }
});
