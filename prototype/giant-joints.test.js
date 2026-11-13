import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import names from './tools/creature-names.json' with {type: 'json'};

// every H the live game builds through giant() (the minotaur has its own builder)
const GIANTS = names.filter(n => n.letter === 'H' && n.name !== 'minotaur').map(n => n.name);
const build = name => createCreature({name, glyph: 'H', color: '#888'});
// stage 1 step 3: the trunk and limbs are one skinned hide, so a turn is read off the skin's vertices as well
const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
// the hide: the skinned mesh on the body whose bones run from the spine out to the arms
// (and carries the arms' and legs' vertices: the frost giants' chest is a second skin on the same bones, trunk only)
const uses = (o, n) => { const k = new Set(o.skeleton.bones.flatMap((b, i) => b.name === n ? [i] : [])), si = o.geometry.attributes.skinIndex;
  for (let i = 0; i < si.count; i++) for (let c = 0; c < 4; c++) if (k.has(si.getComponent(i, c))) return true; return false; };
const hideOf = a => a.body.children.filter(o => o.isSkinnedMesh && ['spine1', 'lfore_1', 'lleg1_1'].every(n => uses(o, n)));
// every skinned vertex in the world as it is drawn now, and how much of its weight hangs past `root`
const verts = a => { a.g.updateMatrixWorld(true); const v = new THREE.Vector3(), out = [];
  a.g.traverse(m => { if (m.isSkinnedMesh) for (let i = 0; i < m.geometry.attributes.position.count; i++) { m.getVertexPosition(i, v); out.push(v.clone().applyMatrix4(m.matrixWorld)); } }); return out; };
const shareOn = (a, root) => { const out = [];
  a.g.traverse(m => { if (!m.isSkinnedMesh) return; const si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
    for (let i = 0; i < si.count; i++) { let w = 0; for (let k = 0; k < 4; k++) if (under(m.skeleton.bones[si.getComponent(i, k)], root)) w += sw.getComponent(i, k); out.push(w); } }); return out; };
const plainCentres = a => { const out = []; a.g.traverse(o => { if (o.isMesh && !o.isSkinnedMesh) out.push([o, world(o)]); }); return out; };

// a mesh's place: its geometry's centre in the world (merged meshes stand at their group's origin)
const world = o => { o.updateWorldMatrix(true, false); const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox(); return g.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(o.matrixWorld); };
const meshesUnder = root => { const m = []; root.traverse(o => { if (o.isMesh) m.push(o); }); return m; };
// every rigid mesh's world position and every skinned vertex, before and after turning `joint` about x
function turned(a, joint, angle = .6) {
  const all = meshesUnder(a.g).filter(m => !m.isSkinnedMesh), at = () => all.map(world);
  const rest = at(), restV = verts(a), share = shareOn(a, joint), was = joint.rotation.x; joint.rotation.x += angle; const bent = at(), bentV = verts(a); joint.rotation.x = was;
  const past = new Set(meshesUnder(joint));
  return [...all.map((m, i) => ({past: past.has(m), d: rest[i].distanceTo(bent[i])})),
    ...restV.map((r, i) => ({past: share[i] > .5, before: share[i] === 0, d: r.distanceTo(bentV[i])}))];
}

test('every giant has its head, arms and legs as named joints', () => {
  assert(GIANTS.length >= 10, 'the giants in creature-names.json');
  for (const name of GIANTS) {
    const a = build(name), j = a.joints;
    assert(j, `${name}: joints`);
    assert.equal(j.head, a.head, `${name}: head`);
    assert(j.neck0?.isBone && j.neck0 !== a.head, `${name}: neck0 is the neck's first bone (stage 1 step 3)`);
    for (const n of ['lfore', 'rfore', 'lleg1', 'rleg1']) assert(j[n]?.isObject3D && j[n].name === n, `${name}: ${n}`);
    assert.equal(j.lleg1, a.legs.find(l => l.position.x < 0), `${name}: left is -x`);
    assert(j.lfore.position.x < 0 && j.rfore.position.x > 0, `${name}: the left arm is -x`);
    assert(!('arms' in a), `${name}: no arms handle, so no arm motion turns on`);
  }
});

