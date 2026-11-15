// Family L stage 1 step 3: each lich's trunk and neck are on bones (`hips` at the floor, `spine0` at the waist,
// `spine1` at the chest, `neck0`..`neck3` up to the skull), the robe one vertex-coloured hide and the overrobe's glow
// strips skinned onto them, the skull on `neck3`, the arms on the chest, and the rest of the robe's dressing rigid on
// the spine bone at its height. No legs: the robe reaches the floor.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const MEMBERS = [['lich', 2], ['demilich', 1], ['master lich', 5], ['arch-lich', 6], ['unknown L', 3]];
const BONES = ['hips', 'spine0', 'spine1', 'neck0', 'neck1', 'neck2', 'neck3'];
const build = ([name, color]) => createCreature({name, symbol: 76, color});
const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
// the trunk's skins: the skinned meshes on the trunk's skeleton (not the arms')
const trunkSkins = a => { const m = []; a.g.traverse(o => { if (o.isSkinnedMesh && o.skeleton.bones.includes(a.joints.hips)) m.push(o); }); return m; };
const verts = (a, m) => { a.g.updateMatrixWorld(true); const v = new THREE.Vector3(); return Array.from({length: m.geometry.attributes.position.count}, (_, i) => m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld).clone()); };
const shareOn = (m, root) => { const bones = m.skeleton.bones, si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
  return Array.from({length: si.count}, (_, i) => { let w = 0; for (let k = 0; k < 4; k++) if (under(bones[si.getComponent(i, k)], root)) w += sw.getComponent(i, k); return w; }); };
const world = (a, o) => { a.g.updateMatrixWorld(true); return o.getWorldPosition(new THREE.Vector3()); };

test('every lich has the trunk and neck bones, chained floor to skull, in joints', () => {
  for (const m of MEMBERS) {
    const a = build(m), j = a.joints, name = m[0];
    BONES.forEach((n, i) => {
      assert(j[n]?.isBone, `${name}: ${n} is a bone`);
      if (i) assert(j[n].parent === j[BONES[i - 1]], `${name}: ${n} chained on ${BONES[i - 1]}`);
    });
    const at = n => world(a, j[n]);
    assert(Math.abs(at('hips').y - a.g.position.y) < 1e-6, name + ': the pelvis root at the floor');
    for (let i = 1; i < BONES.length; i++) assert(at(BONES[i]).y > at(BONES[i - 1]).y, `${name}: ${BONES[i]} above ${BONES[i - 1]}`);
    assert(at('neck3').distanceTo(world(a, a.head)) < 1e-6, name + ': the neck ends at the skull pivot');
    assert(a.head.parent === j.neck3, name + ': the skull on neck3');
    for (const h of a.lichHands) assert(h.arm.parent === j.spine1, name + ': the arms on the chest');
    const skins = trunkSkins(a);
    assert.equal(skins.length, 2, name + ': the robe hide and the glow strips');
    assert(skins[0].material.vertexColors, name + ': the hide is one vertex-coloured robe');
    assert(skins[1].material.emissiveIntensity > 0, name + ': the strips still glow');
    assert(skins[0].skeleton === skins[1].skeleton, name + ': one skeleton');
  }
});

test('bending the spine or neck moves the robe past it and nothing before it', () => {
  for (const m of MEMBERS) {
    const a = build(m), j = a.joints, name = m[0];
    for (const [label, axis, v] of [['spine0', 'x', .4], ['spine1', 'x', .4], ['spine1', 'y', .5], ['neck1', 'x', .5]]) {
      for (const skin of trunkSkins(a)) {
        const share = shareOn(skin, j[label]), rest = verts(a, skin);
        j[label].rotation[axis] += v;
        const bent = verts(a, skin);
        j[label].rotation[axis] -= v;
        let past = 0;
        rest.forEach((r, i) => { const d = r.distanceTo(bent[i]); if (share[i] === 0) assert(d < 1e-6, `${name}: ${label} moved robe before it`); else if (share[i] > .5) past = Math.max(past, d); });
        // (the strips end below the chest, so only the waist bends them; the robe has no skin at the neck, whose
        // bones carry only the skull under the hood: the bow test checks that)
        if (label !== 'neck1' && (skin.material.vertexColors || label === 'spine0')) assert(past > .005, `${name}: ${label} moved the robe past it (${past.toFixed(3)})`);
      }
    }
    // the hem stays on the pelvis: a bow leaves the robe's bottom on the floor
    const hide = trunkSkins(a)[0], low = verts(a, hide).map(p => p.y);
    j.spine0.rotation.x = .4; const lowBent = verts(a, hide).map(p => p.y); j.spine0.rotation.x = 0;
    assert(Math.abs(Math.min(...low) - Math.min(...lowBent)) < 1e-6, name + ': the hem stays down');
  }
});

test('a bow carries the skull, the arms and the hood, and leaves the staff and the hem', () => {
  for (const m of MEMBERS) {
    const a = build(m), j = a.joints, name = m[0];
    const head = world(a, a.head), hands = a.lichHands.map(h => world(a, h.fingers[1])), orb = world(a, a.orb);
    const chest = j.spine1.children.filter(o => o.isMesh), hem = j.hips.children.filter(o => o.isMesh);
    assert(chest.length > 0, name + ': the hood rides the chest');
    // (the gilt hem band of the higher tiers; a plain lich's hem is all in the hide)
    if (m[0] !== 'lich' && m[0] !== 'unknown L') assert(hem.length > 0, name + ': the gilt hem band rides the pelvis');
    const at = o => world(a, o), chestAt = chest.map(at), hemAt = hem.map(at);
    j.spine0.rotation.x = .35; j.spine1.rotation.x = .3;
    assert(world(a, a.head).y < head.y - .03 && world(a, a.head).z > head.z, name + ': the skull came forward and down');
    a.lichHands.forEach((h, i) => assert(world(a, h.fingers[1]).distanceTo(hands[i]) > .03, name + ': the claws went with the chest'));
    chest.forEach((o, k) => assert(at(o).distanceTo(chestAt[k]) > .02, name + ': the hood and chest dressing followed'));
    hem.forEach((o, k) => assert(at(o).distanceTo(hemAt[k]) < 1e-9, name + ': the hem stayed'));
    assert(world(a, a.orb).distanceTo(orb) < 1e-9, name + ': the staff stands where it was');
    j.spine0.rotation.x = j.spine1.rotation.x = 0;
    const was = world(a, a.head); j.neck1.rotation.x = .5; j.neck2.rotation.x = .4;
    assert(world(a, a.head).distanceTo(was) > .005, name + ': the skull went with the neck');
  }
});
