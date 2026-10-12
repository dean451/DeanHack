import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, updateActions, clearActionPose} from './actions.js';
import {updateTrudge} from './trudge.js';
import {updateZombieTwitch, zombieTwitchPose, zombieTwitches, LIFT, CRANE, REACH, CLAW, DROP, SPASM_LEN, FIRST_MIN, FIRST_SPAN, MUMMY_STIFF} from './zombie-twitch.js';

const make = (name = 'human zombie') => {
  const a = createCreature({name, symbol: 'Z'.charCodeAt(0), color: 7});
  a.species = name; a.actions = createActionQueue();
  return a;
};
function frame(a, dt, t, walking = false) {
  clearActionPose(a, a.actions);
  updateTrudge(a, dt, walking);
  updateActions(a, a.actions, dt);
  return updateZombieTwitch(a, dt, t, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [a.head.rotation.x, a.head.rotation.z, ...a.arms.map(r => r.rotation.x)];

test('the spasm pose stays in bounds, never jumps, and starts and ends at rest', () => {
  const dt = 1 / 600;
  for (const side of [-1, 1]) {
    let prev = zombieTwitchPose(0, side), lifted = 0, clawed = 0, dropped = 0;
    for (let s = 0; s <= SPASM_LEN + 1e-9; s += dt) {
      const p = zombieTwitchPose(s, side);
      for (const v of Object.values(p)) assert(Number.isFinite(v));
      assert(p.lift >= 0 && p.lift <= LIFT + 1e-12 && side * p.crane >= -1e-12 && side * p.crane <= CRANE + 1e-12);
      assert(p.reach >= -1e-12 && p.reach <= REACH + 1e-12 && p.claw >= 0 && p.claw <= CLAW * 2 + 1e-12);
      assert(p.drop >= 0 && p.drop <= DROP + 1e-12);
      for (const k of Object.keys(p)) assert(Math.abs(p[k] - prev[k]) < .03, `${k} jumps at ${s}`);
      lifted = Math.max(lifted, p.lift); clawed = Math.max(clawed, p.claw); dropped = Math.max(dropped, p.drop); prev = p;
    }
    assert(lifted > LIFT * .99 && clawed > CLAW * .9 && dropped > DROP * .5);
    assert(Object.values(zombieTwitchPose(SPASM_LEN, side)).every(v => v === 0));
  }
  assert(Object.values(zombieTwitchPose(1, 1, 0)).every(v => v === 0) && Object.values(zombieTwitchPose(NaN)).every(v => v === 0));
});

test('a still zombie spasms, returns exactly to rest, and walking or death cuts it off', () => {
  const a = make(), rest = snap(a), dt = 1 / 60;
  assert(zombieTwitches(a) && !zombieTwitches(make('skeleton')) && !zombieTwitches(make('jackal')));
  let t = 0, started = -1, ended = -1, lifted = 0;
  for (; t < FIRST_MIN + FIRST_SPAN + SPASM_LEN + 1; t += dt) {
    const p = frame(a, dt, t);
    if (p && started < 0) started = t;
    if (p) lifted = Math.max(lifted, rest[0] - a.head.rotation.x);
    if (started >= 0 && !p && ended < 0) ended = t;
  }
  assert(started >= FIRST_MIN - dt && started <= FIRST_MIN + FIRST_SPAN + dt, `started ${started}`);
  assert(Math.abs(ended - started - SPASM_LEN) < .1);
  assert(lifted > LIFT * .8, `lifted ${lifted}`);
  snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `part ${i} back to rest`));

  const b = make(), rb = snap(b);
  t = 0;
  while (!(b.zombieTwitch?.cur?.s > .5)) { frame(b, dt, t); t += dt; }
  for (let i = 0; i < 150; i++, t += dt) frame(b, dt, t, true);
  for (let i = 0; i < 90; i++, t += dt) frame(b, dt, t, false);
  assert(!b.zombieTwitch.cur);
  snap(b).forEach((v, i) => assert(Math.abs(v - rb[i]) < 1e-9, `part ${i} back to rest after the walk`));

  const c = make();
  c.actions.dead = true;
  for (let i = 0; i < 60 * 20; i++, t += dt) assert.equal(frame(c, dt, t), null);
});

test('a mummy spasms too, but stiffly, and returns exactly to rest', () => {
  const m = make('mummy'), dt = 1 / 60;
  assert(m.quirk === 'mummy' && zombieTwitches(m));
  const rest = snap(m);
  let peak = 0, t = 0;
  for (; t < FIRST_MIN + FIRST_SPAN + SPASM_LEN + 1; t += dt) {
    frame(m, dt, t);
    peak = Math.max(peak, rest[0] - m.head.rotation.x);
  }
  assert(peak > LIFT * MUMMY_STIFF * .8 && peak <= LIFT * MUMMY_STIFF + 1e-9, `mummy lift ${peak}`);
  snap(m).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `part ${i} back to rest`));
});
