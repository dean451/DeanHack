// Family U stage 1 step 2: the umber hulk's and the shambling horror's arms and legs are on three bones each
// (shoulder or hip, about halfway, near the end), every piece of the limb skinned along them (hide or flesh, plates,
// claws, talons, fingers), as on the trolls (troll-limbs.test.js). The joint groups stay the pivots shambler-lurch.js
// swings, and the horror's odd limbs (the club foot, the hocked shank, the withered arm) bend with the rest.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {isShambler} from './shambler-lurch.js';

const NAMES = ['umber hulk', 'shambling horror', 'unknown U'];
const LIMBS = ['lfore', 'rfore', 'lleg1', 'rleg1'];
const build = name => createCreature({name, symbol: 85, color: 3});
const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
const skinsOf = (a, root) => { const m = []; a.g.traverse(o => { if (o.isSkinnedMesh && o.skeleton.bones.some(b => under(b, root))) m.push(o); }); return m; };
const shareOn = (m, root) => { const bones = m.skeleton.bones, si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
  return Array.from({length: si.count}, (_, i) => { let w = 0; for (let k = 0; k < 4; k++) if (under(bones[si.getComponent(i, k)], root)) w += sw.getComponent(i, k); return w; }); };
const verts = (m, root) => { root.updateMatrixWorld(true); const p = m.geometry.attributes.position, v = new THREE.Vector3(); return Array.from({length: p.count}, (_, i) => m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld).clone()); };

test('every limb of every U has three bones chained in its joint group, named in joints, and is skinned on them', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints;
    for (const limb of LIMBS) {
      for (let i = 0; i < 3; i++) {
        const b = j[`${limb}_${i}`];
        assert(b?.isBone, `${name} ${limb}_${i} is a bone in joints`);
        assert(i ? b.parent === j[`${limb}_${i - 1}`] : under(b, j[limb]), `${name} ${limb}_${i} chained under the joint`);
        if (i) assert(b.position.y < 0, `${name} ${limb}_${i}: the bones run down the limb`);
      }
      const skins = skinsOf(a, j[limb]);
      assert(skins.length >= 2, `${name} ${limb}: the skin and its claws or fingers are skinned (${skins.length})`);
      for (const m of skins) assert(m.skeleton.bones.includes(j[`${limb}_0`]), `${name} ${limb}: on the limb's bones`);
      assert.equal(j[limb].children.filter(o => o.isMesh && !o.isSkinnedMesh).length, 0, `${name} ${limb}: no plain piece left on the joint`);
      // (the hide or flesh carries the bones: the plates and claws are bound to its skeleton)
      const carrier = skins.find(m => m.children.includes(j[`${limb}_0`]));
      assert(carrier, `${name} ${limb}: one skin carries the bones`);
      assert(skins.every(m => m.skeleton === carrier.skeleton), `${name} ${limb}: one skeleton`);
    }
  }
  const h = build('shambling horror');
  assert(h.joints.lfore === h.digArm && h.joints.rfore === h.limpArm && isShambler(h), 'the lurch still swings the arm groups');
});

test('bending an elbow or a knee bends the limb below it and leaves the part above', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints;
    for (const limb of LIMBS) {
      let top = 0, topN = 0, low = 0, lowN = 0;
      for (const skin of skinsOf(a, j[limb])) {
        const share = shareOn(skin, j[`${limb}_1`]), onLimb = shareOn(skin, j[`${limb}_0`]), rest = verts(skin, a.g);
        j[`${limb}_1`].rotation.x += .9;
        const now = verts(skin, a.g);
        j[`${limb}_1`].rotation.x -= .9;
        for (let i = 0; i < rest.length; i++) {
          const d = rest[i].distanceTo(now[i]);
          if (share[i] === 0) assert(d < 1e-6, `${name} ${limb}: a vertex not on the lower bones moved`);
          if (onLimb[i] < .5) continue;
          if (share[i] < .25) { top += d; topN++; } else if (share[i] > .75) { low += d; lowN++; }
        }
      }
      assert(topN > 0 && lowN > 0, `${name} ${limb}: ${topN} vertices up top, ${lowN} below the joint`);
      assert(low / lowN > .03, `${name} ${limb}: the part below bends (${(low / lowN).toFixed(3)})`);
      assert(top / topN < .4 * (low / lowN), `${name} ${limb}: the top stays (${(top / topN).toFixed(3)} against ${(low / lowN).toFixed(3)})`);
    }
  }
});

test('the claws ride the end of the limb: bending the last bone carries them', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints;
    for (const limb of LIMBS) {
      const end = j[`${limb}_2`];
      let tip = 0, n = 0;
      for (const skin of skinsOf(a, j[limb])) {
        const share = shareOn(skin, end), rest = verts(skin, a.g);
        end.rotation.x += .8;
        const now = verts(skin, a.g);
        end.rotation.x -= .8;
        for (let i = 0; i < rest.length; i++) if (share[i] > .9) { tip += rest[i].distanceTo(now[i]); n++; }
      }
      assert(n > 0 && tip / n > .01, `${name} ${limb}: the end of the limb turns with ${limb}_2 (${n} vertices)`);
    }
  }
});
