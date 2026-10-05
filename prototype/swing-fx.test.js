import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {swingPose, swingPhase, swingLength, swingTrailOn, applySwing, clearSwing, CONTACT_U, IMPACTS, impactKind} from './swing.js';
import {createSwingFx, weaponReach, glintScale, GLINT_LIFE, GLINT_SIZE} from './swing-fx.js';
import {createHeldWeapon} from './equipment.js';

// The hero's arm chain as main.js builds it, facing +z, with a held weapon.
function hero(weapon = 'long sword') {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const arm = new THREE.Group(); arm.position.set(.34, .92, 0); body.add(arm);
  const elbow = new THREE.Group(); elbow.position.set(0, -.25, 0); elbow.rotation.x = -.65; arm.add(elbow);
  const wrist = new THREE.Group(); wrist.position.set(0, -.25, 0); elbow.add(wrist);
  const weaponSocket = new THREE.Group(); weaponSocket.rotation.x = Math.PI / 4 + .65; wrist.add(weaponSocket);
  const shieldArm = new THREE.Group(); shieldArm.position.set(-.34, .91, 0); body.add(shieldArm);
  if (weapon) weaponSocket.add(createHeldWeapon({name: weapon}));
  return {g, body, arm, elbow, wrist, weaponSocket, shieldArm, actions: {swing: null}};
}

// Drives one swing through swing.js the way actions.js does, calling fx.update each frame.
function play(fx, h, blow, result, target, hz = 120) {
  const dt = 1 / hz, len = swingLength(result);
  let contacted = false, trailFrames = 0, maxSamples = 0;
  for (let t = 0; t <= len + 1.5; t += dt) {
    const live = t <= len, u = live ? swingPhase(t, blow, result) : 1;
    const pose = live ? swingPose(blow, u, result) : null;
    if (pose) applySwing(h, pose);
    const contact = live && result === 'hit' && !contacted && u >= CONTACT_U[blow];
    if (contact) contacted = true;
    h.actions.swing = live ? {blow, u, trail: swingTrailOn(blow, u), dir: [0, 1], contact} : null;
    if (h.actions.swing?.trail) trailFrames++;
    fx.update(h, dt, target);
    maxSamples = Math.max(maxSamples, fx.trail.samples);
    if (pose) clearSwing(h, pose);
  }
  return {contacted, trailFrames, maxSamples};
}

test('weapon reach follows the held weapon', () => {
  assert.ok(Math.abs(weaponReach(hero('long sword').weaponSocket) - .91) < .01);
  assert.ok(Math.abs(weaponReach(hero('dagger').weaponSocket) - .5) < .01);
  assert.equal(weaponReach(hero(null).weaponSocket), .14);
  assert.equal(weaponReach(null), .14);
});

test('a slash draws a finite trail along the blade, bursts once and fades out', () => {
  const world = new THREE.Group(); world.position.set(2, 0, -3);
  const h = hero(); world.add(h.g); h.g.position.set(1, 0, 1);
  const fx = createSwingFx(THREE, world);
  assert.ok(world.children.includes(fx.trail.mesh) && world.children.includes(fx.burst.points));
  const origUpdate = fx.burst.burst; let bursts = 0, kind = null, at = null;
  fx.burst.burst = (p, d, k, b) => { bursts++; kind = k; at = p.clone(); return origUpdate(p, d, k, b); };
  const r = play(fx, h, 'slash', 'hit', 'jackal');
  assert.ok(r.contacted && r.trailFrames >= 3 && r.maxSamples >= 2, JSON.stringify(r));
  assert.equal(bursts, 1);
  assert.equal(kind, impactKind('jackal'));
  // In the world group's space: in front of the hero (+z), at chest height.
  assert.ok(Math.abs(at.x - 1) < 1e-9 && Math.abs(at.z - 1.62) < 1e-9 && at.y > .4 && at.y < .9);
  // Every trail vertex is finite.
  const pos = fx.trail.mesh.geometry.attributes.position.array;
  assert.ok([...pos].every(Number.isFinite));
  // Well after the swing, the ribbon and particles are gone.
  assert.equal(fx.trail.samples, 0);
  assert.equal(fx.trail.mesh.visible, false);
  assert.equal(fx.burst.alive, 0);
  fx.dispose();
  assert.ok(!world.children.includes(fx.trail.mesh));
});

test('the trail tip sits a sword length from its base, inside the arm reach', () => {
  const world = new THREE.Group(), h = hero(); world.add(h.g);
  const fx = createSwingFx(THREE, world);
  h.actions.swing = {blow: 'slash', u: .4, trail: true, dir: [0, 1], contact: false};
  const pose = swingPose('slash', .4, 'hit'); applySwing(h, pose);
  fx.update(h, 1 / 60);
  fx.update(h, 1 / 60);
  const p = fx.trail.mesh.geometry.attributes.position.array;
  const base = new THREE.Vector3(p[0], p[1], p[2]), tip = new THREE.Vector3(p[3], p[4], p[5]);
  assert.ok(Math.abs(base.distanceTo(tip) - .91 * .75) < 1e-3);
  assert.ok(tip.length() < 2.2 && tip.y > -.2);
  clearSwing(h, pose);
});

