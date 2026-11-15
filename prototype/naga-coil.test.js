import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {updateSlither, coilOf} from './slither.js';

// The nagas' coil on bones (family N, stage 1): tail0 where the coil rises into the neck, out to tail11 by the tip,
// nested in order on the body; the coil (and the white naga's rime) skinned along them by place on the curve.
const NAMES = ['red', 'black', 'golden', 'guardian', 'white'].flatMap(k => [`${k} naga`, `${k} naga hatchling`]);
const TAIL = Array.from({length: 12}, (_, i) => 'tail' + i);
const build = name => { const a = createCreature({name, symbol: 78}); a.g.updateMatrixWorld(true); return a; };
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
const coilBonesOf = (o, i) => {
  const s = o.geometry.attributes.skinIndex, w = o.geometry.attributes.skinWeight, r = [];
  for (let k = 0; k < 4; k++) if (w.getComponent(i, k) > 0) r.push(o.skeleton.bones[s.getComponent(i, k)].name);
  return r;
};

test('every naga has the coil chain tail0..tail11, nested in order on the body, from the neck end out to the tip', () => {
  for (const name of NAMES) {
    const a = build(name), coil = coilOf(a);
    for (const j of TAIL) assert.ok(a.joints?.[j]?.isBone, `${name}: ${j}`);
    assert.equal(a.joints.tail0.parent, a.body, `${name}: the chain hangs on the body`);
    for (let k = 1; k < TAIL.length; k++) assert.equal(a.joints[TAIL[k]].parent, a.joints[TAIL[k - 1]], `${name}: ${TAIL[k]} on ${TAIL[k - 1]}`);
    assert.ok(coil.isSkinnedMesh && coil.skeleton.bones.includes(a.joints.tail11), `${name}: the coil is skinned on its bones`);
    // tail0 sits where the neck leaves the coil, tail11 out by the tip on the outer turn
    const w = b => b.getWorldPosition(new THREE.Vector3()), neck = a.tail.getWorldPosition(new THREE.Vector3());
    assert.ok(w(a.joints.tail0).distanceTo(neck) < .01, `${name}: tail0 at the neck's root`);
    const flat = v => Math.hypot(v.x - neck.x, v.z - neck.z);
    assert.ok(flat(w(a.joints.tail11)) > flat(w(a.joints.tail5)), `${name}: the chain winds outward`);
  }
});

test('the coil at rest is exactly as built, and its bend follows the curve, not the nearest turn', () => {
  for (const name of NAMES) {
    const a = build(name), coil = coilOf(a), v = new THREE.Vector3(), p = coil.geometry.attributes.position;
    coil.skeleton.update();
    for (let i = 0; i < p.count; i++) { coil.getVertexPosition(i, v); assert.ok(v.distanceTo(new THREE.Vector3().fromBufferAttribute(p, i)) < 1e-5, `${name}: vertex ${i}`); }
    // each ring rides two neighbouring bones, and rings further out ride bones further out
    let last = -1;
    for (let i = p.count - 1; i >= 0; i -= 7) {
      const on = coilBonesOf(coil, i).map(n => +n.slice(4));
      assert.ok(Math.max(...on) - Math.min(...on) <= 1, `${name}: ring of ${i} on ${on}`);
      assert.ok(Math.min(...on) >= last - 0, `${name}: rings ride bones in order`); last = Math.min(...on);
    }
  }
});

test('turning a coil joint moves the coil past it and nothing before it; the neck and head never move', () => {
  for (const name of ['red naga', 'white naga', 'guardian naga hatchling']) {
    for (const k of [2, 5, 9]) {
      const a = build(name), before = verts(a);
      a.joints['tail' + k].rotation.y += .5; a.joints['tail' + k].rotation.x += .2;
      const after = verts(a);
      let moved = 0;
      before.forEach(({o, i, p}, n) => {
        const d = p.distanceTo(after[n].p);
        if (!o.isSkinnedMesh || !o.skeleton.bones.includes(a.joints.tail0)) { assert.ok(d < 1e-9, `${name} tail${k}: ${o.userData.part} moved ${d}`); return; }
        const on = coilBonesOf(o, i).map(s => +s.slice(4));
        if (Math.max(...on) < k) assert.ok(d < 1e-6, `${name} tail${k}: ${o.userData.part} vertex ${i} (on ${on}) before the joint moved ${d}`);
        else if (Math.min(...on) > k) { assert.ok(d > 1e-4, `${name} tail${k}: ${o.userData.part} vertex ${i} past the joint stayed`); moved++; }
      });
      assert.ok(moved > 40, `${name} tail${k}: ${moved} moved`);
    }
  }
});

test('the white naga\'s rime rides the coil: bend the coil and the splinters go with it', () => {
  const a = build('white naga'); let rime = null; a.g.traverse(o => { if (o.userData.part === 'rime') rime = o; });
  assert.ok(rime?.isSkinnedMesh && rime.skeleton === coilOf(a).skeleton);
  const box = () => { a.g.updateMatrixWorld(true); rime.skeleton.update(); rime.computeBoundingBox(); return rime.boundingBox.clone(); };
  const b0 = box(); a.joints.tail1.rotation.y += .6; const b1 = box();
  assert.ok(b0.min.distanceTo(b1.min) + b0.max.distanceTo(b1.max) > .01, 'the rime moved with the coil');
});

test('the slither still ripples the skinned coil, and still bends with its joints', () => {
  const a = build('red naga'), coil = coilOf(a), v = new THREE.Vector3();
  const at = i => { a.g.updateMatrixWorld(true); coil.skeleton.update(); return coil.getVertexPosition(i, v).clone(); };
  const i = 20 * 7 + 3, rest = at(i);
  for (let f = 0; f < 30; f++) updateSlither(a, 1 / 30, f / 30, true);
  assert.ok(coilOf(a) === coil && coil.isSkinnedMesh, 'the coil keeps its skin');
  const rippled = at(i);
  assert.ok(rippled.distanceTo(rest) > 1e-4, `the ripple moved the outer coil (${rippled.distanceTo(rest)})`);
  a.joints.tail3.rotation.y += .5;
  assert.ok(at(i).distanceTo(rippled) > 1e-3, 'a bent joint carries the rippling coil');
});
