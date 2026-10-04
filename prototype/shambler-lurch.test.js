import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, clearActionPose, updateActions} from './actions.js';
import {tailSway, HORROR_LOLL, HORROR_DRIFT} from './tail-sway.js';
import * as S from './shambler-lurch.js';

const dt = 1 / 60;
const horror = () => { const a = createCreature({name: 'shambling horror', symbol: 85, color: 14}); a.g.updateMatrixWorld(true); return a; };
const pose = a => [a.body.rotation, a.body.scale, a.tail.rotation, a.digArm.rotation, a.limpArm.rotation].flatMap(r => [r.x, r.y, r.z]);
const far = (p, q) => Math.max(...p.map((v, i) => Math.abs(v - q[i])));

// One frame as live.js runs it: take the action pose off, swing the legs, sway the head, bob, fidget, then the actions.
function frame(a, t, look, walking = false) {
  if (a.actions) clearActionPose(a, a.actions);
  a.legs.forEach((l, i) => l.rotation.x = walking ? Math.sin(t * 22 + i * 2) * .4 : 0);
  a.tail.rotation.z = tailSway(a, t);
  a.body.position.y = Math.sin(t * (walking ? 22 : 2.5)) * .025;
  const busy = walking || !!a.actions?.current || !!a.actions?.queue.length;
  const st = S.updateShamblerLurch(a, dt, t, busy, look, walking);
  if (a.actions) updateActions(a, a.actions, dt);
  return st;
}

test('only the shambling horror is moved; its arms are their own groups and its head hangs lolled', () => {
  for (const name of ['umber hulk', 'minotaur', 'jackal']) assert.equal(S.updateShamblerLurch(createCreature({name}), dt, 0, false), null, name);
  const a = horror();
  assert.ok(S.isShambler(a));
  assert.ok(a.digArm.children.some(c => c.isMesh) && a.limpArm.children.some(c => c.isMesh));
  for (let t = 0; t < 30; t += .37) {
    const z = tailSway(a, t);
    assert.ok(Math.abs(z - HORROR_LOLL) <= HORROR_DRIFT * 1.35 + 1e-9, `${z}`);
  }
});

test('the curves are zero outside their spans and bounded inside', () => {
  for (const v of [-1, 0, 1, 2, NaN]) {
    assert.deepEqual(S.slamCurve(v), {raise: 0, slam: 0, drag: 0});
    assert.equal(S.spasmCurve(v), 0);
    assert.equal(S.reachCurve(v), 0);
  }
  let raise = 0, slam = 0, drag = 0, raisedAt = 0, slamAt = 0, dragAt = 0;
  for (let u = 0; u <= 1; u += .005) {
    const c = S.slamCurve(u);
    for (const x of [c.raise, c.slam, c.drag, S.spasmCurve(u), S.reachCurve(u)]) assert.ok(x >= 0 && x <= 1);
    if (c.raise > raise) { raise = c.raise; raisedAt = u; }
    if (c.slam > slam) { slam = c.slam; slamAt = u; }
    if (c.drag > drag) { drag = c.drag; dragAt = u; }
  }
  assert.ok(raise > .9 && slam > .9 && drag > .9);
  assert.ok(raisedAt < slamAt && slamAt < dragAt, 'raised, then slammed, then raked back');
});

test('the claw sticks after the slam: it judders both ways, only in its span, and stays small', () => {
  let lo = 0, hi = 0;
  for (const u of [-1, 0, S.TUG_FROM, S.TUG_TO, 1, 2, NaN]) assert.equal(S.clawTug(u), 0, `${u}`);
  for (let u = S.TUG_FROM; u <= S.TUG_TO; u += .002) { const c = S.clawTug(u); assert.ok(Math.abs(c) <= 1); lo = Math.min(lo, c); hi = Math.max(hi, c); }
  assert.ok(lo < -.3 && hi > .3, `judders both ways ${lo} ${hi}`);
  assert.ok(S.slamCurve(.5).slam > .5 && S.slamCurve(S.TUG_TO).drag < .6, 'it is still in the floor while the tug runs');
});

