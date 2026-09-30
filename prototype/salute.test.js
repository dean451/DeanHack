import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateSalute, salutePose, salutes, HILT, LOW, BOW, SHIELD, SALUTE_LEN, FIRST_MIN, FIRST_SPAN} from './salute.js';

const make = name => {
  const a = createCreature({name, symbol: 64, color: 4});
  a.species = name; a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateSalute(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [a.head.rotation.x, a.arm.rotation.x, a.arm.rotation.z, a.weaponSocket.rotation.x, a.shieldArm.rotation.x];
// the hand (socket) and the far end of the blade, in the model's own space, plus every blade point
function blade(a) {
  a.g.updateMatrixWorld(true);
  const v = new THREE.Vector3(), inv = a.g.matrixWorld.clone().invert(), socket = new THREE.Vector3(), pts = [];
  a.weaponSocket.getWorldPosition(socket).applyMatrix4(inv);
  let far = null, best = -1;
  a.weaponSocket.traverse(o => {
    const p = o.geometry?.attributes?.position; if (!p) return;
    for (let i = 0; i < p.count; i += 3) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv); pts.push(v.clone());
      const d = v.distanceTo(socket); if (d > best) { best = d; far = v.clone(); }
    }
  });
  return {socket, tip: far, pts};
}
function box(a, part) {
  a.g.updateMatrixWorld(true);
  const b = new THREE.Box3(), v = new THREE.Vector3(), inv = a.g.matrixWorld.clone().invert();
  part.traverse(o => {
    const p = o.geometry?.attributes?.position; if (!p) return;
    for (let i = 0; i < p.count; i++) b.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv));
  });
  return b;
}

test('the salute pose stays in bounds, moves smoothly and starts and ends at rest', () => {
  const n = 6000;
  let prev = salutePose(0);
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = salutePose(u);
    for (const v of Object.values(p)) assert(Number.isFinite(v));
    assert(p.arm <= 1e-12 && p.arm >= HILT.arm - 1e-12 && p.bow >= 0 && p.bow <= BOW + 1e-12 && p.shield >= 0 && p.shield <= SHIELD + 1e-12);
    for (const k of Object.keys(p)) assert(Math.abs(p[k] - prev[k]) < .02, `${k} jumps at ${u}`);
    prev = p;
  }
  for (const p of [salutePose(0), salutePose(1), salutePose(.5, 0), salutePose(NaN)]) assert(Object.values(p).every(v => v === 0));
  for (const k of ['arm', 'roll', 'pitch']) {
    assert(Math.abs(salutePose(.3)[k] - HILT[k]) < 1e-9, `${k} at the hilt`);
    assert(Math.abs(salutePose(.7)[k] - LOW[k]) < 1e-9, `${k} at the lowered point`);
  }
  assert(salutePose(.34).bow > BOW * .99 && salutePose(.6).bow === 0, 'bows over the hilt only');
});

test('only knights salute', () => {
  assert(salutes(make('knight')));
  for (const name of ['samurai', 'valkyrie', 'orc-captain', 'watchman']) assert(!salutes(make(name)), name);
});

test('a standing knight salutes now and then, the blade clears its helm and the floor, and it goes back exactly to rest', () => {
  const a = make('knight'), rest = snap(a), head = box(a, a.head).expandByScalar(.01), dt = 1 / 60;
  const restBlade = blade(a);
  let reach = -1, side = -1, started = null, t = 0, peak = -1, lowTip = null, hiltAt = null;
  for (let i = 0; i < 60 * 30 && !started; i++) { if (frame(a, dt)) started = t; t += dt; }
  assert(started != null && started >= FIRST_MIN - .1 && started <= FIRST_MIN + FIRST_SPAN + .1, `started at ${started}`);
  for (let i = 0; i < SALUTE_LEN * 60 + 5; i++) {
    const p = frame(a, dt), u = a.salute.cur?.u;
    for (const v of snap(a)) assert(Number.isFinite(v));
    const b = blade(a);
    for (const q of b.pts) {
      assert(!head.containsPoint(q), `blade inside the helm at u ${u}`);
      assert(q.y > .02, `blade in the floor at u ${u}`);
      reach = Math.max(reach, q.z); side = Math.max(side, Math.abs(q.x));
    }
    peak = Math.max(peak, b.tip.y);
    if (p && u > .29 && u < .31) hiltAt = b;
    if (p && u > .66 && u < .7) lowTip = b.tip;
  }
  assert(reach < 1.1 && side < .5, `blade reaches z ${reach}, x ${side}`);
  assert(hiltAt, "reached the hilt pose");
  assert(Math.abs(hiltAt.socket.x) < .12 && hiltAt.socket.y > .85 && hiltAt.socket.z > .2, 'hilt before the visor');
  assert(Math.abs(hiltAt.tip.x - hiltAt.socket.x) < .08 && Math.abs(hiltAt.tip.z - hiltAt.socket.z) < .08, 'blade upright');
  assert(peak > restBlade.tip.y + .3, 'the blade rises above the helm');
  assert(lowTip && lowTip.y < .2 && lowTip.x > .2 && lowTip.z > .4, 'point lowered to the floor at front right');
  assert.equal(a.salute.cur, null);
  snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-12, `part ${i} back at rest`));
});

test('walking, an attack or death fades the salute out within ~0.1 s and leaves it at rest', () => {
  for (const cut of ['walk', 'attack', 'die']) {
    const a = make('knight'), rest = snap(a), dt = 1 / 60;
    for (let i = 0; i < 60 * 30 && !(a.salute?.cur?.u > .3); i++) frame(a, dt);
    assert(a.salute.cur?.u > .3, cut);
    if (cut === 'attack') enqueueAction(a.actions, {kind: 'attack', type: 'weapon', dir: [1, 0]});
    if (cut === 'die') enqueueAction(a.actions, {kind: 'die'});
    for (let i = 0; i < 8; i++) frame(a, dt, cut === 'walk');
    assert(a.salute.f < .2, `${cut}: faded to ${a.salute.f}`);
    for (let i = 0; i < 60 * 3; i++) frame(a, dt, cut === 'walk');
    assert.equal(a.salute.cur, null, cut);
    if (cut !== 'die') snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `${cut}: part ${i} back at rest`));
    else assert.equal(updateSalute(a, dt, 0, false), null, 'the dead do not salute');
  }
});
