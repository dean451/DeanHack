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
    assert(j.head === a.head, name);
    // (since step 3 the neck is on bones: neck0 is its first bone and the head hangs on the last, neck3)
    assert(j.neck0?.isBone && j.neck0 !== a.head, name + ': neck0 is the neck\'s first bone');
    assert(a.head.parent === j.neck3, name + ': the head hangs on the top of the neck');
    for (const label of ['fore', 'leg1']) for (const side of ['l', 'r']) {
      const o = j[side + label];
      assert(o && o.isObject3D && !o.isMesh, `${name} ${side}${label} is a group`);
      // (the arms hang on the chest bone, the legs on the body at the pelvis)
      assert(o.parent === (label === 'fore' ? j.spine1 : a.body), `${name} ${side}${label}`);
      assert.equal(o.name, side + label, name);
      assert.equal(o.position.x < 0, side === 'l', `${name} ${side}${label} side`);
    }
    assert(a.legs.includes(j.lleg1) && a.legs.includes(j.rleg1), name + ': the legs are the rig legs');
    assert(j.lfore !== j.rfore, name);
    assert(j.head_1 === undefined, name);
    // no `arms` or `arm` handle: fidget.js and the other idle motions would start swinging them
    assert(a.arms === undefined, name);
    assert(a.arm === undefined, name);
  }
});

// every skinned vertex in the world as drawn now, and how much of its weight hangs past `root`
const verts = g => { g.updateMatrixWorld(true); const v = new THREE.Vector3(), out = [];
  g.traverse(m => { if (m.isSkinnedMesh) for (let i = 0; i < m.geometry.attributes.position.count; i++) { m.getVertexPosition(i, v); out.push(v.clone().applyMatrix4(m.matrixWorld)); } }); return out; };
const shareOn = (g, root) => { const out = [];
  g.traverse(m => { if (!m.isSkinnedMesh) return; const si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
    for (let i = 0; i < si.count; i++) { let w = 0; for (let k = 0; k < 4; k++) if (under(m.skeleton.bones[si.getComponent(i, k)], root)) w += sw.getComponent(i, k); out.push(w); } }); return out; };

test('turning a joint moves everything on it and nothing else; the club rides the right arm', () => {
  // (since step 3 the skin is one hide on the body: a skinned vertex is on a joint by its weight on the bones past it)
  for (const name of NAMES) {
    const a = build(name), j = a.joints, rest = places(a.g), restV = verts(a.g);
    for (const [label, axis, v] of [['neck0', 'x', .5], ['neck0', 'y', .6], ['head', 'x', .5], ['lfore', 'x', .7], ['rfore', 'z', .5], ['lleg1', 'x', .6], ['rleg1', 'x', -.6], ['spine0', 'x', .4]]) {
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
    assert(j.rfore_2.children.some(o => o.isGroup && o.children.some(m => m.isMesh)), name + ': the club is on the right wrist');
  }
});

test('named joints leave every ogre drawn where it was: same bounds, same mesh count', () => {
  // bounds and mesh counts of each ogre on master before the joints were named (scale included)
  const before = {
    'ogre': [[-.434, 0, -.244], [.434, 1.221, .38], 17],
    'ogre lord': [[-.499, .006, -.281], [.494, 1.334, .437], 26],
    // (since step 2 the king's nails ride the club on the wrist, so they no longer merge with his shoulder pads: one more)
    // (since step 3 the skin-coloured trunk and limbs are one hide, and the lord's faceted flesh one skin on its bones: fewer, the lord's the same)
    'ogre king': [[-.572, 0, -.385], [.572, 1.604, .549], 26],
    'unknown O': [[-.434, 0, -.244], [.434, 1.221, .38], 17],
  };
  for (const [name, [lo, hi, count]] of Object.entries(before)) {
    const a = build(name), b = boxOf(a.g);
    lo.forEach((v, k) => assert(Math.abs(b.min.getComponent(k) - v) < .001, `${name} min ${k}`));
    hi.forEach((v, k) => assert(Math.abs(b.max.getComponent(k) - v) < .001, `${name} max ${k}`));
    let meshes = 0; a.g.traverse(o => { if (o.isMesh) meshes++; });
    assert.equal(meshes, count, name);
  }
});
