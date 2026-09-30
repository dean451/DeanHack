import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateTripod, tripodPose, tripodLayout, tripods, TRIPOD} from './tripod.js';

const bug = (name, symbol = 'a') => { const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 3}); a.actions = createActionQueue(); return a; };
const WALKERS = [['giant ant', 'a'], ['soldier ant', 'a'], ['fire ant', 'a'], ['giant beetle', 'a']];

// One frame as live.js runs it: the generic leg swing and body bob, the tripod, then the actions.
function frame(a, t, dt, walking) {
  clearActionPose(a, a.actions);
  a.legs.forEach((l, i) => l.rotation.x = walking ? Math.sin(t * 22 + i * 2) * .4 : 0);
  a.body.position.y = Math.sin(t * (walking ? 22 : 2.5)) * .015;
  const p = updateTripod(a, dt, walking);
  updateActions(a, a.actions, dt);
  return p;
}
const snap = a => [...a.legs.flatMap(l => [l.rotation.x, l.rotation.y, l.rotation.z]), a.body.position.y];
const settled = (a, t) => [...a.legs.flatMap(() => [0, 0, 0]), Math.sin(t * 2.5) * .015];

test('ants and the beetle walk on alternating tripods, whatever order their legs are listed in', () => {
  for (const [name, sym] of WALKERS) {
    const a = bug(name, sym);
    assert(tripods(a), name);
    const {side, group} = tripodLayout(a.legs);
    // three legs a side, and each tripod is front + hind of one side with the middle of the other
    assert.equal(side.filter(s => s > 0).length, 3);
    for (const g of [1, -1]) {
      const legs = a.legs.map((l, i) => i).filter(i => group[i] === g);
      assert.equal(legs.length, 3, name);
      const sides = legs.map(i => side[i]);
      assert.equal(Math.abs(sides.reduce((x, y) => x + y)), 1, `${name} tripod mixes sides`);
      const odd = legs.find(i => sides.filter(s => s === side[i]).length === 1);
      const zs = s => a.legs.filter((l, i) => side[i] === s).map(l => l.position.z).sort((x, y) => x - y);
      // the lone leg is its side's middle leg; the pair are the other side's front and hind legs
      assert.equal(zs(side[odd])[1], a.legs[odd].position.z, name);
      const pair = legs.filter(i => i !== odd).map(i => a.legs[i].position.z).sort((x, y) => x - y), far = zs(-side[odd]);
      assert.deepEqual(pair, [far[0], far[2]], name);
    }
  }
  // other bugs keep live.js's walk: bees dangle their legs, the centipede has sixteen
  for (const [name, sym] of [['killer bee', 'a'], ['centipede', 's'], ['cave spider', 's']]) assert(!tripods(bug(name, sym)), name);
  assert.equal(updateTripod(bug('sewer rat', 'r'), 1 / 60, true), null);
});

test('three feet are always down, and a leg lifts only while it swings forward', () => {
  const layout = tripodLayout(bug('giant ant').legs);
  for (let i = 0; i <= 400; i++) {
    const ph = Math.PI * 2 * i / 400, p = tripodPose(layout, ph);
    for (const v of [...p.yaw, ...p.lift, p.bob]) assert(Number.isFinite(v));
    const up = p.lift.map((v, k) => v * layout.side[k]);
    up.forEach(v => assert(v >= 0 && v <= TRIPOD.lift + 1e-12));
    assert(up.filter(v => v > 1e-9).length <= 3);
    p.yaw.forEach(v => assert(Math.abs(v) <= TRIPOD.stride + 1e-12));
    assert(p.bob <= 0 && p.bob >= -TRIPOD.dip);
    // a raised leg is moving its foot forward (+z): d(yaw)/d(phase) points forward for its side
    const q = tripodPose(layout, ph + 1e-4);
    up.forEach((v, k) => { if (v > 1e-3) assert(-layout.side[k] * (q.yaw[k] - p.yaw[k]) > 0, `leg ${k} lifted on the back stroke`); });
  }
  assert.equal(tripodPose(layout, 1, 0).bob, 0);
});

test('a walking ant scurries, then settles back to its exact rest pose', () => {
  for (const [name, sym] of WALKERS) {
    const a = bug(name, sym), dt = 1 / 60;
    let t = 0, prev = snap(a), worst = 0, maxLift = 0;
    for (let i = 0; i < 240; i++, t += dt) {
      const walking = i < 120;
      frame(a, t, dt, walking);
      const now = snap(a);
      now.forEach(v => assert(Number.isFinite(v)));
      if (i > 30 && walking) {
        a.legs.forEach(l => { assert(Math.abs(l.rotation.x) < .02); assert(Math.abs(l.rotation.y) <= TRIPOD.stride + 1e-9); });
        maxLift = Math.max(maxLift, ...a.legs.map(l => Math.abs(l.rotation.z)));
      }
      if (i) worst = Math.max(worst, ...now.map((v, k) => Math.abs(v - prev[k])));
      prev = now;
    }
    assert(maxLift > TRIPOD.lift * .9, `${name} legs lift`);
    assert(worst < .2, `${name} largest per-frame jump ${worst}`);
    const want = settled(a, t - dt);
    snap(a).forEach((v, k) => assert(Math.abs(v - want[k]) < 1e-9, `${name} ${k} ${v} vs ${want[k]}`));
  }
});

test('the big beetle trundles slower than a fire ant', () => {
  const ant = bug('fire ant'), beetle = bug('giant beetle');
  for (let i = 0; i < 15; i++) { updateTripod(ant, 1 / 60, true); updateTripod(beetle, 1 / 60, true); }
  assert(Math.abs(ant.tripod.phase - TRIPOD.rate / Math.sqrt(ant.g.scale.x) * .25) < .1);
  assert(Math.abs(beetle.tripod.phase - TRIPOD.rate / Math.sqrt(beetle.g.scale.x) * .25) < .1);
  assert(ant.tripod.phase > beetle.tripod.phase);
});

test('a bite mid-stride and death both leave the legs at rest', () => {
  const a = bug('soldier ant'), dt = 1 / 60;
  let t = 0;
  for (let i = 0; i < 30; i++, t += dt) frame(a, t, dt, true);
  assert(enqueueAction(a.actions, {kind: 'attack', attack: 'bite', dir: [0, 1]}));
  for (let i = 0; i < 90; i++, t += dt) { frame(a, t, dt, i < 20); snap(a).forEach(v => assert(Number.isFinite(v))); }
  const want = settled(a, t - dt);
  snap(a).forEach((v, k) => assert(Math.abs(v - want[k]) < 1e-9, `${k} ${v}`));
  enqueueAction(a.actions, {kind: 'die', dir: [1, 0]});
  for (let i = 0; i < 140; i++, t += dt) frame(a, t, dt, true);
  assert.equal(a.tripod.w, 0);
  a.legs.forEach(l => { assert.equal(l.rotation.y, 0); assert.equal(l.rotation.z, 0); });
});
