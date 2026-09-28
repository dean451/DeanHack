import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {swingPose, swingPhase, swingLength, swingTrailOn, applySwing, clearSwing, impactKind,
  createImpactBurst, createSwingTrail, SWING_TIME, HITSTOP, CONTACT_U, IMPACTS} from './swing.js';

// The hero's arm chain as main.js builds it (knight()), facing +z with the sword on +x.
function rig() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const arm = new THREE.Group(); arm.position.set(.34, .92, 0); body.add(arm);
  const elbow = new THREE.Group(); elbow.position.set(0, -.25, 0); elbow.rotation.x = -.65; arm.add(elbow);
  const wrist = new THREE.Group(); wrist.position.set(0, -.25, 0); elbow.add(wrist);
  const weaponSocket = new THREE.Group(); weaponSocket.rotation.x = Math.PI / 4 + .65; wrist.add(weaponSocket);
  const shieldArm = new THREE.Group(); shieldArm.position.set(-.34, .91, 0); body.add(shieldArm);
  return {g, body, arm, elbow, wrist, weaponSocket, shieldArm};
}
const hand = r => { r.g.updateMatrixWorld(true); return r.wrist.getWorldPosition(new THREE.Vector3()); };
const snapshot = r => ['body', 'arm', 'elbow', 'wrist', 'weaponSocket', 'shieldArm']
  .flatMap(k => [r[k].rotation.x, r[k].rotation.y, r[k].rotation.z]);

test('every blow rests at both ends and stays finite and bounded', () => {
  for (const blow of ['slash', 'pierce', 'blunt', null, 'weird']) for (const result of ['hit', 'miss']) {
    for (const f of Object.values(swingPose(blow, 0, result))) assert.equal(f, 0);
    for (const f of Object.values(swingPose(blow, 1, result))) assert.ok(Math.abs(f) < 1e-12);
    for (let u = 0; u <= 1; u += .01) for (const [k, v] of Object.entries(swingPose(blow, u, result))) {
      assert.ok(Number.isFinite(v), `${blow} ${k} at ${u}`);
      assert.ok(Math.abs(v) < 3.8, `${blow} ${k}=${v}`);
    }
  }
  assert.deepEqual(swingPose('slash', NaN), swingPose('slash', 1));
});

test('hitstop holds the pose at contact on a hit only', () => {
  for (const blow of ['slash', 'pierce', 'blunt']) {
    const tc = CONTACT_U[blow] * SWING_TIME;
    assert.equal(swingPhase(tc + HITSTOP * .5, blow, 'hit'), CONTACT_U[blow]);
    assert.ok(swingPhase(tc + HITSTOP * .5, blow, 'miss') > CONTACT_U[blow]);
    assert.equal(swingPhase(swingLength('hit'), blow, 'hit'), 1);
    assert.equal(swingPhase(swingLength('miss'), blow, 'miss'), 1);
    let last = 0;
    for (let t = 0; t <= swingLength('hit'); t += 1 / 120) { const u = swingPhase(t, blow, 'hit'); assert.ok(u >= last); last = u; }
  }
  assert.equal(swingPhase(-1, 'slash'), 0);
  assert.ok(swingTrailOn('slash', CONTACT_U.slash) && !swingTrailOn('slash', .05) && !swingTrailOn('slash', .95));
});

test('a slash sweeps the hand across the body; a thrust drives it forward; a miss overreaches', () => {
  const at = (blow, u, result = 'hit') => {
    const r = rig(), p = swingPose(blow, u, result); applySwing(r, p); return hand(r);
  };
  const up = at('slash', .3), mid = at('slash', CONTACT_U.slash), end = at('slash', .68);
  assert.ok(up.y > 1.1, `windup raised ${up.y}`);
  assert.ok(mid.z > .3, `contact out front ${mid.z}`);
  assert.ok(end.x < mid.x && mid.x < up.x + .2, 'moves across toward the off side');
  const rest = hand(rig()), thrust = at('pierce', CONTACT_U.pierce);
  assert.ok(thrust.z > rest.z + .35, `thrust reaches ${thrust.z}`);
  const blunt = at('blunt', .34);
  assert.ok(blunt.y > 1.25, `overhead ${blunt.y}`);
  const hitEnd = at('slash', .7, 'hit'), missEnd = at('slash', .7, 'miss');
  assert.ok(missEnd.x < hitEnd.x, 'a whiff follows through further');
});

