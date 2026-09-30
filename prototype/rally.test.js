import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateRally, rallyPose, rallies, OVERHEAD, POINT, LOOK, THRUST, SHAKE, NOD, FIST, PUMP, FIRST_MIN, FIRST_SPAN} from './rally.js';

const make = (name, symbol) => {
  const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 5});
  a.species = name; a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateRally(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [a.head.rotation.x, a.head.rotation.z, a.arm.rotation.x, a.weaponSocket.rotation.x, a.arms[0].rotation.x, a.arms[0].rotation.z];
// the socket and the far end of the blade, in the model's own space
function blade(a) {
  a.g.updateMatrixWorld(true);
  const v = new THREE.Vector3(), inv = a.g.matrixWorld.clone().invert(), socket = new THREE.Vector3();
  a.weaponSocket.getWorldPosition(socket).applyMatrix4(inv);
  let far = null, best = -1;
  a.weaponSocket.traverse(o => {
    const p = o.geometry?.attributes?.position; if (!p) return;
    for (let i = 0; i < p.count; i += 5) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
      const d = v.distanceTo(socket); if (d > best) { best = d; far = v.clone(); }
    }
  });
  return {socket, tip: far};
}

test('the rally pose stays in bounds, moves smoothly and starts and ends at rest', () => {
  const n = 6000;
  let prev = rallyPose(0), back = 0, fwd = 0, shakeL = 0, shakeR = 0, pumps = 0, lastRaise = 0, rising = false;
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = rallyPose(u);
    for (const v of Object.values(p)) assert(Number.isFinite(v));
    assert(p.raise >= -1e-12 && p.raise <= OVERHEAD + PUMP + 1e-12 && p.fist >= 0 && p.fist <= FIST + 1e-12);
    assert(Math.abs(p.shake) <= SHAKE + 1e-12 && p.look >= -LOOK - 1e-12 && p.look <= THRUST + NOD + 1e-12);
    for (const k of Object.keys(p)) assert(Math.abs(p[k] - prev[k]) < .03, `${k} jumps at ${u}`);
    back = Math.min(back, p.look); fwd = Math.max(fwd, p.look);
    shakeL = Math.min(shakeL, p.shake); shakeR = Math.max(shakeR, p.shake);
    if (u > .2 && u < .44) { const up = p.raise > lastRaise; if (up && !rising) pumps++; rising = up; }
    lastRaise = p.raise; prev = p;
  }
  assert(Object.values(rallyPose(0)).every(v => v === 0) && Object.values(rallyPose(1)).every(v => v === 0));
  assert(Object.values(rallyPose(.5, 0)).every(v => v === 0) && Object.values(rallyPose(NaN)).every(v => v === 0));
  assert(back < -LOOK * .9 && fwd > THRUST * .9, 'head thrown back, then jutting forward');
  assert(shakeL < -SHAKE * .9 && shakeR > SHAKE * .9, 'shakes with the roar');
  assert.equal(pumps, 2, 'brandishes twice');
  assert(rallyPose(.2).raise > OVERHEAD * .99, 'blade overhead');
  assert(rallyPose(.5).fist > FIST * .99, 'fist out in the bellow');
  assert(Math.abs(rallyPose(.8).raise - POINT) < 1e-9, 'pointing ahead');
  assert(rallyPose(.97).raise < 1e-9, 'back at its side');
});

test('a standing orc-captain rallies now and then, the blade clears its head, and it goes back exactly to rest', () => {
  const a = make('orc-captain', 'o');
  assert(rallies(a));
  const rest = snap(a), dt = 1 / 60, head = new THREE.Vector3();
  a.g.updateMatrixWorld(true); a.head.getWorldPosition(head);
  let t = 0, first = null, count = 0, topTip = -Infinity, pointZ = 0, pointY = 0, nearHead = Infinity;
  for (let i = 0; i < 60 * 50; i++) {
    t += dt;
    const p = frame(a, dt);
    if (p && first == null) first = t;
    if (p && !a.rally.counted) { a.rally.counted = true; count++; }
    if (!p && a.rally) a.rally.counted = false;
    for (const v of snap(a)) assert(Number.isFinite(v));
    if (p && i % 3 === 0) {
      const {tip} = blade(a);
      nearHead = Math.min(nearHead, tip.distanceTo(head));
      if (a.rally.cur.u > .15 && a.rally.cur.u < .25) topTip = Math.max(topTip, tip.y);
      if (a.rally.cur.u > .76 && a.rally.cur.u < .82) { pointZ = Math.max(pointZ, tip.z); pointY = tip.y; }
    }
    if (!p) snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9, `drift at ${t}`));
  }
  assert(first >= FIRST_MIN && first <= FIRST_MIN + FIRST_SPAN + dt, `first at ${first}`);
  assert(count >= 2, `rallied ${count} times`);
  assert(topTip > head.y + .4, `blade held up over the head (tip y ${topTip}, head y ${head.y})`);
  assert(pointZ > .75 && Math.abs(pointY - head.y) < .35, `blade pointed ahead at head height (z ${pointZ}, y ${pointY})`);
  assert(nearHead > .2, `blade stays clear of the head (${nearHead})`);
});

test('walking fades a rally out and an attack blocks one', () => {
  const a = make('orc-captain', 'o'), dt = 1 / 60;
  const rest = snap(a);
  let i = 0;
  while (!frame(a, dt) && i++ < 60 * 12);
  for (let k = 0; k < 60; k++) frame(a, dt);
  assert(a.rally.cur && a.rally.applied.raise > 1);
  for (let k = 0; k < 30; k++) frame(a, dt, true);
  assert(!a.rally.cur, 'faded out within half a second');
  snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9));
  const b = make('orc-captain', 'o');
  for (let k = 0; k < 60 * 12; k++) {
    if (!b.actions.current && !b.actions.queue.length) enqueueAction(b.actions, {kind: 'attack', dir: {x: 1, z: 0}});
    assert.equal(frame(b, dt), null);
  }
});

test('other monsters do not rally', () => {
  for (const [name, symbol] of [['orc', 'o'], ['uruk-hai', 'o'], ['orc shaman', 'o'], ['bugbear', 'h'], ['dwarf lord', 'h'], ['hobgoblin', 'o']]) {
    const a = make(name, symbol);
    assert(!rallies(a), name);
    for (let k = 0; k < 60 * 15; k++) assert.equal(updateRally(a, 1 / 60, 0, false), null);
  }
});
