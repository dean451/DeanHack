import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const zruty = () => createCreature({name: 'zruty', symbol: 122, color: 3});

test('the zruty towers over an umber hulk, its claws and flank crusted with old blood', () => {
  const z = zruty(), h = createCreature({name: 'umber hulk', symbol: 85, color: 3});
  assert(z.g.scale.y >= 1.5, 'larger than life');
  assert(z.g.scale.y > h.g.scale.y, 'bigger than the hulk');
  let gore = 0;
  z.g.traverse(o => { if (o.isMesh && o.material.color.getHexString() === '3c0e0c') gore++; });
  assert(gore >= 1, 'bloodied claws and scars');
  z.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(z.g, true);
  assert(b.min.y > -0.05, 'stands on the floor');
  assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.3, 'fits its tile');
});

test('the zruty has a head, long arms and short legs as named joints; each turns only what hangs on it', () => {
  const z = zruty(), j = z.joints;
  assert(j, 'joints');
  assert.equal(j.head, z.head);
  assert(j.neck0.isBone && j.neck3.isBone && j.hips.isBone && j.spine0.isBone && j.spine1.isBone, 'the trunk and neck are bones');
  assert.equal(j.neck3.children.includes(z.head), true, 'the head rides the top of the neck');
  for (const side of ['l', 'r']) {
    assert.equal(j[side + 'fore'].position.x < 0, side === 'l', side + ' arm side');
    assert.equal(j[side + 'leg1'].position.x < 0, side === 'l', side + ' leg side');
    assert(z.legs.includes(j[side + 'leg1']), side + ' leg is one of the legs');
  }
  const at = o => { o.updateWorldMatrix(true, false); return o.getWorldPosition(new THREE.Vector3()); };
  const boxOf = o => new THREE.Box3().setFromObject(o, true);
  z.g.updateMatrixWorld(true);
  const lArm = boxOf(j.lfore).clone(), rLeg = boxOf(j.rleg1).clone(), rArm = boxOf(j.rfore).clone(), headBox = boxOf(z.head).clone();
  j.lfore.rotation.x = .6; z.g.updateMatrixWorld(true);
  assert(boxOf(j.lfore).min.distanceTo(lArm.min) > .01, 'the arm turned');
  assert.equal(boxOf(j.rfore).min.distanceTo(rArm.min), 0, 'the other arm stays');
  assert.equal(boxOf(z.head).min.distanceTo(headBox.min), 0, 'the head stays');
  j.lfore.rotation.x = 0; j.neck0.rotation.y = .6; z.g.updateMatrixWorld(true);
  assert(boxOf(z.head).min.distanceTo(headBox.min) > .005, 'the head moved');
  assert.equal(boxOf(j.rleg1).min.distanceTo(rLeg.min), 0, 'legs stay');
  j.neck0.rotation.y = 0; j.lleg1.rotation.x = .5; z.g.updateMatrixWorld(true);
  assert.equal(boxOf(j.rleg1).min.distanceTo(rLeg.min), 0, 'the other leg stays');
  assert(at(j.lleg1).distanceTo(at(j.rleg1)) > .1);
  assert.equal(z.arms, undefined, 'arms are not swung by the fidget');
});

test('the zruty legs and arms are skinned on three bones each, and bending a bone carries every piece past it', () => {
  const z = zruty(), j = z.joints;
  for (const n of ['lleg1', 'rleg1', 'lfore', 'rfore']) {
    for (let i = 0; i < 3; i++) assert(j[n + '_' + i]?.isBone, n + '_' + i + ' is a bone');
    let plain = 0;
    j[n].traverse(o => { if (o.isMesh && !o.isSkinnedMesh) plain++; });
    assert.equal(plain, 0, n + ' leaves no plain piece behind');
  }
  const low = (o) => { // lowest and farthest-forward true vertex of a limb's skinned pieces
    let y = Infinity;
    o.traverse(m => { if (!m.isSkinnedMesh) return; const p = m.geometry.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) { m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld); y = Math.min(y, v.y); } });
    return y;
  };
  z.g.updateMatrixWorld(true);
  const rest = low(j.lleg1), other = low(j.rleg1), arm = low(j.lfore);
  j.lleg1_1.rotation.x = -.8; j.lfore_1.rotation.x = -.8; z.g.updateMatrixWorld(true);
  assert(low(j.lleg1) > rest + .02, 'the bent knee carries the foot');
  assert(low(j.lfore) > arm + .02, 'the bent elbow lifts the knuckles');
  assert.equal(low(j.rleg1), other, 'the other leg stays');
});

test('the zruty trunk and neck are bones in one hide: a bent spine carries the head and arms, a bent neck only the head', () => {
  const z = zruty(), j = z.joints;
  const hide = []; z.body.traverse(o => { if (o.isSkinnedMesh && o.userData.part === 'body') hide.push(o); });
  assert(hide.length >= 1, 'a skinned body hide');
  const at = o => { o.updateWorldMatrix(true, false); return o.getWorldPosition(new THREE.Vector3()); };
  const probe = () => { z.g.updateMatrixWorld(true); return {head: at(z.head), lfore: at(j.lfore), rleg: at(j.rleg1_0), lleg: at(j.lleg1_0)}; };
  const rest = probe();
  j.neck1.rotation.x = .5; let p = probe();
  assert(p.head.distanceTo(rest.head) > .02, 'a bent neck moves the head');
  assert.equal(p.lfore.distanceTo(rest.lfore), 0, 'and not the arm');
  assert.equal(p.rleg.distanceTo(rest.rleg), 0, 'nor the leg');
  j.neck1.rotation.x = 0; j.spine0.rotation.x = .4; p = probe();
  assert(p.head.distanceTo(rest.head) > .02, 'a bent spine moves the head');
  assert(p.lfore.distanceTo(rest.lfore) > .02, 'and the arm');
  assert.equal(p.rleg.distanceTo(rest.rleg), 0, 'not the leg');
});

test('the zruty is faceted, not a smooth toy: flat-shaded fur and hide, no round sphere caps on the skull (review 2026-11-09)', () => {
  const z = zruty();
  let fur = 0;
  z.g.traverse(o => {
    if (!o.isMesh || o.material.emissive.getHex()) return;
    const c = o.material.color.getHexString();
    if (o.material.vertexColors || ['6a4a2c', '543a22', 'a07a58'].includes(c)) { fur++; assert(o.material.flatShading, 'fur and hide are flat shaded: ' + c); }
  });
  assert(fur >= 10, 'the hide, fur and skin pieces are found');
  z.head.traverse(o => {
    const p = o.isMesh && o.geometry.parameters;
    if (p && o.geometry.type === 'SphereGeometry' && p.radius > .04) assert(p.widthSegments <= 6, 'a big round skull or muzzle piece: r ' + p.radius);
  });
});
