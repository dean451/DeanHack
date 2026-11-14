// Family L stage 1 step 1: every lich exposes named joints (`head` / `neck0`, `jaw`, `lfore` / `rfore`),
// each joint turns only what hangs on it, and the model is drawn where it was before.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const MEMBERS = [['lich', 2], ['demilich', 1], ['master lich', 5], ['arch-lich', 6], ['unknown L', 3]];
const build = ([name, color]) => createCreature({name, symbol: 76, color});
const boxOf = o => new THREE.Box3().setFromObject(o, true);
const moved = (a, b) => a.min.distanceTo(b.min) + a.max.distanceTo(b.max);
const places = g => { g.updateMatrixWorld(true); const m = new Map(); g.traverse(o => { if (o.isMesh) m.set(o, boxOf(o)); }); return m; };
const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };

test('every lich has a head, a jaw and two arms as named joints', () => {
  for (const m of MEMBERS) {
    const a = build(m), j = a.joints, name = m[0];
    assert(j, name + ' joints');
    assert.equal(j.head, a.head, name);
    assert.equal(j.neck0, a.head, name + ': the neck pivot is the head group');
    assert.equal(a.head.parent, a.body, name + ': the head hangs on the body');
    assert.equal(j.jaw, a.jaw, name);
    assert(under(a.jaw, a.head), name + ': the jaw rides the skull');
    for (const [side, hand] of [['l', a.lichHands[0]], ['r', a.lichHands[1]]]) {
      assert.equal(j[side + 'fore'], hand.arm, `${name} ${side}fore is the sleeved arm lich-chill flexes`);
      assert.equal(j[side + 'fore'].parent, a.body, `${name} ${side}fore`);
      assert.equal(j[side + 'fore'].position.x < 0, side === 'l', `${name} ${side} arm side`);
    }
    assert.equal(a.arms, undefined, name + ': arms are not swung by the fidget');
    assert.deepEqual(a.legs, [], name + ': the robe reaches the floor, no legs');
  }
});

test('turning a joint moves everything on it and nothing else', () => {
  for (const m of MEMBERS) {
    const a = build(m), j = a.joints, rest = places(a.g), name = m[0];
    for (const [label, axis, v] of [['neck0', 'x', .5], ['neck0', 'y', .6], ['jaw', 'x', .4], ['lfore', 'x', .7], ['rfore', 'z', .5]]) {
      const joint = j[label];
      joint.rotation[axis] += v;
      const now = places(a.g);
      let on = 0;
      for (const [mesh, p] of rest) {
        const d = moved(now.get(mesh), p);
        if (under(mesh, joint)) { if (d > 1e-4) on++; }
        else assert(d < 1e-9, `${name}: turning ${label} moved a mesh not on it`);
      }
      assert(on > 0, `${name}: turning ${label} moved what hangs on it`);
      joint.rotation[axis] -= v;
    }
  }
});

test('the skull, its sockets and the crown ride the head; the hood and the staff stay put', () => {
  for (const m of MEMBERS) {
    const a = build(m), name = m[0];
    a.g.updateMatrixWorld(true);
    const head = boxOf(a.head);
    // the head group holds the cranium down to the jaw and up to the circlet or crown
    assert(head.max.y - head.min.y > .25 * a.g.scale.y, name + ': the head group holds the skull and its circlet or crown');
    let glows = 0; a.head.traverse(o => { if (o.isMesh && o.material.emissiveIntensity >= 2) glows++; });
    assert(glows >= 1, name + ': the burning sockets ride the head (merged into one glowing mesh)');
    // nodding the head carries its top and leaves the staff's orb where it was
    const orb = new THREE.Vector3(), orb2 = new THREE.Vector3();
    a.orb.getWorldPosition(orb);
    a.head.rotation.x += .5; a.g.updateMatrixWorld(true);
    const nod = boxOf(a.head); a.orb.getWorldPosition(orb2); a.head.rotation.x -= .5;
    assert(moved(nod, head) > .03, name + ': the skull nods');
    assert(orb2.distanceTo(orb) < 1e-9, name + ': the staff stays in the hand, not on the head');
  }
});

test('named joints leave the lich drawn where it was: same bounds, under the mesh cap', () => {
  // bounds of each lich on master before the joints were named (scale included)
  const before = {
    lich: [[-.394, -.080, -.777], [.447, 1.507, .389]],
    demilich: [[-.506, -.081, -.792], [.506, 1.535, .506]],
    'master lich': [[-.515, -.083, -.806], [.515, 1.579, .515]],
    'arch-lich': [[-.575, -.092, -.900], [.575, 1.951, .575]],
  };
  for (const [name, [lo, hi]] of Object.entries(before)) {
    const a = build(MEMBERS.find(m => m[0] === name)), b = boxOf(a.g);
    lo.forEach((v, k) => assert(Math.abs(b.min.getComponent(k) - v) < .001, `${name} min ${k}`));
    hi.forEach((v, k) => assert(Math.abs(b.max.getComponent(k) - v) < .001, `${name} max ${k}`));
    let meshes = 0; a.g.traverse(o => { if (o.isMesh) meshes++; });
    // 28 to 33 on master; the skull's bone, socket and gilt no longer merge with the robe's
    assert(meshes <= 36, `${name}: ${meshes} meshes`);
  }
});
