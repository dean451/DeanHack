import test from 'node:test';
import assert from 'node:assert/strict';
import {KOBOLDS, createKobold} from './kobold.js';
import {SETTLE, SETTLING, RISE} from './insect-settle.js';
import {updateKoboldSettle} from './kobold-settle.js';
import {updateKoboldCringe} from './kobold-cringe.js';

// The game's frame order: fidget.js's cringe first, kobold-settle.js last. `settle` false is the control: the same
// cringe with no crouch, so any difference is the crouch leaving something behind.
const pose = a => [...Object.values(a.joints).flatMap(o => o.rotation.toArray().slice(0, 3)), a.body.rotation.x, a.body.position.y, ...a.head.rotation.toArray().slice(0, 3)];
function frames(a, secs, look, state, settle = true) {
  let yaw = 0;
  for (let i = 0; i < Math.round(secs * 20); i++) {
    state.t += .05;
    updateKoboldCringe(a, .05, state.t, false, look);
    if (settle) updateKoboldSettle(a, .05, false, look);
    yaw = Math.max(yaw, Math.abs(a.head.rotation.y));
  }
  return yaw;
}

test('a crouched kobold gets up when the hero comes near, cringes at him, and the crouch leaves nothing behind', () => {
  for (const name of KOBOLDS) {
    const a = createKobold(name), c = createKobold(name);
    // (the cringe seeds from the mesh id; give both the same, so the control plays the same cringes at the same times)
    for (const k of [a, c]) { k.g.updateMatrixWorld(true); k.koboldCringe = {seed: 777, wait: 0, s: null, f: 0, o: {x: 0, y: 0, z: 0, b: 0}, side: 1}; }
    const far = {x: 50, z: 50}, near = {x: a.g.position.x + 2, z: a.g.position.z};
    const sa = {t: 0}, sc = {t: 0};
    const crouchSecs = SETTLE + SETTLING + 40; // long enough for idle cringes to fire over the crouch
    frames(a, crouchSecs, far, sa); frames(c, crouchSecs, far, sc, false);
    assert.equal(a.koboldRest.p, 1, `${name}: it crouched`);
    // The hero walks up: it rises and cringes at him. Both then run the same cringe, so once it is on its feet the
    // crouch must have left every joint exactly where the cringe-only control has it.
    const yaw = frames(a, RISE + 1.5, near, sa);
    frames(c, RISE + 1.5, near, sc, false);
    assert(yaw > .2, `${name}: it cringed at the hero (head yawed ${yaw.toFixed(2)})`);
    assert.equal(a.koboldRest.p, 0, `${name}: upright`);
    const pa = pose(a), pc = pose(c);
    pa.forEach((v, i) => assert(Math.abs(v - pc[i]) < 1e-9, `${name}: value ${i} drifted by ${(v - pc[i]).toExponential(2)}`));
  }
});
