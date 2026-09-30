import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {JAW_GAPE} from './jaw.js';
import {WHIFFLE, whiffles, burblePose, whifflePose, updateWhiffle} from './whiffle.js';

const J = 'J'.charCodeAt(0);
const jab = name => { const a = createCreature({name, symbol: J, color: 1}); a.actions = createActionQueue(); return a; };
const pose = a => [a.head.rotation.x, a.head.rotation.y, a.jaw.rotation.x, ...a.arms.map(m => m.rotation.x)];
const rest = a => pose(a);

// One frame as live.js runs it: clear the action pose, run the actions, then whiffle.
function frame(a, dt, t, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateWhiffle(a, dt, t, walking, !!a.actions.current || !!a.actions.queue.length);
}

test('only jabberwocks whiffle', () => {
  for (const name of ['jabberwock', 'vorpal jabberwock']) assert.ok(whiffles(jab(name)), name);
  for (const name of ['crocodile', 'red dragon', 'killer bee', 'hobbit']) assert.ok(!whiffles(createCreature({name})), name);
});

test('the burble snaps open and shut, starting and ending closed', () => {
  assert.equal(burblePose(0), 0); assert.equal(burblePose(WHIFFLE.burbleS), 0); assert.equal(burblePose(-1), 0);
  let peaks = 0, prev = 0, rising = false, max = 0;
  for (let i = 1; i < 900; i++) {
    const v = burblePose(i / 900 * WHIFFLE.burbleS);
    assert.ok(Number.isFinite(v) && v >= 0 && v <= WHIFFLE.gape);
    if (v < prev && rising) peaks++;
    rising = v > prev; prev = v; max = Math.max(max, v);
  }
  assert.equal(peaks, WHIFFLE.snaps);
  assert.ok(max > WHIFFLE.gape * .7);
  const p = whifflePose(1.3, 0, 0);
  assert.equal(p.yaw, 0); assert.equal(p.pitch, 0); assert.ok(p.arms.every(v => v === 0));
});

test('the jabberwock weaves, raises its talons and burbles, idle and walking, without jumps', () => {
  for (const name of ['jabberwock', 'vorpal jabberwock']) {
    const a = jab(name), r = rest(a), dt = 1 / 60;
    let prev = pose(a), burbled = 0, maxYaw = 0, raised = 0, maxJump = 0;
    for (let i = 0; i < 60 * 20; i++) {
      const walking = i > 600 && i < 900;
      frame(a, dt, i * dt, walking);
      const p = pose(a);
      p.forEach(v => assert.ok(Number.isFinite(v)));
      maxJump = Math.max(maxJump, ...p.map((v, j) => Math.abs(v - prev[j])));
      prev = p;
      const d = p.map((v, j) => v - r[j]);
      assert.ok(Math.abs(d[0]) < .1 && Math.abs(d[1]) < .2, `${name} head ${d}`);
      assert.ok(d[2] >= 0 && d[2] <= WHIFFLE.gape, `${name} jaw ${d[2]}`);
      assert.ok(d[3] <= 0 && d[4] <= 0 && d[3] > -.25 && d[4] > -.25, `${name} arms ${d}`);
      if (d[2] > .1) burbled++;
      maxYaw = Math.max(maxYaw, Math.abs(d[1]));
      if (d[3] < -.05) raised++;
    }
    assert.ok(maxJump < .06, `${name} jump ${maxJump}`);
    assert.ok(burbled > 30, `${name} burbled ${burbled}`);
    assert.ok(maxYaw > .12, `${name} weave ${maxYaw}`);
    assert.ok(raised > 600, `${name} talons ${raised}`);
  }
});

test('an attack fades the whiffle out, the jaw never passes the gape, and death ends at rest', () => {
  const a = jab('vorpal jabberwock'), r = rest(a), dt = 1 / 60;
  let t = 0;
  for (let i = 0; i < 240; i++) frame(a, dt, t += dt);
  enqueueAction(a.actions, {kind: 'attack', attack: 'bite', result: 'hit', dir: [1, 0]});
  let faded = false;
  for (let i = 0; i < 120; i++) {
    const st = frame(a, dt, t += dt);
    assert.ok(a.jaw.rotation.x - r[2] <= JAW_GAPE + 1e-9);
    if (a.actions.current && st.w < .05) faded = true;
  }
  assert.ok(faded, 'whiffle should fade during the attack');
  for (let i = 0; i < 300; i++) frame(a, dt, t += dt);
  assert.ok(a.whiffle.w > .9, 'whiffle comes back after the attack');
  enqueueAction(a.actions, {kind: 'die', style: 'topple', dir: [1, 0]});
  for (let i = 0; i < 600; i++) frame(a, dt, t += dt);
  assert.equal(a.whiffle.w, 0);
  // The whiffle's own offsets are all taken back.
  const ap = a.whiffle.applied;
  assert.equal(ap.yaw, 0); assert.equal(ap.pitch, 0); assert.equal(ap.jaw, 0); assert.equal(ap.arms.length, 0);
});

test('with no actions the pose returns exactly to rest once the whiffle is taken back', () => {
  const a = jab('jabberwock'), r = rest(a), dt = 1 / 60;
  for (let i = 0; i < 500; i++) frame(a, dt, i * dt, i % 200 < 100);
  // Busy from here on (as if an action were queued forever), with no action deltas to muddle it.
  for (let i = 0; i < 120; i++) updateWhiffle(a, dt, 10 + i * dt, false, true);
  pose(a).forEach((v, j) => assert.ok(Math.abs(v - r[j]) < 1e-9, `${j}: ${v} vs ${r[j]}`));
});
