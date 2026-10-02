import test from 'node:test';
import assert from 'node:assert/strict';
import {createDarkOne} from './dark-one.js';
import {createPelias} from './pelias.js';
import {createCharon} from './charon.js';
import {createMasterAssassin} from './master-assassin.js';
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

test('Pelias\'s bearskin hem and kilt strips swing heavy from the belt and settle in death', () => {
  const a = createPelias(), P = HEMS.pelias;
  a.actions = {dead: false};
  assert(isHemSway(a));
  updateHemSway(a, 1 / 60, 0);
  const st = a.hemSway, p = st.geo.attributes.position.array;
  // the cloak hem (knee) and the kilt strips' ends move; the torso and belt don't
  const at = (lo, hi) => { let d = 0; for (let i = 1; i < p.length; i += 3) if (st.rest[i] >= lo && st.rest[i] < hi) d = Math.max(d, Math.hypot(p[i - 1] - st.rest[i - 1], p[i] - st.rest[i], p[i + 1] - st.rest[i + 1])); return d; };
  const hemZ = () => { let s = 0, n = 0; for (const i of st.idx) if (st.rest[i * 3 + 1] < .28) { s += p[i * 3 + 2] - st.rest[i * 3 + 2]; n++; } return s / n; };
  let t = 0, minZ = 0, maxZ = -1;
  for (let i = 0; i < 90; i++) { t += 1 / 60; a.g.position.z += 1.2 / 60; updateHemSway(a, 1 / 60, t); minZ = Math.min(minZ, hemZ()); }
  assert(minZ < -.03 && minZ > -P.lag * 1.6, `cloak hem trails: ${minZ}`);
  assert(at(.34, .42) > .005, 'kilt strip ends swing');
  for (let i = 0; i < 90; i++) { t += 1 / 60; updateHemSway(a, 1 / 60, t); maxZ = Math.max(maxZ, hemZ()); }
  assert(maxZ > .004, `hem swings past: ${maxZ}`);
  for (let i = 0; i < 400; i++) { t += 1 / 60; updateHemSway(a, 1 / 60, t); }
  const stir = at(0, P.top);
  assert(stir > .001 && stir < .02, `wind stir ${stir}`);
  assert.equal(at(P.top, 9), 0, 'nothing above the belt moves');
  a.actions.dead = true;
  for (let i = 0; i < 600; i++) { t += 1 / 60; updateHemSway(a, 1 / 60, t); }
  assert.equal(at(-9, 9), 0);
  assert(st.settled);
});

test('Charon\'s soaked robe drags heavy, barely lifts, laps while he stands and settles in death', () => {
  const a = createCharon(), P = HEMS.charon;
  a.actions = {dead: false};
  assert(isHemSway(a));
  updateHemSway(a, 1 / 60, 0);
  const st = a.hemSway, p = st.geo.attributes.position.array;
  const at = (lo, hi) => { let d = 0; for (let i = 1; i < p.length; i += 3) if (st.rest[i] >= lo && st.rest[i] < hi) d = Math.max(d, Math.hypot(p[i - 1] - st.rest[i - 1], p[i] - st.rest[i], p[i + 1] - st.rest[i + 1])); return d; };
  const lift = () => { let d = 0; for (let i = 1; i < p.length; i += 3) d = Math.max(d, p[i] - st.rest[i]); return d; };
  let t = 0, minZ = 0, maxZ = -1, up = 0;
  for (let i = 0; i < 90; i++) { t += 1 / 60; a.g.position.z += 1.2 / 60; updateHemSway(a, 1 / 60, t); minZ = Math.min(minZ, trailZ(a)); up = Math.max(up, lift()); }
  assert(minZ < -.025 && minZ > -P.lag * 1.6, `robe drags: ${minZ}`);
  assert(up < .005, `sodden hem barely lifts: ${up}`);
  for (let i = 0; i < 120; i++) { t += 1 / 60; updateHemSway(a, 1 / 60, t); maxZ = Math.max(maxZ, trailZ(a)); }
  assert(maxZ > .002 && maxZ < .012, `a small swing past: ${maxZ}`);
  for (let i = 0; i < 400; i++) { t += 1 / 60; updateHemSway(a, 1 / 60, t); }
  const lap = at(0, P.top);
  assert(lap > .002 && lap < .015, `current laps the hem: ${lap}`);
  assert(at(.42, P.top) < .001, 'the purse at the girdle stays put');
  assert.equal(at(P.top, 9), 0, 'nothing above the girdle moves');
  a.actions.dead = true;
  for (let i = 0; i < 600; i++) { t += 1 / 60; updateHemSway(a, 1 / 60, t); }
  assert.equal(at(-9, 9), 0);
  assert(st.settled);
});

test('the Master Assassin\'s half-cape snaps out behind, whips past, stirs while he stands and settles in death', () => {
  const a = createMasterAssassin(), P = HEMS['master assassin'];
  a.actions = {dead: false};
  assert(isHemSway(a));
  updateHemSway(a, 1 / 60, 0);
  const st = a.hemSway, p = st.geo.attributes.position.array;
  // only the cape's two lowest rings: on his left and back, well out from the hips, vials and baldrics
  assert.equal(st.idx.length, 252);
  for (const i of st.idx) {
    const x = st.rest[i * 3], y = st.rest[i * 3 + 1], z = st.rest[i * 3 + 2];
    assert(x < .001 && y < .5 && Math.hypot(x, (z + .012) / .85) > .179, `cape vertex ${x} ${y} ${z}`);
  }
  const picked = new Set(st.idx);
  const others = () => { let d = 0; for (let i = 0; i < p.length / 3; i++) if (!picked.has(i)) d = Math.max(d, Math.abs(p[i * 3] - st.rest[i * 3]) + Math.abs(p[i * 3 + 1] - st.rest[i * 3 + 1]) + Math.abs(p[i * 3 + 2] - st.rest[i * 3 + 2])); return d; };
  const capeD = () => { let d = 0; for (const i of st.idx) { const j = i * 3; d = Math.max(d, Math.hypot(p[j] - st.rest[j], p[j + 1] - st.rest[j + 1], p[j + 2] - st.rest[j + 2])); } return d; };
  const pointsZ = () => { let s = 0, n = 0; for (const i of st.idx) if (st.rest[i * 3 + 1] < .36) { s += p[i * 3 + 2] - st.rest[i * 3 + 2]; n++; } return s / n; };
  let t = 0, minZ = 0, maxZ = -1;
  for (let i = 0; i < 90; i++) { t += 1 / 60; a.g.position.z += 1.2 / 60; updateHemSway(a, 1 / 60, t); minZ = Math.min(minZ, pointsZ()); }
  assert(minZ < -.03 && minZ > -P.lag * 1.6, `cape snaps out behind: ${minZ}`);
  for (let i = 0; i < 90; i++) { t += 1 / 60; updateHemSway(a, 1 / 60, t); maxZ = Math.max(maxZ, pointsZ()); }
  assert(maxZ > .008, `cape whips past: ${maxZ}`);
  for (let i = 0; i < 400; i++) { t += 1 / 60; updateHemSway(a, 1 / 60, t); }
  const stir = capeD();
  assert(stir > .001 && stir < .02, `draught stirs the cape: ${stir}`);
  assert.equal(others(), 0, 'the rest of the body stays put');
  a.actions.dead = true;
  for (let i = 0; i < 600; i++) { t += 1 / 60; updateHemSway(a, 1 / 60, t); }
  assert.equal(capeD(), 0);
  assert(st.settled);
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
