import test from 'node:test';
import assert from 'node:assert/strict';
import {createDarkOne} from './dark-one.js';
import {updateHemSway, isHemSway, HEMS} from './hem-sway.js';

const bodyGeo = a => a.body.children.find(o => o.isMesh && o.userData.part === 'body').geometry;
function shift(a) {
  const st = a.hemSway, p = st.geo.attributes.position.array;
  let d = 0, up = 0;
  for (let i = 0; i < p.length; i++) {
    const v = Math.abs(p[i] - st.rest[i]);
    assert(Number.isFinite(p[i]));
    d = Math.max(d, v);
    if (i % 3 === 1 && st.rest[i] >= HEMS['dark one'].top) up = Math.max(up, v);
  }
  return {d, up};
}
// mean trail of the lowest vertices along body z (forward)
function trailZ(a) {
  const st = a.hemSway, p = st.geo.attributes.position.array;
  let s = 0, n = 0;
  for (const i of st.idx) if (st.rest[i * 3 + 1] < .06) { s += p[i * 3 + 2] - st.rest[i * 3 + 2]; n++; }
  return s / n;
}

test('the Dark One\'s hem trails a glide, swings past on the stop, crawls while still and settles in death', () => {
  const a = createDarkOne(), b = createDarkOne();
  a.actions = {dead: false};
  assert(isHemSway(a));
  const shared = bodyGeo(a);
  updateHemSway(a, 1 / 60, 0);
  assert.notEqual(bodyGeo(a), shared, 'geometry is cloned');
  assert.equal(bodyGeo(b), shared, 'other copies untouched');
  let t = 0;
  // glide forward (+z, facing +z) at 1.2 units/s for 1.5 s
  let minZ = 0;
  for (let i = 0; i < 90; i++) { t += 1 / 60; a.g.position.z += 1.2 / 60; updateHemSway(a, 1 / 60, t); minZ = Math.min(minZ, trailZ(a)); }
  assert(minZ < -.012, `hem trails behind: ${minZ}`);
  // the stop: it swings on past
  let maxZ = -1;
  for (let i = 0; i < 60; i++) { t += 1 / 60; updateHemSway(a, 1 / 60, t); maxZ = Math.max(maxZ, trailZ(a)); }
  assert(maxZ > .002, `hem swings past: ${maxZ}`);
  // standing: the lag dies away but the crawl goes on
  for (let i = 0; i < 300; i++) { t += 1 / 60; updateHemSway(a, 1 / 60, t); }
  assert(Math.hypot(a.hemSway.lx, a.hemSway.lz) < 1e-3);
  const still = shift(a);
  assert(still.d > .002 && still.d < .03, `crawl ${still.d}`);
  assert.equal(still.up, 0, 'nothing above the hem moves');
  // a jump across the map doesn't fling it
  a.g.position.x += 40; t += 1 / 60; updateHemSway(a, 1 / 60, t);
  assert(Math.hypot(a.hemSway.lx, a.hemSway.lz) < 1e-3);
  // death: eases out and goes back to rest
  a.actions.dead = true;
  for (let i = 0; i < 600; i++) { t += 1 / 60; updateHemSway(a, 1 / 60, t); }
  assert.equal(shift(a).d, 0);
  assert(a.hemSway.settled);
  // bad input stays finite
  a.actions.dead = false;
  updateHemSway(a, NaN, NaN); updateHemSway(a, 5, 1e6);
  shift(a);
  // the mesh disposes its clone with the actor
  assert.equal(typeof a.body.children.find(o => o.userData.part === 'body').userData.dispose, 'function');
});

test('stone holds the hem and other actors are ignored', () => {
  const a = createDarkOne();
  updateHemSway(a, 1 / 60, 1);
  const snap = Float32Array.from(a.hemSway.geo.attributes.position.array);
  a.stone = true;
  updateHemSway(a, 1 / 60, 3);
  assert.deepEqual(Float32Array.from(a.hemSway.geo.attributes.position.array), snap);
  assert.equal(updateHemSway({kind: 'jackal', body: {}, g: {}}, 1 / 60, 0), null);
});