test('it shambles, spasms and reaches for the hero, all finite and bounded', () => {
  const a = horror(), hero = new THREE.Vector3(1.5, 0, 2.5);
  let t = 0, spasms = 0, reaches = 0, was = false, wasReach = false, maxRoll = 0, maxDrag = 0, minReach = 0;
  for (let i = 0; i < 40 * 60; i++) {
    const st = frame(a, t += dt, hero);
    assert.ok(pose(a).every(Number.isFinite));
    if (st.spasm && !was) spasms++;
    if (st.reach && !wasReach) reaches++;
    was = !!st.spasm; wasReach = !!st.reach;
    minReach = Math.min(minReach, a.limpArm.rotation.x);
    assert.ok(Math.abs(a.body.rotation.z) < .3 && Math.abs(a.body.rotation.x) < .3);
  }
  assert.ok(spasms >= 4 && spasms <= 10, `spasms ${spasms}`);
  assert.ok(reaches >= 3, `reaches ${reaches}`);
  assert.ok(minReach < S.REACH_X * .8, 'the withered arm reaches out');
  assert.ok(a.shamblerLurch.look > .3, 'the head creeps round to the hero, front right');
  // walking: it lurches onto the club foot and drags the claw, and stops reaching
  for (let i = 0; i < 3 * 60; i++) {
    const st = frame(a, t += dt, hero, true);
    if (i > 30) { assert.equal(st.reach, null); maxRoll = Math.max(maxRoll, a.body.rotation.z); maxDrag = Math.max(maxDrag, a.digArm.rotation.x); }
  }
  assert.ok(maxRoll > S.WALK.club * .8, `roll ${maxRoll}`);
  assert.ok(maxDrag > S.WALK.drag * .9, `drag ${maxDrag}`);
});

test('the claw is heaved overhead, slammed down and raked back', () => {
  const a = horror(), hero = new THREE.Vector3(0, 0, 1);
  a.actions = createActionQueue();
  let t = 0, high = 0, low = Infinity, back = -Infinity, phase = 0;
  enqueueAction(a.actions, {kind: 'attack', attack: 'claw', dir: [0, 1], result: 'hit'});
  for (let i = 0; i < 120; i++) {
    frame(a, t += dt, hero);
    assert.ok(pose(a).every(Number.isFinite));
    if (!a.actions.current) continue;
    const x = a.digArm.rotation.x;
    if (x < high) { high = x; phase = a.actions.u; }
    back = Math.max(back, x);
    if (a.actions.u > .45 && a.actions.u < .55) low = Math.min(low, Math.abs(x - S.SLAM.slamX));
  }
  assert.ok(high < S.SLAM.raiseX * .9, `raised to ${high}`);
  assert.ok(phase < .45, 'raised before the slam');
  assert.ok(low < .3, 'slammed down in front');
  assert.ok(back > S.SLAM.dragX * .8, `raked back to ${back}`);
});

test('death eases back to exact rest; stone holds', () => {
  const a = horror(), hero = new THREE.Vector3(1, 0, 2);
  a.actions = createActionQueue();
  const rest = pose(a);
  let t = 0;
  for (let i = 0; i < 10 * 60; i++) frame(a, t += dt, hero, i % 300 < 90);
  enqueueAction(a.actions, {kind: 'hit', result: 'hit'});
  for (let i = 0; i < 30; i++) frame(a, t += dt, hero);
  assert.ok(a.shamblerLurch.quiver > 0 && a.shamblerLurch.spasm, 'a blow quivers and spasms it');
  for (let i = 0; i < 60; i++) frame(a, t += dt, hero);
  a.actions.dead = true; a.actions.current = null; a.actions.queue.length = 0;
  for (let i = 0; i < 10 * 60; i++) frame(a, t += dt, hero);
  // the head's roll (index 8) is rewritten each frame by the loop; compare the rest of the pose
  const p = pose(a);
  p.forEach((v, i) => { if (i !== 8) assert.ok(Math.abs(v - rest[i]) < 1e-6, `index ${i}: ${v} vs ${rest[i]}`); });

  const b = horror();
  for (let i = 0; i < 4 * 60; i++) frame(b, t += dt, hero, true);
  b.stone = true;
  const held = pose(b);
  for (let i = 0; i < 60; i++) S.updateShamblerLurch(b, dt, t += dt, true, hero, true);
  assert.ok(far(pose(b), held) < 1e-12);
});
