// Family U stage 1 step 1: the umber hulk and the shambling horror expose named joints (`head` / `neck0`, `lfore` /
// `rfore`, `lleg1` / `rleg1`), each joint turns only what hangs on it, the handles tail-sway.js and shambler-lurch.js
// use are kept (the head is still the `tail` group, the horror's `digArm` / `limpArm` are its arm joints), the actor
// gains no `head` handle (so fidget.js and actions.js leave the head as before), and the model is drawn where it was.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {isShambler} from './shambler-lurch.js';

const NAMES = ['umber hulk', 'shambling horror', 'unknown U'];
const build = name => createCreature({name, symbol: 85, color: 3});
const boxOf = o => new THREE.Box3().setFromObject(o, true);
const moved = (a, b) => a.min.distanceTo(b.min) + a.max.distanceTo(b.max);
const places = g => { g.updateMatrixWorld(true); const m = new Map(); g.traverse(o => { if (o.isMesh) m.set(o, boxOf(o)); }); return m; };
const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };

test('every U has a head, two arms and two legs as named joints', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints;
    assert(j, name + ' joints');
    assert(j.head === a.tail && j.neck0 === a.tail, name + ': head and neck0 are the head group (the tail handle)');
    assert.equal(a.tail.name, 'head', name);
    assert.equal(a.head, undefined, name + ': no head handle, so no new head motion');
    for (const label of ['fore', 'leg1']) for (const side of ['l', 'r']) {
      const o = j[side + label];
      assert(o && o.isObject3D && !o.isMesh, `${name} ${side}${label} is a group`);
      assert(o.parent === a.body, `${name} ${side}${label} hangs on the body`);
      assert.equal(o.name, side + label, name);
      assert.equal(o.position.x < 0, side === 'l', `${name} ${side}${label} side`);
      assert(o.children.some(m => m.isMesh), `${name} ${side}${label} carries its limb`);
    }
    assert(a.legs.includes(j.lleg1) && a.legs.includes(j.rleg1), name + ': the legs are the rig legs');
  }
  const h = build('shambling horror');
  assert(h.joints.lfore === h.digArm && h.joints.rfore === h.limpArm, 'the digging claw is the left arm, the withered one the right');
  assert(isShambler(h), 'shambler-lurch.js still takes it');
});

test('turning a joint moves everything on it and nothing else', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints, rest = places(a.g);
    for (const [label, axis, v] of [['neck0', 'x', .5], ['head', 'y', .6], ['lfore', 'x', .7], ['rfore', 'z', .5], ['lleg1', 'x', .6], ['rleg1', 'x', -.6]]) {
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

test('named joints leave every U drawn where it was: same bounds, same mesh count', () => {
  // bounds and mesh counts of each on master before the joints were named (scale included)
  const before = {
    'umber hulk': [[-.694, .007, -.509], [.694, 1.716, .74], 29],
    'shambling horror': [[-.561, .007, -.463], [.566, 1.364, .445], 24],
    'unknown U': [[-.479, .005, -.351], [.479, 1.183, .51], 29],
  };
  for (const [name, [lo, hi, count]] of Object.entries(before)) {
    const a = build(name), b = boxOf(a.g);
    lo.forEach((v, k) => assert(Math.abs(b.min.getComponent(k) - v) < .001, `${name} min ${k}`));
    hi.forEach((v, k) => assert(Math.abs(b.max.getComponent(k) - v) < .001, `${name} max ${k}`));
    let meshes = 0; a.g.traverse(o => { if (o.isMesh) meshes++; });
    assert.equal(meshes, count, name);
  }
});
