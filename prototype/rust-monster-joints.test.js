// Family R stage 1 step 1: the rust monster and the disenchanter expose named joints (`head` / `neck0`,
// `tail0`, `vane`, `lleg0` / `rleg0` fore, `lleg1` / `rleg1` hind, `lfeeler` / `rfeeler`), each joint turns only
// what hangs on it, and the model is drawn where it was before.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {feels} from './rust-feel.js';

const NAMES = ['rust monster', 'disenchanter'];
const build = name => createCreature({name, symbol: 82, color: 3});
const boxOf = o => new THREE.Box3().setFromObject(o, true);
const moved = (a, b) => a.min.distanceTo(b.min) + a.max.distanceTo(b.max);
const places = g => { g.updateMatrixWorld(true); const m = new Map(); g.traverse(o => { if (o.isMesh) m.set(o, boxOf(o)); }); return m; };
const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };

test('rust monsters and disenchanters have a head, tail, vane, four legs and two feelers as named joints', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints;
    assert(j, name + ' joints');
    assert(j.head === a.head && j.neck0 === a.head && j.head === a.feelHead, name + ': head and neck0 are the head group');
    assert(j.tail0 === a.tail && j.vane === a.vane && a.vane.parent === a.tail, name + ': the vane rides the tail');
    for (const leg of ['lleg0', 'rleg0', 'lleg1', 'rleg1']) {
      const o = j[leg];
      assert(o && !o.isMesh && a.legs.includes(o), `${name} ${leg} is a rig leg`);
      assert.equal(o.name, leg);
      assert.equal(o.position.x < 0, leg[0] === 'l', `${name} ${leg} side`);
      assert.equal(o.position.z > 0, leg.endsWith('0'), `${name} ${leg} fore or hind`);
    }
    assert.equal(new Set(['lleg0', 'rleg0', 'lleg1', 'rleg1'].map(k => j[k])).size, 4, name + ': four different legs');
    assert(j.lfeeler === a.feelers[0] && j.rfeeler === a.feelers[1], name + ': the feelers, left first');
    assert(j.lfeeler.position.x < 0 && j.rfeeler.position.x > 0 && j.lfeeler.parent === a.head, name);
    assert(feels(a), name + ': rust-feel.js still drives it');
  }
});

test('turning a joint moves everything on it and nothing else', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints, rest = places(a.g);
    for (const [label, axis, v] of [['neck0', 'y', .6], ['head', 'x', .4], ['tail0', 'y', .7], ['tail0', 'x', -.5], ['vane', 'z', 1.1],
      ['lleg0', 'x', .6], ['rleg0', 'z', -.5], ['lleg1', 'x', -.6], ['rleg1', 'x', .6], ['lfeeler', 'x', .7], ['rfeeler', 'y', -.6]]) {
      const joint = j[label];
      joint.rotation[axis] += v;
      const now = places(a.g);
      let on = 0;
      for (const [mesh, p] of rest) {
        const d = moved(now.get(mesh), p);
        if (under(mesh, joint)) { if (d > 1e-4) on++; }
        else assert(d < 1e-9, `${name}: turning ${label} moved ${mesh.userData.part}, not on it`);
      }
      assert(on > 0, `${name}: turning ${label} moved what hangs on it`);
      joint.rotation[axis] -= v;
    }
    // past and before: the tail carries the vane, the head carries the feelers, and neither the reverse
    for (const [outer, inner] of [['tail0', 'vane'], ['head', 'lfeeler'], ['head', 'rfeeler']]) {
      assert(under(j[inner], j[outer]), `${name}: ${inner} hangs past ${outer}`);
      assert(!under(j[outer], j[inner]), `${name}: ${outer} is not past ${inner}`);
    }
  }
});

test('named joints leave rust monsters and disenchanters drawn where they were: same bounds, same mesh count', () => {
  // bounds and mesh counts on master before the joints were named (scale included)
  const before = {
    'rust monster': [[-.239, .003, -.530], [.239, .578, .510], 11],
    'disenchanter': [[-.353, .005, -.783], [.353, .861, .733], 13],
  };
  for (const [name, [lo, hi, count]] of Object.entries(before)) {
    const a = build(name);
    a.g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(a.g, true);
    lo.forEach((v, i) => assert(Math.abs(b.min.getComponent(i) - v) < .002, `${name} min ${i}: ${b.min.getComponent(i)}`));
    hi.forEach((v, i) => assert(Math.abs(b.max.getComponent(i) - v) < .002, `${name} max ${i}: ${b.max.getComponent(i)}`));
    let n = 0; a.g.traverse(o => { if (o.isMesh) n++; });
    assert.equal(n, count, name + ' meshes');
  }
});
