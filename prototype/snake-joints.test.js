import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {updateSlither, coilOf} from './slither.js';
import {createCorpse} from './corpse.js';

// The snakes' coil on bones (family S, stage 1): tail0 where the coil rises, out to tail11 at the tip, nested in
// order on the body; the tube skinned along them by place on the curve, the rise on its own bone.
const NAMES = ['garter snake', 'snake', 'water moccasin', 'pit viper', 'python', 'cobra'];
const TAIL = Array.from({length: 12}, (_, i) => 'tail' + i);
const build = name => { const a = createCreature({name, symbol: 83}); a.g.updateMatrixWorld(true); return a; };
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
const bonesOf = (o, i) => {
  const s = o.geometry.attributes.skinIndex, w = o.geometry.attributes.skinWeight, r = [];
  for (let k = 0; k < 4; k++) if (w.getComponent(i, k) > 0) r.push(o.skeleton.bones[s.getComponent(i, k)].name);
  return r;
};

test('every snake has the coil chain tail0..tail11 nested in order on the body, winding out to the tip', () => {
  for (const name of NAMES) {
    const a = build(name), coil = coilOf(a);
    assert.equal(a.quirk, 'snake', name);
    for (const j of ['head', 'neck0', 'jaw', ...TAIL]) assert.ok(a.joints?.[j], `${name}: ${j}`);
    assert.equal(a.joints.head, a.jaw.parent, `${name}: head is the jaw's group`);
    assert.equal(a.joints.tail0.parent, a.body, `${name}: the chain hangs on the body`);
    for (let k = 1; k < TAIL.length; k++) assert.equal(a.joints[TAIL[k]].parent, a.joints[TAIL[k - 1]], `${name}: ${TAIL[k]} on ${TAIL[k - 1]}`);
    assert.ok(coil.isSkinnedMesh && coil.skeleton.bones.includes(a.joints.tail11), `${name}: the coil is skinned on its bones`);
    assert.equal(coil.parent, a.body, `${name}: the coil is still the body's tube`);
    assert.equal(coil.geometry.type, 'TubeGeometry', `${name}: cobra-rear finds the tube by its type`);
    const w = b => b.getWorldPosition(new THREE.Vector3()), mid = w(a.body);
    const flat = v => Math.hypot(v.x - mid.x, v.z - mid.z);
    assert.ok(flat(w(a.joints.tail11)) > flat(w(a.joints.tail6)) && flat(w(a.joints.tail6)) > flat(w(a.joints.tail0)), `${name}: the chain winds outward`);
    assert.ok(w(a.joints.tail11).y < w(a.joints.tail0).y, `${name}: the tip lies lower than the coil's top`);
  }
});

test('the coil at rest is exactly as built (the actor\'s scale counted once), and rings ride bones in order', () => {
  for (const name of NAMES) {
    const a = build(name), coil = coilOf(a), v = new THREE.Vector3(), p = coil.geometry.attributes.position;
    coil.skeleton.update();
    for (let i = 0; i < p.count; i++) { coil.getVertexPosition(i, v); assert.ok(v.distanceTo(new THREE.Vector3().fromBufferAttribute(p, i)) < 1e-5, `${name}: vertex ${i}`); }
    // the world box of the skinned coil matches the rest tube's (a python and a cobra are scaled up)
    const box = new THREE.Box3().setFromObject(coil, true), plain = new THREE.Box3().setFromBufferAttribute(p).applyMatrix4(coil.matrixWorld);
    assert.ok(box.min.distanceTo(plain.min) < 1e-4 && box.max.distanceTo(plain.max) < 1e-4, `${name}: skinned box ${box.min.toArray()} vs ${plain.min.toArray()}`);
    let last = Infinity;
    for (let i = 0; i < p.count; i += 9) {
      const on = bonesOf(coil, i);
      if (on.includes('rise')) { assert.deepEqual(on, ['rise'], `${name}: the rise on its own bone`); continue; }
      const k = on.map(n => +n.slice(4));
      assert.ok(Math.max(...k) - Math.min(...k) <= 1, `${name}: ring ${i} on ${on}`);
      assert.ok(Math.min(...k) <= last, `${name}: rings toward the head ride bones nearer tail0`); last = Math.min(...k);
    }
  }
});

test('turning a coil joint moves the coil past it and nothing before it; the rise and the head never move', () => {
  for (const name of ['garter snake', 'python', 'cobra']) {
    for (const k of [0, 3, 8]) {
      const a = build(name), before = verts(a), coil = coilOf(a);
      a.joints['tail' + k].rotation.y += .5; a.joints['tail' + k].rotation.x += .2;
      const after = verts(a);
      let moved = 0;
      before.forEach(({o, i, p}, n) => {
        const d = p.distanceTo(after[n].p);
        if (o !== coil) { assert.ok(d < 1e-9, `${name} tail${k}: ${o.userData.part} moved ${d}`); return; }
        const on = bonesOf(o, i);
        if (on.includes('rise')) { assert.ok(d < 1e-6, `${name} tail${k}: the rise moved ${d}`); return; }
        const j = on.map(s => +s.slice(4));
        if (Math.max(...j) < k) assert.ok(d < 1e-6, `${name} tail${k}: vertex ${i} (on ${on}) before the joint moved ${d}`);
        else if (Math.min(...j) > k) { assert.ok(d > 1e-4, `${name} tail${k}: vertex ${i} past the joint stayed`); moved++; }
      });
      assert.ok(moved > 40, `${name} tail${k}: ${moved} moved`);
      a.joints['tail' + k].rotation.set(0, 0, 0);
      verts(a).forEach(({p}, n) => assert.ok(p.distanceTo(before[n].p) < 1e-6, `${name} tail${k}: back exactly`));
    }
  }
});

test('the slither still ripples the skinned coil, and the bent coil carries the ripple', () => {
  const a = build('pit viper'), coil = coilOf(a), rest = verts(a).filter(e => e.o === coil).map(e => e.p);
  a.joints.tail4.rotation.y = .6;
  for (let f = 0; f < 20; f++) updateSlither(a, 1 / 30, f / 30, true);
  const after = verts(a).filter(e => e.o === coil).map(e => e.p);
  const far = after.reduce((m, p, i) => Math.max(m, p.distanceTo(rest[i])), 0);
  assert.ok(far > .01, `the coil moved ${far}`);
  assert.equal(coilOf(a).isSkinnedMesh, true, 'still skinned after the slither owns its geometry');
});

test('a snake corpse still bakes its coil (the skinned tube set in its pose)', () => {
  const factory = {creatureFactory: o => createCreature({...o, symbol: 83}), symbol: 83};
  for (const name of ['garter snake', 'cobra']) {
    const corpse = createCorpse(name, 2, 0, factory), body = corpse.children.find(o => o.userData.part === 'corpse');
    assert.ok(corpse.userData.lie, `${name}: its own model`);
    // every mesh of the standing model is in the bake, the skinned coil included (3072 of its vertices)
    let all = 0, coil = 0;
    createCreature({name, symbol: 83}).g.traverse(o => { if (!o.isMesh || o.userData.outline) return; const k = o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count; all += k; if (o.isSkinnedMesh) coil += k; });
    assert.ok(coil > 1000, `${name}: the coil is skinned (${coil})`);
    assert.equal(body.geometry.attributes.position.count, all, `${name}: the bake keeps every mesh`);
    const size = new THREE.Box3().setFromObject(corpse).getSize(new THREE.Vector3());
    assert.ok(Math.max(size.x, size.z) > .3, `${name}: the coil lies spread on the floor`);
    corpse.userData.dispose();
  }
});
