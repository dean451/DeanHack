import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as L from './lich-chill.js';

const dt = 1 / 60;
function mon(name, symbol = 'L') { const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 5}); a.species = name; return a; }
const alphas = p => [...p.geometry.attributes.color.array].filter((_, k) => k % 4 === 3);
const finite = p => p.geometry.attributes.position.array.every(Number.isFinite) && p.geometry.attributes.color.array.every(Number.isFinite);
const pose = a => a.lichHands.flatMap(h => [h.arm.rotation.x, ...h.fingers.flatMap(f => [f.rotation.x, f.rotation.z])]).concat(a.orb.scale.toArray());

test('every lich has hands with knuckled claws and an orb; nothing else chills', () => {
  for (const name of ['lich', 'demilich', 'master lich', 'arch-lich', 'unknown L']) {
    const a = mon(name);
    assert.equal(a.lichHands.length, 2, name);
    for (const h of a.lichHands) assert.equal(h.fingers.length, 3, name);
    assert.ok(a.orb?.isMesh, name);
    assert.ok(L.updateLichChill(a, dt, 0, false), name);
  }
  for (const [name, s] of [['skeleton', 'Z'], ['brown mold', 'F'], ['wraith', 'W']]) assert.equal(L.updateLichChill(mon(name, s), dt, 0, false), null, name);
});

test('poses stay in bounds', () => {
  for (let u = -.1; u <= 1.1; u += .01) {
    const g = L.graspPose(u), t = L.thrustPose(u);
    for (const v of [g.raise, g.splay, g.fist, g.pull, t]) assert.ok(v >= 0 && v <= 1, `${u}`);
  }
  assert.deepEqual(L.graspPose(0), {raise: 0, splay: 0, fist: 0, pull: 0});
  assert.equal(L.thrustPose(1), 0);
});

test('a lich flexes its claws, grasps, sheds cold motes, casts and rests after death', () => {
  const a = mon('arch-lich');
  const rest = pose(a);
  let t = 0, grasps = 0, was = false, fist = 0, mote = 0, minCurl = 9, maxCurl = -9;
  const free = a.lichHands.find(h => h.side < 0);
  for (let i = 0; i < 60 * 25; i++) {
    t += dt; updateFidget(a, dt, t, false);
    const st = a.lichChill;
    if (st.grasp && !was) grasps++;
    was = !!st.grasp;
    if (st.grasp) fist = Math.max(fist, L.graspPose(st.grasp.u).fist);
    mote = Math.max(mote, ...alphas(st.points).slice(0, L.MOTES));
    assert.ok(finite(st.points));
    assert.ok(pose(a).every(Number.isFinite));
    for (const f of free.fingers) { minCurl = Math.min(minCurl, f.rotation.x); maxCurl = Math.max(maxCurl, f.rotation.x); }
    const p = st.points.geometry.attributes.position;
    for (let k = 0; k < L.MOTES; k++) assert.ok(p.getY(k) >= .03 - 1e-9 && p.getY(k) < 1.6 && Math.abs(p.getX(k)) < .8 && Math.abs(p.getZ(k)) < .8);
    assert.ok(a.orb.scale.x > .9 && a.orb.scale.x < 1.4);
  }
  assert.ok(grasps >= 2, `it grasps (${grasps})`);
  assert.ok(fist > .9, `it makes a fist ${fist}`);
  assert.ok(mote > L.MOTE_ALPHA * .7, `motes ${mote}`);
  assert.ok(minCurl < -.3 && maxCurl > .9, `curl range ${minCurl}..${maxCurl}`);

  // a cast: the hand thrusts forward, the claws splay, frost is flung out ahead (+z)
  const st = a.lichChill;
  a.actions = {current: {kind: 'attack', attack: 'magic', dir: [0, 1]}, age: 0, u: 0, queue: [], dead: false};
  let reach = 0;
  for (let i = 0; i < 40; i++) {
    a.actions.u = Math.min(1, i / 40); a.actions.age = i * dt;
    t += dt; updateFidget(a, dt, t, true);
    reach = Math.min(reach, free.arm.rotation.x - st.free.restX);
  }
  assert.ok(reach < L.THRUST * .9, `thrust ${reach}`);
  assert.equal(st.spray.length, L.SPRAY);
  const live = st.spray.filter(p => p.born);
  assert.ok(live.length > L.SPRAY * .7 && live.every(p => p.vz > 0 && p.y >= .03));
  a.actions = {current: null, age: 0, queue: [], dead: false};

  // death eases everything back to rest
  a.actions = {current: null, age: 0, queue: [], dead: true};
  for (let i = 0; i < 60 * 8; i++) { t += dt; updateFidget(a, dt, t, false); }
  assert.deepEqual(pose(a), rest);
  assert.ok(alphas(st.points).every(v => v === 0));
});

test('two liches flex out of step', () => {
  const a = mon('lich'), b = mon('lich');
  let diff = 0;
  for (let i = 0; i < 120; i++) {
    updateFidget(a, dt, i * dt, false); updateFidget(b, dt, i * dt, false);
    diff = Math.max(diff, Math.abs(a.lichHands[0].fingers[0].rotation.x - b.lichHands[0].fingers[0].rotation.x));
  }
  assert.ok(diff > .05, `diff ${diff}`);
});
