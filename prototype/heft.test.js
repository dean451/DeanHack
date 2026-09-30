import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateHeft, heftPose, hefts, CRACK, GLARE, RAISE, TWIRL, SETTLE, FIRST_MIN, FIRST_SPAN} from './heft.js';

const make = (name, symbol) => {
  const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 3});
  a.species = name; a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateHeft(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [a.head.rotation.x, a.head.rotation.z, a.arm.rotation.x, a.weaponSocket.rotation.x, a.weaponSocket.rotation.z];
// the far end of the weapon (the spiked ball), in the model's own space
function ballAt(a) {
  a.g.updateMatrixWorld(true);
  const box = new THREE.Box3(), v = new THREE.Vector3(), inv = a.g.matrixWorld.clone().invert(), socket = new THREE.Vector3();
  a.weaponSocket.getWorldPosition(socket).applyMatrix4(inv);
  let far = null, best = -1;
  a.weaponSocket.traverse(o => {
    const p = o.geometry?.attributes?.position; if (!p) return;
    for (let i = 0; i < p.count; i += 7) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
      const d = v.distanceTo(socket); if (d > best) { best = d; far = v.clone(); }
    }
  });
  return far;
}

test('the heft pose stays in bounds, moves smoothly and starts and ends at rest', () => {
  const n = 6000;
  let prev = heftPose(0), crackL = 0, crackR = 0, pitchL = 0, pitchR = 0, settle = 0;
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = heftPose(u);
    for (const v of Object.values(p)) assert(Number.isFinite(v));
    assert(Math.abs(p.crack) <= CRACK + 1e-12 && p.glare >= 0 && p.glare <= GLARE + 1e-12);
    assert(p.raise >= 0 && p.raise <= RAISE + 1e-12 && p.roll >= 0 && p.roll <= TWIRL + 1e-12);
    assert(Math.abs(p.pitch) <= TWIRL + SETTLE + 1e-12);
    for (const k of Object.keys(p)) assert(Math.abs(p[k] - prev[k]) < .02, `${k} jumps at ${u}`);
    prev = p;
    crackL = Math.min(crackL, p.crack); crackR = Math.max(crackR, p.crack);
    pitchL = Math.min(pitchL, p.pitch); pitchR = Math.max(pitchR, p.pitch);
    if (u > .82) settle = Math.max(settle, Math.abs(p.pitch));
  }
  assert(Object.values(heftPose(0)).every(v => v === 0) && Object.values(heftPose(1)).every(v => v === 0));
  assert(Object.values(heftPose(.5, 0)).every(v => v === 0) && Object.values(heftPose(NaN)).every(v => v === 0));
  assert(crackL < -CRACK * .9 && crackR > CRACK * .9, 'cracks the neck both ways');
  assert(pitchL < -TWIRL * .9 && pitchR > TWIRL * .9, 'twirls round');
  assert(heftPose(.55).raise > RAISE * .99 && heftPose(.55).glare > GLARE * .99, 'weapon up, glaring');
  assert(heftPose(.83).raise < RAISE * .05 && settle > SETTLE * .3, 'dropped, the ball swings on');
});

test('a standing bugbear hefts now and then, the ball stays clear of it, and it goes back exactly to rest', () => {
  const a = make('bugbear', 'h');
  assert(hefts(a));
  const rest = snap(a), restBall = ballAt(a), dt = 1 / 60;
  let t = 0, first = null, count = 0, lift = 0, minZ = Infinity, reach = 0;
  for (let i = 0; i < 60 * 45; i++) {
    t += dt;
    const p = frame(a, dt);
    if (p && first == null) first = t;
    if (p && !a.heft.counted) { a.heft.counted = true; count++; }
    if (!p && a.heft) a.heft.counted = false;
    for (const v of snap(a)) assert(Number.isFinite(v));
    if (p && i % 4 === 0) {
      const b = ballAt(a);
      lift = Math.max(lift, b.y - restBall.y); minZ = Math.min(minZ, b.z);
      reach = Math.max(reach, Math.hypot(b.x, b.z));
    }
    if (!p) snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9, `drift at ${t}`));
  }
  assert(first >= FIRST_MIN && first <= FIRST_MIN + FIRST_SPAN + dt, `first at ${first}`);
  assert(count >= 2, `hefted ${count} times`);
  assert(lift > .2, `ball lifted ${lift}`);
  assert(minZ > .12, `ball stays in front of the body (z ${minZ})`);
  assert(reach < .95, `ball stays near the tile (${reach})`);
});

test('walking fades a heft out and an attack blocks one', () => {
  const a = make('bugbear', 'h'), dt = 1 / 60;
  const rest = snap(a);
  let i = 0;
  while (!frame(a, dt) && i++ < 60 * 12);
  for (let k = 0; k < 120; k++) frame(a, dt);
  assert(a.heft.cur && a.heft.applied.raise > .1);
  for (let k = 0; k < 30; k++) frame(a, dt, true);
  assert(!a.heft.cur, 'faded out within half a second');
  snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9));
  const b = make('bugbear', 'h');
  for (let k = 0; k < 60 * 12; k++) {
    if (!b.actions.current && !b.actions.queue.length) enqueueAction(b.actions, {kind: 'attack', dir: {x: 1, z: 0}});
    assert.equal(frame(b, dt), null);
  }
});

test('other monsters do not heft', () => {
  for (const [name, symbol] of [['hobgoblin', 'o'], ['orc', 'o'], ['orc shaman', 'o'], ['dwarf', 'h'], ['gnome', 'G'], ['kobold', 'k']]) {
    const a = make(name, symbol);
    assert(!hefts(a), name);
    for (let k = 0; k < 60 * 15; k++) assert.equal(updateHeft(a, 1 / 60, 0, false), null);
  }
});
