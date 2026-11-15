// Family M stage 1 step 2: each mummy's arms and legs are on three bones (shoulder or hip, elbow or knee, wrist or
// ankle), the wrapped limb skinned along them, so a bent elbow or knee carries the bound hand or foot below it.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {MUMMIES} from './mummy.js';

const NAMES = Object.keys(MUMMIES);
const LIMBS = ['lfore', 'rfore', 'lleg1', 'rleg1'];
const build = name => createCreature({name, symbol: 77, color: 7});
const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
// (since step 3 the limbs' skins are merged with the trunk into one hide on the body; the bones stay under each limb's group)
const skinOf = a => { const m = []; a.g.traverse(o => { if (o.isSkinnedMesh) m.push(o); }); assert.equal(m.length, 1, 'one hide'); return m[0]; };
// each vertex's weight on bones under `root`
const shareOn = (m, root) => { const bones = m.skeleton.bones, si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
  return Array.from({length: si.count}, (_, i) => { let w = 0; for (let k = 0; k < 4; k++) if (under(bones[si.getComponent(i, k)], root)) w += sw.getComponent(i, k); return w; }); };
// every vertex of a skinned mesh, posed, in world space
const verts = (m, root) => { root.updateMatrixWorld(true); const p = m.geometry.attributes.position, v = new THREE.Vector3(); return Array.from({length: p.count}, (_, i) => m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld).clone()); };
const meshCount = a => { let n = 0; a.g.traverse(o => { if (o.isMesh) n++; }); return n; };

test('every limb of every mummy has three bones in its joint group, named in joints', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints;
    for (const limb of LIMBS) {
      const skin = skinOf(a);
      assert.equal(skin.userData.part, 'body', `${name} the hide`);
      for (let i = 0; i < 3; i++) {
        const b = j[`${limb}_${i}`];
        assert(b?.isBone && skin.skeleton.bones.includes(b), `${name} ${limb}_${i}: a bone of the limb's skin, in joints`);
        assert(under(b, j[limb]), `${name} ${limb}_${i} under the joint`);
        if (i) assert.equal(b.parent, j[`${limb}_${i - 1}`], `${name} ${limb}_${i} chained`);
      }
    }
  }
});

test('the bones sit at the knee and ankle, the elbow and wrist', () => {
  const a = build('human mummy'), j = a.joints;
  for (const side of ['l', 'r']) {
    // in each limb group's own space: the knee ball at .22 below the hip, the elbow ball .2 below the shoulder
    assert(Math.abs(j[side + 'leg1_1'].position.y + .22) < 1e-9 && Math.abs(j[side + 'fore_1'].position.y + .2) < 1e-9, side);
    // the ankle above the bound foot (foot at .405), the wrist where the wrappings end over the palm (.36 to .4)
    const ankle = j[side + 'leg1_1'].position.y + j[side + 'leg1_2'].position.y, wrist = j[side + 'fore_1'].position.y + j[side + 'fore_2'].position.y;
    assert(ankle < -.36 && ankle > -.405, side + ' ankle ' + ankle);
    assert(wrist < -.35 && wrist > -.4, side + ' wrist ' + wrist);
  }
});

test('bending an elbow or a knee bends the limb below it and leaves the part above', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints;
    for (const limb of LIMBS) {
      const skin = skinOf(a), share = shareOn(skin, j[`${limb}_1`]), rest = verts(skin, a.g);
      // the point of the limb farthest from its root (a fingertip or the toe), which rides the last bone
      const root = j[limb].getWorldPosition(new THREE.Vector3()), whole = shareOn(skin, j[limb]);
      let lowest = -1; for (let i = 0; i < rest.length; i++) if (whole[i] === 1 && (lowest < 0 || rest[i].distanceTo(root) > rest[lowest].distanceTo(root))) lowest = i;
      j[`${limb}_1`].rotation.x += .9;
      const now = verts(skin, a.g);
      j[`${limb}_1`].rotation.x -= .9;
      let still = 0, bent = 0;
      for (let i = 0; i < rest.length; i++) {
        const d = rest[i].distanceTo(now[i]);
        if (share[i] === 0) { assert(d < 1e-6, `${name} ${limb}: a vertex not on the lower bones moved`); still++; }
        else if (share[i] > .5 && d > .01) bent++;
      }
      assert(still > 0 && bent > 0, `${name} ${limb}: ${still} still, ${bent} bent`);
      assert(share[lowest] === 1 && rest[lowest].distanceTo(now[lowest]) > .03, `${name} ${limb}: the hand or foot follows the bend`);
    }
  }
});

test('bending a wrist or ankle turns only the bound hand or foot', () => {
  for (const name of ['human mummy', 'ettin mummy']) {
    const a = build(name), j = a.joints;
    for (const limb of LIMBS) {
      const skin = skinOf(a), share = shareOn(skin, j[`${limb}_2`]), rest = verts(skin, a.g);
      j[`${limb}_2`].rotation.x += .7;
      const now = verts(skin, a.g);
      j[`${limb}_2`].rotation.x -= .7;
      let moved = 0;
      for (let i = 0; i < rest.length; i++) {
        const d = rest[i].distanceTo(now[i]);
        if (share[i] === 0) assert(d < 1e-6, `${name} ${limb}: the wrist or ankle moved a vertex above it`);
        else if (d > .005) moved++;
      }
      assert(moved > 0, `${name} ${limb}: the hand or foot turned`);
    }
  }
});

test('the limbs on bones cost no more meshes (7, the ettin 9); one hide since step 3: 3, the ettin 5', () => {
  for (const name of NAMES) assert.equal(meshCount(build(name)), name === 'ettin mummy' ? 5 : 3, name);
});
