import test from 'node:test';
import assert from 'node:assert/strict';
import {createHippocrates} from './hippocrates.js';
import {createMasterAssassin} from './master-assassin.js';
import {updateSerpentStaff, isSerpentStaff, flick, WEAVE} from './serpent-staff.js';

const staffGeo = a => a.weaponSocket.children.find(o => o.isMesh && o.userData.part === 'staff').geometry;
const moved = (st, pick) => {
  const p = st.geo.attributes.position.array;
  let d = 0;
  for (let i = 0; i < p.length / 3; i++) if (pick(i)) for (let j = 0; j < 3; j++) {
    assert(Number.isFinite(p[i * 3 + j]));
    d = Math.max(d, Math.abs(p[i * 3 + j] - st.rest[i * 3 + j]));
  }
  return d;
};

test('Hippocrates\' serpent weaves its head, tastes the air, fixes on the hero and settles in death', () => {
  assert.equal(isSerpentStaff(createMasterAssassin()), false);
  assert.equal(updateSerpentStaff(createMasterAssassin(), 1 / 60, 0), null);
  const a = createHippocrates(), shared = staffGeo(createHippocrates());
  const st = updateSerpentStaff(a, 0, 0);
  // the neck, head, eyes and forked tongue: never the wood
  assert.equal(st.idx.length, 390);
  assert.equal(st.tongue.reduce((s, v) => s + v, 0), 72);
  assert.notEqual(staffGeo(a), shared);
  const picked = new Set(st.idx);

  // alone: a wide weave, a few tastes a minute, the tongue in between
  let yaw = 0, tastes = 0, was = -1, inMost = 0, frames = 0;
  for (let i = 1; i <= 3600; i++) {
    updateSerpentStaff(a, 1 / 60, i / 60, null);
    yaw = Math.max(yaw, Math.abs(st.pose.yaw));
    if (st.taste >= 0 && was < 0) tastes++;
    was = st.taste;
    if (st.pose.ext < .01) inMost++;
    frames++;
  }
  assert(yaw > WEAVE * .8 && yaw <= WEAVE + 1e-9, `weave ${yaw}`);
  assert(tastes >= 6 && tastes <= 20, `tastes ${tastes}`);
  assert(inMost / frames > .7);
  const head = moved(st, i => picked.has(i));
  assert(head > .015 && head < .05, `head moved ${head}`);
  assert.equal(moved(st, i => !picked.has(i)), 0);

  // near: a narrow weave and far more tastes
  const b = createHippocrates(), sb = updateSerpentStaff(b, 0, 0);
  b.g.position.set(0, 0, 0);
  let nearYaw = 0, nearTastes = 0;
  was = -1;
  for (let i = 1; i <= 3600; i++) {
    updateSerpentStaff(b, 1 / 60, i / 60, {x: 2, z: 1});
    if (i > 300) nearYaw = Math.max(nearYaw, Math.abs(sb.pose.yaw));
    if (sb.taste >= 0 && was < 0) nearTastes++;
    was = sb.taste;
  }
  assert(nearYaw < yaw * .5, `near weave ${nearYaw}`);
  assert(nearTastes > tastes * 1.5, `near tastes ${nearTastes} vs ${tastes}`);

  // bad input stays finite
  updateSerpentStaff(a, NaN, NaN, {x: NaN, z: 0});
  updateSerpentStaff(a, 5, 1e6, null);
  moved(st, () => true);

  // stone holds
  a.stone = true;
  const before = Float32Array.from(st.geo.attributes.position.array);
  updateSerpentStaff(a, 1 / 60, 3);
  assert.deepEqual(st.geo.attributes.position.array, before);
  a.stone = false;

  // death: back to the built shape exactly, the tongue lolling out, then left alone
  a.actions = {dead: true};
  for (let i = 0; i < 600; i++) updateSerpentStaff(a, 1 / 60, 70 + i / 60);
  assert(st.settled);
  assert.equal(moved(st, () => true), 0);

  // a flick goes out and comes back
  assert.equal(flick(0, 3), 0);
  assert.equal(flick(1, 3), 0);
  assert(flick(1 / 6, 3) > .99);
  assert(flick(1 / 3, 3) < .01);
});
