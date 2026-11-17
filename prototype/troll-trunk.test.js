// Family T stage 1 step 3: each troll's trunk and neck are on bones (`hips`, `spine0`, `spine1`, `neck0`..`neck3`,
// through rigGiant in giant-joints.js, as the ogres), the skin-coloured trunk and limbs one hide, the head on the
// top of the neck and the arms on the chest; every other piece built on the trunk (the loincloth, the belly, the warts,
// the spikes, the trophy cord, the magma seams, the plates, the barnacles, the ice, the pauldrons) hangs rigid on the
// bone at its height. troll-knit.js keeps its `arms` and `arm` handles.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {knits} from './troll-knit.js';

const NAMES = ['troll', 'ice troll', 'rock troll', 'water troll', 'olog-hai', 'unknown T'];
const CLUBBED = ['rock troll', 'olog-hai'];
const build = name => createCreature({name, symbol: 84, color: 2});
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

test('every ogre has its trunk and neck on bones in one chain, the head on its top and the arms on the chest', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints;
    for (const n of ['hips', 'spine0', 'spine1', 'neck0', 'neck1', 'neck2', 'neck3']) assert(j[n]?.isBone, `${name}: ${n}`);
    assert(j.spine0.parent === j.hips && j.spine1.parent === j.spine0 && j.neck0.parent === j.spine1 && j.neck3.parent === j.neck2, `${name}: one chain`);
    assert(a.head.parent === j.neck3, `${name}: the head rides neck3`);
    for (const n of ['lfore', 'rfore']) assert(j[n].parent === j.spine1, `${name}: ${n} hangs from the chest`);
    for (const n of ['lleg1', 'rleg1']) assert(!under(j[n], j.spine0), `${name}: ${n} stays on the pelvis`);
    assert.equal(hideOf(a).length, 1, `${name}: one hide on the skin, the spine and the limbs`);
    // (rigGiant drops `arms`; the troll gets them back, the same arm groups, so troll-knit.js still drives them)
    assert.deepEqual(a.arms, [j.lfore, j.rfore], `${name}: arms are the arm joints`);
    assert(a.arm === j.rfore && knits(a), `${name}: troll-knit.js still takes it`);
    const loose = a.body.children.filter(o => o.isMesh && !o.isSkinnedMesh);
    assert.equal(loose.length, 0, `${name}: every trunk piece hangs on a bone (${loose.length} left on the body)`);
  }
});

test('bowing the neck carries the head; the skin before it, the trunk pieces and the legs stay', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints, rest = verts(a), share = shareOn(a, j.neck1), was = worldOf(a.head), legs = a.legs.map(worldOf), plain = plainCentres(a);
    j.neck1.rotation.x = .5; j.neck2.rotation.x = .4;
    assert(worldOf(a.head).distanceTo(was) > .02, `${name}: the head went with the neck`);
    verts(a).forEach((v, i) => { if (share[i] === 0) assert(v.distanceTo(rest[i]) < 1e-6, `${name}: the skin before the neck stayed`); });
    for (const [o, at] of plain) if (!under(o, a.head)) assert(world(o).distanceTo(at) < 1e-9, `${name}: a piece off the neck moved`);
    a.legs.forEach((l, i) => assert(worldOf(l).distanceTo(legs[i]) < 1e-9, `${name}: the legs stayed`));
  }
});

test('a hunch at the waist carries the head, arms, a club and the chest\'s pieces, and leaves the legs and the skin below', () => {
  for (const name of NAMES) {
    const a = build(name), j = a.joints, rest = verts(a), share = shareOn(a, j.spine0), head = worldOf(a.head), legs = a.legs.map(worldOf);
    const arms = [j.lfore, j.rfore].map(worldOf), chest = plainCentres(a).filter(([o]) => o.parent === j.spine1);
    const club = j.rfore_2.children.find(o => o.isGroup && o.children.length), clubAt = club && worldOf(club);
    assert.equal(!!club, CLUBBED.includes(name), `${name}: a club only where it stands`);
    j.spine0.rotation.x = .4; j.spine1.rotation.x = .3;
    const now = worldOf(a.head);
    assert(now.y < head.y - .03 && now.z > head.z, `${name}: the head came forward and down`);
    [j.lfore, j.rfore].forEach((o, i) => assert(worldOf(o).distanceTo(arms[i]) > .02, `${name}: ${o.name} went with the chest`));
    if (club) assert(worldOf(club).distanceTo(clubAt) > .02, `${name}: the club went with the chest`);
    assert(chest.length > 0, `${name}: something rides the chest`);
    for (const [o, at] of chest) assert(world(o).distanceTo(at) > .01, `${name}: a piece on the chest went with it`);
    let moved = 0; const bent = verts(a);
    rest.forEach((r, i) => { const d = r.distanceTo(bent[i]); if (share[i] === 0) assert(d < 1e-6, `${name}: the skin below the waist stayed`); else if (share[i] > .5) moved = Math.max(moved, d); });
    assert(moved > .05, `${name}: the skin above the waist moved ${moved.toFixed(3)}`);
    a.legs.forEach((l, i) => assert(worldOf(l).distanceTo(legs[i]) < 1e-9, `${name}: the legs stayed`));
  }
});
