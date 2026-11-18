// Family V stage 1 step 1: every vampire exposes named joints (`head` / `neck0`, `lfore` / `rfore`, `lleg1` /
// `rleg1`), each joint turns only what hangs on it, the handles vampire-sweep.js uses are kept (the head, both arms,
// the right arm as `arm`, the cape and its two flaps), and the model is drawn where it was.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {sweeps} from './vampire-sweep.js';

const NAMES = ['vampire', 'vampire lord', 'vampire mage', 'vlad the impaler', 'unknown V'];
const build = name => createCreature({name, symbol: 86, color: 1});
const boxOf = o => new THREE.Box3().setFromObject(o, true);
const moved = (a, b) => a.min.distanceTo(b.min) + a.max.distanceTo(b.max);
const places = g => { g.updateMatrixWorld(true); const m = new Map(); g.traverse(o => { if (o.isMesh) m.set(o, boxOf(o)); }); return m; };
const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };

test('every vampire has a head, two arms and two legs as named joints', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints;
    assert(j, name + ' joints');
    assert(j.head === a.head && j.neck0 === a.head, name + ': head and neck0 are the head group');
    assert.equal(a.head.name, 'head', name);
    assert(a.head.parent === a.body, name + ': the head hangs on the body');
    for (const label of ['fore', 'leg1']) for (const side of ['l', 'r']) {
      const o = j[side + label];
      assert(o && o.isObject3D && !o.isMesh, `${name} ${side}${label} is a group`);
      assert(o.parent === a.body, `${name} ${side}${label} hangs on the body`);
      assert.equal(o.name, side + label, name);
      assert.equal(o.position.x < 0, side === 'l', `${name} ${side}${label} side`);
      assert(o.children.some(m => m.isMesh), `${name} ${side}${label} carries its limb`);
    }
    assert(a.arms.includes(j.lfore) && a.arms.includes(j.rfore), name + ': the arms are the sweep arms');
    assert(a.arm === j.rfore, name + ': the cape-sweeping arm is the right arm');
    assert(a.legs.includes(j.lleg1) && a.legs.includes(j.rleg1), name + ': the legs are the rig legs');
    assert(sweeps(a), name + ': vampire-sweep.js still takes it');
    for (const o of [a.cape, ...a.flaps]) assert(!Object.values(j).some(x => under(o, x)), name + ': the cape hangs on no joint');
  }
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

test('named joints leave every vampire drawn where it was: same bounds, same mesh count', () => {
  // bounds and mesh counts of each on master before the joints were named (scale included)
  const before = {
    'vampire': [[-.446, 0, -.513], [.442, 1.46, .202], 25],
    'vampire lord': [[-.519, 0, -.576], [.519, 1.711, .519], 28],
    'vampire mage': [[-.506, 0, -.562], [.506, 1.599, .506], 27],
    'vlad the impaler': [[-.572, 0, -.635], [.572, 2.054, .572], 31],
    'unknown V': [[-.425, 0, -.488], [.421, 1.39, .193], 25],
  };
  for (const [name, [lo, hi, count]] of Object.entries(before)) {
    const a = build(name), b = boxOf(a.g);
    lo.forEach((v, k) => assert(Math.abs(b.min.getComponent(k) - v) < .001, `${name} min ${k}`));
    hi.forEach((v, k) => assert(Math.abs(b.max.getComponent(k) - v) < .001, `${name} max ${k}`));
    let meshes = 0; a.g.traverse(o => { if (o.isMesh) meshes++; });
    assert.equal(meshes, count, name);
  }
});
