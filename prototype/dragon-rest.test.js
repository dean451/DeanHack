import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {sleepPose, wingFold, blendDragon, dragonPoser} from './dragon-rest.js';
import {DRAGON} from './creature-measures.js';

const make = name => createCreature({name, symbol: 68});
const posed = (a, test) => { const out = [], v = new THREE.Vector3(); a.g.updateMatrixWorld(true); a.g.traverse(o => { if (!o.isMesh) return; if (o.isSkinnedMesh) o.skeleton.update(); const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i += 3) { v.fromBufferAttribute(p, i); if (o.isSkinnedMesh) o.applyBoneTransform(i, v); v.applyMatrix4(o.matrixWorld); if (!test || test(o)) out.push(v.clone()); } }); return out; };

test('a sleeping dragon meets every goal of its pose to under 2 cm: the draken and the wyvern lying down, the lindworm in its coil', () => {
  for (const name of ['draken', 'wyvern', 'lindworm']) {
    const a = make(name), r = sleepPose(a, 'test:' + name);
    r.apply(r.pose);
    for (const [k, g] of Object.entries(r.goals)) {
      const worst = Math.max(0, ...[g(r.points)].flat(2).map(Math.abs));
      assert(worst < .02, `${name}: ${k} misses by ${(worst * 100).toFixed(1)} cm`);
    }
  }
});

test('it is lying down, not standing: the body has come down to the floor and nothing goes through it', () => {
  for (const name of ['draken', 'wyvern', 'lindworm']) {
    const a = make(name); a.g.updateMatrixWorld(true);
    const standing = Math.min(...posed(a, o => !o.isSkinnedMesh && o.parent === a.body).map(p => p.y));
    const r = sleepPose(a, 'test:' + name); r.apply(r.pose);
    const all = posed(a), low = Math.min(...all.map(p => p.y));
    assert(low > -.012, `${name}: something ${(-low * 100).toFixed(1)} cm through the floor`);
    if (name !== 'lindworm') { const lying = Math.min(...posed(a, o => !o.isSkinnedMesh && o.parent === a.body).map(p => p.y)); assert(standing > .2 && lying < .03, `${name}: belly from ${standing.toFixed(2)} down to ${lying.toFixed(3)}`); }
  }
});

test('the tail\'s outer half lies on the floor', () => {
  for (const name of ['draken', 'wyvern', 'lindworm']) {
    const a = make(name), r = sleepPose(a, 'test:' + name); r.apply(r.pose);
    const tail = []; for (let i = 0; a.joints['tail' + i]; i++) tail.push(a.joints['tail' + i]);
    for (const b of tail.slice(Math.ceil(tail.length / 2))) { const y = b.getWorldPosition(new THREE.Vector3()).y; assert(y < .13 * a.g.scale.x, `${name} ${b.name} ${y.toFixed(3)} up`); }
  }
});

test('the wings fold like a bat\'s and lie over the back: no wing point below the back\'s top line, wrists over the shoulders, tips behind the hips', () => {
  for (const name of ['draken', 'wyvern']) {
    const a = make(name), r = sleepPose(a, 'test:' + name); r.apply(r.pose);
    const back = Math.max(...posed(a, o => !o.isSkinnedMesh && o.parent === a.body).map(p => p.y)), P = r.points;
    for (const s of ['l', 'r']) {
      for (const p of [`wingwrist:${s}`, `wingtip:${s}`]) assert(P[p]().y > back, `${name}: ${p} at ${P[p]().y.toFixed(3)}, the back's top at ${back.toFixed(3)}`);
      assert(P[`wingwrist:${s}`]().y > P.withers().y, `${name}: the ${s} wrist over the shoulders`);
      const hip = name === 'wyvern' || P[`hip:${s}`] ? P[`hip:${s}`]() : P.rump();
      assert(P[`wingtip:${s}`]().z < hip.z, `${name}: the ${s} tip behind the hip`);
    }
    // folded to about a bat's forearm share of the open wing
    for (const w of a.wings) { const f = r.pose[`${w.name}_inner`].s; assert(f === wingFold(w.userData.inner) && f > .4 && f < .7, `${name} fold ${f}`); }
  }
  assert(DRAGON.forearmMid > .25 && DRAGON.forearmMid < .4, 'the bat measure the fold follows');
});

test('the head curls round like a sleeping cat\'s: beside the chest, chin down on the left forepaw (a wyvern\'s on the floor), the face turned back along the flank, the neck low', () => {
  for (const name of ['draken', 'wyvern']) {
    const a = make(name), r = sleepPose(a, 'test:' + name); r.apply(r.pose); const P = r.points;
    const half = Math.max(...posed(a, o => !o.isSkinnedMesh && o.parent === a.body).map(p => Math.abs(p.x))), head = a.joints.head.getWorldPosition(new THREE.Vector3());
    assert(P.chin().y < .1 * a.g.scale.x, `${name}: chin ${P.chin().y.toFixed(3)} up`);
    assert(head.x < -half + .02, `${name}: the head lies beside the chest (${head.x.toFixed(3)} against its half-width ${half.toFixed(3)})`);
    assert(P.mouth().z < P.chin().z && P.mouth().x < P.chin().x, `${name}: the face turned back and out along the flank`);
    const necks = []; for (let i = 0; a.joints['neck' + i]; i++) necks.push(a.joints['neck' + i].getWorldPosition(new THREE.Vector3()).y);
    assert(Math.max(...necks) - necks[0] < .1 * a.g.scale.x, `${name}: the neck rises ${(Math.max(...necks) - necks[0]).toFixed(3)} off the chest`);
    if (name === 'draken') assert(P.chin().distanceTo(P['paw:lf']()) < .1 * a.g.scale.x, 'the chin on the left forepaw');
  }
});

test('the pose blends back exactly to the standing dragon', () => {
  const a = make('draken'), {apply} = dragonPoser(a), before = new Map();
  a.g.updateMatrixWorld(true); for (const [n, o] of Object.entries(a.joints)) before.set(n, o.matrixWorld.clone());
  const r = sleepPose(a, 'test:draken');
  apply(blendDragon(r.pose, {}, .5)); apply(blendDragon(r.pose, {}, 1));
  for (const [n, o] of Object.entries(a.joints)) assert(o.matrixWorld.equals(before.get(n)), `${n} back where it stood`);
});
