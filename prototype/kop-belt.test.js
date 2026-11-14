// Review finding 2026-11-14: the Kop's belt was a narrower, squashed band at the spine0 seam, sunk into the coat, so
// only a bar of it showed in front and a hunch would open or bury it. It is now slung under the paunch on the pelvis
// bone, round and as finely cut as the coat's lathe. The belt's vertices are measured against the hide where the
// skin draws it (posed by the bones), sampled densely over the hide's triangles near the belt (the coat's lathe has
// rows of vertices 10 cm apart, so its own vertices would be far from any belt).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {surfaceGap} from './fit-check.js';

const MEMBERS = ['keystone kop', 'kop sergeant', 'kop lieutenant', 'kop kaptain'];
const build = name => createCreature({name, symbol: 75, color: 4});
const hideOf = a => { const m = []; a.g.traverse(o => { if (o.isSkinnedMesh) m.push(o); }); assert.equal(m.length, 1, 'one hide'); return m[0]; };
// the belt: the widest mesh hung on the pelvis bone (the buckle is the other)
const beltOf = a => {
  const w = o => { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox; return b.max.x - b.min.x; };
  return a.joints.hips.children.filter(o => o.isMesh).sort((p, q) => w(q) - w(p))[0];
};

function shapes(a) {
  a.g.updateMatrixWorld(true);
  const belt = beltOf(a), hide = hideOf(a), pos = hide.geometry.attributes.position;
  hide.skeleton.update();
  const box = new THREE.Box3().setFromObject(belt), lo = box.min.y - .02, hi = box.max.y + .02, n = 14;
  const at = i => hide.applyBoneTransform(i, new THREE.Vector3().fromBufferAttribute(pos, i)).applyMatrix4(hide.matrixWorld);
  // (only the coat: triangles whose every vertex rides the spine, not a sleeve or a trouser leg passing the belt's height)
  const spine = new Set(['hips', 'spine0', 'spine1'].map(k => a.joints[k])), si = hide.geometry.attributes.skinIndex, sw = hide.geometry.attributes.skinWeight;
  const onSpine = i => { for (let k = 0; k < 4; k++) if (sw.getComponent(i, k) > 0 && !spine.has(hide.skeleton.bones[si.getComponent(i, k)])) return false; return true; };
  const body = [];
  for (let i = 0; i < pos.count; i += 3) {
    if (!onSpine(i) || !onSpine(i + 1) || !onSpine(i + 2)) continue;
    const A = at(i), B = at(i + 1), C = at(i + 2), ys = [A.y, B.y, C.y];
    if (Math.max(...ys) < lo || Math.min(...ys) > hi) continue;
    for (let u = 0; u <= n; u++) for (let v = 0; v <= n - u; v++) body.push(new THREE.Vector3().addScaledVector(A, u / n).addScaledVector(B, v / n).addScaledVector(C, (n - u - v) / n));
  }
  // (the band's ring of vertices round its outside; the cylinder's cap centres sit on its axis, inside the kop)
  const bp = belt.geometry.attributes.position, c = box.getCenter(new THREE.Vector3()), r = (box.max.x - box.min.x) / 2, ring = [];
  for (let i = 0; i < bp.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(bp, i).applyMatrix4(belt.matrixWorld); if (Math.hypot(v.x - c.x, v.z - c.z) > .9 * r) ring.push(v); }
  const cloud = pts => new THREE.Mesh(new THREE.BufferGeometry().setFromPoints(pts));
  return [cloud(ring), cloud(body), a.g.scale.y, box];
}

test('the belt is a full round band, not a squashed bar', () => {
  for (const name of MEMBERS) {
    const belt = beltOf(build(name)), b = new THREE.Box3().setFromObject(belt), s = b.getSize(new THREE.Vector3());
    assert(Math.abs(s.x - s.z) < .01 * s.x, `${name}: belt ${s.x.toFixed(3)} wide, ${s.z.toFixed(3)} deep`);
  }
});

test('the belt wraps the coat all the way round, at rest, with spine1 bent and in a hunch', () => {
  for (const name of MEMBERS) {
    const a = build(name), j = a.joints;
    const check = label => { const [belt, body, k] = shapes(a), gap = surfaceGap(belt, body); assert(gap < .015 * k, `${name}: belt ${gap.toFixed(3)} off the coat ${label}`); };
    check('at rest');
    j.spine1.rotation.x = .4; check('with spine1 bent');
    j.spine0.rotation.x = .4; j.spine1.rotation.x = .3; check('in a hunch');
  }
});

test('no coat shows through the belt: every hide point at the belt\'s height lies inside it', () => {
  for (const name of MEMBERS) {
    const a = build(name), [, body, , b] = shapes(a), c = b.getCenter(new THREE.Vector3()), r = (b.max.x - b.min.x) / 2;
    const p = body.geometry.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      if (v.y < b.min.y + .002 || v.y > b.max.y - .002) continue;
      // (the 24-sided band's flats sit at cos(7.5°) of its radius)
      assert(Math.hypot(v.x - c.x, v.z - c.z) < r * Math.cos(Math.PI / 24), `${name}: coat pokes through the belt at ${v.toArray().map(x => x.toFixed(3))}`);
    }
  }
});
