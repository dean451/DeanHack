import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHeldWeapon} from './equipment.js';
import {fxTimeline} from './fx.js';
import {queueThrows, updateActions, clearActionPose} from './actions.js';
import {RELEASE_U, THROW_TIME} from './throw-motion.js';
import {updateSlingWhirl, whirlAngle, heldSling, slings, stoneIn, WINDUP_TURNS, FLOP_TURNS} from './sling-whirl.js';

const TAU = Math.PI * 2;
// A hero rig with an arm, wrist and socket holding `name`.
function rig(name = 'sling') {
  const g = new THREE.Group(), arm = new THREE.Group(), wrist = new THREE.Group(), weaponSocket = new THREE.Group();
  arm.position.set(.28, .95, 0); wrist.position.y = -.5; weaponSocket.rotation.x = Math.PI / 4 + .65;
  g.add(arm); arm.add(wrist); wrist.add(weaponSocket);
  const weapon = createHeldWeapon({name}); weaponSocket.add(weapon);
  return {g, arm, wrist, weaponSocket, weapon};
}
// A flash-mode throw of `effect` from (2, 2) towards +x.
const throwOf = effect => fxTimeline({type: 'fx', steps: [{op: 'start', mode: 'flash', effect},
  ...[3, 4, 5].flatMap(x => [{op: 'draw', x, z: 2}, {op: 'tick'}]), {op: 'end'}]});
const ROCK = {kind: 'object', class: 13, material: 0};
const DAGGER = {kind: 'object', class: 2, material: 11, shape: 'dagger'};
const stones = w => { const out = []; w.traverse(o => { if (o.isMesh && o.userData.part === 'stone') out.push(o); }); return out; };
// Where the pouch (the stone's middle) is, in the socket's space.
const pouch = w => new THREE.Vector3(0, .4, 0).applyQuaternion(w.quaternion).add(w.position);

test('the whirl angle rests at both ends, turns whole at the release and never runs back', () => {
  assert.equal(whirlAngle(0), 0);
  assert.equal(whirlAngle(1), 0);
  assert.ok(Math.abs(whirlAngle(RELEASE_U) - WINDUP_TURNS * TAU) < 1e-9);
  assert.ok(Math.abs(whirlAngle(1 - 1e-9) - (WINDUP_TURNS + FLOP_TURNS) * TAU) < 1e-6);
  let prev = 0, prevStep = 0, peak = 0;
  for (let u = .001; u < 1; u += .001) {
    const a = whirlAngle(u), step = a - prev;
    assert.ok(Number.isFinite(a) && step >= -1e-12, `runs forward at ${u}`);
    // no jump: the step across the release is about the same either side
    if (Math.abs(u - RELEASE_U) < .0015) assert.ok(Math.abs(step - prevStep) < .02 * Math.max(step, prevStep) + .005, 'no kink at the release');
    peak = Math.max(peak, step); prev = a; prevStep = step;
  }
  // fastest at the release (rad per .001 of the throw), slow by the end
  assert.ok(Math.abs(whirlAngle(RELEASE_U) - whirlAngle(RELEASE_U - .001) - peak) < .02);
  assert.ok(whirlAngle(.999) - whirlAngle(.998) < peak * .01);
  assert.ok(stoneIn(0) && stoneIn(RELEASE_U - .01) && !stoneIn(RELEASE_U) && !stoneIn(.99) && stoneIn(1));
});

test('only a sling with a stone-like missile whirls', () => {
  assert.ok(heldSling(rig().weaponSocket));
  assert.equal(heldSling(rig('long sword').weaponSocket), null);
  assert.ok(slings({kind: 'throw', shape: 'stone'}) && slings({kind: 'throw', shape: 'gem'}));
  assert.ok(!slings({kind: 'throw', shape: 'dagger'}) && !slings({kind: 'throw', shape: 'lump'}) && !slings({kind: 'attack', shape: 'stone'}) && !slings(null));
  // A dagger thrown from a sling hand leaves the sling alone.
  const hero = rig(), rest = hero.weapon.quaternion.clone();
  queueThrows(throwOf(DAGGER), (x, z) => x === 2 && z === 2 ? hero : null);
  for (let i = 0; i < 30; i++) { clearActionPose(hero, hero.actions); updateActions(hero, hero.actions, 1 / 60); updateSlingWhirl(hero); }
  assert.ok(hero.weapon.quaternion.equals(rest));
  assert.ok(stones(hero.weapon).every(m => m.visible));
  // A sword hand with a rock throw: nothing to whirl, no state left behind.
  const sword = rig('long sword');
  queueThrows(throwOf(ROCK), (x, z) => x === 2 && z === 2 ? sword : null);
  for (let i = 0; i < 30; i++) { clearActionPose(sword, sword.actions); updateActions(sword, sword.actions, 1 / 60); updateSlingWhirl(sword); }
  assert.equal(sword.weapon.rotation.x, 0);
});

test('slinging a rock whirls the pouch round the hand, lets the stone go and settles to rest', () => {
  const hero = rig(), w = hero.weapon, rest = w.quaternion.clone(), restPouch = pouch(w);
  assert.equal(hero.actions, undefined);
  queueThrows(throwOf(ROCK), (x, z) => x === 2 && z === 2 ? hero : null);
  assert.equal(hero.actions.queue[0].shape, 'stone');
  const dt = 1 / 120, frames = Math.ceil(THROW_TIME / dt) + 30;
  let t = 0, minY = Infinity, sawHidden = false, hiddenBefore = false, sawBack = false;
  for (let i = 0; i < frames; i++) {
    clearActionPose(hero, hero.actions); updateActions(hero, hero.actions, dt); updateSlingWhirl(hero); t += dt;
    const p = pouch(w), u = t / THROW_TIME, visible = stones(w).every(m => m.visible);
    for (const v of [...w.quaternion.toArray(), p.x, p.y, p.z]) assert.ok(Number.isFinite(v));
    // the cords keep their length: the pouch stays .4 from the hand
    assert.ok(Math.abs(p.length() - .4) < 1e-6);
    minY = Math.min(minY, p.y);
    if (!visible) { sawHidden = true; if (u < RELEASE_U - .02) hiddenBefore = true; }
    if (sawHidden && visible) sawBack = true;
  }
  assert.ok(minY < -.35, 'the pouch swings right round under the hand');
  assert.ok(sawHidden && !hiddenBefore, 'the stone goes at the release, not before');
  assert.ok(sawBack, 'the next stone is in once the throw is over');
  assert.ok(w.quaternion.angleTo(rest) < 1e-6, 'back at rest');
  assert.ok(pouch(w).distanceTo(restPouch) < 1e-6);
});
