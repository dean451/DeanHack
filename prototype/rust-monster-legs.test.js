// Family R stage 1 step 2: each leg of the rust monster and the disenchanter is one SkinnedMesh on three bones
// under its group (`<leg>_0` hip, `_1` knee, `_2` foot); bending the knee moves the shin and the hooked foot and
// leaves the hip, the other legs and the body where they were.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const NAMES = ['rust monster', 'disenchanter'];
const LEGS = ['lleg0', 'rleg0', 'lleg1', 'rleg1'];
const build = name => createCreature({name, symbol: 82, color: 3});
// every skinned vertex of `mesh` in the world as drawn now, with the weight it gives bones from `from` on
const verts = (g, mesh, from) => {
  g.updateMatrixWorld(true);
  const v = new THREE.Vector3(), si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight, out = [];
  const idx = from.map(b => mesh.skeleton.bones.indexOf(b));
  for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
    mesh.getVertexPosition(i, v);
    let w = 0; for (let k = 0; k < 4; k++) if (idx.includes(si.getComponent(i, k))) w += sw.getComponent(i, k);
    out.push([v.clone().applyMatrix4(mesh.matrixWorld), w]);
  }
  return out;
};

test('every leg is one skinned mesh on three bones: hip, knee, foot', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints;
    for (const leg of LEGS) {
      const group = j[leg], skins = group.children.filter(o => o.isSkinnedMesh);
      assert.equal(skins.length, 1, `${name} ${leg}: one skinned mesh`);
      assert.equal(group.children.filter(o => o.isMesh && !o.isSkinnedMesh).length, 0, `${name} ${leg}: no plain mesh left`);
      const bones = [0, 1, 2].map(i => j[`${leg}_${i}`]);
      bones.forEach((b, i) => assert(b?.isBone && b.name === `${leg}_${i}`, `${name} ${leg}_${i} is a bone`));
      assert.deepEqual(skins[0].skeleton.bones, bones, `${name} ${leg}: the skin rides its own bones`);
      assert(bones[1].parent === bones[0] && bones[2].parent === bones[1], `${name} ${leg}: the bones are nested`);
      // the knee stands up and out from the hip, the foot below the knee and further out (left is -x)
      const s = leg[0] === 'l' ? -1 : 1;
      assert(bones[1].position.x * s > .05 && bones[1].position.y > 0, `${name} ${leg}: knee up and out`);
      assert(bones[2].position.x * s > 0 && bones[2].position.y < -.2, `${name} ${leg}: foot down`);
    }
  }
});

test('bending a knee moves the shin and foot only, and returns exactly', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints;
    for (const leg of LEGS) {
      const mesh = j[leg].children.find(o => o.isSkinnedMesh), knee = j[`${leg}_1`], foot = j[`${leg}_2`];
      const others = LEGS.filter(l => l !== leg).map(l => j[l].children.find(o => o.isSkinnedMesh));
      const rest = verts(a.g, mesh, [knee, foot]), restOthers = others.map(m => verts(a.g, m, []));
      const body = new THREE.Box3().setFromObject(a.body.children.find(o => o.userData.part === 'body'), true);
      knee.rotation.x += .8;
      const now = verts(a.g, mesh, [knee, foot]);
      let shin = 0;
      rest.forEach(([p, w], i) => {
        const d = p.distanceTo(now[i][0]);
        if (w === 0) assert(d < 1e-6, `${name} ${leg}: a vertex on the hip alone moved ${d}`);
        if (w > .99 && d > .01) shin++;
      });
      assert(shin > 20, `${name} ${leg}: the shin and foot moved (${shin})`);
      others.forEach((m, k) => verts(a.g, m, []).forEach(([p], i) => assert(p.distanceTo(restOthers[k][i][0]) < 1e-9, `${name}: bending ${leg} moved another leg`)));
      assert(new THREE.Box3().setFromObject(a.body.children.find(o => o.userData.part === 'body'), true).equals(body), `${name}: the body stays`);
      knee.rotation.x -= .8;
      verts(a.g, mesh, []).forEach(([p], i) => assert(p.distanceTo(rest[i][0]) < 1e-9, `${name} ${leg}: returns exactly`));
    }
  }
});

test('the hooked feet still rest on the floor, the leg drawn where it was', () => {
  for (const name of NAMES) {
    const a = build(name);
    a.g.updateMatrixWorld(true);
    for (const leg of LEGS) {
      const box = new THREE.Box3().setFromObject(a.joints[leg], true);
      assert(box.min.y > -.01 && box.min.y < .03, `${name} ${leg}: the foot at the floor (${box.min.y.toFixed(3)})`);
    }
  }
});
