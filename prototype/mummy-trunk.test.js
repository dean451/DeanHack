// Family M stage 1 step 3: each mummy's trunk and neck are on bones (`hips` at the body's origin, `spine0` at the
// waist, `spine1` at the chest, `neck0`..`neck3` up to the head's pivot), the head (both of the ettin's) on `neck3`,
// the arms on the chest and the legs on the pelvis, and the wrapped trunk and limbs one skinned hide.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {MUMMIES} from './mummy.js';

const NAMES = [...Object.keys(MUMMIES), 'unknown M'];
const BONES = ['hips', 'spine0', 'spine1', 'neck0', 'neck1', 'neck2', 'neck3'];
const build = name => createCreature({name, symbol: 77, color: 7});
const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
const hideOf = a => { const m = []; a.g.traverse(o => { if (o.isSkinnedMesh) m.push(o); }); assert.equal(m.length, 1, 'one hide'); return m[0]; };
const verts = (a, h) => { a.g.updateMatrixWorld(true); const v = new THREE.Vector3(); return Array.from({length: h.geometry.attributes.position.count}, (_, i) => h.getVertexPosition(i, v).applyMatrix4(h.matrixWorld).clone()); };
const shareOn = (h, root) => { const bones = h.skeleton.bones, si = h.geometry.attributes.skinIndex, sw = h.geometry.attributes.skinWeight;
  return Array.from({length: si.count}, (_, i) => { let w = 0; for (let k = 0; k < 4; k++) if (under(bones[si.getComponent(i, k)], root)) w += sw.getComponent(i, k); return w; }); };
const world = (a, o) => { a.g.updateMatrixWorld(true); return o.getWorldPosition(new THREE.Vector3()); };

test('every mummy has the trunk and neck bones, chained pelvis to head, in joints', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints, hide = hideOf(a);
    BONES.forEach((n, i) => {
      assert(j[n]?.isBone && hide.skeleton.bones.includes(j[n]), `${name}: ${n} is a bone of the hide`);
      if (i) assert.equal(j[n].parent, j[BONES[i - 1]], `${name}: ${n} chained on ${BONES[i - 1]}`);
    });
    for (let i = 1; i < BONES.length; i++) assert(world(a, j[BONES[i]]).y > world(a, j[BONES[i - 1]]).y, `${name}: ${BONES[i]} above ${BONES[i - 1]}`);
    for (const h of a.heads) assert.equal(h.parent, j.neck3, name + ': every head on neck3');
    const mid = a.heads.reduce((s, h) => s.add(world(a, h)), new THREE.Vector3()).multiplyScalar(1 / a.heads.length);
    assert(world(a, j.neck3).distanceTo(mid) < 1e-6, name + ': the neck ends at the head pivot (between the ettin\'s two)');
    for (const o of a.arms) assert.equal(o.parent, j.spine1, name + ': the arms on the chest');
    for (const o of a.legs) assert.equal(o.parent, a.body, name + ': the legs stay on the body');
    // every limb's bones in the one hide
    for (const limb of ['lfore', 'rfore', 'lleg1', 'rleg1']) assert(hide.skeleton.bones.includes(j[limb + '_0']), `${name}: ${limb} in the hide`);
  }
});

test('bending the spine or neck moves the wrappings past it and nothing before it', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints, hide = hideOf(a);
    for (const [label, axis, v] of [['spine0', 'x', .4], ['spine1', 'x', .4], ['spine1', 'y', .5], ['neck0', 'x', .5], ['neck2', 'z', .5]]) {
      const share = shareOn(hide, j[label]), rest = verts(a, hide);
      j[label].rotation[axis] += v;
      const bent = verts(a, hide);
      j[label].rotation[axis] -= v;
      let past = 0;
      rest.forEach((r, i) => { const d = r.distanceTo(bent[i]); if (share[i] === 0) assert(d < 1e-6, `${name}: ${label} moved wrappings before it`); else if (share[i] > .5) past = Math.max(past, d); });
      assert(past > .005 * a.g.scale.y, `${name}: ${label} moved the wrappings past it (${past.toFixed(4)})`);
    }
  }
});

test('a bow carries the heads and the arms and leaves the legs; a neck bend carries the heads alone', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints, hide = hideOf(a);
    const heads = a.heads.map(h => world(a, h)), hands = a.arms.map(o => world(a, o)), feet = a.legs.map(o => world(a, o));
    const legShare = a.legs.map(o => shareOn(hide, o)), rest = verts(a, hide);
    j.spine0.rotation.x = .35; j.spine1.rotation.x = .3;
    a.heads.forEach((h, i) => assert(world(a, h).y < heads[i].y - .02 && world(a, h).z > heads[i].z, name + ': the head came forward and down'));
    a.arms.forEach((o, i) => assert(world(a, o).distanceTo(hands[i]) > .02, name + ': the arm went with the chest'));
    a.legs.forEach((o, i) => assert(world(a, o).distanceTo(feet[i]) < 1e-9, name + ': the leg stayed'));
    const bent = verts(a, hide);
    legShare.forEach(s => s.forEach((w, i) => { if (w === 1) assert(bent[i].distanceTo(rest[i]) < 1e-6, name + ': the leg wrappings stayed'); }));
    j.spine0.rotation.x = j.spine1.rotation.x = 0;
    const was = a.heads.map(h => world(a, h)), arms = a.arms.map(o => world(a, o));
    j.neck1.rotation.x = .5; j.neck2.rotation.x = .4;
    a.heads.forEach((h, i) => assert(world(a, h).distanceTo(was[i]) > .01, name + ': the head went with the neck'));
    a.arms.forEach((o, i) => assert(world(a, o).distanceTo(arms[i]) < 1e-9, name + ': a neck bend leaves the arms'));
  }
});
