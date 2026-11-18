// Family U stage 1 step 3: the umber hulk's and the shambling horror's trunk and neck are on bones (`hips`, `spine0`,
// `spine1`, `neck0`..`neck3`, through rigGiant in giant-joints.js, as the trolls), the hide or flesh of the trunk and
// limbs one skin, the head on the top of the neck and the arms on the chest; every other piece built on the trunk (the
// hulk's plates, ridges, rift and spurs; the horror's lumps, sores, spurs, feelers and stray eyes) hangs rigid on the
// bone at its height. The head stays the `tail` handle tail-sway.js and shambler-lurch.js turn, and no head handle is added.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {isShambler} from './shambler-lurch.js';

const NAMES = ['umber hulk', 'shambling horror', 'unknown U'];
const build = name => createCreature({name, symbol: 85, color: 3});
const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
const worldOf = o => { o.updateWorldMatrix(true, false); return new THREE.Vector3().setFromMatrixPosition(o.matrixWorld); };
const world = o => { o.updateWorldMatrix(true, false); const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox(); return g.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(o.matrixWorld); };
const plainCentres = a => { const out = []; a.g.traverse(o => { if (o.isMesh && !o.isSkinnedMesh) out.push([o, world(o)]); }); return out; };
const verts = a => { a.g.updateMatrixWorld(true); const v = new THREE.Vector3(), out = [];
  a.g.traverse(m => { if (m.isSkinnedMesh) for (let i = 0; i < m.geometry.attributes.position.count; i++) { m.getVertexPosition(i, v); out.push(v.clone().applyMatrix4(m.matrixWorld)); } }); return out; };
const shareOn = (a, root) => { const out = [];
  a.g.traverse(m => { if (!m.isSkinnedMesh) return; const si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
    for (let i = 0; i < si.count; i++) { let w = 0; for (let k = 0; k < 4; k++) if (under(m.skeleton.bones[si.getComponent(i, k)], root)) w += sw.getComponent(i, k); out.push(w); } }); return out; };
const uses = (o, n) => { const k = new Set(o.skeleton.bones.flatMap((b, i) => b.name === n ? [i] : [])), si = o.geometry.attributes.skinIndex;
  for (let i = 0; i < si.count; i++) for (let c = 0; c < 4; c++) if (k.has(si.getComponent(i, c))) return true; return false; };
const hideOf = a => a.body.children.filter(o => o.isSkinnedMesh && ['spine1', 'lfore_1', 'lleg1_1'].every(n => uses(o, n)));

test('every U has its trunk and neck on bones in one chain, the head on its top and the arms on the chest', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints;
    for (const n of ['hips', 'spine0', 'spine1', 'neck0', 'neck1', 'neck2', 'neck3']) assert(j[n]?.isBone, `${name}: ${n}`);
    assert(j.spine0.parent === j.hips && j.spine1.parent === j.spine0 && j.neck0.parent === j.spine1 && j.neck3.parent === j.neck2, `${name}: one chain`);
    assert(a.tail.parent === j.neck3 && j.head === a.tail, `${name}: the head (the tail handle) rides neck3`);
    assert.equal(a.head, undefined, `${name}: no head handle, so no new head motion`);
    for (const n of ['lfore', 'rfore']) assert(j[n].parent === j.spine1, `${name}: ${n} hangs from the chest`);
    for (const n of ['lleg1', 'rleg1']) assert(!under(j[n], j.spine0), `${name}: ${n} stays on the pelvis`);
    assert.equal(hideOf(a).length, 1, `${name}: one hide on the skin, the spine and the limbs`);
    assert.equal(a.arms, undefined, `${name}: no arms handle, so no new arm motion`);
    const loose = a.body.children.filter(o => o.isMesh && !o.isSkinnedMesh);
    assert.equal(loose.length, 0, `${name}: every trunk piece hangs on a bone (${loose.length} left on the body)`);
  }
});

test('bowing the neck carries the head; the skin before it, the trunk pieces and the legs stay', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints, rest = verts(a), share = shareOn(a, j.neck1), was = worldOf(a.tail), legs = a.legs.map(worldOf), plain = plainCentres(a);
    j.neck1.rotation.x = .5; j.neck2.rotation.x = .4;
    assert(worldOf(a.tail).distanceTo(was) > .02, `${name}: the head went with the neck`);
    verts(a).forEach((v, i) => { if (share[i] === 0) assert(v.distanceTo(rest[i]) < 1e-6, `${name}: the skin before the neck stayed`); });
    for (const [o, at] of plain) if (!under(o, a.tail)) assert(world(o).distanceTo(at) < 1e-9, `${name}: a piece off the neck moved`);
    a.legs.forEach((l, i) => assert(worldOf(l).distanceTo(legs[i]) < 1e-9, `${name}: the legs stayed`));
  }
});

test('a hunch at the waist carries the head, arms and the chest\'s pieces, and leaves the legs and the skin below', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints, rest = verts(a), share = shareOn(a, j.spine0), head = worldOf(a.tail), legs = a.legs.map(worldOf);
    const arms = [j.lfore, j.rfore].map(worldOf), chest = plainCentres(a).filter(([o]) => o.parent === j.spine1);
    j.spine0.rotation.x = .4; j.spine1.rotation.x = .3;
    const now = worldOf(a.tail);
    assert(now.y < head.y - .03 && now.z > head.z, `${name}: the head came forward and down`);
    [j.lfore, j.rfore].forEach((o, i) => assert(worldOf(o).distanceTo(arms[i]) > .02, `${name}: ${o.name} went with the chest`));
    assert(chest.length > 0, `${name}: something rides the chest`);
    for (const [o, at] of chest) assert(world(o).distanceTo(at) > .01, `${name}: a piece on the chest went with it`);
    let moved = 0; const bent = verts(a);
    rest.forEach((r, i) => { const d = r.distanceTo(bent[i]); if (share[i] === 0) assert(d < 1e-6, `${name}: the skin below the waist stayed`); else if (share[i] > .5) moved = Math.max(moved, d); });
    assert(moved > .05, `${name}: the skin above the waist moved ${moved.toFixed(3)}`);
    a.legs.forEach((l, i) => assert(worldOf(l).distanceTo(legs[i]) < 1e-9, `${name}: the legs stayed`));
  }
});

test('the shambling horror keeps its arm handles on the arm joints, so shambler-lurch.js still swings them', () => {
  const h = build('shambling horror'), j = h.joints;
  assert(h.digArm === j.lfore && h.limpArm === j.rfore && isShambler(h));
  assert(h.digArm.parent === j.spine1 && h.limpArm.parent === j.spine1, 'both arms ride the chest');
});
