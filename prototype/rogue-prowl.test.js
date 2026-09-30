import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateRogueProwl, prowlPose, prowls, LOOK, TURN, DRAW, EDGE, WATCH, LOOK_TILT, LEN, FIRST_MIN, FIRST_SPAN} from './rogue-prowl.js';

const TAU = Math.PI * 2;
const make = name => {
  const a = createCreature({name, symbol: 64, color: 1});
  a.species = name; a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateRogueProwl(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const parts = a => [a.head.rotation, a.body.rotation, ...a.arms.map(r => r.rotation), a.weaponSocket.rotation];
const snap = a => parts(a).flatMap(r => [r.x, r.y, r.z]);
// the dagger's tip and the lowest point of the whole model, in the model's own space
function measure(a) {
  a.g.updateMatrixWorld(true);
  const v = new THREE.Vector3(), inv = a.g.matrixWorld.clone().invert();
  let low = Infinity, tip = null;
  a.g.traverse(o => {
    const p = o.geometry?.attributes?.position; if (!p) return;
    for (let i = 0; i < p.count; i += 5) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
      low = Math.min(low, v.y);
    }
  });
  // the needle point sits .31 up the dagger's own axis, tilted by the grip
  const local = new THREE.Vector3(0, .31, 0).applyEuler(new THREE.Euler(Math.PI / 2 - .85, 0, 0)).add(new THREE.Vector3(0, .02, 0));
  tip = local.applyMatrix4(a.weaponSocket.matrixWorld).applyMatrix4(inv);
  return {low, tip};
}

test('both prowl poses stay in bounds, move smoothly and start and end at rest', () => {
  const n = 6000;
  for (const kind of ['glance', 'flip']) {
    let prev = prowlPose(kind, 0), sawLeft = false, sawRight = false, sawFlip = 0;
    for (let i = 0; i <= n; i++) {
      const u = i / n, p = prowlPose(kind, u);
      for (const v of Object.values(p)) assert(Number.isFinite(v));
      assert(Math.abs(p.yaw) <= LOOK * (1 - TURN) + 1e-12 && Math.abs(p.turn) <= LOOK * TURN + 1e-12);
      assert(p.tilt >= 0 && p.tilt <= LOOK_TILT + 1e-12 && p.nod >= 0 && p.nod <= WATCH + 1e-12);
      assert(p.arm <= 1e-12 && p.arm >= DRAW - 1e-12 && p.edge >= 0 && p.edge <= EDGE + 1e-12);
      assert(p.flip >= 0 && p.flip < TAU);
      for (const k of Object.keys(p)) {
        let d = Math.abs(p[k] - prev[k]);
        if (k === 'flip') d = Math.min(d, TAU - d);
        assert(d < .02, `${kind} ${k} jumps at ${u}`);
      }
      if (p.yaw < -LOOK * (1 - TURN) * .99) sawLeft = true;
      if (p.yaw > LOOK * (1 - TURN) * .99) sawRight = true;
      sawFlip = Math.max(sawFlip, p.flip);
      prev = p;
    }
    for (const p of [prowlPose(kind, 0), prowlPose(kind, 1), prowlPose(kind, .5, 0), prowlPose(kind, NaN)]) assert(Object.values(p).every(v => v === 0));
    if (kind === 'glance') assert(sawLeft && sawRight, 'looks over both shoulders');
    else {
      assert(sawFlip > Math.PI * 1.9, 'the blade turns right over');
      assert.equal(prowlPose('flip', .3).edge, 0, 'flips before showing the edge');
      assert(Math.abs(prowlPose('flip', .66).edge - EDGE) < 1e-9 && Math.abs(prowlPose('flip', .66).arm - DRAW) < 1e-9);
      assert.equal(prowlPose('flip', .66).flip, 0, 'caught the right way up');
    }
  }
});

test('only rogues prowl', () => {
  assert(prowls(make('rogue')));
  for (const name of ['monk', 'knight', 'samurai', 'barbarian', 'archeologist', 'watchman']) assert(!prowls(make(name)), name);
});

test('a standing rogue glances over its shoulders, then flips its dagger, and goes back exactly to rest', () => {
  const a = make('rogue'), rest = snap(a), dt = 1 / 60;
  const base = measure(a);
  let t = 0, started = null;
  for (let i = 0; i < 60 * 30 && !started; i++) { if (frame(a, dt)) started = t; t += dt; }
  assert(started != null && started >= FIRST_MIN - .1 && started <= FIRST_MIN + FIRST_SPAN + .1, `started at ${started}`);
  const seen = [];
  let floor = Infinity, tipLow = Infinity, tipFwd = -Infinity, turned = 0;
  for (let i = 0; i < 60 * 40; i++) {
    const p = frame(a, dt), kind = a.rogueProwl.cur?.kind;
    if (kind && seen.at(-1) !== kind) seen.push(kind);
    for (const v of snap(a)) assert(Number.isFinite(v));
    if (p) turned = Math.max(turned, Math.abs(a.head.rotation.y + a.body.rotation.y - rest[1] - rest[4]));
    if (p && kind === 'flip' && i % 3 === 0) {
      const m = measure(a);
      floor = Math.min(floor, m.low); tipLow = Math.min(tipLow, m.tip.y); tipFwd = Math.max(tipFwd, m.tip.z);
    }
  }
  assert.deepEqual(seen.slice(0, 2), ['glance', 'flip']);
  assert(Math.abs(turned - LOOK) < .01, `head turned ${turned}`);
  assert(floor > base.low - .01, `sinks into the floor (${floor})`);
  assert(tipLow > .15, `dagger tip dips to ${tipLow}`);
  assert(tipFwd > base.tip.z + .1, 'the hand draws the blade forward to look at it');
  while (a.rogueProwl.cur) frame(a, dt);
  snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `part ${i} back at rest`));
  assert(LEN.glance > 3 && LEN.flip > 3, 'slow enough to glide');
});

test('walking, an attack or death fades the prowl out within ~0.1 s, even mid-flip, and leaves it at rest', () => {
  for (const [kind, at] of [['glance', .35], ['flip', .33], ['flip', .6]]) for (const cut of ['walk', 'attack', 'die']) {
    const a = make('rogue'), rest = snap(a), dt = 1 / 60, name = `${kind}@${at} ${cut}`;
    for (let i = 0; i < 60 * 60 && !(a.rogueProwl?.cur?.kind === kind && a.rogueProwl.cur.u > at); i++) frame(a, dt);
    assert(a.rogueProwl.cur?.u > at, name);
    if (cut === 'attack') enqueueAction(a.actions, {kind: 'attack', type: 'weapon', dir: [1, 0]});
    if (cut === 'die') enqueueAction(a.actions, {kind: 'die'});
    for (let i = 0; i < 8; i++) frame(a, dt, cut === 'walk');
    assert(a.rogueProwl.f < .2, `${name}: faded to ${a.rogueProwl.f}`);
    const spin = a.rogueProwl.applied.flip;
    assert(spin < .6 || spin > TAU - .6, `${name}: blade unwinds (${spin})`);
    for (let i = 0; i < 60 * 3; i++) frame(a, dt, cut === 'walk');
    assert.equal(a.rogueProwl.cur, null, name);
    if (cut !== 'die') snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `${name}: part ${i} back at rest`));
    else assert.equal(updateRogueProwl(a, dt, 0, false), null, 'the dead do not prowl');
  }
});
