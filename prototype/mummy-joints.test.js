// Family M stage 1 step 1: every mummy exposes named joints (`head` / `neck0`, the ettin's `head_1`,
// `lfore` / `rfore`, `lleg1` / `rleg1`), each joint turns only what hangs on it, and the model is drawn
// where it was before.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {MUMMIES} from './mummy.js';

const NAMES = Object.keys(MUMMIES);
const build = name => createCreature({name, symbol: 77, color: 7});
const boxOf = o => new THREE.Box3().setFromObject(o, true);
const moved = (a, b) => a.min.distanceTo(b.min) + a.max.distanceTo(b.max);
const places = g => { g.updateMatrixWorld(true); const m = new Map(); g.traverse(o => { if (o.isMesh) m.set(o, boxOf(o)); }); return m; };
const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };

test('every mummy has a head, two arms and two legs as named joints', () => {
  for (const name of [...NAMES, 'unknown M']) {
    const a = name === 'unknown M' ? createCreature({name, symbol: 77, color: 7}) : build(name), j = a.joints;
    assert(j, name + ' joints');
    assert.equal(a.quirk, 'mummy', name);
    assert.equal(j.head, a.head, name);
    assert.equal(j.neck0, a.head, name + ': the neck pivot is the head group');
    assert.equal(a.head.parent, a.body, name + ': the head hangs on the body');
    for (const [label, list] of [['fore', a.arms], ['leg1', a.legs]]) for (const side of ['l', 'r']) {
      const o = j[side + label];
      assert(o && list.includes(o), `${name} ${side}${label} is one of the rig's ${label === 'fore' ? 'arms' : 'legs'}`);
      assert.equal(o.parent, a.body, `${name} ${side}${label}`);
      assert.equal(o.position.x < 0, side === 'l', `${name} ${side}${label} side`);
    }
    assert.equal(j.rfore, a.arm, name + ': the right arm is the swing arm');
    if (a.heads.length > 1) {
      assert.equal(j.head_1, a.heads[1], name + ': the second head is head_1');
      assert.equal(a.heads[1].parent, a.body, name);
    } else assert.equal(j.head_1, undefined, name);
  }
});

test('turning a joint moves everything on it and nothing else', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints, rest = places(a.g);
    const turns = [['neck0', 'x', .5], ['neck0', 'y', .6], ['lfore', 'x', .7], ['rfore', 'z', .5], ['lleg1', 'x', .6], ['rleg1', 'x', -.6]];
    if (j.head_1) turns.push(['head_1', 'z', .4]);
    for (const [label, axis, v] of turns) {
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

test('the bound skull and its glowing eye slit ride the head', () => {
  for (const name of NAMES) {
    const a = build(name);
    for (const h of a.heads) {
      const parts = []; h.traverse(o => { if (o.isMesh) parts.push(o.userData.part); });
      assert.deepEqual(parts.sort(), ['eyes', 'head'], name);
    }
  }
});

test('named joints leave every mummy drawn where it was: same bounds, same mesh count', () => {
  // bounds and mesh counts of each mummy on master before the joints were named (scale included)
  const before = {
    'kobold mummy': [[-.22, .003, -.197], [.213, .816, .422], 7],
    'gnome mummy': [[-.216, .003, -.193], [.209, .769, .414], 7],
    'orc mummy': [[-.323, .004, -.288], [.312, 1.107, .619], 7],
    'dwarf mummy': [[-.289, .003, -.259], [.28, .909, .555], 7],
    'elf mummy': [[-.294, .005, -.263], [.285, 1.212, .564], 7],
    'human mummy': [[-.314, .004, -.281], [.304, 1.165, .603], 7],
    'ogre mummy': [[-.49, .006, -.438], [.474, 1.515, .941], 7],
    'troll mummy': [[-.477, .006, -.427], [.462, 1.608, .915], 7],
    'ettin mummy': [[-.546, .007, -.488], [.528, 1.864, 1.047], 9],
    'giant mummy': [[-.611, .008, -.546], [.591, 2.252, 1.171], 7],
  };
  for (const [name, [lo, hi, count]] of Object.entries(before)) {
    const a = build(name), b = boxOf(a.g);
    lo.forEach((v, k) => assert(Math.abs(b.min.getComponent(k) - v) < .001, `${name} min ${k}`));
    hi.forEach((v, k) => assert(Math.abs(b.max.getComponent(k) - v) < .001, `${name} max ${k}`));
    let meshes = 0; a.g.traverse(o => { if (o.isMesh) meshes++; });
    assert.equal(meshes, count, name);
  }
});
