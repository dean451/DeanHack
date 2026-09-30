import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateTaunt, tauntPose, taunts, COCK, CACKLE, RAISE, FLARE, FLUTTER, LIFT, WHIP, TAUNT_LEN, FIRST_MIN, FIRST_SPAN} from './taunt.js';

const make = (name = 'imp', symbol = 'i') => {
  const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 1});
  a.species = name; a.actions = createActionQueue();
  return a;
};
// One frame in live.js's order for these parts: the idle loop writes the tail's roll and the
// wings' yaw absolutely, then actions, then the taunt.
function frame(a, dt, t, walking = false) {
  clearActionPose(a, a.actions);
  a.tail.rotation.z = Math.sin(t * 3) * .24;
  a.wings.forEach((w, i) => { w.rotation.y = (i ? 1 : -1) * (-.18 + Math.sin(t * 5) * .12); });
  updateActions(a, a.actions, dt);
  return updateTaunt(a, dt, t, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [a.head.rotation.x, a.head.rotation.y, a.head.rotation.z, ...a.arms.map(r => r.rotation.x), a.tail.rotation.x];

test('the taunt pose stays in bounds, moves smoothly and starts and ends at rest', () => {
  const n = 6000;
  let prev = tauntPose(0), beckons = 0, wasIn = false, whipL = 0, whipR = 0;
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = tauntPose(u);
    for (const v of Object.values(p)) assert(Number.isFinite(v));
    assert(p.cock >= 0 && p.cock <= COCK + 1e-12 && p.nod >= 0 && p.nod <= CACKLE + 1e-12);
    assert(p.arm >= 0 && p.arm <= RAISE + 1e-12 && p.lift >= 0 && p.lift <= LIFT + 1e-12);
    assert(Math.abs(p.flare) <= FLARE + FLUTTER + 1e-12 && Math.abs(p.whip) <= WHIP + 1e-12);
    // at 60 fps one frame is 1/180 of u; these steps are ~33× finer
    for (const k of Object.keys(p)) assert(Math.abs(p[k] - prev[k]) < .02, `${k} jumps at ${u}`);
    const curled = u > .3 && p.arm < RAISE * .8;
    if (curled && !wasIn && u < .7) beckons++;
    wasIn = curled; prev = p;
    whipL = Math.min(whipL, p.whip); whipR = Math.max(whipR, p.whip);
  }
  assert(Object.values(tauntPose(0)).every(v => v === 0) && Object.values(tauntPose(1)).every(v => v === 0));
  assert(Object.values(tauntPose(.5, 0)).every(v => v === 0) && Object.values(tauntPose(NaN)).every(v => v === 0));
  assert.equal(beckons, 3);
  assert(whipL < -WHIP * .5 && whipR > WHIP * .5, 'the whip lashes both ways');
  assert(tauntPose(.6).arm > RAISE * .5 && tauntPose(.6).lift > LIFT * .5 && tauntPose(.2).flare > FLARE * .5);
});

test('a standing imp taunts now and then and goes back exactly to rest', () => {
  const a = make();
  assert(taunts(a));
  const rest = snap(a), dt = 1 / 60;
  let t = 0, first = null, peak = 0;
  for (let i = 0; i < 60 * 30; i++) {
    t += dt;
    const p = frame(a, dt, t);
    if (p && first == null) first = t;
    if (p) peak = Math.max(peak, p.arm);
    for (const v of snap(a)) assert(Number.isFinite(v));
    if (!p) snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9, `drift at ${t}`));
    // the idle loop's absolute writes are never corrupted when idle
    if (!p) assert(Math.abs(a.tail.rotation.z - Math.sin(t * 3) * .24) < 1e-12);
  }
  assert(first != null && first >= FIRST_MIN - .05 && first <= FIRST_MIN + FIRST_SPAN + .05, `first taunt at ${first}`);
  assert(peak > RAISE * .9);
  // wings open further along their rest yaw at the flare
  const b = make(); let t2 = 0, flare = 0;
  for (let i = 0; i < 60 * 12; i++) { t2 += dt; const p = frame(b, dt, t2); if (p && p.flare > flare) { flare = p.flare; assert(Math.abs(b.wings[0].rotation.y) > .18 + FLARE * .3 || p.flare < FLARE * .6); } }
  assert(flare > FLARE * .8);
});

test('walking or an attack fades a taunt out within ~0.1 s and it rests again', () => {
  const a = make(), rest = snap(a), dt = 1 / 60;
  let t = 0;
  while (!(a.taunt?.cur && a.taunt.cur.u > .5)) { t += dt; frame(a, dt, t); assert(t < 20); }
  for (let i = 0; i < 8; i++) { t += dt; frame(a, dt, t, true); }
  assert(!a.taunt.cur || a.taunt.f < .2);
  for (let i = 0; i < 40; i++) { t += dt; frame(a, dt, t, true); }
  assert.equal(a.taunt.cur, null);
  snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9));
  enqueueAction(a.actions, {kind: 'attack', dir: {x: 1, z: 0}});
  assert(a.actions.queue.length);
  for (let i = 0; i < 30; i++) { t += dt; assert.equal(frame(a, dt, t), null); }
});

test('only imps taunt', () => {
  for (const [name, sym] of [['homunculus', 'i'], ['ghoul', 'Z'], ['gnome', 'G'], ['jackal', 'd']]) {
    const a = make(name, sym);
    assert(!taunts(a), name);
    assert.equal(updateTaunt(a, 1 / 60, 1, false), null);
    assert.equal(a.taunt, undefined);
  }
  assert(!taunts(null) && !taunts({quirk: 'imp'}));
});
