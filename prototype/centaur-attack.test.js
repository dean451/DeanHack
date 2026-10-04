import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {centaurAttackPose, CENTAUR_WEAPONS} from './centaur-attack.js';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose, STRIKE_U, ACTION_TIME} from './actions.js';

test('centaur weapon poses are finite and start and end at rest', () => {
  for (const w of [...CENTAUR_WEAPONS, 'none'])
    for (const result of ['hit', 'miss']) {
      for (let i = 0; i <= 50; i++) for (const v of Object.values(centaurAttackPose(w, i / 50, result))) assert(Number.isFinite(v), w);
      for (const u of [0, 1]) for (const [k, v] of Object.entries(centaurAttackPose(w, u, result))) assert(Math.abs(v) < 1e-9, `${w} ${k} at ${u}`);
    }
});

// The weapon's far point (the vertex furthest from the fist), in world space.
function far(hand) {
  hand.updateWorldMatrix(true, true);
  const h = hand.getWorldPosition(new THREE.Vector3()), v = new THREE.Vector3();
  let best = null, bd = -1;
  hand.traverse(m => {
    if (!m.geometry) return;
    const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); const d = v.distanceTo(h); if (d > bd) { bd = d; best = v.clone(); } }
  });
  return best;
}

test('centaurs thrust the spear ahead, smash the club down from overhead and raise the bow upright, then come back to rest', () => {
  const dt = 1 / 60, strikeAt = Math.round(ACTION_TIME.attack * STRIKE_U / dt);
  for (const [name, weapon] of [['plains centaur', 'spear'], ['mountain centaur', 'club'], ['forest centaur', 'bow']]) {
    const a = createCreature({name, symbol: 67, color: 3});
    assert.equal(a.centaur, weapon, name);
    assert(a.offHand?.isObject3D, name);
    const snap = () => { const r = []; a.g.traverse(o => r.push(...o.position.toArray(), o.rotation.x, o.rotation.y, o.rotation.z)); return r; };
    const rest = snap(), restFar = far(weapon === 'bow' ? a.offHand : a.weaponSocket);
    const q = createActionQueue();
    enqueueAction(q, {kind: 'attack', attack: 'weapon', result: 'hit', dir: [0, 1]});
    let top = -Infinity, frames = 0, atStrike = null;
    while (frames < 60) {
      clearActionPose(a, q);
      if (updateActions(a, q, frames ? dt : 0) === 'idle') break;
      const f = far(weapon === 'bow' ? a.offHand : a.weaponSocket);
      for (const n of f.toArray()) assert(Number.isFinite(n), name);
      assert(f.y > 0, `${name} weapon stays above the floor`);
      top = Math.max(top, f.y);
      if (frames === strikeAt) atStrike = f;
      frames++;
    }
    clearActionPose(a, q);
    const back = snap();
    rest.forEach((v, i) => assert(Math.abs(v - back[i]) < 1e-9, `${name} back at rest`));
    if (weapon === 'spear') {
      assert(restFar.y > 1.3, 'the spear stands upright at rest');
      assert(atStrike.z > 1.4 && atStrike.y > .5 && atStrike.y < 1.1, `spear tip ahead at the strike (${atStrike.toArray()})`);
      assert(Math.abs(atStrike.x) < .4, 'the spear points ahead, not out to the side');
    } else if (weapon === 'club') {
      assert(top > 1.7, `the club goes up over the head (${top})`);
      assert(atStrike.z > 1.1 && atStrike.y < 1.2, `the club comes down in front (${atStrike.toArray()})`);
    } else {
      assert(atStrike.y > 1.3 && atStrike.z > .6, `the bow is raised in front (${atStrike.toArray()})`);
      assert(Math.abs(atStrike.x - restFar.x) < .05, 'the bow stays upright in the fore-aft plane');
    }
  }
});

test('a centaur with an empty hand keeps the generic weapon wave', () => {
  const a = createCreature({symbol: 67, color: 2, kind: 'monster'});
  assert.equal(a.centaur, null);
  const q = createActionQueue();
  enqueueAction(q, {kind: 'attack', attack: 'weapon', result: 'hit', dir: [0, 1]});
  updateActions(a, q, 0); updateActions(a, q, .15);
  assert(q.applied.arm < -1, 'the arm waves forward');
  assert(!q.applied.grip && !q.applied.off);
});

test('a spear that hits sticks and is wrenched back out; a miss has no tug', () => {
  const hit = u => centaurAttackPose('spear', u, 'hit').arm, miss = u => centaurAttackPose('spear', u, 'miss').arm;
  assert(hit(.7) - hit(.56) > .3, 'the arm jerks back to free the spear');
  assert(hit(.7) - hit(.8) > .1 && hit(.8) < -.5, 'then one more tug as it comes free');
  for (let u = .44; u <= 1; u += .02) assert(Math.abs(hit(u)) < 1.5 && Math.abs(centaurAttackPose('spear', u, 'hit').grip) < 3, `in bounds at ${u}`);
  for (let u = .62; u < .98; u += .02) assert(miss(u + .02) >= miss(u) - 1e-9, `a miss just recovers at ${u}`);
});