test('applying then clearing a swing over time returns the rig to rest', () => {
  const r = rig(), rest = snapshot(r);
  for (const blow of ['slash', 'pierce', 'blunt']) {
    let p = null;
    for (let t = 0; t <= swingLength('hit') + .05; t += 1 / 60) {
      clearSwing(r, p);
      r.body.rotation.x = Math.sin(t * 18) * .01; // the frame loop's own bob underneath
      p = swingPose(blow, swingPhase(t, blow, 'hit'), 'hit'); applySwing(r, p);
      for (const v of snapshot(r)) assert.ok(Number.isFinite(v));
    }
    clearSwing(r, p); r.body.rotation.x = 0;
    snapshot(r).forEach((v, i) => assert.ok(Math.abs(v - rest[i]) < 1e-9, `${blow} ${i}`));
  }
});

test('impact material comes from the seen species only', () => {
  assert.equal(impactKind('iron golem'), 'metal');
  assert.equal(impactKind('stone golem'), 'stone');
  assert.equal(impactKind('earth elemental'), 'stone');
  assert.equal(impactKind('air elemental'), 'mist');
  assert.equal(impactKind('human zombie'), 'bone');
  assert.equal(impactKind('brown pudding'), 'ooze');
  assert.equal(impactKind('jackal'), 'flesh');
  assert.equal(impactKind(null), 'flesh');
});

test('impact bursts fly outward, settle on the floor and all expire', () => {
  for (const kind of Object.keys(IMPACTS)) {
    const b = createImpactBurst(THREE, 64, 7);
    const n = b.burst({x: 1, y: .8, z: 2}, [1, 0], kind, 'slash');
    assert.ok(n > 0 && b.alive === n);
    for (let t = 0; t < 1.2; t += 1 / 60) {
      b.update(1 / 60);
      const p = b.points.geometry.attributes.position.array, c = b.points.geometry.attributes.color.array;
      for (let i = 0; i < p.length; i += 3) {
        assert.ok(Number.isFinite(p[i]) && Number.isFinite(p[i + 1]) && Number.isFinite(p[i + 2]));
        if (p[i + 1] > -900) {
          assert.ok(p[i + 1] >= .0099 && p[i + 1] < 2.5, `${kind} y ${p[i + 1]}`);
          assert.ok(Math.hypot(p[i] - 1, p[i + 2] - 2) < 2, `${kind} spread`);
        }
      }
      for (const v of c) assert.ok(v >= 0 && v <= 1.1);
    }
    assert.equal(b.alive, 0, `${kind} expired`);
    b.dispose();
  }
  // Pooling wraps instead of growing.
  const b = createImpactBurst(THREE, 8);
  b.burst({x: 0, y: 1, z: 0}, [0, 1], 'metal'); b.burst({x: 0, y: 1, z: 0}, [0, 1], 'metal');
  assert.equal(b.alive, 8);
});

test('the weapon trail follows samples and fades away', () => {
  const trail = createSwingTrail(THREE, 10, .14);
  assert.equal(trail.mesh.visible, false);
  for (let i = 0; i < 14; i++) {
    const a = i / 13 * Math.PI;
    trail.sample({x: Math.cos(a) * .3, y: 1, z: .2}, {x: Math.cos(a) * 1.1, y: 1.2 - i * .03, z: .6});
    trail.update(1 / 60);
  }
  assert.ok(trail.samples >= 8 && trail.samples <= 10);
  assert.ok(trail.mesh.visible);
  for (const v of trail.mesh.geometry.attributes.position.array) assert.ok(Number.isFinite(v) && Math.abs(v) < 2);
  for (let t = 0; t < .3; t += 1 / 60) trail.update(1 / 60);
  assert.equal(trail.samples, 0);
  assert.equal(trail.mesh.visible, false);
  trail.dispose();
});
