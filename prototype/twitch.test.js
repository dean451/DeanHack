import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateTrudge} from './trudge.js';
import {updateTwitch, twitchPose, twitches, YAW, NUDGE, COCK, DIP, RATTLE, ARM, TWITCH_LEN, SNAP_T, BACK_AT, FIRST_MIN, FIRST_SPAN, GAP_MIN} from './twitch.js';

const make = (name = 'skeleton', symbol = 'Z') => {
  const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 7});
  a.species = name; a.actions = createActionQueue();
  return a;
};
// One frame in live.js's order for these parts.
function frame(a, dt, t, walking = false) {
  clearActionPose(a, a.actions);
  updateTrudge(a, dt, walking);
  updateActions(a, a.actions, dt);
  return updateTwitch(a, dt, t, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [a.head.rotation.x, a.head.rotation.y, a.head.rotation.z, ...a.arms.map(r => r.rotation.x)];

test('the twitch pose stays in bounds, snaps but never jumps, and starts and ends at rest', () => {
  const dt = 1 / 600;
  for (const side of [-1, 1]) {
    let prev = twitchPose(0, side), clatters = 0, wasPos = false;
    for (let s = 0; s <= TWITCH_LEN + 1e-9; s += dt) {
      const p = twitchPose(s, side);
      for (const v of Object.values(p)) assert(Number.isFinite(v));
      assert(side * p.yaw >= -1e-12 && side * p.yaw <= YAW + NUDGE + 1e-12, `yaw ${p.yaw}`);
      assert(side * p.cock >= -1e-12 && side * p.cock <= COCK + 1e-12 && p.dip >= 0 && p.dip <= DIP + 1e-12);
      assert(Math.abs(p.rattle) <= RATTLE * 1.6 + 1e-12 && p.arm >= 0 && p.arm <= ARM + 1e-12);
      // a snap is quick (YAW + NUDGE back in SNAP_T): at 60 fps up to ~.18 rad a frame, 10 of these steps
      for (const k of Object.keys(p)) assert(Math.abs(p[k] - prev[k]) < .02, `${k} jumps at ${s}`);
      const pos = p.rattle > RATTLE * .3;
      if (pos && !wasPos) clatters++;
      wasPos = pos; prev = p;
    }
    assert(clatters >= 3, `clatter peaks ${clatters}`);
    // turned and held through the middle, the nudge adds on, and it comes back to the front
    assert(side * twitchPose(.5, side).yaw > YAW * .99 && side * twitchPose(1.2, side).yaw > (YAW + NUDGE) * .99);
    assert(Math.abs(twitchPose(BACK_AT + SNAP_T + .01, side).yaw) < 1e-9);
    assert(Object.values(twitchPose(TWITCH_LEN, side)).every(v => v === 0));
  }
  assert(Object.values(twitchPose(1, 1, 0)).every(v => v === 0) && Object.values(twitchPose(NaN)).every(v => v === 0));
  // the snap round really is quick: most of the way there within a snap's length
  assert(twitchPose(SNAP_T * .8).yaw > YAW * .85);
});

test('a still skeleton twitches now and then, returns exactly to rest, and walking or death cuts it off', () => {
  const a = make(), rest = snap(a), dt = 1 / 60;
  assert(twitches(a));
  for (const [n, s] of [['human zombie', 'Z'], ['ghoul', 'Z'], ['jackal', 'd']]) assert(!twitches(make(n, s)), n);
  let t = 0, started = -1, turned = 0, ended = -1;
  for (; t < FIRST_MIN + FIRST_SPAN + TWITCH_LEN + 1; t += dt) {
    const p = frame(a, dt, t);
    if (p && started < 0) started = t;
    if (p) turned = Math.max(turned, Math.abs(a.head.rotation.y - rest[1]));
    if (started >= 0 && !p && ended < 0) ended = t;
  }
  assert(started >= FIRST_MIN - dt && started <= FIRST_MIN + FIRST_SPAN + dt, `started ${started}`);
  assert(ended > started && Math.abs(ended - started - TWITCH_LEN) < .1, `lasted ${ended - started}`);
  assert(turned > YAW * .95, `head turned ${turned}`);
  snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `part ${i} back to rest`));

  // the next one comes after a gap
  let next = -1;
  for (let s = t - ended; s < GAP_MIN + 8; s += dt, t += dt) if (frame(a, dt, t) && next < 0) next = s;
  assert(next >= GAP_MIN - 2 * dt, `gap ${next}`);

  // walking fades it within ~.1 s (from the held turn), and the skull comes back to rest
  const b = make(), rb = snap(b);
  t = 0;
  while (!(b.twitch?.cur?.s > .5)) { frame(b, dt, t); t += dt; }
  assert(Math.abs(b.head.rotation.y - rb[1]) > YAW * .9);
  for (let i = 0; i < 9; i++, t += dt) frame(b, dt, t, true);
  assert(Math.abs(b.head.rotation.y - rb[1]) < YAW * .3, 'mostly faded after .15 s');
  for (let i = 0; i < 120; i++, t += dt) frame(b, dt, t, true);
  for (let i = 0; i < 90; i++, t += dt) frame(b, dt, t, false); // the rattling gait settles; the next twitch is >= FIRST_MIN away
  assert(!b.twitch.cur);
  snap(b).forEach((v, i) => assert(Math.abs(v - rb[i]) < 1e-9, `part ${i} back to rest after the walk`));

  // an attack starting mid-twitch also cuts it off, and a dead skeleton never twitches
  const c = make();
  t = 0;
  while (!(c.twitch?.cur?.s > .3)) { frame(c, dt, t); t += dt; }
  assert(enqueueAction(c.actions, {kind: 'attack', attack: 'weapon', result: 'hit', dir: [1, 0]}));
  for (let i = 0; i < 30; i++, t += dt) frame(c, dt, t);
  assert(!c.twitch.cur || c.twitch.f < .05);
  c.actions.dead = true;
  for (let i = 0; i < 60 * 20; i++, t += dt) assert.equal(frame(c, dt, t), null);
});
