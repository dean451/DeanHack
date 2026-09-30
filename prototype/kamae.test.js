import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose, STRIKE_U, ACTION_TIME} from './actions.js';
import {updateKamae, holdsKamae, aim, HILT, ARM_LEN} from './kamae.js';

const make = name => {
  const a = createCreature({name, symbol: 64, color: 1});
  a.species = name; a.actions = createActionQueue();
  return a;
};
function frame(a, dt, t, kamae = true) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return kamae ? updateKamae(a, dt, t) : null;
}
const snap = a => [...a.arms.flatMap(r => [r.rotation.x, r.rotation.y, r.rotation.z, r.position.x, r.position.y, r.position.z]),
  a.weaponSocket.rotation.x, a.weaponSocket.rotation.y, a.weaponSocket.rotation.z];
const inModel = (a, o, x, y, z) => { a.g.updateMatrixWorld(true); return o.localToWorld(new THREE.Vector3(x, y, z)).applyMatrix4(a.g.matrixWorld.clone().invert()); };

test('aim points an arm hanging down its local -y at the target', () => {
  const from = new THREE.Vector3(.2, .8, 0), e = new THREE.Euler();
  for (const to of [[0, .5, .3], [.5, .4, -.2], [-.3, 1.1, .4], [.2, .1, 0]]) {
    const t = new THREE.Vector3(...to), {x, z} = aim(from, t);
    const dir = new THREE.Vector3(0, -1, 0).applyEuler(e.set(x, 0, z)), want = t.clone().sub(from).normalize();
    assert(dir.distanceTo(want) < 1e-9, `aim at ${to}`);
  }
});

test('only the samurai stands in kamae', () => {
  assert(holdsKamae(make('samurai')));
  for (const name of ['valkyrie', 'knight', 'soldier', 'mind flayer']) assert(!holdsKamae(make(name)), name);
});

test('a standing samurai holds the katana two-handed, forward and up, edge down, arms clear of the dō', () => {
  const a = make('samurai');
  const restHand = inModel(a, a.arm, 0, -ARM_LEN, 0);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < 400; i++) {
    const t = i / 60, p = frame(a, 1 / 60, t);
    for (const v of snap(a)) assert(Number.isFinite(v));
    assert(p);
    const hand = inModel(a, a.arm, 0, -ARM_LEN, 0), left = inModel(a, a.arms[0], 0, -ARM_LEN, 0);
    const socket = inModel(a, a.weaponSocket, 0, 0, 0), tip = inModel(a, a.weaponSocket, 0, .67, 0);
    const edge = inModel(a, a.weaponSocket, 0, .3, .05).sub(inModel(a, a.weaponSocket, 0, .3, 0)).normalize();
    const axis = tip.clone().sub(socket).normalize();
    // the right hand up in front of the chest, near the middle
    assert(hand.y > restHand.y + .2 && hand.z > .3 && Math.abs(hand.x) < .08, `right hand ${hand.toArray()}`);
    // the blade forward and up, straight ahead, edge down
    assert(axis.z > .8 && axis.y > .4 && Math.abs(axis.x) < 1e-6, `blade ${axis.toArray()}`);
    assert(edge.y < -.7 && edge.dot(axis) < 1e-6);
    // the left hand on the hilt below the right, not on the right hand
    const rel = left.clone().sub(socket), along = rel.dot(axis), off = rel.addScaledVector(axis, -along).length();
    assert(off < .005 && along >= HILT[0] - 1e-6 && along <= HILT[1] + 1e-6, `left hand at ${along}, ${off} off the hilt`);
    lo = Math.min(lo, tip.y); hi = Math.max(hi, tip.y);
  }
  assert(hi - lo > .01 && hi - lo < .05, 'the tip breathes a little');
});

test('the arms stay clear of the dō in kamae', () => {
  const a = make('samurai');
  const body = a.body.children.find(m => m.isMesh).geometry.attributes.position;
  // the armour's outer radius per 2 cm band and 16 sectors
  const key = (y, ang) => Math.round(y / .02) + ':' + Math.round(ang / (Math.PI / 8)), prof = new Map();
  for (let i = 0; i < body.count; i++) {
    const x = body.getX(i), y = body.getY(i), z = body.getZ(i), k = key(y, Math.atan2(x, z));
    prof.set(k, Math.max(prof.get(k) || 0, Math.hypot(x, z)));
  }
  const depth = () => {
    a.g.updateMatrixWorld(true);
    const inv = a.body.matrixWorld.clone().invert(), v = new THREE.Vector3();
    let d = 0;
    for (const arm of a.arms) {
      const m = arm.children.find(o => o.isMesh), p = m.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        // the arm below the shoulder cap, not the sode plate
        if (p.getY(i) > -.12 || Math.hypot(p.getX(i), p.getZ(i)) > .075) continue;
        v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld).applyMatrix4(inv);
        const r = prof.get(key(v.y, Math.atan2(v.x, v.z)));
        if (r) d = Math.max(d, r - Math.hypot(v.x, v.z));
      }
    }
    return d;
  };
  const rest = depth();
  frame(a, 1 / 60, 0);
  // a straight arm from an unmoved shoulder to the hilt sinks ~.09 into the armour
  assert(depth() < rest + .015, `arms sink ${depth()} (rest ${rest})`);
});

