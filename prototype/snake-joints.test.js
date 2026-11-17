import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {updateSlither, coilOf} from './slither.js';
import {createCorpse} from './corpse.js';
import {updateCobraRear} from './cobra-rear.js';

// The snakes' coil on bones (family S, stage 1): tail0 where the coil rises, out to tail11 at the tip, nested in
// order on the body, and neck0..neck3 up the rise with the head on neck3; the tube skinned along both by place on
// the curve.
const NAMES = ['garter snake', 'snake', 'water moccasin', 'pit viper', 'python', 'cobra'];
const TAIL = Array.from({length: 12}, (_, i) => 'tail' + i), NECK = ['neck0', 'neck1', 'neck2', 'neck3'];
const onNeck = on => on.some(n => n.startsWith('neck'));
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
    for (const j of ['head', 'jaw', ...NECK, ...TAIL]) assert.ok(a.joints?.[j], `${name}: ${j}`);
    assert.equal(a.joints.head, a.jaw.parent, `${name}: head is the jaw's group`);
    assert.equal(a.joints.tail0.parent, a.body, `${name}: the chain hangs on the body`);
    for (let k = 1; k < TAIL.length; k++) assert.equal(a.joints[TAIL[k]].parent, a.joints[TAIL[k - 1]], `${name}: ${TAIL[k]} on ${TAIL[k - 1]}`);
    assert.equal(a.joints.neck0.parent, a.body, `${name}: the neck hangs on the body, not on the coil`);
    for (let k = 1; k < NECK.length; k++) assert.equal(a.joints[NECK[k]].parent, a.joints[NECK[k - 1]], `${name}: ${NECK[k]} on ${NECK[k - 1]}`);
    assert.equal(a.joints.head.parent, a.joints.neck3, `${name}: the head hangs on the last neck bone`);
    assert.ok(coil.skeleton.bones.includes(a.joints.neck3), `${name}: the rise is skinned on the neck`);
    assert.ok(coil.isSkinnedMesh && coil.skeleton.bones.includes(a.joints.tail11), `${name}: the coil is skinned on its bones`);
    assert.equal(coil.parent, a.body, `${name}: the coil is still the body's tube`);
    assert.equal(coil.geometry.type, 'TubeGeometry', `${name}: cobra-rear finds the tube by its type`);
    const w = b => b.getWorldPosition(new THREE.Vector3()), mid = w(a.body);
    const flat = v => Math.hypot(v.x - mid.x, v.z - mid.z);
    assert.ok(flat(w(a.joints.tail11)) > flat(w(a.joints.tail6)) && flat(w(a.joints.tail6)) > flat(w(a.joints.tail0)), `${name}: the chain winds outward`);
    assert.ok(w(a.joints.tail11).y < w(a.joints.tail0).y, `${name}: the tip lies lower than the coil's top`);
    for (let k = 1; k < NECK.length; k++) assert.ok(w(a.joints[NECK[k]]).y > w(a.joints[NECK[k - 1]]).y, `${name}: the neck climbs`);
    assert.ok(w(a.joints.neck0).distanceTo(w(a.joints.tail0)) < 1e-6, `${name}: the neck rises from the coil's top`);
    // the head sits where it always did: (0, .44, .18) in the body's frame
    const h = a.body.worldToLocal(w(a.joints.head));
    assert.ok(h.distanceTo(new THREE.Vector3(0, .44, .18)) < 1e-9, `${name}: head at ${h.toArray()}`);
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
      if (onNeck(on)) { assert.ok(on.every(n => n.startsWith('neck')), `${name}: ring ${i} on ${on} (the rise on the neck alone)`); continue; }
      const k = on.map(n => +n.slice(4));
      assert.ok(Math.max(...k) - Math.min(...k) <= 1, `${name}: ring ${i} on ${on}`);
      assert.ok(Math.min(...k) <= last, `${name}: rings toward the head ride bones nearer tail0`); last = Math.min(...k);
    }
  }
});

test('turning a coil joint moves the coil past it and nothing before it; the neck and the head never move', () => {
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
        if (onNeck(on)) { assert.ok(d < 1e-6, `${name} tail${k}: the rise moved ${d}`); return; }
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

test('turning a neck joint carries the rise past it and the head, and leaves the coil and the rise before it', () => {
  for (const name of ['garter snake', 'python', 'cobra']) {
    for (const k of [0, 1, 2]) {
      const a = build(name), before = verts(a), coil = coilOf(a), j = a.joints['neck' + k];
      j.rotation.x -= .4; j.rotation.y += .3;
      const after = verts(a);
      let rise = 0;
      const far = new Map();
      before.forEach(({o, i, p}, n) => {
        const d = p.distanceTo(after[n].p);
        if (o !== coil) { far.set(o, Math.max(far.get(o) || 0, d)); return; }
        const on = bonesOf(o, i);
        if (!onNeck(on)) { assert.ok(d < 1e-6, `${name} neck${k}: coil vertex ${i} (on ${on}) moved ${d}`); return; }
        const m = on.map(s => +s.slice(4));
        if (Math.max(...m) < k) assert.ok(d < 1e-6, `${name} neck${k}: rise vertex ${i} (on ${on}) before the joint moved ${d}`);
        else if (Math.min(...m) > k) { assert.ok(d > 1e-4, `${name} neck${k}: rise vertex ${i} past the joint stayed`); rise++; }
      });
      // the head and everything on it (skull, eyes, jaw, tongue, a cobra's hood) ride the neck
      for (const [o, d] of far) assert.ok(d > 5e-3, `${name} neck${k}: ${o.userData.part || o.type} stayed (${d})`);
      assert.ok(far.size >= 4 && rise > 0, `${name} neck${k}: ${far.size} head meshes and ${rise} rise vertices moved`);
      j.rotation.set(0, 0, 0);
      verts(a).forEach(({p}, n) => assert.ok(p.distanceTo(before[n].p) < 1e-6, `${name} neck${k}: back exactly`));
    }
  }
});

test('the reared cobra\'s neck beads still end at the head\'s neck joint, now through the neck bones', () => {
  const a = build('cobra'), look = new THREE.Vector3(0, 0, 1.2);
  a.species = 'cobra';
  // a turned neck bone moves the head off the body's frame: the beads must follow it there
  a.joints.neck2.rotation.x = -.3;
  for (let f = 0; f < 90; f++) updateCobraRear(a, 1 / 30, f / 30, false, look);
  const st = a.cobraRear;
  assert.ok(st.neck.visible, 'reared: the bead neck shows');
  a.g.updateMatrixWorld(true);
  const m = new THREE.Matrix4(), end = new THREE.Vector3();
  st.neck.getMatrixAt(st.neck.count - 1, m); end.setFromMatrixPosition(m).applyMatrix4(a.body.matrixWorld);
  const join = new THREE.Vector3(0, -.04, -.06).applyMatrix4(a.joints.head.matrixWorld);
  assert.ok(end.distanceTo(join) < 1e-6, `the last bead ${end.toArray()} at the joint ${join.toArray()}`);
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
