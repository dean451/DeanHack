import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateTrudge} from './trudge.js';
import {updateSkulk, skulkPose, skulks, DIP, YAW, COCK, SNIFF, ARM, SKULK_LEN, BURSTS, FIRST_MIN, FIRST_SPAN, GAP_MIN, GAP_SPAN} from './skulk.js';

const make = (name = 'ghoul', symbol = 'Z') => {
  const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 2});
  a.species = name; a.actions = createActionQueue();
  return a;
};
// One frame in live.js's order for these parts.
function frame(a, dt, t, walking = false) {
  clearActionPose(a, a.actions);
  updateTrudge(a, dt, walking);
  updateActions(a, a.actions, dt);
  return updateSkulk(a, dt, t, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [a.head.rotation.x, a.head.rotation.y, a.head.rotation.z, ...a.arms.map(r => r.rotation.x)];

test('the skulk pose stays in bounds, moves smoothly and starts and ends at rest', () => {
  const n = 4000;
  let prev = skulkPose(0), sniffs = 0, wasUp = false;
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = skulkPose(u);
    for (const v of Object.values(p)) assert(Number.isFinite(v));
    assert(p.dip >= 0 && p.dip <= DIP + 1e-12 && Math.abs(p.yaw) <= YAW + 1e-12 && Math.abs(p.cock) <= COCK + 1e-12);
    assert(p.sniff >= 0 && p.sniff <= SNIFF + 1e-12 && p.arm >= 0 && p.arm <= ARM + 1e-12);
    // at 60 fps a frame is SKULK_LEN*60 = 264 steps of u; here each step is ~15× finer
    for (const k of Object.keys(p)) assert(Math.abs(p[k] - prev[k]) < .004, `${k} jumps at ${u}`);
    const up = p.sniff > SNIFF * .35;
    if (up && !wasUp) sniffs++;
    wasUp = up; prev = p;
  }
  assert.deepEqual(skulkPose(0), skulkPose(1));
  assert(Object.values(skulkPose(1)).every(v => v === 0));
  assert(Object.values(skulkPose(.5, 0)).every(v => v === 0) && Object.values(skulkPose(NaN)).every(v => v === 0));
  assert(sniffs >= 2 * BURSTS.length && sniffs <= 5 * BURSTS.length, `sniff count ${sniffs}`);
  // head low through the middle; the sweep goes both ways
  assert(skulkPose(.5).dip > DIP * .99 && skulkPose(.25).yaw > YAW * .9 && skulkPose(.75).yaw < -YAW * .9);
});

test('a still ghoul skulks now and then, returns exactly to rest, and walking or death cuts it off', () => {
  const a = make(), rest = snap(a), dt = 1 / 60;
  assert(skulks(a));
  for (const [n, s] of [['human zombie', 'Z'], ['skeleton', 'Z'], ['jackal', 'd']]) assert(!skulks(make(n, s)), n);
  let t = 0, started = -1, lowest = 0, ended = -1;
  for (; t < FIRST_MIN + FIRST_SPAN + SKULK_LEN + 1; t += dt) {
    const p = frame(a, dt, t);
    if (p && started < 0) started = t;
    if (p) lowest = Math.max(lowest, a.head.rotation.x - rest[0]);
    if (started >= 0 && !p && ended < 0) ended = t;
  }
  assert(started >= FIRST_MIN - dt && started <= FIRST_MIN + FIRST_SPAN + dt, `started ${started}`);
  assert(ended > started && Math.abs(ended - started - SKULK_LEN) < .1, `lasted ${ended - started}`);
  assert(lowest > DIP * .9, `head went down ${lowest}`);
  snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `part ${i} back to rest`));

  // the next one comes after a gap
  let next = -1;
  for (let s = t - ended; s < GAP_MIN + GAP_SPAN + 1; s += dt, t += dt) if (frame(a, dt, t) && next < 0) next = s;
  assert(next >= GAP_MIN - 2 * dt, `gap ${next}`);

  // walking fades it within ~.1 s (from the middle of one), and the head comes back to rest
  const b = make(), rb = snap(b);
  t = 0;
  while (!(b.skulk?.cur?.u > .45)) { frame(b, dt, t); t += dt; }
  assert(b.head.rotation.x - rb[0] > DIP * .8);
  for (let i = 0; i < 9; i++, t += dt) frame(b, dt, t, true);
  assert(Math.abs(b.head.rotation.x - rb[0] - (b.trudge?.nod || 0)) < DIP * .3, 'mostly faded after .15 s');
  for (let i = 0; i < 120; i++, t += dt) frame(b, dt, t, true);
  for (let i = 0; i < 130; i++, t += dt) frame(b, dt, t, false); // the lope eases out; the next skulk is >= FIRST_MIN away
  assert(!b.skulk.cur);
  snap(b).forEach((v, i) => assert(Math.abs(v - rb[i]) < 1e-9, `part ${i} back to rest after the walk`));

  // an attack starting mid-skulk also cuts it off, and a dead ghoul never skulks
  const c = make();
  t = 0;
  while (!(c.skulk?.cur?.u > .3)) { frame(c, dt, t); t += dt; }
  assert(enqueueAction(c.actions, {kind: 'attack', attack: 'claw', result: 'hit', dir: [1, 0]}));
  for (let i = 0; i < 30; i++, t += dt) frame(c, dt, t);
  assert(!c.skulk.cur || c.skulk.f < .05);
  c.actions.dead = true;
  for (let i = 0; i < 60 * 20; i++, t += dt) assert.equal(frame(c, dt, t), null);
});