test('a weapon attack is a two-handed cut from kamae: up over the head, down through the target, back to kamae', () => {
  for (const result of ['hit', 'miss']) {
    const a = make('samurai'), dt = 1 / 60;
    for (let i = 0; i < 60; i++) frame(a, dt, i * dt);
    const held = snap(a);
    enqueueAction(a.actions, {kind: 'attack', attack: 'weapon', result, dir: {x: 1, z: 0}});
    let i = 60, top = -Infinity, back = Infinity, blow = null, low = Infinity, off = 0;
    while (a.actions.current || a.actions.queue.length) {
      frame(a, dt, i * dt); i++;
      for (const v of snap(a)) assert(Number.isFinite(v));
      assert.equal(a.kamae.f, 1, 'the stance holds through the cut');
      const q = a.actions, socket = inModel(a, a.weaponSocket, 0, 0, 0), tip = inModel(a, a.weaponSocket, 0, .67, 0);
      const axis = tip.clone().sub(socket).normalize(), left = inModel(a, a.arms[0], 0, -ARM_LEN, 0);
      const rel = left.clone().sub(socket), along = rel.dot(axis);
      // the left hand rides the hilt all the way
      off = Math.max(off, rel.addScaledVector(axis, -along).length());
      if (q.current && q.u < STRIKE_U) { top = Math.max(top, tip.y); back = Math.min(back, tip.z); }
      if (q.current && q.age >= STRIKE_U * ACTION_TIME.attack && q.age < STRIKE_U * ACTION_TIME.attack + dt) blow = {tip, axis};
      if (q.current && q.u > STRIKE_U) low = Math.min(low, tip.y);
      assert(i < 600);
    }
    assert(off < .04, `${result}: left hand ${off} off the hilt`);
    // furikaburi: the blade up over the head and pointing back
    assert(top > 1.5 && back < -.1, `${result}: raised to ${top}, back to ${back}`);
    // at the blow the blade is out in front, about level, straight ahead
    assert(blow && blow.tip.z > .9 && Math.abs(blow.axis.y) < .3 && Math.abs(blow.axis.x) < .1, `${result}: blow ${blow?.tip.toArray()}`);
    // a miss follows through low; a hit stops on the target
    if (result === 'miss') assert(low < .4, `miss follows through to ${low}`); else assert(low > .65, `hit stops at ${low}`);
    for (let k = 0; k < 90; k++, i++) frame(a, dt, i * dt);
    // back in kamae (the breath moves only the socket and arm by a hair)
    assert(snap(a).every((v, k) => Math.abs(v - held[k]) < .05));
  }
});

test('the samurai cuts instead of thrusting its katana like a spear', () => {
  const a = make('samurai'), plain = make('samurai'), dt = 1 / 60;
  for (const x of [a, plain]) enqueueAction(x.actions, {kind: 'attack', attack: 'weapon', result: 'hit', dir: {x: 0, z: 1}});
  // with no kamae on top, the action layer leaves the sword arm and katana alone
  const rest = snap(plain);
  for (let i = 0; i < 30; i++) frame(plain, dt, i * dt, false);
  assert(snap(plain).every((v, k) => Math.abs(v - rest[k]) < 1e-9));
});

test('death fades the stance out and leaves the arms and katana exactly at rest', () => {
  const a = make('samurai'), rest = snap(a), dt = 1 / 60;
  for (let i = 0; i < 60; i++) frame(a, dt, i * dt);
  assert(snap(a).some((v, k) => Math.abs(v - rest[k]) > .3));
  enqueueAction(a.actions, {kind: 'die', dir: {x: 0, z: 1}});
  for (let i = 60; i < 360; i++) frame(a, dt, i * dt);
  assert.equal(a.kamae.f, 0);
  assert(snap(a).every((v, k) => Math.abs(v - rest[k]) < 1e-9));
});
