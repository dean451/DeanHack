// Family K stage 1: every Kop exposes named joints (`head`, `lfore` / `rfore`, `lleg1` / `rleg1`, and since step 3
// the trunk and neck bones `hips`, `spine0`, `spine1`, `neck0`..`neck3`), each joint turns only what hangs on it
// (the skin past it and the rigid pieces on it), and the model is drawn where it was before.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const MEMBERS = ['keystone kop', 'kop sergeant', 'kop lieutenant', 'kop kaptain'];
const build = name => createCreature({name, symbol: 75, color: 4});
const boxOf = o => new THREE.Box3().setFromObject(o, true);
const moved = (a, b) => a.min.distanceTo(b.min) + a.max.distanceTo(b.max);
const places = g => { g.updateMatrixWorld(true); const m = new Map(); g.traverse(o => { if (o.isMesh) m.set(o, boxOf(o)); }); return m; };
const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
// the hide: the one skinned mesh (trunk and limbs); its vertices as skinned now, and each one's weight on bones under `root`
const hideOf = a => { const m = []; a.g.traverse(o => { if (o.isSkinnedMesh) m.push(o); }); assert.equal(m.length, 1, 'one hide'); return m[0]; };
const verts = a => { a.g.updateMatrixWorld(true); const h = hideOf(a), v = new THREE.Vector3(); return Array.from({length: h.geometry.attributes.position.count}, (_, i) => h.getVertexPosition(i, v).applyMatrix4(h.matrixWorld).clone()); };
const shareOn = (a, root) => { const h = hideOf(a), bones = h.skeleton.bones, si = h.geometry.attributes.skinIndex, sw = h.geometry.attributes.skinWeight;
  return Array.from({length: si.count}, (_, i) => { let w = 0; for (let k = 0; k < 4; k++) if (under(bones[si.getComponent(i, k)], root)) w += sw.getComponent(i, k); return w; }); };

test('every kop has a head, two arms and two legs as named joints', () => {
  for (const name of MEMBERS) {
    const a = build(name), j = a.joints;
    assert(j, name + ' joints');
    assert.equal(j.head, a.head, name);
    for (const n of ['hips', 'spine0', 'spine1', 'neck0', 'neck1', 'neck2', 'neck3']) assert(j[n]?.isBone, `${name}: ${n}`);
    assert.equal(a.head.parent, j.neck3, name + ': the head rides the top of the neck');
    for (const side of ['l', 'r']) {
      assert.equal(j[side + 'fore'].parent, j.spine1, `${name} ${side}fore hangs from the chest`);
      assert.equal(j[side + 'fore'].position.x < 0, side === 'l', `${name} ${side} arm side`);
      assert(a.legs.includes(j[side + 'leg1']), `${name} ${side}leg1 is a leg`);
      assert.equal(j[side + 'leg1'].position.x < 0, side === 'l', `${name} ${side} leg side`);
    }
    assert.equal(a.arms, undefined, name + ': arms are not swung by the fidget');
    assert(under(a.tail, j.rfore), name + ': the truncheon (the tail) rides the raised right arm');
  }
});

test('turning a joint moves everything on it and nothing else', () => {
  for (const name of MEMBERS) {
    const a = build(name), j = a.joints, rest = places(a.g), skin = verts(a);
    for (const [label, axis, v] of [['neck1', 'x', .6], ['head', 'x', .6], ['lfore', 'x', .7], ['rfore', 'z', .5], ['lleg1', 'x', .5], ['rleg1', 'x', .5], ['spine0', 'x', .4], ['spine1', 'x', .4]]) {
      const joint = j[label], share = shareOn(a, joint);
      joint.rotation[axis] += v;
      const now = places(a.g), bent = verts(a);
      let on = 0;
      for (const [mesh, p] of rest) {
        if (mesh.isSkinnedMesh) continue;
        const d = moved(now.get(mesh), p);
        if (under(mesh, joint)) { if (d > 1e-4) on++; }
        else assert(d < 1e-9, `${name}: turning ${label} moved a mesh not on it`);
      }
      // the hide: no vertex with no weight past the joint moves; the head turns alone, the hide stays
      let past = 0;
      skin.forEach((r, i) => { const d = r.distanceTo(bent[i]); if (share[i] === 0) assert(d < 1e-6, `${name}: turning ${label} moved skin before it`); else if (share[i] > .5) past = Math.max(past, d); });
      if (label !== 'head') assert(past > .005, `${name}: turning ${label} moved the skin past it (${past.toFixed(3)})`);
      // (every rigid piece the joint carries: the helmet and face on the neck and head, a glove or boot on a limb, the brass on the spine)
      assert(on > 0, `${name}: turning ${label} moved what hangs on it`);
      joint.rotation[axis] -= v;
    }
  }
});

