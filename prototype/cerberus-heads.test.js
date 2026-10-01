import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, clearActionPose, updateActions} from './actions.js';
import * as C from './cerberus-heads.js';

const dt = 1 / 60;
const hound = () => createCreature({name: 'Cerberus', symbol: 100, color: 1});
const pose = a => a.heads.flatMap(h => [h.rotation.x, h.rotation.y, h.rotation.z]);
const far = (p, q) => Math.max(...p.map((v, i) => Math.abs(v - q[i])));

// One frame as live.js runs it: take the action pose off, then fidget (this module), then the actions.
// Returns the pose as this module left it (before the action pitch goes on).
function frame(a, t, look, walking = false) {
  if (a.actions) clearActionPose(a, a.actions);
  const busy = walking || !!a.actions?.current || !!a.actions?.queue.length;
  C.updateCerberusHeads(a, dt, t, busy, look, walking);
  const p = pose(a);
  if (a.actions) updateActions(a, a.actions, dt);
  return p;
}

test('only Cerberus is moved', () => {
  for (const name of ['jackal', 'hell hound', 'large dog', 'red dragon']) assert.equal(C.updateCerberusHeads(createCreature({name}), dt, 0, false, null), null, name);
  assert.ok(C.updateCerberusHeads(hound(), dt, 0, false, null));
});

test('alone, each head keeps its own watch, sniffs, and the side heads snap at the middle one', () => {
  const a = hound(), rest = pose(a), base = a.heads.map(h => h.rotation.y);
  const yaws = [[], [], []];
  let squabs = 0, sniffs = 0, wasSquab = false, prevSniff = [0, 0, 0];
  for (let i = 0; i < 60 * 40; i++) {
    const p = frame(a, i * dt, null);
    for (const v of p) assert.ok(Number.isFinite(v));
    a.heads.forEach((h, k) => {
      yaws[k].push(h.rotation.y - base[k]);
      assert.ok(Math.abs(h.rotation.y - base[k]) < 1.2 && Math.abs(h.rotation.x - rest[k * 3]) < .7 && Math.abs(h.rotation.z) < .4);
    });
    const st = a.cerberusHeads;
    if (st.squab && !wasSquab) squabs++;
    wasSquab = !!st.squab;
    st.heads.forEach((s, k) => { if (s.sniff > prevSniff[k]) sniffs++; prevSniff[k] = s.sniff; });
  }
  assert.ok(squabs >= 2, `squabbles ${squabs}`);
  assert.ok(sniffs >= 3, `sniffs ${sniffs}`);
  // the heads look about independently: their yaw histories differ
  const diff = (x, y) => x.reduce((s, v, i) => s + Math.abs(v - y[i]), 0) / x.length;
  assert.ok(diff(yaws[0], yaws[1]) > .1 && diff(yaws[1], yaws[2]) > .1 && diff(yaws[0], yaws[2]) > .1);
  // the side heads mostly look out over their own flank
  const mean = x => x.reduce((s, v) => s + v, 0) / x.length;
  assert.ok(mean(yaws[0]) < 0 && mean(yaws[2]) > 0, `${mean(yaws[0])} ${mean(yaws[2])}`);
});

test('with the hero near, all three lock on, lowered and growling, and feint at the hero', () => {
  const a = hound(), base = a.heads.map(h => h.rotation.y), restX = a.heads.map(h => h.rotation.x);
  const look = {x: 2, z: 3};
  const b = Math.atan2(2, 3);
  let feints = 0, was = false;
  for (let i = 0; i < 60 * 20; i++) {
    frame(a, i * dt, look);
    const st = a.cerberusHeads;
    if (st.feint && !was) feints++;
    was = !!st.feint;
    if (i > 60 && !st.feint) a.heads.forEach((h, k) => {
      assert.ok(Math.abs(base[k] + (h.rotation.y - base[k]) - b) < .05, `head ${k} faces the hero`);
      assert.ok(h.rotation.x - restX[k] > C.LOWER - .03, `head ${k} lowered`);
    });
  }
  assert.ok(feints >= 3, `feints ${feints}`);
  // the hero walks off: the heads go back to their own watch
  for (let i = 0; i < 60 * 5; i++) frame(a, 20 + i * dt, {x: 40, z: 0});
  assert.equal(a.cerberusHeads.feint, null);
});

