import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const D = 68;
const FORMS = ['draken', 'wyvern', 'sirrush', 'leviathan', 'lindworm', 'baby draken'];
const make = name => createCreature({name, symbol: D});
const tip = (actor, bone) => { actor.g.updateMatrixWorld(true); return new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld); };
const skinned = actor => { const l = []; actor.g.traverse(o => { if (o.isSkinnedMesh) l.push(o); }); return l; };
const meshCount = actor => { let n = 0; actor.g.traverse(o => { if (o.isMesh) n++; }); return n; };

test('every dragon form hangs its neck, tail and head on named joints', () => {
  for (const name of FORMS) {
    const a = make(name), j = a.joints;
    assert(j && j.head, `${name}: head joint`);
    assert(j.tail7 || j.tail5, `${name}: tail joints`);
    assert(j.tail0.isBone && j.tail1.parent === j.tail0, `${name}: tail bones nest`);
    if (!/leviathan|lindworm/.test(name)) assert(j.neck5.isBone, `${name}: neck5`);
    assert(skinned(a).length >= 1, `${name}: skinned chains`);
    for (const s of skinned(a)) assert(s.skeleton.bones.length >= 6, name);
  }
});

test('turning a tail joint swings the tail tip; the neck before it stays put', () => {
  const a = make('draken'), j = a.joints;
  const tailTip = () => { const s = skinned(a)[0]; s.skeleton.update(); const p = s.geometry.attributes.position, i = j.tail7.name; let best = null, bw = -1; const idx = s.geometry.attributes.skinIndex, w = s.geometry.attributes.skinWeight, id = s.skeleton.bones.indexOf(j.tail7);
    const v = new THREE.Vector3(); for (let k = 0; k < p.count; k++) if (idx.getX(k) === id && w.getX(k) > bw) { bw = w.getX(k); v.fromBufferAttribute(p, k); s.applyBoneTransform(k, v); best = v.clone(); }
    return best.applyMatrix4(s.matrixWorld); };
  a.g.updateMatrixWorld(true);
  const before = tailTip(), neck = tip(a, j.neck5), head = tip(a, j.head);
  j.tail2.rotation.x = .5;
  a.g.updateMatrixWorld(true);
  const after = tailTip();
  assert(after.distanceTo(before) > .03 * a.g.scale.x, `tail tip moved ${after.distanceTo(before)}`);
  assert.equal(tip(a, j.neck5).distanceTo(neck), 0, 'neck5 exactly where it was');
  assert.equal(tip(a, j.head).distanceTo(head), 0, 'head unmoved by a tail joint');
});

test('turning a neck joint carries the head with it', () => {
  const a = make('draken'), j = a.joints, head = tip(a, j.head);
  j.neck2.rotation.x = .5;
  assert(tip(a, j.head).distanceTo(head) > .03, 'head follows the neck');
});

test('skinning does not add meshes: every form stays at or under its old count', () => {
  const before = {draken: 34, wyvern: 29, sirrush: 31, leviathan: 15, lindworm: 19, 'baby draken': 34};
  for (const [name, most] of Object.entries(before)) assert(meshCount(make(name)) <= most, `${name}: ${meshCount(make(name))} meshes`);
});
