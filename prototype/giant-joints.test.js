import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import names from './tools/creature-names.json' with {type: 'json'};

// every H the live game builds through giant() (the minotaur has its own builder)
const GIANTS = names.filter(n => n.letter === 'H' && n.name !== 'minotaur').map(n => n.name);
const build = name => createCreature({name, glyph: 'H', color: '#888'});
// a mesh's place: its geometry's centre in the world (merged meshes stand at their group's origin)
const world = o => { o.updateWorldMatrix(true, false); const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox(); return g.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(o.matrixWorld); };
const meshesUnder = root => { const m = []; root.traverse(o => { if (o.isMesh) m.push(o); }); return m; };
// every mesh's world position, before and after turning `joint` about x
function turned(a, joint, angle = .6) {
  const all = meshesUnder(a.g), at = () => all.map(world);
  const rest = at(), was = joint.rotation.x; joint.rotation.x += angle; const bent = at(); joint.rotation.x = was;
  const past = new Set(meshesUnder(joint));
  return all.map((m, i) => ({past: past.has(m), d: rest[i].distanceTo(bent[i])}));
}

test('every giant has its head, arms and legs as named joints', () => {
  assert(GIANTS.length >= 10, 'the giants in creature-names.json');
  for (const name of GIANTS) {
    const a = build(name), j = a.joints;
    assert(j, `${name}: joints`);
    assert.equal(j.head, a.head, `${name}: head`);
    assert.equal(j.neck0, a.head, `${name}: neck0 is the head group`);
    for (const n of ['lfore', 'rfore', 'lleg1', 'rleg1']) assert(j[n]?.isObject3D && j[n].name === n, `${name}: ${n}`);
    assert.equal(j.lleg1, a.legs.find(l => l.position.x < 0), `${name}: left is -x`);
    assert(j.lfore.position.x < 0 && j.rfore.position.x > 0, `${name}: the left arm is -x`);
    assert(!('arms' in a), `${name}: no arms handle, so no arm motion turns on`);
  }
});

test('the ettin names its second head head_1; one-headed giants have none', () => {
  const e = build('ettin');
  assert(e.joints.head_1?.isObject3D && e.joints.head_1 !== e.head, 'head_1');
  assert(e.joints.head_1.parent === e.head.parent, 'both heads on the body');
  assert(!build('hill giant').joints.head_1, 'one head');
});

test('turning a giant joint moves what hangs past it and nothing else', () => {
  for (const name of GIANTS) {
    const a = build(name);
    for (const n of ['head', 'lfore', 'rfore', 'lleg1', 'rleg1', ...(a.joints.head_1 ? ['head_1'] : [])]) {
      const r = turned(a, a.joints[n]);
      assert(r.some(x => x.past && x.d > .005), `${name}: something past ${n} moved`);
      for (const x of r) if (!x.past) assert(x.d < 1e-9, `${name}: a mesh not on ${n} moved ${x.d}`);
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
      assert(j[limb].children.some(o => o.isSkinnedMesh), `${name}: ${limb} skinned`);
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
