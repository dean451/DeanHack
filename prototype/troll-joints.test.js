// Family T stage 1 step 1: every troll exposes named joints (`head` / `neck0`, `lfore` / `rfore`, `lleg1` / `rleg1`),
// each joint turns only what hangs on it, the handles troll-knit.js uses are kept, and the model is drawn where it was.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const NAMES = ['troll', 'ice troll', 'rock troll', 'water troll', 'olog-hai', 'unknown T'];
const build = name => createCreature({name, symbol: 84, color: 2});
const boxOf = o => new THREE.Box3().setFromObject(o, true);
const moved = (a, b) => a.min.distanceTo(b.min) + a.max.distanceTo(b.max);
const places = g => { g.updateMatrixWorld(true); const m = new Map(); g.traverse(o => { if (o.isMesh) m.set(o, boxOf(o)); }); return m; };
const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };

test('every troll has a head, two arms and two legs as named joints', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints;
    assert(j, name + ' joints');
    assert(j.head === a.head, name);
    // (since step 3 the neck is on bones: neck0 is its first bone and the head hangs on the last, neck3)
    assert(j.neck0?.isBone && j.neck0 !== a.head, name + ': neck0 is the neck\'s first bone');
    assert(a.head.parent === j.neck3, name + ': the head hangs on the top of the neck');
    assert.equal(a.head.name, 'head', name);
    for (const label of ['fore', 'leg1']) for (const side of ['l', 'r']) {
      const o = j[side + label];
      assert(o && o.isObject3D && !o.isMesh, `${name} ${side}${label} is a group`);
      // (since step 3 the arms hang on the chest bone, the legs on the body at the pelvis)
      assert(o.parent === (label === 'fore' ? j.spine1 : a.body), `${name} ${side}${label} hangs on the chest or the pelvis`);
      assert.equal(o.name, side + label, name);
      assert.equal(o.position.x < 0, side === 'l', `${name} ${side}${label} side`);
      assert(o.children.some(m => m.isMesh), `${name} ${side}${label} carries its limb`);
    }
    assert(a.legs.includes(j.lleg1) && a.legs.includes(j.rleg1), name + ': the legs are the rig legs');
    // (the troll already had `arms` and `arm` for troll-knit.js; naming the joints keeps them, the same groups)
    assert.deepEqual([...a.arms].sort((x, y) => x.position.x - y.position.x), [j.lfore, j.rfore], name + ': arms are the arm joints');
    assert(a.arm === j.rfore, name + ': arm is the right arm');
    assert.equal(a.troll, name === 'unknown T' ? 'troll' : name, name);
    assert(j.head_1 === undefined, name);
  }
});

// every skinned vertex in the world as drawn now, and how much of its weight hangs past `root`
const verts = g => { g.updateMatrixWorld(true); const v = new THREE.Vector3(), out = [];
  g.traverse(m => { if (m.isSkinnedMesh) for (let i = 0; i < m.geometry.attributes.position.count; i++) { m.getVertexPosition(i, v); out.push(v.clone().applyMatrix4(m.matrixWorld)); } }); return out; };
const shareOn = (g, root) => { const out = [];
  g.traverse(m => { if (!m.isSkinnedMesh) return; const si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
    for (let i = 0; i < si.count; i++) { let w = 0; for (let k = 0; k < 4; k++) if (under(m.skeleton.bones[si.getComponent(i, k)], root)) w += sw.getComponent(i, k); out.push(w); } }); return out; };

test('turning a joint moves everything on it and nothing else', () => {
  // (since step 3 the skin is one hide on the body: a skinned vertex is on a joint by its weight on the bones past it)
  for (const name of NAMES) {
    const a = build(name), j = a.joints, rest = places(a.g), restV = verts(a.g);
    for (const [label, axis, v] of [['neck0', 'x', .5], ['head', 'y', .6], ['lfore', 'x', .7], ['rfore', 'z', .5], ['lleg1', 'x', .6], ['rleg1', 'x', -.6], ['spine0', 'x', .4]]) {
      const joint = j[label], share = shareOn(a.g, joint);
      joint.rotation[axis] += v;
      const now = places(a.g), nowV = verts(a.g);
      let on = 0;
      for (const [mesh, p] of rest) {
        if (mesh.isSkinnedMesh) continue;
        const d = moved(now.get(mesh), p);
        if (under(mesh, joint)) { if (d > 1e-4) on++; }
        else assert(d < 1e-9, `${name}: turning ${label} moved a mesh not on it`);
      }
      restV.forEach((r, i) => { const d = r.distanceTo(nowV[i]); if (share[i] === 0) assert(d < 1e-6, `${name}: turning ${label} moved skin not on it`); else if (share[i] > .5 && d > 1e-3) on++; });
      assert(on > 0, `${name}: turning ${label} moved what hangs on it`);
      joint.rotation[axis] -= v;
    }
  }
});

test('named joints leave every troll drawn where it was: same bounds, same mesh count', () => {
  // bounds and mesh counts of each troll on master before the joints were named (scale included)
  const before = {
    // (since step 3 the skin-coloured trunk and the four limbs' skins are one hide: four meshes fewer on each)
    'troll': [[-.537, -.013, -.412], [.537, 1.423, .552], 21],
    'ice troll': [[-.537, -.013, -.412], [.537, 1.423, .552], 25],
    'rock troll': [[-.537, -.013, -.412], [.537, 1.423, .552], 22],
    'water troll': [[-.486, -.012, -.397], [.486, 1.379, .499], 21],
    'olog-hai': [[-.557, -.014, -.427], [.557, 1.476, .573], 25],
    'unknown T': [[-.398, -.01, -.305], [.398, 1.054, .409], 19],
  };
  for (const [name, [lo, hi, count]] of Object.entries(before)) {
    const a = build(name), b = boxOf(a.g);
    lo.forEach((v, k) => assert(Math.abs(b.min.getComponent(k) - v) < .001, `${name} min ${k}`));
    hi.forEach((v, k) => assert(Math.abs(b.max.getComponent(k) - v) < .001, `${name} max ${k}`));
    let meshes = 0; a.g.traverse(o => { if (o.isMesh) meshes++; });
    assert.equal(meshes, count, name);
  }
});
