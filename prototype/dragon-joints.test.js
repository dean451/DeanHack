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

// the posed position of every vertex of the skinned meshes weighted mostly to one of `bones`
const posed = (actor, names) => {
  actor.g.updateMatrixWorld(true); const out = [], v = new THREE.Vector3();
  for (const s of skinned(actor)) {
    s.skeleton.update(); const idx = s.geometry.attributes.skinIndex, w = s.geometry.attributes.skinWeight, p = s.geometry.attributes.position;
    for (let k = 0; k < p.count; k++) { const b = s.skeleton.bones[w.getX(k) >= .5 ? idx.getX(k) : idx.getY(k)]; if (!names.has(b.name)) continue; v.fromBufferAttribute(p, k); s.applyBoneTransform(k, v); out.push(v.clone().applyMatrix4(s.matrixWorld)); }
  }
  return out;
};

test('legs and wings are named joints too: each leg bends at hip, knee, hock and foot, each wing has its pivot', () => {
  for (const name of ['draken', 'wyvern', 'sirrush', 'lindworm', 'baby draken']) {
    const a = make(name), j = a.joints, legs = a.legs.map(l => l.name);
    assert(legs.length && legs.every(n => /^[lr](fore|hind)$/.test(n) && j[n] && j[n + '0']?.isBone && j[n + '0'].children.some(c => c.isBone)), `${name}: legs ${legs}`);
    for (const w of a.wings) assert(j[w.name] === w && j[w.name + '_inner'] === w.userData.inner && /^[lr]wing$/.test(w.name), `${name}: wing ${w.name}`);
  }
  // a four-legged dragon has all four, on the cat's sides (left is -x)
  const d = make('draken');
  assert.deepEqual(d.legs.map(l => l.name).sort(), ['lfore', 'lhind', 'rfore', 'rhind']);
  assert(d.joints.lfore.position.x < 0 && d.joints.rfore.position.x > 0);
});

test('a bent knee carries the foot and its claws and leaves the hip where it was', () => {
  const a = make('draken'), j = a.joints, foot = new Set(['lfore3', 'lfore4']), hip = new Set(['lfore0']);
  const f0 = posed(a, foot), h0 = posed(a, hip);
  j.lfore1.rotation.x = .8;
  const f1 = posed(a, foot), h1 = posed(a, hip);
  assert(f0.length > 50 && f0.every((p, i) => p.distanceTo(f1[i]) > .01), 'every foot and claw vertex moves with the knee');
  assert(h0.every((p, i) => p.distanceTo(h1[i]) < 1e-9), 'the hip stays');
});

test('nothing that rides a chain is left behind when it bends: no loose meshes on the tail or the legs, and the spade follows the tail', () => {
  for (const name of FORMS) {
    const a = make(name);
    const loose = [a.tail, ...a.legs].flatMap(g => g ? g.children.filter(c => c.isMesh) : []);
    assert.equal(loose.length, 0, `${name}: ${loose.length} meshes still fixed to the tail or a leg group`);
  }
  const a = make('draken'), j = a.joints, last = Object.keys(j).filter(n => /^tail\d+$/.test(n)).sort((p, q) => +p.slice(4) - +q.slice(4)).at(-1);
  const tip = new Set([last]), before = posed(a, tip);
  j.tail1.rotation.y = .7;
  const after = posed(a, tip);
  assert(before.length > 30 && before.every((p, i) => p.distanceTo(after[i]) > .02), 'the spade and its barbs swing with the tail');
});

test('a serpent bends along its whole length: the head rides the spine\'s front, the tail its end', () => {
  for (const name of ['leviathan', 'lindworm']) {
    const a = make(name), j = a.joints, spine = Object.keys(j).filter(n => /^spine\d+$/.test(n));
    assert(spine.length >= 9, `${name}: ${spine.length} spine bones`);
    a.g.updateMatrixWorld(true);
    const head = tip(a, j.head), tailRoot = tip(a, j.tail0);
    j.spine0.rotation.y = .4;
    assert(tip(a, j.head).distanceTo(head) > .01 && tip(a, j.tail0).distanceTo(tailRoot) > .01, `${name}: head and tail follow the spine`);
  }
});