test('misses whiff with a trail but no burst; no swing does nothing', () => {
  for (const blow of ['slash', 'pierce', 'blunt']) {
    const world = new THREE.Group(), h = hero(blow === 'blunt' ? 'mace' : 'long sword'); world.add(h.g);
    const fx = createSwingFx(THREE, world);
    const r = play(fx, h, blow, 'miss', 'jackal');
    assert.ok(!r.contacted && r.maxSamples >= 2, `${blow} ${JSON.stringify(r)}`);
    assert.equal(fx.burst.alive, 0);
  }
  const world = new THREE.Group(), fx = createSwingFx(THREE, world);
  fx.update(null, .016); fx.update({g: new THREE.Group()}, .016); fx.update(hero(), NaN);
  assert.equal(fx.trail.samples, 0);
  assert.equal(fx.burst.alive, 0);
});

test('a contact with no direction strikes where the hero faces, by the seen material', () => {
  const world = new THREE.Group(), h = hero(); world.add(h.g); h.g.rotation.y = Math.PI / 2;
  const fx = createSwingFx(THREE, world);
  h.actions.swing = {blow: 'blunt', u: .5, trail: false, dir: null, contact: true};
  fx.update(h, 1 / 60, null);
  const look = IMPACTS[impactKind(null)];
  assert.equal(fx.burst.alive, Math.round(look.count * .85));
  const p = fx.burst.points.geometry.attributes.position.array;
  const xs = []; for (let i = 0; i < p.length; i += 3) if (p[i + 1] > -100) xs.push(p[i]);
  assert.ok(xs.length && xs.every(x => x > .3), 'particles start to the hero\'s +x');
});

test('an off-hand strike draws its ribbon from the off-hand blade, not the sword', () => {
  const world = new THREE.Group(), h = hero(); world.add(h.g);
  h.offhandSocket = new THREE.Group(); h.offhandSocket.position.set(-.34, .5, .1);
  h.shieldArm.add(h.offhandSocket); h.offhandSocket.add(createHeldWeapon({name: 'dagger'}));
  const fx = createSwingFx(THREE, world);
  assert.ok(world.children.includes(fx.offTrail.mesh));
  h.actions.swing = {blow: 'slash', u: .4, trail: true, off: true, dir: [0, 1], contact: false};
  fx.update(h, 1 / 60); fx.update(h, 1 / 60);
  assert.ok(fx.offTrail.samples >= 2 && fx.trail.samples === 0);
  // Near the off hand's side of the body, a dagger length from its base.
  const p = fx.offTrail.mesh.geometry.attributes.position.array;
  assert.ok(p[3] < 0, 'tip on the off side');
  h.actions.swing = null;
  for (let i = 0; i < 30; i++) fx.update(h, 1 / 60);
  assert.equal(fx.offTrail.samples, 0);
  assert.equal(fx.offTrail.mesh.visible, false);
  fx.dispose();
  assert.ok(!world.children.includes(fx.offTrail.mesh));
});

test('an off-hand blow flashes a glint at the off-hand blade that flares and is gone', () => {
  const world = new THREE.Group(), h = hero(); world.add(h.g);
  h.offhandSocket = new THREE.Group(); h.offhandSocket.position.set(-.34, .5, .1);
  h.shieldArm.add(h.offhandSocket); h.offhandSocket.add(createHeldWeapon({name: 'dagger'}));
  const fx = createSwingFx(THREE, world);
  assert.equal(fx.glint.visible, false);
  // the sword hand's contact does not glint
  h.actions.swing = {blow: 'slash', u: .5, trail: false, dir: [0, 1], contact: true};
  fx.update(h, 1 / 60);
  assert.equal(fx.glint.visible, false);
  h.actions.swing = {blow: 'slash', u: .5, trail: false, off: true, dir: [0, 1], contact: true};
  fx.update(h, 1 / 60);
  assert.equal(fx.glint.visible, true);
  assert.ok(fx.glint.position.x < 0, 'on the off side');
  h.actions.swing = null;
  let peak = 0;
  for (let i = 0; i < 4; i++) { fx.update(h, 1 / 60); peak = Math.max(peak, fx.glint.scale.x); }
  assert.ok(peak > .1 && peak <= GLINT_SIZE + 1e-9);
  for (let i = 0; i < 30; i++) fx.update(h, 1 / 60);
  assert.equal(fx.glint.visible, false);
  assert.equal(glintScale(0), 0); assert.equal(glintScale(GLINT_LIFE), 0); assert.equal(glintScale(NaN), 0);
  fx.dispose();
  assert.ok(!world.children.includes(fx.glint));
});