test('an attack bites in turn, middle, left, right; a blow jerks each head its own way', () => {
  const a = hound(), neck = a.heads.map(h => h.rotation.x);
  a.actions = createActionQueue();
  const look = {x: 0, z: 2};
  for (let i = 0; i < 60; i++) frame(a, i * dt, look);
  enqueueAction(a.actions, {kind: 'attack', attack: 'bite', result: 'hit', dir: [0, 1]});
  const peak = [{v: -1, t: 0}, {v: -1, t: 0}, {v: -1, t: 0}], low = [0, 0, 0];
  for (let i = 0; i < 60 * 3; i++) {
    const biting = a.actions.current?.kind === 'attack';
    const p = frame(a, 1 + i * dt, look);
    if (!biting) continue;
    // the module's own pitch on top of the lowered stare
    [0, 1, 2].forEach(k => {
      const v = p[k * 3] - neck[k] - C.LOWER;
      if (v > peak[k].v) peak[k] = {v, t: i};
      low[k] = Math.min(low[k], v);
    });
  }
  assert.ok(peak[1].t < peak[0].t && peak[0].t < peak[2].t, `in turn ${peak.map(p => p.t)}`);
  for (const k of [0, 2]) assert.ok(peak[k].v > .25 && low[k] < -.15, `head ${k} rears and snaps ${low[k]} ${peak[k].v}`);
  // a blow
  const before = pose(a);
  enqueueAction(a.actions, {kind: 'hit', attack: 'weapon', result: 'hit', dir: [0, -1]});
  let moved = [0, 0, 0];
  for (let i = 0; i < 30; i++) { const p = frame(a, 4 + i * dt, look); for (let k = 0; k < 3; k++) moved[k] = Math.max(moved[k], far(p.slice(k * 3, k * 3 + 3), before.slice(k * 3, k * 3 + 3))); }
  for (const m of moved) assert.ok(m > .05, `jerk ${moved}`);
});

test('death eases every head back to rest, even after many bites; stone holds', () => {
  const a = hound(), rest = pose(a);
  a.actions = createActionQueue();
  // bites and blows along the way, so the middle head's shared pitch with actions.js gets exercised
  for (let i = 0; i < 60 * 8; i++) {
    if (i >= 240 && i % 40 === 0) enqueueAction(a.actions, {kind: i % 80 ? 'hit' : 'attack', attack: 'bite', result: 'hit', dir: [0, 1]});
    frame(a, i * dt, i < 240 ? null : {x: 1, z: 2});
  }
  assert.ok(far(pose(a), rest) > .02);
  a.actions.dead = true;
  for (let i = 0; i < 60 * 4; i++) frame(a, 8 + i * dt, {x: 1, z: 2});
  assert.ok(far(pose(a), rest) < 1e-3, `dead at rest ${far(pose(a), rest)}`);
  for (let i = 0; i < 60; i++) frame(a, 12 + i * dt, {x: 1, z: 2});
  assert.ok(far(pose(a), rest) < 1e-3);

  const s = hound();
  for (let i = 0; i < 60 * 3; i++) frame(s, i * dt, {x: 1, z: 2});
  s.stone = true;
  const held = pose(s);
  for (let i = 0; i < 60 * 3; i++) frame(s, 3 + i * dt, {x: -3, z: 1});
  assert.ok(far(pose(s), held) < 1e-12, 'stone holds');
});

test('walking: the heads face forward and nod out of step, and come back', () => {
  const a = hound(), rest = pose(a);
  for (let i = 0; i < 60 * 3; i++) frame(a, i * dt, null, true);
  const p = pose(a);
  assert.ok(far(p, rest) < C.WALK_NOD + .02, `walking ${far(p, rest)}`);
  const x = [0, 1, 2].map(k => p[k * 3] - rest[k * 3]);
  assert.ok(Math.max(...x) - Math.min(...x) > .02, 'out of step');
});