test('the ettin names its second head head_1; one-headed giants have none', () => {
  const e = build('ettin');
  assert(e.joints.head_1?.isObject3D && e.joints.head_1 !== e.head, 'head_1');
  assert(e.joints.head_1.parent === e.head.parent && e.head.parent === e.joints.neck3, 'both heads on the top of the neck');
  assert(!build('hill giant').joints.head_1, 'one head');
});

test('turning a giant joint moves what hangs past it and nothing else', () => {
  for (const name of GIANTS) {
    const a = build(name);
    for (const n of ['head', 'lfore', 'rfore', 'lleg1', 'rleg1', ...(a.joints.head_1 ? ['head_1'] : [])]) {
      const r = turned(a, a.joints[n]);
      assert(r.some(x => x.past && x.d > .005), `${name}: something past ${n} moved`);
      for (const x of r) if (x.before ?? !x.past) assert(x.d < 1e-6, `${name}: a mesh or skin not on ${n} moved ${x.d}`);
    }
  }
});

test('the stone giant\'s boulder rides its left arm', () => {
  const a = build('stone giant'), rock = meshesUnder(a.joints.lfore).find(m => m.userData.part === 'boulder');
  assert(rock, 'the boulder is on lfore');
});

// stage 1 step 2: each arm and leg on three bones, the weapon (and the stone giant's boulder) on the wrist bone
const worldOf = o => { o.updateWorldMatrix(true, false); return new THREE.Vector3().setFromMatrixPosition(o.matrixWorld); };

test('every giant\'s arms and legs are on three bones each', () => {
  for (const name of GIANTS) {
    const a = build(name), j = a.joints;
    for (const limb of ['lfore', 'rfore', 'lleg1', 'rleg1']) {
      for (const k of [0, 1, 2]) assert(j[`${limb}_${k}`]?.isBone, `${name}: ${limb}_${k}`);
      assert.equal(j[`${limb}_1`].parent, j[`${limb}_0`], `${name}: ${limb} elbow or knee under its root`);
      assert.equal(j[`${limb}_2`].parent, j[`${limb}_1`], `${name}: ${limb} wrist or ankle under the elbow or knee`);
      const plain = j[limb].children.filter(o => o.isMesh && !o.isSkinnedMesh);
      assert.equal(plain.length, 0, `${name}: no plain mesh left on ${limb}`);
      const onLimb = shareOn(a, j[`${limb}_0`]).some(w => w > .5);
      assert(onLimb, `${name}: ${limb} skinned (in the hide or on its own skin)`);
    }
  }
});

test('a bent elbow carries the weapon; a bent knee moves the foot and not the trunk', () => {
  for (const name of GIANTS) {
    const a = build(name), held = a.g.getObjectByName('held');
    const weapon = held && meshesUnder(held)[0];
    if (weapon) {
      assert.equal(held.parent, a.joints.rfore_2, `${name}: the weapon hangs on the right wrist`);
      const rest = world(weapon); a.joints.rfore_1.rotation.x -= 1; const bent = world(weapon); a.joints.rfore_1.rotation.x += 1;
      assert(rest.distanceTo(bent) > .05, `${name}: the weapon follows the elbow`);
    }
    const head = worldOf(a.head), was = head.clone();
    a.joints.lleg1_1.rotation.x += .8; assert(worldOf(a.head).distanceTo(was) < 1e-9, `${name}: the knee leaves the head`); a.joints.lleg1_1.rotation.x -= .8;
  }
  for (const name of ['giant', 'hill giant', 'fire giant', 'frost giant', 'storm giant', 'titan'])
    assert(meshesUnder(build(name).g.getObjectByName('held')).length, `${name} holds a weapon`);
});

test('the stone giant\'s boulder hangs on its left wrist bone and follows the elbow', () => {
  const a = build('stone giant'), grip = a.g.getObjectByName('grip');
  assert.equal(grip.parent, a.joints.lfore_2, 'on lfore_2');
  const rock = meshesUnder(grip).find(m => m.userData.part === 'boulder'), rest = world(rock);
  a.joints.lfore_1.rotation.x += .8;
  assert(world(rock).distanceTo(rest) > .05, 'the boulder moves with the elbow');
});

