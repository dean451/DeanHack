import test from 'node:test';
import assert from 'node:assert/strict';
import {createCarnarvon} from './carnarvon.js';
import {updateFlap, isFlap, FLAPS} from './puggaree-flap.js';

const headGeo = a => a.head.children.find(o => o.isMesh && o.userData.part === 'head').geometry;
// mean offset of the tail's bottom vertices (head space)
function bottom(a) {
  const st = a.clothFlap, p = st.geo.attributes.position.array, o = {x: 0, y: 0, z: 0};
  let n = 0;
  for (let k = 0; k < st.idx.length; k++) {
    if (st.loc[k * 3 + 1] > -.04) continue;
    const j = st.idx[k] * 3;
    o.x += p[j] - st.rest[j]; o.y += p[j + 1] - st.rest[j + 1]; o.z += p[j + 2] - st.rest[j + 2]; n++;
  }
  return {x: o.x / n, y: o.y / n, z: o.z / n};
}
function maxShift(a, moving) {
  const st = a.clothFlap, p = st.geo.attributes.position.array, tail = new Set(st.idx);
  let d = 0;
  for (let i = 0; i < p.length; i++) {
    assert(Number.isFinite(p[i]));
    if (tail.has(Math.floor(i / 3)) === moving) d = Math.max(d, Math.abs(p[i] - st.rest[i]));
  }
  return d;
}

test('Carnarvon\'s puggaree lifts out on a walk, swings across, taps back, stirs in the draught and settles in death', () => {
  const a = createCarnarvon(), b = createCarnarvon();
  a.actions = {dead: false};
  assert(isFlap(a));
  const shared = headGeo(a);
  const st = updateFlap(a, 1 / 60, 0);
  assert.equal(st.idx.length, 36, 'only the tail box (36 corners) moves');
  assert.notEqual(headGeo(a), shared, 'geometry is cloned');
  assert.equal(headGeo(b), shared, 'other copies untouched');
  let t = 0;
  const run = (n, dx, dz, f) => { for (let i = 0; i < n; i++) { t += 1 / 60; a.g.position.x += dx / 60; a.g.position.z += dz / 60; updateFlap(a, 1 / 60, t); f?.(); } };
  // standing: the draught stirs it a little
  let stir = 0;
  run(600, 0, 0, () => { stir = Math.max(stir, Math.hypot(bottom(a).x, bottom(a).z)); });
  assert(stir > .001 && stir < .02, `draught stir ${stir}`);
  // walking forward (+z, facing +z): the bottom lifts out behind the helmet
  let back = 0;
  run(90, 0, 1.2, () => { back = Math.min(back, bottom(a).z); });
  assert(back < -.03 && back > -.08, `lifts out behind: ${back}`);
  assert(st.lift > .3 && st.lift < FLAPS['lord carnarvon'].lag * 1.4);
  // the stop: it swings back past rest, but the helmet holds it
  let tap = 9;
  run(60, 0, 0, () => { tap = Math.min(tap, st.lift); });
  assert(tap < 0 && tap >= -FLAPS['lord carnarvon'].inward, `taps back: ${tap}`);
  // sideways (+x): the bottom trails to -x
  let side = 0;
  run(60, 1.2, 0, () => { side = Math.min(side, bottom(a).x); });
  assert(side < -.02, `swings across: ${side}`);
  assert.equal(maxShift(a, false), 0, 'the rest of the head stays put');
  // a jump doesn't fling it
  run(120, 0, 0);
  a.g.position.z += 30; updateFlap(a, 1 / 60, t += 1 / 60);
  assert(Math.abs(st.lift) < .3, `no fling: ${st.lift}`);
  // NaN and huge dt stay finite
  updateFlap(a, NaN, NaN); updateFlap(a, 5, t);
  maxShift(a, true);
  // stone holds
  a.stone = true;
  const frozen = Float32Array.from(st.geo.attributes.position.array);
  run(30, 0, 1.2);
  assert.deepEqual(Float32Array.from(st.geo.attributes.position.array), frozen);
  a.stone = false;
  // death eases out to the exact rest shape
  a.actions.dead = true;
  run(900, 0, 0);
  assert.equal(maxShift(a, true), 0);
  assert(st.settled);
});
