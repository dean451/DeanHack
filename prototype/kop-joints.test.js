// Family K stage 1 step 1: every Kop exposes named joints (`head` / `neck0`, `lfore` / `rfore`, `lleg1` /
// `rleg1`), each joint turns only what hangs on it, and the model is drawn where it was before.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const MEMBERS = ['keystone kop', 'kop sergeant', 'kop lieutenant', 'kop kaptain'];
const build = name => createCreature({name, symbol: 75, color: 4});
const boxOf = o => new THREE.Box3().setFromObject(o, true);
const moved = (a, b) => a.min.distanceTo(b.min) + a.max.distanceTo(b.max);
const places = g => { g.updateMatrixWorld(true); const m = new Map(); g.traverse(o => { if (o.isMesh) m.set(o, boxOf(o)); }); return m; };
const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };

test('every kop has a head, two arms and two legs as named joints', () => {
  for (const name of MEMBERS) {
    const a = build(name), j = a.joints;
    assert(j, name + ' joints');
    assert.equal(j.head, a.head, name);
    assert.equal(j.neck0, a.head, name + ': the neck pivot is the head group');
    assert.equal(a.head.parent, a.body, name + ': the head hangs on the body');
    for (const side of ['l', 'r']) {
      assert.equal(j[side + 'fore'].parent, a.body, `${name} ${side}fore`);
      assert.equal(j[side + 'fore'].position.x < 0, side === 'l', `${name} ${side} arm side`);
      assert(a.legs.includes(j[side + 'leg1']), `${name} ${side}leg1 is a leg`);
      assert.equal(j[side + 'leg1'].position.x < 0, side === 'l', `${name} ${side} leg side`);
    }
    assert.equal(a.arms, undefined, name + ': arms are not swung by the fidget');
    assert(under(a.tail, j.rfore), name + ': the truncheon (the tail) rides the raised right arm');
  }
});

test('turning a joint moves everything on it and nothing else', () => {
  for (const name of MEMBERS) {
    const a = build(name), j = a.joints, rest = places(a.g);
    for (const [label, axis, v] of [['neck0', 'x', .6], ['lfore', 'x', .7], ['rfore', 'z', .5], ['lleg1', 'x', .5], ['rleg1', 'x', .5]]) {
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

test('the face and helmet ride the head, the fists the arms, the truncheon swings with the right arm', () => {
  for (const name of MEMBERS) {
    const a = build(name), j = a.joints;
    a.g.updateMatrixWorld(true);
    const head = boxOf(a.head), body = boxOf(a.g);
    // the head group reaches from the moustache to the helmet's knob, level with the raised truncheon at the top
    assert(body.max.y - head.max.y < .03, name + ': the helmet rides the head, up at the top of the kop');
    assert(head.max.y - head.min.y > .3, name + ': the head group holds the face and the helmet');
    for (const side of ['lfore', 'rfore']) { const b = boxOf(j[side]); assert(b.max.y - b.min.y > .15, name + ' ' + side + ' holds the arm'); }
    // turning the right shoulder carries the truncheon's tip
    const tip = new THREE.Vector3(), after = new THREE.Vector3();
    a.tail.getWorldPosition(tip);
    j.rfore.rotation.z += .5; a.g.updateMatrixWorld(true); a.tail.getWorldPosition(after); j.rfore.rotation.z -= .5;
    assert(after.distanceTo(tip) > .05, name + ': the truncheon follows the arm');
  }
});

test('named joints leave the kop drawn where it was: same bounds, under the mesh cap', () => {
  // bounds of each kop on master before the joints were named (scale included)
  const before = {
    'keystone kop': [[-.294, .011, -.179], [.310, 1.173, .186]],
    'kop kaptain': [[-.321, .012, -.195], [.337, 1.277, .203]],
  };
  for (const [name, [lo, hi]] of Object.entries(before)) {
    const a = build(name), b = boxOf(a.g);
    lo.forEach((v, k) => assert(Math.abs(b.min.getComponent(k) - v) < .001, `${name} min ${k}`));
    hi.forEach((v, k) => assert(Math.abs(b.max.getComponent(k) - v) < .001, `${name} max ${k}`));
    let meshes = 0; a.g.traverse(o => { if (o.isMesh) meshes++; });
    assert(meshes <= 25, `${name}: ${meshes} meshes`);
  }
});
