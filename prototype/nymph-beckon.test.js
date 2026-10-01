import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import * as N from './nymph-beckon.js';

const dt = 1 / 60;
function mon(name, symbol, color = 2) { const a = createCreature({name, symbol: symbol.charCodeAt(0), color}); a.species = name; return a; }
const pose = a => [a.body, a.head, a.beckonArm, a.bauble].flatMap(o => o.rotation.toArray().slice(0, 3))
  .concat(a.beckonHand.quaternion.toArray(), a.motes.rotation.toArray().slice(0, 3), a.motes.position.toArray());

test('nymphs beckon; other creatures do not', () => {
  for (const name of ['wood nymph', 'water nymph', 'mountain nymph']) {
    const a = mon(name, 'n');
    assert.ok(N.beckons(a), name);
    assert.ok(N.updateNymphBeckon(a, dt, 0, false), name);
    assert.equal(a.motes.children.length, 1, `${name}: the motes are one draw`);
  }
  for (const [name, s] of [['leprechaun', 'l'], ['gnome', 'G'], ['troll', 'T']]) assert.equal(N.updateNymphBeckon(mon(name, s), dt, 0, false), null, name);
});

test('the arm and amulet moved onto pivots without moving the model', () => {
  const a = mon('water nymph', 'n');
  assert.equal(a.beckonHand.parent, a.beckonArm);
  assert.equal(a.baubleGem.parent, a.bauble);
  a.g.updateMatrixWorld(true);
  const local = o => a.body.worldToLocal(new THREE.Vector3().setFromMatrixPosition(o.matrixWorld));
  // the wrist and the amulet's chain sit where they did before the pivots, in the body's space
  assert.ok(local(a.beckonHand).distanceTo(new THREE.Vector3(.13, .735, .09)) < 1e-6, `${local(a.beckonHand).toArray()}`);
  assert.ok(local(a.bauble).distanceTo(new THREE.Vector3(-.204, .545, .006)) < 1e-6);
  assert.ok(local(a.baubleGem).distanceTo(new THREE.Vector3(-.204, .415, .012)) < 1e-6);
});

test('the turn pose stays in 0..1 and ends at zero', () => {
  for (const tease of [false, true]) for (let u = -.1; u <= 1.1; u += .005) for (const v of Object.values(N.turnPose(u, tease))) assert.ok(v >= 0 && v <= 1, `${u}`);
  for (const v of Object.values(N.turnPose(1))) assert.equal(v, 0);
  assert.ok(N.turnPose(.5).reach > .99 && N.turnPose(.5, true).twirl > .99);
  let curls = 0, was = false;
  for (let u = 0; u < 1; u += .002) { const c = N.turnPose(u).curl > .9; if (c && !was) curls++; was = c; }
  assert.equal(curls, N.CURLS);
});

test('she looks at the hero, beckons and teases, snatches, flinches and rests after death', () => {
  const a = mon('wood nymph', 'n');
  const hero = new THREE.Vector3(2, 0, 2);
  const rest = pose(a);
  N.updateNymphBeckon(a, 0, 0, false, hero);
  const st = a.nymphBeckon;
  let t = 0, beck = 0, teases = 0, was = false, lift = 0, curl = 0, flare = 0, snatch = 0, flinch = 0, aim = 0;
  for (let i = 0; i < 60 * 40; i++) {
    t += dt;
    if (i === 60 * 30) a.actions = {current: {kind: 'hit'}};
    if (i === 60 * 30 + 10) a.actions = null;
    if (i === 60 * 32) a.actions = {current: {kind: 'attack'}, age: 0, u: .4};
    if (i === 60 * 32 + 20) a.actions = null;
    N.updateNymphBeckon(a, dt, t, i % 600 > 540, hero);
    if (st.turn && !was) st.turn.tease ? teases++ : beck++;
    was = !!st.turn;
    lift = Math.max(lift, st.arm.x - a.beckonArm.rotation.x);
    curl = Math.max(curl, a.beckonHand.quaternion.angleTo(st.hand));
    flare = Math.max(flare, a.baubleGem.material.emissiveIntensity);
    if (i > 60 * 32 && i < 60 * 32 + 20) snatch = Math.max(snatch, a.body.rotation.x - st.body.x);
    if (i > 60 * 30 && i < 60 * 31) flinch = Math.max(flinch, st.body.x - a.body.rotation.x);
    if (!st.turn && i < 60 * 30) aim = Math.max(aim, Math.abs(a.head.rotation.y - st.head.y));
    const p = pose(a);
    assert.ok(p.every(Number.isFinite));
    assert.ok(Math.abs(a.body.rotation.x - st.body.x) < .3 && Math.abs(a.body.rotation.y - st.body.y) < .3, `${i} ${a.body.rotation.x - st.body.x} ${a.body.rotation.y - st.body.y}`);
    assert.ok(Math.abs(a.head.rotation.x - st.head.x) < .5 && Math.abs(a.head.rotation.y - st.head.y) < 1.1 && Math.abs(a.head.rotation.z - st.head.z) < .5, `${i} ${a.head.rotation.toArray()}`);
    assert.ok(Math.abs(a.beckonArm.rotation.x - st.arm.x) < 1.6);
    assert.ok(a.motes.position.length() < .3);
  }
  assert.ok(beck >= 2 && teases >= 1, `beckons ${beck} teases ${teases}`);
  assert.ok(lift > .9, `lift ${lift}`);
  assert.ok(curl > .5, `curl ${curl}`);
  assert.ok(flare > 3, `flare ${flare}`);
  assert.ok(snatch > .05, `snatch ${snatch}`);
  assert.ok(flinch > .05, `flinch ${flinch}`);
  assert.ok(aim > .4, `aim ${aim}`);
  // her gem material is her own
  assert.notEqual(a.baubleGem.material, mon('wood nymph', 'n').baubleGem.material);
  a.actions = {dead: true};
  for (let i = 0; i < 60 * 8; i++) { t += dt; N.updateNymphBeckon(a, dt, t, true, hero); }
  pose(a).forEach((v, k) => assert.ok(Math.abs(v - rest[k]) < 1e-6, `${k}: ${v} vs ${rest[k]}`));
  assert.ok(Math.abs(a.baubleGem.material.emissiveIntensity - st.glow) < 1e-6);
});
