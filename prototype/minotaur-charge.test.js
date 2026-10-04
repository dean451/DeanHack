import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, clearActionPose, updateActions} from './actions.js';
import * as M from './minotaur-charge.js';

const dt = 1 / 60;
const bull = () => { const a = createCreature({name: 'minotaur'}); a.g.updateMatrixWorld(true); return a; };
const pose = a => [a.body.rotation, a.body.scale, a.head.rotation, ...a.legs.map(l => l.rotation), a.tail.rotation]
  .flatMap(r => [r.x, r.y, r.z]);
const far = (p, q) => Math.max(...p.map((v, i) => Math.abs(v - q[i])));

// One frame as live.js runs it: take the action pose off, swing the legs and tail, fidget, then the actions.
function frame(a, t, look, walking = false) {
  if (a.actions) clearActionPose(a, a.actions);
  a.legs.forEach((l, i) => l.rotation.x = walking ? Math.sin(t * 22 + i * 2) * .4 : 0);
  a.tail.rotation.z = Math.sin(t * 1.8) * .1;
  a.body.position.y = Math.sin(t * 2.5) * .025;
  const busy = walking || !!a.actions?.current || !!a.actions?.queue.length;
  const st = M.updateMinotaurCharge(a, dt, t, busy, look);
  if (a.actions) updateActions(a, a.actions, dt);
  return st;
}

test('only the minotaur is moved', () => {
  for (const name of ['hill giant', 'doppelganger', 'jackal']) assert.equal(M.updateMinotaurCharge(createCreature({name}), dt, 0, false), null, name);
  assert.ok(M.isMinotaur(bull()));
});

test('the curves are zero outside their spans and bounded inside', () => {
  for (const v of [-1, 0, 1, 2, NaN]) {
    assert.deepEqual(M.snortCurve(v), {toss: 0, hook: 0});
    assert.equal(M.scrapeCurve(v), 0);
    assert.deepEqual(M.goreCurve(v), {duck: 0, hook: 0, dig: 0, wipe: 0});
  }
  let reach = 0, drag = 0, toss = 0, hook = 0;
  for (let v = 0; v <= 1; v += .005) {
    const s = M.scrapeCurve(v), n = M.snortCurve(v), g = M.goreCurve(v);
    reach = Math.min(reach, s); drag = Math.max(drag, s);
    toss = Math.max(toss, n.toss); hook = Math.max(hook, n.hook);
    for (const x of [n.toss, n.hook, g.duck, g.hook, g.dig]) assert.ok(x >= 0 && x <= 1);
    assert.ok(Math.abs(g.wipe) <= 1);
  }
  assert.ok(reach < -.5 && drag > .95, 'the hoof reaches forward, then drags back');
  assert.ok(toss > .9 && hook > .9);
});

test('near the hero it glares, snorts and paws, all finite, and stops pawing when it moves', () => {
  const a = bull(), hero = new THREE.Vector3(2, 0, 2.5);
  let t = 0, snorts = 0, paws = 0, wasSnort = false, wasPaw = false, minHead = 0;
  for (let i = 0; i < 30 * 60; i++) {
    const st = frame(a, t += dt, hero);
    assert.ok(pose(a).every(Number.isFinite));
    if (st.snort && !wasSnort) snorts++;
    if (st.paw && !wasPaw) paws++;
    wasSnort = !!st.snort; wasPaw = !!st.paw;
    minHead = Math.min(minHead, a.head.rotation.x - .32);
    for (const l of a.legs) assert.ok(Math.abs(l.rotation.x) <= M.PAW_DRAG + M.GORE.dig + 1e-9);
  }
  assert.ok(snorts >= 4 && snorts <= 14, `snorts ${snorts}`);
  assert.ok(paws >= 2, `paws ${paws}`);
  assert.ok(minHead < M.TOSS * .5, 'the head tosses up');
  // the hero is to its front right: the head has turned that way
  assert.ok(a.minotaurCharge.look > .3);
  // walking cuts the pawing off
  for (let i = 0; i < 60; i++) { const st = frame(a, t += dt, hero, true); assert.equal(st.paw, null); }
});

test('the butt ducks, digs in and gores; the claw leaves the head to actions.js', () => {
  const a = bull(), hero = new THREE.Vector3(0, 0, 1);
  a.actions = createActionQueue();
  let t = 0;
  enqueueAction(a.actions, {kind: 'attack', attack: 'butt', dir: [0, 1], result: 'hit'});
  let duck = 0, hook = 0, dig = 0;
  for (let i = 0; i < 120; i++) {
    frame(a, t += dt, hero);
    const g = M.goreCurve(a.actions.u ?? 0);
    if (a.actions.current) { duck = Math.max(duck, g.duck); hook = Math.max(hook, g.hook); dig = Math.max(dig, g.dig); }
    assert.ok(pose(a).every(Number.isFinite));
  }
  assert.ok(duck > .9 && hook > .9 && dig > .9, `${duck} ${hook} ${dig}`);
});

test('after the gore it flicks its head side to side to fling the muck off, ending at rest', () => {
  let left = 0, right = 0;
  for (let u = 0; u <= 1; u += .002) { const w = M.goreCurve(u).wipe; left = Math.min(left, w); right = Math.max(right, w); if (u < .7) assert.equal(w, 0, `${u}`); }
  assert.ok(left < -.5 && right > .5, 'swings both ways');
  assert.equal(M.goreCurve(1).wipe, 0);
  assert.ok(Math.abs(M.goreCurve(.9999).wipe) < 1e-3, 'no pop at the end');
});

test('death eases back to exact rest; stone holds', () => {
  const a = bull(), hero = new THREE.Vector3(1, 0, 2);
  a.actions = createActionQueue();
  const rest = pose(a);
  let t = 0;
  for (let i = 0; i < 10 * 60; i++) frame(a, t += dt, hero);
  enqueueAction(a.actions, {kind: 'hit', result: 'hit'});
  for (let i = 0; i < 60; i++) frame(a, t += dt, hero);
  assert.ok(a.minotaurCharge.shake > 0 || a.minotaurCharge.snort, 'a blow shakes it');
  a.actions.dead = true; a.actions.current = null; a.actions.queue.length = 0;
  for (let i = 0; i < 10 * 60; i++) frame(a, t += dt, hero);
  // the legs and tail are rewritten each frame by the loop; compare the rest of the pose
  const p = pose(a);
  for (const i of [0, 1, 2, 3, 4, 5, 6, 7, 8]) assert.ok(Math.abs(p[i] - rest[i]) < 1e-6, `index ${i}: ${p[i]} vs ${rest[i]}`);
  assert.ok(Math.abs(a.legs[0].rotation.x) < 1e-6 && Math.abs(a.legs[1].rotation.x) < 1e-6);

  const b = bull();
  for (let i = 0; i < 4 * 60; i++) frame(b, t += dt, hero);
  b.stone = true;
  const held = pose(b);
  for (let i = 0; i < 60; i++) { M.updateMinotaurCharge(b, dt, t += dt, false, hero); }
  assert.ok(far(pose(b), held) < 1e-12);
});