test('a hunch carries the head, the arms and the brass on the chest, and leaves the legs and the belt', () => {
  for (const name of MEMBERS) {
    const a = build(name), j = a.joints, world = o => { a.g.updateMatrixWorld(true); return o.getWorldPosition(new THREE.Vector3()); };
    const head = world(a.head), club = world(a.tail), legs = a.legs.map(world);
    const chest = j.spine1.children.filter(o => o.isMesh), belt = j.hips.children.filter(o => o.isMesh);
    assert(chest.length > 0, name + ': buttons and the whistle ride the chest');
    assert(belt.length > 0, name + ': the belt and buckle ride the pelvis');
    // (the farthest a rigid piece's vertex went: a merged row of buttons turns about the chest's pivot near its middle)
    const pts = o => { a.g.updateMatrixWorld(true); const p = o.geometry.attributes.position; return Array.from({length: p.count}, (_, i) => new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld)); };
    const far = (o, was) => pts(o).reduce((m, v, i) => Math.max(m, v.distanceTo(was[i])), 0);
    const chestAt = chest.map(pts), beltAt = belt.map(pts);
    j.spine0.rotation.x = .4; j.spine1.rotation.x = .3;
    assert(world(a.head).y < head.y - .03 && world(a.head).z > head.z, name + ': the head came forward and down');
    assert(world(a.tail).distanceTo(club) > .05, name + ': the truncheon arm went with the chest');
    chest.forEach((o, k) => assert(far(o, chestAt[k]) > .02, name + ': the chest dressing followed'));
    belt.forEach((o, k) => assert(far(o, beltAt[k]) < 1e-9, name + ': the belt stayed'));
    a.legs.forEach((l, i) => assert(world(l).distanceTo(legs[i]) < 1e-9, name + ': the legs stayed'));
    // a bowed neck carries the helmet
    j.spine0.rotation.x = j.spine1.rotation.x = 0;
    const at = world(a.head); j.neck1.rotation.x = .5; j.neck2.rotation.x = .4;
    assert(world(a.head).distanceTo(at) > .02, name + ': the head went with the neck');
  }
});

test('the face and helmet ride the head, the fists the arms, the truncheon swings with the right arm', () => {
  for (const name of MEMBERS) {
    const a = build(name), j = a.joints;
    a.g.updateMatrixWorld(true);
    const head = boxOf(a.head), body = boxOf(a.g);
    // the head group reaches from the moustache to the helmet's knob, level with the raised truncheon at the top
    assert(body.max.y - head.max.y < .03, name + ': the helmet rides the head, up at the top of the kop');
    assert(head.max.y - head.min.y > .3, name + ': the head group holds the face and the helmet');
    // each arm's sleeve: the hide's vertices riding the arm's bones reach down the whole arm
    for (const side of ['lfore', 'rfore']) {
      const share = shareOn(a, j[side]), ys = verts(a).filter((v, i) => share[i] > .5).map(v => v.y);
      assert(Math.max(...ys) - Math.min(...ys) > .15, name + ' ' + side + ' holds the arm');
    }
    // turning the right shoulder carries the truncheon's tip
    const tip = new THREE.Vector3(), after = new THREE.Vector3();
    a.tail.getWorldPosition(tip);
    j.rfore.rotation.z += .5; a.g.updateMatrixWorld(true); a.tail.getWorldPosition(after); j.rfore.rotation.z -= .5;
    assert(after.distanceTo(tip) > .05, name + ': the truncheon follows the arm');
  }
});

test('named joints leave the kop drawn where it was: same bounds, under the mesh cap', () => {
  // bounds of each kop on master before the joints were named (scale included)
  const before = {
    'keystone kop': [[-.294, .011, -.179], [.310, 1.173, .186]],
    'kop kaptain': [[-.321, .012, -.195], [.337, 1.277, .203]],
  };
  for (const [name, [lo, hi]] of Object.entries(before)) {
    const a = build(name), b = boxOf(a.g);
    lo.forEach((v, k) => assert(Math.abs(b.min.getComponent(k) - v) < .001, `${name} min ${k}`));
    hi.forEach((v, k) => assert(Math.abs(b.max.getComponent(k) - v) < .001, `${name} max ${k}`));
    let meshes = 0; a.g.traverse(o => { if (o.isMesh) meshes++; });
    assert(meshes <= 22, `${name}: ${meshes} meshes (the hide merge took three off the step 2 count)`);
  }
});
