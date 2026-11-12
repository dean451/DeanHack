// Family E stage 1 step 2: each elemental arm is one skinned mesh on three bones (shoulder, elbow, wrist),
// with the fist and everything on it (the fire's finger flames, the stalker's claws and knuckle spurs, the
// fire's clinker knuckles) hung on the wrist bone, so a bent elbow carries them.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const MEMBERS = ['stalker', 'fire elemental', 'earth elemental'];
const build = name => createCreature({name, symbol: 69, color: 7});
const skinOf = arm => arm.children.find(o => o.isSkinnedMesh);
// each vertex of a skinned mesh where it is drawn now (world space)
const verts = m => { let r = m; while (r.parent) r = r.parent; r.updateMatrixWorld(true); const v = new THREE.Vector3(), out = []; for (let i = 0; i < m.geometry.attributes.position.count; i++) { m.getVertexPosition(i, v); out.push(v.clone().applyMatrix4(m.matrixWorld)); } return out; };
const center = o => { o.updateMatrixWorld(true); return new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()); };

test('both arms are one skinned mesh on shoulder, elbow and wrist bones, in actor.joints', () => {
  for (const name of MEMBERS) {
    const a = build(name), j = a.joints;
    for (const side of ['l', 'r']) {
      const arm = j[side + 'fore'], skin = skinOf(arm);
      assert(skin, `${name} ${side}: a skinned arm`);
      assert.equal(skin.userData.part, 'arm', name);
      assert.equal(arm.children.filter(o => o.isMesh && !o.isSkinnedMesh).length, 0, `${name} ${side}: no plain arm pieces left on the shoulder`);
      for (let i = 0; i < 3; i++) assert(j[`${side}fore_${i}`]?.isBone, `${name} ${side}fore_${i}`);
      assert.equal(j[`${side}fore_1`].parent, j[`${side}fore_0`], name);
      assert.equal(j[`${side}fore_2`].parent, j[`${side}fore_1`], name);
      assert.deepEqual(skin.skeleton.bones, [0, 1, 2].map(i => j[`${side}fore_${i}`]), name);
      // the wrist sits at the fist: the arm's lowest skin is within a few centimetres of it
      a.g.updateMatrixWorld(true);
      const w = j[`${side}fore_2`].getWorldPosition(new THREE.Vector3()), low = verts(skin).reduce((m, v) => v.y < m.y ? v : m);
      assert(w.distanceTo(low) < .12 * a.g.scale.x, `${name} ${side}: the wrist at the end of the forearm`);
      assert(j[`${side}fore_2`].children.some(o => o.isMesh), `${name} ${side}: the fist rides the wrist`);
    }
  }
});

test('bending the elbow moves the forearm and fist, not the upper arm, the shoulder or the other arm', () => {
  for (const name of MEMBERS) {
    const a = build(name), j = a.joints, skin = skinOf(j.lfore), other = skinOf(j.rfore);
    const rest = verts(skin), restOther = verts(other), fist = center(j.lfore_2), head = center(a.head);
    j.lfore_1.rotation.x = -1.1;
    const now = verts(skin), shoulder = j.lfore_0.getWorldPosition(new THREE.Vector3()), elbow = j.lfore_1.getWorldPosition(new THREE.Vector3());
    const wristY = rest.reduce((m, v) => Math.min(m, v.y), Infinity), mid = (elbow.y + wristY) / 2;
    let below = 0, above = 0;
    rest.forEach((v, i) => {
      const d = v.distanceTo(now[i]);
      // vertices nearer the shoulder than the elbow stay; the far end of the forearm moves
      if (v.distanceTo(shoulder) < v.distanceTo(elbow) - .02) assert(d < 1e-6, `${name}: an upper arm vertex moved ${d}`);
      if (v.y < mid) { below++; if (d > .02) above++; }
    });
    assert(below > 0 && above === below, `${name}: the lower forearm swings (${above}/${below})`);
    assert(center(j.lfore_2).distanceTo(fist) > .05, `${name}: the fist follows the bent elbow`);
    verts(other).forEach((v, i) => assert(v.distanceTo(restOther[i]) < 1e-9, `${name}: the right arm stayed`));
    assert(center(a.head).distanceTo(head) < 1e-9, `${name}: the head stayed`);
    j.lfore_1.rotation.x = 0;
    verts(skin).forEach((v, i) => assert(v.distanceTo(rest[i]) < 1e-9, `${name}: back at rest`));
  }
});

test('the stalker\'s claws and the fire\'s finger flames and clinker knuckles hang on the wrist', () => {
  const s = build('stalker'), f = build('fire elemental');
  const count = o => { let n = 0; o.traverse(m => { if (m.isMesh) n++; }); return n; };
  for (const side of ['l', 'r']) {
    // the fist, three claws and three spurs (merged per material, so at least the fist, claws and spurs)
    assert(count(s.joints[side + 'fore_2']) >= 3, `stalker ${side}: fist, claws and spurs on the wrist`);
    assert(count(f.joints[side + 'fore_2']) >= 2, `fire ${side}: fist, flames and clinker on the wrist`);
    for (const a of [s, f]) {
      a.g.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(a.joints[side + 'fore_2']), w = a.joints[side + 'fore_2'].getWorldPosition(new THREE.Vector3());
      assert(box.distanceToPoint(w) < 1e-6, `${a.name || 'creature'} ${side}: what hangs on the wrist sits at it`);
    }
  }
  // the stalker's claws reach well below its wrist
  s.g.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(s.joints.lfore_2), w = s.joints.lfore_2.getWorldPosition(new THREE.Vector3());
  assert(box.min.y < w.y - .1, 'the claws hang off the fist');
});
