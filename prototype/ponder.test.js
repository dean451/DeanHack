import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updatePonder, ponderPose, ponders, REACH, INWARD, TAP, TILT, GAZE, CURL, WRITHE, FIRST_MIN, FIRST_SPAN} from './ponder.js';

const make = (name, symbol) => {
  const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 5});
  a.species = name; a.actions = createActionQueue();
  return a;
};
function frame(a, dt, t, walking = false) {
  clearActionPose(a, a.actions);
  // live.js writes the tentacle sway absolutely every frame
  a.tail.rotation.z = Math.sin(t * 3) * .24;
  updateActions(a, a.actions, dt);
  return updatePonder(a, dt, t, walking || !!a.actions.current || !!a.actions.queue.length);
}
const snap = a => [...a.arms.flatMap(r => [r.rotation.x, r.rotation.z]), a.head.rotation.x, a.head.rotation.z, a.tail.rotation.x];
// the lowest point of a part (a fingertip, a tentacle tip), in the model's own space
function lowest(a, part) {
  a.g.updateMatrixWorld(true);
  const inv = a.g.matrixWorld.clone().invert(), v = new THREE.Vector3();
  let best = null;
  part.traverse(o => {
    const p = o.geometry?.attributes?.position; if (!p) return;
    for (let i = 0; i < p.count; i += 3) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
      if (!best || v.y < best.y) best = v.clone();
    }
  });
  return best;
}

test('the ponder pose stays in bounds, moves smoothly and starts and ends at rest', () => {
  const n = 6000;
  let prev = ponderPose(0), tapLo = Infinity;
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = ponderPose(u);
    for (const v of Object.values(p)) assert(Number.isFinite(v));
    assert(p.reach >= 0 && p.reach <= REACH + 1e-12 && p.inward >= 0 && p.inward <= INWARD + 1e-12);
    assert(p.tilt >= 0 && p.tilt <= TILT + 1e-12 && p.gaze >= 0 && p.gaze <= GAZE + 1e-12);
    assert(p.curl >= 0 && p.curl <= CURL + WRITHE + 1e-12);
    for (const k of Object.keys(p)) assert(Math.abs(p[k] - prev[k]) < .02, `${k} jumps at ${u}`);
    prev = p;
    if (u > .3 && u < .7) tapLo = Math.min(tapLo, p.inward);
  }
  assert(Object.values(ponderPose(0)).every(v => v === 0) && Object.values(ponderPose(1)).every(v => v === 0));
  assert(Object.values(ponderPose(.5, 0)).every(v => v === 0) && Object.values(ponderPose(NaN)).every(v => v === 0));
  assert(tapLo < INWARD - TAP * .9, 'the fingertips tap');
  assert(ponderPose(.5).reach > REACH * .99 && ponderPose(.5).curl > CURL * .99, 'steepled, tentacles curled');
  assert(ponderPose(.96).reach < REACH * .02, 'hands back down');
});

for (const name of ['mind flayer', 'master mind flayer']) {
  test(`a standing ${name} ponders now and then, hands steepled below its tentacles, and goes back exactly to rest`, () => {
    const a = make(name, 'h');
    assert(ponders(a));
    const rest = snap(a), dt = 1 / 60;
    let t = 0, first = null, count = 0, gap = Infinity, below = Infinity;
    for (let i = 0; i < 60 * 45; i++) {
      t += dt;
      const p = frame(a, dt, t);
      if (p && first == null) first = t;
      if (p && !a.ponder.counted) { a.ponder.counted = true; count++; }
      if (!p && a.ponder) a.ponder.counted = false;
      for (const v of snap(a)) assert(Number.isFinite(v));
      if (p && p.reach > REACH * .99 && i % 6 === 0) {
        const l = lowest(a, a.arms[0]), r = lowest(a, a.arms[1]), tip = lowest(a, a.tail);
        gap = Math.min(gap, r.x - l.x);
        assert(r.x - l.x > 0, 'hands never cross');
        assert(l.z > .3 && r.z > .3, 'hands out in front of the robe');
        below = Math.min(below, tip.y - Math.max(l.y, r.y));
      }
      if (!p) snap(a).slice(0, 6).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9, `drift at ${t}`));
      if (!p) assert(Math.abs(a.tail.rotation.x - rest[6]) < 1e-9);
    }
    assert(first >= FIRST_MIN && first <= FIRST_MIN + FIRST_SPAN + dt, `first at ${first}`);
    assert(count >= 2, `pondered ${count} times`);
    assert(gap < .1, `fingertips meet (gap ${gap})`);
    assert(below > .1, `tentacles stay clear above the hands (${below})`);
  });
}

test('walking fades a ponder out and an attack blocks one', () => {
  const a = make('mind flayer', 'h'), dt = 1 / 60;
  const rest = snap(a);
  let i = 0, t = 0;
  while (!frame(a, dt, t += dt) && i++ < 60 * 12);
  for (let k = 0; k < 90; k++) frame(a, dt, t += dt);
  assert(a.ponder.cur && a.ponder.applied.reach > .1);
  for (let k = 0; k < 30; k++) frame(a, dt, t += dt, true);
  assert(!a.ponder.cur, 'faded out within half a second');
  snap(a).forEach((v, k) => assert(Math.abs(v - rest[k]) < 1e-9));
  const b = make('mind flayer', 'h');
  for (let k = 0; k < 60 * 12; k++) {
    if (!b.actions.current && !b.actions.queue.length) enqueueAction(b.actions, {kind: 'attack', dir: {x: 1, z: 0}, attack: 'tentacle'});
    assert.equal(frame(b, dt, t += dt), null);
  }
});

test('other monsters do not ponder', () => {
  for (const [name, symbol] of [['orc-captain', 'o'], ['bugbear', 'h'], ['dwarf', 'h'], ['homunculus', 'i'], ['kobold shaman', 'k']]) {
    const a = make(name, symbol);
    assert(!ponders(a), name);
    for (let k = 0; k < 60 * 15; k++) assert.equal(updatePonder(a, 1 / 60, 0, false), null);
  }
});
