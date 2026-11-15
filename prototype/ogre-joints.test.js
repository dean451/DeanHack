// Family O stage 1 step 1: every ogre exposes named joints (`head` / `neck0`, `lfore` / `rfore`, `lleg1` / `rleg1`),
// each joint turns only what hangs on it, no arm motion turns on, and the model is drawn where it was before.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const NAMES = ['ogre', 'ogre lord', 'ogre king', 'unknown O'];
const build = name => createCreature({name, symbol: 79, color: 1});
const boxOf = o => new THREE.Box3().setFromObject(o, true);
const moved = (a, b) => a.min.distanceTo(b.min) + a.max.distanceTo(b.max);
const places = g => { g.updateMatrixWorld(true); const m = new Map(); g.traverse(o => { if (o.isMesh) m.set(o, boxOf(o)); }); return m; };
const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };

test('every ogre has a head, two arms and two legs as named joints', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints;
    assert(j, name + ' joints');
    assert.equal(j.head, a.head, name);
    assert.equal(j.neck0, a.head, name + ': the neck pivot is the head group');
    assert.equal(a.head.parent, a.body, name + ': the head hangs on the body');
    for (const label of ['fore', 'leg1']) for (const side of ['l', 'r']) {
      const o = j[side + label];
      assert(o && o.isObject3D && !o.isMesh, `${name} ${side}${label} is a group`);
      assert.equal(o.parent, a.body, `${name} ${side}${label}`);
      assert.equal(o.name, side + label, name);
      assert.equal(o.position.x < 0, side === 'l', `${name} ${side}${label} side`);
    }
    assert(a.legs.includes(j.lleg1) && a.legs.includes(j.rleg1), name + ': the legs are the rig legs');
    assert.notEqual(j.lfore, j.rfore, name);
    assert.equal(j.head_1, undefined, name);
    // no `arms` or `arm` handle: fidget.js and the other idle motions would start swinging them
    assert.equal(a.arms, undefined, name);
    assert.equal(a.arm, undefined, name);
  }
});

test('turning a joint moves everything on it and nothing else; the club stays on the body', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints, rest = places(a.g);
    for (const [label, axis, v] of [['neck0', 'x', .5], ['neck0', 'y', .6], ['lfore', 'x', .7], ['rfore', 'z', .5], ['lleg1', 'x', .6], ['rleg1', 'x', -.6]]) {
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

test('named joints leave every ogre drawn where it was: same bounds, same mesh count', () => {
  // bounds and mesh counts of each ogre on master before the joints were named (scale included)
  const before = {
    'ogre': [[-.434, 0, -.244], [.434, 1.221, .38], 22],
    'ogre lord': [[-.499, .006, -.281], [.494, 1.334, .437], 26],
    'ogre king': [[-.572, 0, -.385], [.572, 1.604, .549], 30],
    'unknown O': [[-.434, 0, -.244], [.434, 1.221, .38], 22],
  };
  for (const [name, [lo, hi, count]] of Object.entries(before)) {
    const a = build(name), b = boxOf(a.g);
    lo.forEach((v, k) => assert(Math.abs(b.min.getComponent(k) - v) < .001, `${name} min ${k}`));
    hi.forEach((v, k) => assert(Math.abs(b.max.getComponent(k) - v) < .001, `${name} max ${k}`));
    let meshes = 0; a.g.traverse(o => { if (o.isMesh) meshes++; });
    assert.equal(meshes, count, name);
  }
});
