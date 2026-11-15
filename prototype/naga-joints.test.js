import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createCorpse} from './corpse.js';

// The nagas' joints (family N, stage 1): the raised neck is one skinned tube on neck0 (out of the coil) to neck4,
// with the head and all that grows on it (hood, eyes, crest, circlet) on the `head` bone; the nape's mane rides
// the neck's bones and the hood rim's crest the head bone.
const NAMES = ['red', 'black', 'golden', 'guardian', 'white'].flatMap(k => [`${k} naga`, `${k} naga hatchling`]);
const JOINTS = ['neck0', 'neck1', 'neck2', 'neck3', 'neck4', 'head'];
const build = name => { const a = createCreature({name, symbol: 78}); a.g.updateMatrixWorld(true); return a; };
// every vertex of every mesh, in world space (skinned ones as posed)
function verts(a) {
  a.g.updateMatrixWorld(true);
  const out = [], v = new THREE.Vector3();
  a.g.traverse(o => {
    if (!o.isMesh) return;
    if (o.isSkinnedMesh) o.skeleton.update();
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { if (o.isSkinnedMesh) o.getVertexPosition(i, v); else v.fromBufferAttribute(p, i); v.applyMatrix4(o.matrixWorld); out.push({o, i, p: v.clone()}); }
  });
  return out;
}
const restOf = (o, i) => new THREE.Vector3().fromBufferAttribute(o.geometry.attributes.position, i).applyMatrix4(o.matrixWorld);

// The bones each vertex rides (a plain mesh rides the bone it hangs under, or none).
function rides(o, i, bones) {
  if (o.isSkinnedMesh) { const s = o.geometry.attributes.skinIndex, w = o.geometry.attributes.skinWeight, r = []; for (let k = 0; k < 4; k++) if (w.getComponent(i, k) > 0) r.push(o.skeleton.bones[s.getComponent(i, k)]); return r; }
  for (let p = o.parent; p; p = p.parent) if (bones.includes(p)) return [p];
  return [];
}

test('every naga, grown and hatchling, has the neck chain and the head joint, nested in order on the sway pivot', () => {
  for (const name of NAMES) {
    const a = build(name);
    for (const j of JOINTS) assert.ok(a.joints?.[j]?.isBone, `${name}: ${j}`);
    assert.equal(a.joints.neck0.parent, a.tail, `${name}: the chain hangs on the neck group, the sway pivot`);
    for (let k = 1; k < JOINTS.length; k++) assert.equal(a.joints[JOINTS[k]].parent, a.joints[JOINTS[k - 1]], `${name}: ${JOINTS[k]} on ${JOINTS[k - 1]}`);
    assert.equal(a.head, undefined, `${name}: actor.head stays unset, so the slither still counter-turns the whole neck`);
    const parts = []; a.g.traverse(o => { if (o.isMesh) parts.push(o); });
    const neck = parts.find(m => m.userData.part === 'neck'), head = parts.find(m => m.userData.part === 'head');
    assert.ok(neck.isSkinnedMesh && neck.skeleton.bones.includes(a.joints.neck4), `${name}: the neck is skinned on its bones`);
    assert.equal(head.parent, a.joints.head, `${name}: the head hangs on the head bone`);
    for (const part of ['eyes', 'hood', 'spots', 'circlet', 'gems']) { const m = parts.find(p => p.userData.part === part); if (m) assert.equal(m.parent, a.joints.head, `${name}: the ${part} rides the head`); }
  }
});

test('at rest nothing moved: every skinned vertex sits where its built geometry put it', () => {
  for (const name of NAMES) {
    for (const {o, i, p} of verts(build(name))) if (o.isSkinnedMesh) assert.ok(p.distanceTo(restOf(o, i)) < 1e-5, `${name}: ${o.userData.part} vertex ${i} off by ${p.distanceTo(restOf(o, i))}`);
  }
});

test('turning a neck joint moves everything past it and nothing before it; turning the head moves only the head', () => {
  for (const name of NAMES) {
    for (const j of ['neck1', 'neck2', 'neck3', 'head']) {
      const a = build(name), bones = JOINTS.map(n => a.joints[n]), k = JOINTS.indexOf(j);
      const before = verts(a);
      a.joints[j].rotation.x += .6; a.joints[j].rotation.y += .3;
      const after = verts(a);
      let movedPast = 0;
      before.forEach(({o, i, p}, n) => {
        const d = p.distanceTo(after[n].p), on = rides(o, i, bones).map(b => bones.indexOf(b));
        const max = on.length ? Math.max(...on) : -1;
        if (max < k) assert.ok(d < 1e-6, `${name} ${j}: ${o.userData.part} vertex ${i} (on ${on}) before the joint moved ${d}`);
        else if (Math.min(...on) >= k + 1 || (j === 'head' && on.every(b => b === k))) { assert.ok(d > 1e-4, `${name} ${j}: ${o.userData.part} vertex ${i} past the joint stayed`); movedPast++; }
      });
      assert.ok(movedPast > 50, `${name} ${j}: ${movedPast} vertices moved past it`);
      // the coil never moves; the head goes with every joint
      for (const n of before.keys()) if (before[n].o.userData.part === 'coil') assert.ok(before[n].p.distanceTo(after[n].p) < 1e-9);
      const hb = before.findIndex(e => e.o.userData.part === 'head');
      assert.ok(before[hb].p.distanceTo(after[hb].p) > 1e-3, `${name} ${j}: the head follows`);
    }
  }
});

test('the mane splits: the hood rim crest rides the head bone, the nape rides the neck', () => {
  for (const name of ['red naga', 'black naga', 'white naga']) {
    const a = build(name); let mane = null; a.g.traverse(o => { if (o.userData.part === 'mane') mane = o; });
    assert.ok(mane?.isSkinnedMesh, name);
    const bones = mane.skeleton.bones, idx = mane.geometry.attributes.skinIndex, w = mane.geometry.attributes.skinWeight, on = new Set();
    for (let i = 0; i < idx.count; i++) for (let k = 0; k < 4; k++) if (w.getComponent(i, k) > 0) on.add(bones[idx.getComponent(i, k)].name);
    assert.ok(on.has('head') && on.has('neck1'), `${name}: rides ${[...on]}`);
  }
});

test('a dead naga keeps its neck: the slumped corpse bakes the skinned neck as it lies', () => {
  for (const name of ['red naga', 'white naga', 'red naga hatchling']) {
    const c = createCorpse(name, undefined, 0, {creatureFactory: createCreature, symbol: 78}); c.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(c), size = b.getSize(new THREE.Vector3());
    let n = 0; c.traverse(o => { if (o.isMesh) n += o.geometry.attributes.position.count; });
    // the baked corpse holds at least the coil, the neck and the head (non-indexed, as the bake makes them)
    const flat = m => m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count;
    let want = 0; build(name).g.traverse(o => { if (o.isMesh && ['coil', 'neck', 'head'].includes(o.userData.part)) want += flat(o); });
    assert.ok(n >= want, `${name}: ${n} vertices baked, the coil, neck and head alone have ${want}`);
    assert.ok(Math.max(size.x, size.z) > 1.15 * Math.min(size.x, size.z), `${name}: the neck lies out past the coil (${size.x.toFixed(2)} x ${size.z.toFixed(2)})`);
  }
});