test('every giant has its trunk and neck on bones, every head on the top of the neck and the arms on the chest', () => {
  for (const name of GIANTS) {
    const a = build(name), j = a.joints;
    for (const n of ['hips', 'spine0', 'spine1', 'neck0', 'neck1', 'neck2', 'neck3']) assert(j[n]?.isBone, `${name}: ${n}`);
    assert(j.spine0.parent === j.hips && j.spine1.parent === j.spine0 && j.neck0.parent === j.spine1 && j.neck3.parent === j.neck2, `${name}: one chain`);
    for (const h of [a.head, j.head_1].filter(Boolean)) assert(h.parent === j.neck3, `${name}: ${h.name} rides neck3`);
    for (const n of ['lfore', 'rfore']) assert(j[n].parent === j.spine1, `${name}: ${n} hangs from the chest`);
    for (const n of ['lleg1', 'rleg1']) assert(!under(j[n], j.spine0), `${name}: ${n} stays on the pelvis`);
    assert.equal(hideOf(a).length, 1, `${name}: one hide on the skin and on the spine`);
    const loose = a.body.children.filter(o => o.isMesh && !o.isSkinnedMesh);
    assert.equal(loose.length, 0, `${name}: every trunk piece hangs on a bone (${loose.length} left on the body)`);
  }
});

test('the ettin\'s neck rises between its two heads', () => {
  const e = build('ettin'), j = e.joints, x = worldOf(j.neck3).x, l = worldOf(e.head).x, r = worldOf(j.head_1).x;
  assert(Math.abs(x - (l + r) / 2) < 1e-6 && Math.min(l, r) < x && x < Math.max(l, r), 'neck3 midway');
});

test('bowing the neck carries every head; the skin before it, the trunk pieces and the legs stay', () => {
  for (const name of GIANTS) {
    const a = build(name), j = a.joints, heads = [a.head, j.head_1].filter(Boolean);
    const rest = verts(a), share = shareOn(a, j.neck1), was = heads.map(worldOf), legs = a.legs.map(worldOf), plain = plainCentres(a);
    j.neck1.rotation.x = .5; j.neck2.rotation.x = .4;
    heads.forEach((h, i) => assert(worldOf(h).distanceTo(was[i]) > .02, `${name}: ${h.name} went with the neck`));
    verts(a).forEach((v, i) => { if (share[i] === 0) assert(v.distanceTo(rest[i]) < 1e-6, `${name}: the skin before the neck stayed`); });
    for (const [o, at] of plain) if (!heads.some(h => under(o, h))) assert(world(o).distanceTo(at) < 1e-9, `${name}: a piece off the neck moved`);
    a.legs.forEach((l, i) => assert(worldOf(l).distanceTo(legs[i]) < 1e-9, `${name}: the legs stayed`));
  }
});

test('a hunch at the waist carries the head, arms, weapon and the chest\'s pieces, and leaves the legs and the skin below', () => {
  for (const name of GIANTS) {
    const a = build(name), j = a.joints, rest = verts(a), share = shareOn(a, j.spine0), head = worldOf(a.head), legs = a.legs.map(worldOf);
    const arms = [j.lfore, j.rfore].map(worldOf), chest = plainCentres(a).filter(([o]) => o.parent === j.spine1);
    j.spine0.rotation.x = .4; j.spine1.rotation.x = .3;
    const now = worldOf(a.head);
    assert(now.y < head.y - .03 && now.z > head.z, `${name}: the head came forward and down`);
    [j.lfore, j.rfore].forEach((o, i) => assert(worldOf(o).distanceTo(arms[i]) > .02, `${name}: ${o.name} went with the chest`));
    for (const [o, at] of chest) assert(world(o).distanceTo(at) > .01, `${name}: a piece on the chest went with it`);
    let moved = 0; const bent = verts(a);
    rest.forEach((r, i) => { const d = r.distanceTo(bent[i]); if (share[i] === 0) assert(d < 1e-6, `${name}: the skin below the waist stayed`); else if (share[i] > .5) moved = Math.max(moved, d); });
    assert(moved > .05, `${name}: the skin above the waist moved ${moved.toFixed(3)}`);
    a.legs.forEach((l, i) => assert(worldOf(l).distanceTo(legs[i]) < 1e-9, `${name}: the legs stayed`));
  }
});
