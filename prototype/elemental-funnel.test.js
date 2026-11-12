// Family E stage 1 step 3: the funnel of the stalker and the fire, air and water elementals is skinned on a chain of
// five bones, `tail0` at the waist to `tail4` at the tip; turning one bends everything past it and nothing before it.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const MEMBERS = ['stalker', 'fire elemental', 'air elemental', 'water elemental'];
const build = name => createCreature({name, symbol: 69, color: 7});
const skins = a => a.tail.children.filter(o => o.isSkinnedMesh);
// every skinned vertex where it is drawn now, in world space
const verts = a => {
  a.g.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  return skins(a).map(m => Array.from({length: m.geometry.attributes.position.count}, (_, i) => m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld).clone()));
};
// every other mesh's world box (the head, arms, body and swirl must not move when the funnel bends)
const others = a => {
  a.g.updateMatrixWorld(true);
  const out = new Map();
  a.g.traverse(o => { if (o.isMesh && !o.isSkinnedMesh) out.set(o, new THREE.Box3().setFromObject(o, true)); });
  return out;
};

test('the funnel is a chain of five bones on the tail group, its pieces skinned on one skeleton', () => {
  for (const name of MEMBERS) {
    const a = build(name), j = a.joints;
    for (let i = 0; i < 5; i++) {
      assert(j['tail' + i]?.isBone, `${name} tail${i}`);
      assert.equal(j['tail' + i].parent, i ? j['tail' + (i - 1)] : a.tail, `${name}: tail${i} hangs on the one before it`);
    }
    assert.equal(j.tail5, undefined, name);
    const ms = skins(a);
    assert(ms.length >= 1 && ms.length <= 2, `${name}: one skinned mesh per material (${ms.length})`);
    assert.equal(a.tail.children.filter(o => o.isMesh && !o.isSkinnedMesh).length, 0, `${name}: no loose funnel piece left unskinned`);
    for (const m of ms) assert.equal(m.skeleton.bones[0], j.tail0, `${name}: every funnel mesh on the same skeleton`);
    // the chain runs down from the waist: each bone below the last
    a.g.updateMatrixWorld(true);
    const y = i => j['tail' + i].getWorldPosition(new THREE.Vector3()).y;
    for (let i = 1; i < 5; i++) assert(y(i) < y(i - 1), `${name}: tail${i} below tail${i - 1}`);
  }
});

test('at rest the skinned funnel is drawn exactly where its pieces were built', () => {
  for (const name of MEMBERS) {
    const a = build(name), now = verts(a);
    skins(a).forEach((m, k) => {
      const p = m.geometry.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) assert(now[k][i].distanceTo(v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld)) < 1e-6, `${name}: vertex ${i} moved at rest`);
    });
  }
});

test('turning a funnel bone moves everything past it and nothing before it', () => {
  for (const name of MEMBERS) {
    const a = build(name), rest = verts(a), restOthers = others(a);
    for (let n = 0; n < 4; n++) {
      const bone = a.joints['tail' + n];
      bone.rotation.x += .6;
      const now = verts(a);
      let past = 0;
      skins(a).forEach((m, k) => {
        const idx = m.geometry.attributes.skinIndex, wt = m.geometry.attributes.skinWeight;
        for (let i = 0; i < idx.count; i++) {
          // a vertex is before the bone when none of its weight is on it or past it, past when all of it is past it
          let on = 0, total = 0;
          for (let c = 0; c < 4; c++) { const w = wt.getComponent(i, c); total += w; if (idx.getComponent(i, c) > n) on += w; }
          const d = now[k][i].distanceTo(rest[k][i]);
          const beyond = [0, 1, 2, 3].reduce((s, c) => s + (idx.getComponent(i, c) >= n ? wt.getComponent(i, c) : 0), 0);
          if (beyond < 1e-6) assert(d < 1e-6, `${name}: turning tail${n} moved a vertex before it`);
          if (on > total - 1e-6 && total > 0) { assert(d > 1e-3, `${name}: turning tail${n} left a vertex past it behind`); past++; }
        }
      });
      // the funnel's tip (its lowest vertex at rest) lies past every bone, so it always moves
      let tip = null;
      rest.forEach((vs, k) => vs.forEach((v, i) => { if (!tip || v.y < rest[tip[0]][tip[1]].y) tip = [k, i]; }));
      assert(now[tip[0]][tip[1]].distanceTo(rest[tip[0]][tip[1]]) > 1e-3, `${name}: turning tail${n} moved the funnel's tip`);
      assert(past > 0, `${name}: something rides wholly past tail${n}`);
      const nowOthers = others(a);
      for (const [mesh, box] of restOthers) assert(nowOthers.get(mesh).min.distanceTo(box.min) + nowOthers.get(mesh).max.distanceTo(box.max) < 1e-9, `${name}: turning tail${n} moved ${mesh.name || mesh.geometry.type} off the funnel`);
      bone.rotation.x -= .6;
    }
    const back = verts(a);
    back.forEach((vs, k) => vs.forEach((v, i) => assert(v.distanceTo(rest[k][i]) < 1e-9, `${name}: back at rest`)));
  }
});

test('the funnel casts no shadow, as its pieces did not', () => {
  for (const name of MEMBERS) for (const m of skins(build(name))) assert.equal(m.castShadow, false, name);
});
