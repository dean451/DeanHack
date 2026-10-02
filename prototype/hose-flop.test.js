import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHeldWeapon} from './equipment.js';
import {swingPose, swingPhase, swingLength} from './swing.js';
import {updateHoseFlop, bendAngles, bendHose, bendWeight, heldHose, MAX, PIVOT_U, HOSE_TIP, HOSE_PIVOT} from './hose-flop.js';

// A bare hero rig: group, body, shoulder, wrist and weapon socket, as main.js nests them.
function rig(name = 'rubber hose') {
  const g = new THREE.Group(), body = new THREE.Group(), arm = new THREE.Group(), wrist = new THREE.Group(), weaponSocket = new THREE.Group();
  arm.position.set(.28, .95, 0); wrist.position.y = -.5; weaponSocket.rotation.x = Math.PI / 4 + .65;
  g.add(body); body.add(arm); arm.add(wrist); wrist.add(weaponSocket);
  const weapon = createHeldWeapon({name}); weaponSocket.add(weapon);
  return {g, body, arm, wrist, weaponSocket, weapon};
}
const meshes = w => { const out = []; w.traverse(o => { if (o.isMesh) out.push(o); }); return out; };
const snapshot = w => meshes(w).map(m => Float32Array.from(m.geometry.attributes.position.array));
const maxShift = (w, snap) => meshes(w).reduce((best, m, k) => {
  const p = m.geometry.attributes.position.array;
  let d = 0; for (let i = 0; i < p.length; i++) d = Math.max(d, Math.abs(p[i] - snap[k][i]));
  return Math.max(best, d);
}, 0);
const allFinite = w => meshes(w).every(m => m.geometry.attributes.position.array.every(Number.isFinite) && (m.geometry.attributes.normal?.array.every(Number.isFinite) ?? true));

test('only a rubber hose is picked up', () => {
  assert.ok(heldHose(rig().weaponSocket));
  assert.equal(heldHose(rig('long sword').weaponSocket), null);
  const r = rig('long sword'), before = snapshot(r.weapon);
  for (let i = 0; i < 30; i++) { r.arm.rotation.x -= .1; updateHoseFlop(r, 1 / 60); }
  assert.equal(maxShift(r.weapon, before), 0);
});

test('the bend moves the tip toward the lag and leaves the grip alone', () => {
  assert.equal(bendWeight(PIVOT_U - .01), 0);
  assert.equal(bendWeight(1), 1);
  const {weapon} = rig(), rest = snapshot(weapon), hose = meshes(weapon).find(m => m.userData.part === 'hose');
  for (const d of [new THREE.Vector3(.05, .08, 0), new THREE.Vector3(-.05, -.08, 0), new THREE.Vector3(0, 0, .07), new THREE.Vector3(0, 0, -.07)]) {
    const {a, b} = bendAngles(d);
    assert.ok(Math.abs(a) <= MAX && Math.abs(b) <= MAX);
    bendHose(weapon, a, b);
    // the vertex nearest the rest tip, moved
    const p = hose.geometry.attributes.position, r = rest[meshes(weapon).indexOf(hose)];
    let best = 0, bd = Infinity;
    for (let i = 0; i < p.count; i++) { const dd = (r[i * 3] - HOSE_TIP.x) ** 2 + (r[i * 3 + 1] - HOSE_TIP.y) ** 2 + (r[i * 3 + 2] - HOSE_TIP.z) ** 2; if (dd < bd) { bd = dd; best = i; } }
    const moved = new THREE.Vector3(p.getX(best) - r[best * 3], p.getY(best) - r[best * 3 + 1], p.getZ(best) - r[best * 3 + 2]);
    assert.ok(moved.dot(d) > 0, `tip moves toward ${d.toArray()}`);
    // the grip, below the pivot, doesn't move
    for (let i = 0; i < p.count; i++) if (r[i * 3 + 1] < HOSE_PIVOT.y - .03 && r[i * 3] < .01) assert.equal(p.getY(i), r[i * 3 + 1]);
    assert.ok(allFinite(weapon));
  }
  bendHose(weapon, 0, 0);
  assert.equal(maxShift(weapon, rest), 0);
});

test('a swing bends the hose, it whips past on the stop and settles back to rest', () => {
  for (const blow of ['slash', 'blunt', 'pierce']) for (const result of ['hit', 'miss']) {
    const r = rig(), rest = snapshot(r.weapon), dt = 1 / 60, len = swingLength(result);
    let peak = 0, whip = false, t = 0;
    for (; t < len + 1.2; t += dt) {
      const p = swingPose(blow, swingPhase(t, blow, result), result);
      r.arm.rotation.x = p.arm; r.arm.rotation.z = p.armZ; r.wrist.rotation.x = p.wrist; r.weaponSocket.rotation.z = p.socket; r.body.rotation.y = p.twist;
      updateHoseFlop(r, dt);
      const s = r.weapon.userData.hoseFlop;
      assert.ok(Number.isFinite(s.a) && Number.isFinite(s.b));
      assert.ok(Math.abs(s.a) <= MAX + 1e-9 && Math.abs(s.b) <= MAX + 1e-9);
      peak = Math.max(peak, Math.abs(s.a), Math.abs(s.b));
      if (t > len + .1 && Math.abs(s.a) > .05) whip = true;
    }
    assert.ok(peak > .2, `${blow}/${result} bends visibly (${peak})`);
    assert.ok(whip, `${blow}/${result} still wobbles after the arm stops`);
    assert.ok(allFinite(r.weapon));
    assert.equal(maxShift(r.weapon, rest), 0, `${blow}/${result} back to rest`);
    assert.equal(r.weapon.userData.hoseFlop.a, 0);
  }
});

test('walking across the map and a weapon-magic skin', () => {
  const r = rig(), rest = snapshot(r.weapon);
  for (let i = 0; i < 120; i++) { r.g.position.x += .05; updateHoseFlop(r, 1 / 60); }
  assert.equal(maxShift(r.weapon, rest), 0, 'sliding the whole hero leaves it straight');
  // a skin under the fittings bends with them
  const fittings = meshes(r.weapon).find(m => m.userData.part === 'fittings');
  const skin = new THREE.Mesh(fittings.geometry.clone(), new THREE.MeshBasicMaterial()); fittings.add(skin);
  bendHose(r.weapon, .4, .2);
  assert.deepEqual(Array.from(skin.geometry.attributes.position.array), Array.from(fittings.geometry.attributes.position.array));
  bendHose(r.weapon, 0, 0);
  assert.equal(maxShift(r.weapon, rest.concat([rest[meshes(r.weapon).indexOf(fittings)]])), 0);
});
