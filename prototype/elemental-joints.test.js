// Family E stage 1 step 1: the stalker and the elementals with bodies (fire, earth; air and water are skipped
// by the plan) expose named joints, and each joint turns only what hangs on it.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const MEMBERS = ['stalker', 'fire elemental', 'earth elemental'];
const build = name => createCreature({name, symbol: 69, color: 7});
const boxOf = o => new THREE.Box3().setFromObject(o, true);
const moved = (a, b) => a.min.distanceTo(b.min) + a.max.distanceTo(b.max);
// every mesh's world box, keyed by the mesh (merged pieces sit at their group's origin, so a position alone hides a turn)
const places = g => { g.updateMatrixWorld(true); const m = new Map(); g.traverse(o => { if (o.isMesh) m.set(o, boxOf(o)); }); return m; };
const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };

test('every member has a head, two arms and a funnel or two legs as named joints', () => {
  for (const name of MEMBERS) {
    const a = build(name), j = a.joints;
    assert(j, name + ' joints');
    assert.equal(j.head, a.head, name);
    assert.equal(j.neck0, a.head, name + ': the neck pivot is the head group');
    assert.equal(a.head.parent, a.body, name + ': the head hangs on the body');
    for (const side of ['l', 'r']) {
      assert(j[side + 'fore'], `${name} ${side}fore`);
      assert.equal(j[side + 'fore'].position.x < 0, side === 'l', `${name} ${side} arm side`);
    }
    if (name === 'earth elemental') {
      for (const side of ['l', 'r']) {
        assert(a.legs.includes(j[side + 'leg1']), `${name} ${side}leg1 is a leg`);
        assert.equal(j[side + 'leg1'].position.x < 0, side === 'l', `${name} ${side} leg side`);
      }
      assert.equal(j.tail0, undefined, 'the earth elemental stands on legs, no funnel');
    } else {
      assert.equal(j.tail0, a.tail, name + ': the funnel is tail0');
      assert.equal(a.legs.length, 0, name);
    }
    assert.equal(a.arms, undefined, name + ': arms are not swung by the fidget');
    if (a.crown) assert.equal(a.crown.parent, a.head, name + ': the crown rides the head');
  }
});

test('turning a joint moves everything on it and nothing else', () => {
  for (const name of MEMBERS) {
    const a = build(name), j = a.joints, rest = places(a.g);
    const check = (joint, label) => {
      const now = places(a.g);
      let on = 0;
      for (const [mesh, p] of rest) {
        const d = moved(now.get(mesh), p);
        if (under(mesh, joint)) { if (d > 1e-4) on++; }
        else assert(d < 1e-9, `${name}: turning ${label} moved a mesh not on it (${mesh.name || mesh.geometry.type})`);
      }
      assert(on > 0, `${name}: turning ${label} moved what hangs on it`);
    };
    for (const [label, axis, v] of [['neck0', 'x', .6], ['lfore', 'x', .7], ['rfore', 'z', .5], ...(j.tail0 ? [['tail0', 'x', .5]] : [['lleg1', 'x', .5], ['rleg1', 'x', .5]])]) {
      const joint = j[label];
      joint.rotation[axis] += v; check(joint, label); joint.rotation[axis] -= v;
    }
    // what rides each joint: the face on the head, the fists (and the stalker's claws) on the arms
    const face = boxOf(a.head), arm = boxOf(j.lfore);
    assert(face.max.y - face.min.y > .1 && arm.max.y - arm.min.y > .2, name + ': the head and arm groups hold their parts');
    a.g.updateMatrixWorld(true);
    assert(moved(boxOf(a.head), face) < 1e-9, name + ': back at rest');
  }
});

test('the stalker\'s claws ride its arms and its gaping maw rides its head', () => {
  // the same builder without them (the air elemental) is the control: the stalker's arm groups reach lower and its head holds more
  const s = build('stalker'), air = build('air elemental');
  for (const a of [s, air]) { a.g.scale.setScalar(1); a.g.updateMatrixWorld(true); }
  for (const side of ['lfore', 'rfore']) assert(boxOf(s.joints[side]).min.y < boxOf(air.joints[side]).min.y - .05, side + ': the claws hang off the fist');
  const meshes = o => { let n = 0; o.traverse(m => { if (m.isMesh) n++; }); return n; };
  assert(meshes(s.head) >= meshes(air.head) + 2, 'the black maw and the fangs (their own materials) are on the head');
});
