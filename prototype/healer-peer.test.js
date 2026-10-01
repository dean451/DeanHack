import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateHealerPeer, peerPoseAt, peers, DIP, COCK, TURN, LIFT, REBOUND, TWIST, LEN, FIRST_MIN, FIRST_SPAN} from './healer-peer.js';

const make = name => {
  const a = createCreature({name, symbol: 64, color: 1});
  a.species = name; a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateHealerPeer(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const parts = a => [a.head.rotation, a.body.rotation, ...a.arms.map(r => r.rotation), a.weaponSocket.rotation];
const snap = a => parts(a).flatMap(r => [r.x, r.y, r.z]);
// the serpent's head (the staff's topmost point) in the model's own space
function serpent(a) {
  a.g.updateMatrixWorld(true);
  const inv = a.g.matrixWorld.clone().invert(), staff = a.weaponSocket.children[0], p = staff.geometry.attributes.position;
  const v = new THREE.Vector3(); let top = null;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    if (!top || v.y > top.y) top = v.clone();
  }
  return top.applyMatrix4(staff.matrixWorld).applyMatrix4(inv);
}

test('both peer poses stay in bounds, move smoothly and start and end at rest', () => {
  const n = 6000;
  for (const kind of ['peer', 'tap']) {
    let prev = peerPoseAt(kind, 0), lo = {roll: 0, twist: 0}, hi = {roll: 0, twist: 0};
    for (let i = 0; i <= n; i++) {
      const u = i / n, p = peerPoseAt(kind, u);
      for (const v of Object.values(p)) assert(Number.isFinite(v));
      assert(p.pitch >= -1e-12 && p.pitch <= DIP + 1e-12 && Math.abs(p.roll) <= COCK + 1e-12 && Math.abs(p.turn) <= TURN + 1e-12);
      assert(p.arm >= LIFT - 1e-12 && p.arm <= REBOUND + 1e-12 && Math.abs(p.twist) <= TWIST + 1e-12);
      for (const k of Object.keys(p)) assert(Math.abs(p[k] - prev[k]) < .01, `${kind} ${k} jumps at ${u}`);
      for (const k of ['roll', 'twist']) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
      prev = p;
    }
    for (const p of [peerPoseAt(kind, 0), peerPoseAt(kind, 1), peerPoseAt(kind, .5, 0), peerPoseAt(kind, NaN)]) assert(Object.values(p).every(v => v === 0));
    if (kind === 'peer') assert(lo.roll < -COCK * .95 && hi.roll > COCK * .95, 'the head cocks to both sides');
    else assert(lo.twist < -TWIST * .95 && hi.twist > TWIST * .95, 'the staff turns both ways');
  }
});

test('only healers peer', () => {
  assert(peers(make('healer')));
  for (const name of ['rogue', 'monk', 'barbarian', 'knight', 'samurai', 'archeologist', 'watchman']) assert(!peers(make(name)), name);
});

test('the turning staff swings the serpent head out to either side', () => {
  const a = make('healer'), rest = serpent(a);
  const at = u => {
    const b = make('healer'), p = peerPoseAt('tap', u);
    b.weaponSocket.rotation.y += p.twist; b.arm.rotation.x += p.arm;
    return serpent(b);
  };
  const out = at(.32), across = at(.66);
  assert(Math.abs(out.x - across.x) > .05, `serpent swings across (${out.x} → ${across.x})`);
  for (const s of [out, across]) assert(Math.abs(s.y - rest.y) < .06 && s.distanceTo(rest) < .2, 'stays up over the staff');
});

test('a standing healer peers, then taps its staff, and goes back exactly to rest', () => {
  const a = make('healer'), rest = snap(a), dt = 1 / 60;
  let t = 0, started = null;
  for (let i = 0; i < 60 * 30 && !started; i++) { if (frame(a, dt)) started = t; t += dt; }
  assert(started != null && started >= FIRST_MIN - .1 && started <= FIRST_MIN + FIRST_SPAN + .1, `started at ${started}`);
  const seen = [];
  for (let i = 0; i < 60 * 40; i++) {
    frame(a, dt);
    const kind = a.healerPeer.cur?.kind;
    if (kind && seen.at(-1) !== kind) seen.push(kind);
    for (const v of snap(a)) assert(Number.isFinite(v));
  }
  assert.deepEqual(seen.slice(0, 2), ['peer', 'tap']);
  while (a.healerPeer.cur) frame(a, dt);
  snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `part ${i} back at rest`));
  assert(LEN.peer > 3 && LEN.tap > 3, 'slow enough to glide');
});

test('walking, an attack or death fades the peer out within ~0.1 s and leaves it at rest', () => {
  for (const [kind, at] of [['peer', .3], ['peer', .55], ['tap', .2], ['tap', .45]]) for (const cut of ['walk', 'attack', 'die']) {
    const a = make('healer'), rest = snap(a), dt = 1 / 60, name = `${kind}@${at} ${cut}`;
    for (let i = 0; i < 60 * 60 && !(a.healerPeer?.cur?.kind === kind && a.healerPeer.cur.u > at); i++) frame(a, dt);
    assert(a.healerPeer.cur?.u > at, name);
    if (cut === 'attack') enqueueAction(a.actions, {kind: 'attack', type: 'weapon', dir: [1, 0]});
    if (cut === 'die') enqueueAction(a.actions, {kind: 'die'});
    for (let i = 0; i < 8; i++) frame(a, dt, cut === 'walk');
    assert(a.healerPeer.f < .2, `${name}: faded to ${a.healerPeer.f}`);
    for (let i = 0; i < 60 * 3; i++) frame(a, dt, cut === 'walk');
    assert.equal(a.healerPeer.cur, null, name);
    if (cut !== 'die') snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `${name}: part ${i} back at rest`));
    else assert.equal(updateHealerPeer(a, dt, 0, false), null, 'the dead do not peer');
  }
});
