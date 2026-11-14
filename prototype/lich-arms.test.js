// Family L stage 1 step 2: each lich's arms are on three bones (shoulder, elbow, wrist: `lfore_0`..`_2`,
// `rfore_0`..`_2`), the sleeve and the bone forearm skinned along them (one skinned mesh per material on one
// skeleton), and the claw knuckles lich-chill.js flexes hung on the wrist bone where they were drawn.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const MEMBERS = [['lich', 2], ['demilich', 1], ['master lich', 5], ['arch-lich', 6], ['unknown L', 3]];
const build = ([name, color]) => createCreature({name, symbol: 76, color});
const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
const skinsOf = arm => { const m = []; arm.traverse(o => { if (o.isSkinnedMesh) m.push(o); }); return m; };
const shareOn = (m, root) => { const bones = m.skeleton.bones, si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
  return Array.from({length: si.count}, (_, i) => { let w = 0; for (let k = 0; k < 4; k++) if (under(bones[si.getComponent(i, k)], root)) w += sw.getComponent(i, k); return w; }); };
const verts = (m, root) => { root.updateMatrixWorld(true); const p = m.geometry.attributes.position, v = new THREE.Vector3(); return Array.from({length: p.count}, (_, i) => m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld).clone()); };
const box = o => new THREE.Box3().setFromObject(o, true);

test('both arms of every lich have three chained bones, named in joints, under the sleeve and the forearm', () => {
  for (const m of MEMBERS) {
    const a = build(m), j = a.joints, name = m[0];
    for (const limb of ['lfore', 'rfore']) {
      const skins = skinsOf(j[limb]);
      assert.equal(skins.length, 2, `${name} ${limb}: the sleeve and the bone forearm, skinned`);
      assert.equal(skins[0].skeleton, skins[1].skeleton, `${name} ${limb}: one skeleton for both materials`);
      assert.notEqual(skins[0].material, skins[1].material, `${name} ${limb}: each piece keeps its own material`);
      for (let i = 0; i < 3; i++) {
        const b = j[`${limb}_${i}`];
        assert(b?.isBone && skins[0].skeleton.bones.includes(b), `${name} ${limb}_${i}: a bone of the arm, in joints`);
        assert(under(b, j[limb]), `${name} ${limb}_${i} under the arm`);
        if (i) assert.equal(b.parent, j[`${limb}_${i - 1}`], `${name} ${limb}_${i} chained`);
      }
      assert(j[`${limb}_2`].position.y < 0 && j[`${limb}_1`].position.y < 0, `${name} ${limb}: the bones run down the arm`);
    }
  }
});

test('the claws hang on the wrist bone, where they were drawn, and lich-chill still flexes them', () => {
  for (const m of MEMBERS) {
    const a = build(m), j = a.joints, name = m[0];
    a.lichHands.forEach((h, s) => {
      const wrist = j[(s ? 'r' : 'l') + 'fore_2'];
      assert.equal(h.fingers.length, 3, name);
      for (const [i, f] of h.fingers.entries()) {
        assert.equal(f.parent, wrist, `${name}: knuckle ${i} on the wrist bone`);
        // drawn where the knuckle stood on the arm before the bones (arm space [-.025|0|.025, -.405, .03])
        const was = h.arm.localToWorld(new THREE.Vector3((i - 1) * .025, -.405, .03)), now = f.getWorldPosition(new THREE.Vector3());
        assert(now.distanceTo(was) < 1e-6, `${name}: knuckle ${i} moved ${now.distanceTo(was)}`);
      }
    });
  }
});

test('bending an elbow bends the forearm and carries the claws, and leaves the shoulder', () => {
  for (const m of MEMBERS) {
    const a = build(m), j = a.joints, name = m[0];
    for (const [s, limb] of [[0, 'lfore'], [1, 'rfore']]) {
      const elbow = j[`${limb}_1`], fingers = a.lichHands[s].fingers;
      const at = fingers.map(f => f.getWorldPosition(new THREE.Vector3()));
      const skins = skinsOf(j[limb]), share = skins.map(k => shareOn(k, elbow)), rest = skins.map(k => verts(k, a.g));
      elbow.rotation.x -= .9;
      const now = skins.map(k => verts(k, a.g)), atNow = fingers.map(f => f.getWorldPosition(new THREE.Vector3()));
      elbow.rotation.x += .9; a.g.updateMatrixWorld(true);
      let still = 0, bent = 0;
      skins.forEach((k, n) => rest[n].forEach((p, i) => {
        const d = p.distanceTo(now[n][i]);
        if (share[n][i] === 0) { assert(d < 1e-6, `${name} ${limb}: a vertex above the elbow moved`); still++; }
        else if (share[n][i] > .5 && d > .01) bent++;
      }));
      assert(still > 0 && bent > 0, `${name} ${limb}: ${still} still, ${bent} bent`);
      at.forEach((p, i) => assert(p.distanceTo(atNow[i]) > .03, `${name} ${limb}: claw ${i} follows the elbow`));
    }
  }
});

test('a fresh lich measures the same box as one whose world matrices were updated', () => {
  for (const m of MEMBERS) {
    const fresh = box(build(m).g), b = build(m); b.g.updateMatrixWorld(true);
    const upd = box(b.g);
    assert(fresh.min.distanceTo(upd.min) < 1e-6 && fresh.max.distanceTo(upd.max) < 1e-6, `${m[0]}: the skins measure where they are drawn`);
  }
});
