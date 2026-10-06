import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {updateCubeDrift, driftPose, drifts, stepDrag, YAW, TILT, BOB, DRAG_TIP, OVERSHOOT} from './cube-drift.js';

const cube = () => createCreature({name: 'gelatinous cube', symbol: 98, color: 6});
const remains = a => { let r; a.g.traverse(o => { if (o.userData.part === 'remains') r = o; }); return r; };

// every vertex of the remains, in the cube's body space
function extent(a) {
  const r = remains(a);
  r.updateMatrix();
  const p = r.geometry.attributes.position, v = new THREE.Vector3();
  const b = {x: 0, lo: Infinity, hi: -Infinity};
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(r.matrix);
    assert.ok(Number.isFinite(v.x + v.y + v.z));
    b.x = Math.max(b.x, Math.abs(v.x), Math.abs(v.z)); b.lo = Math.min(b.lo, v.y); b.hi = Math.max(b.hi, v.y);
  }
  return b;
}

test('only the gelatinous cube drifts', () => {
  assert.ok(drifts(cube()));
  for (const name of ['acid blob', 'brown pudding', 'monk', 'jackal'])
    assert.equal(updateCubeDrift(createCreature({name, symbol: 98, color: 2}), 1 / 60, 1, false), null, name);
});

test('the pose is bounded and slow', () => {
  for (let t = 0; t < 200; t += .37) {
    const p = driftPose(t, 1.3, 0);
    assert.ok(Math.abs(p.yaw) <= YAW + 1e-9 && Math.abs(p.tx) <= TILT + 1e-9 && Math.abs(p.bob) <= BOB + 1e-9);
    // glide, not snap: the yaw never turns faster than ~0.3 rad/s
    assert.ok(Math.abs(driftPose(t + .01, 1.3).yaw - p.yaw) / .01 < .3);
  }
  const p = driftPose(NaN, 0, 5);
  assert.ok(Object.values(p).every(Number.isFinite));
});

test('the remains stay inside the jelly, trail while moving and settle when it stops', () => {
  const a = cube(), r = remains(a), dt = 1 / 30;
  let t = 0, tipped = 0;
  for (let i = 0; i < 30 * 90; i++, t += dt) {
    const walking = (i % 300) < 60;
    const p = updateCubeDrift(a, dt, t, walking);
    if (walking && i % 300 === 59) tipped = Math.max(tipped, -p.tx);
    if (i % 15 === 0) {
      const b = extent(a);
      assert.ok(b.x < .245, `x ${b.x}`);
      assert.ok(b.lo > .01 && b.hi < .49, `y ${b.lo}..${b.hi}`);
    }
  }
  assert.ok(tipped > DRAG_TIP * .7 - TILT, 'drags back while moving');
  // standing still, the drag dies away to nothing
  for (let i = 0; i < 90; i++, t += dt) updateCubeDrift(a, dt, t, false);
  assert.ok(a.cubeDrift.drag < 1e-3);
  // and the mesh is actually moving over time
  const q0 = r.quaternion.clone();
  for (let i = 0; i < 60; i++, t += dt) updateCubeDrift(a, dt, t, false);
  assert.ok(r.quaternion.angleTo(q0) > .01);
});

test('a dead cube lets the remains settle', () => {
  const a = cube();
  for (let i = 0; i < 60; i++) updateCubeDrift(a, 1 / 30, i / 30, true);
  assert.ok(a.cubeDrift.drag > .9);
  a.actions = {dead: true};
  for (let i = 60; i < 180; i++) updateCubeDrift(a, 1 / 30, i / 30, true);
  assert.ok(a.cubeDrift.drag < 1e-3);
});

test('when the cube stops, the remains swing forward past rest and wobble back', () => {
  const st = {drag: 0, vel: 0};
  for (let i = 0; i < 120; i++) stepDrag(st, 1, 1 / 60);
  assert.ok(st.drag > .9 && st.drag < 1.2, 'builds to full drag');
  let low = 0, max = 0;
  for (let i = 0; i < 240; i++) { stepDrag(st, 0, 1 / 60); low = Math.min(low, st.drag); max = Math.max(max, st.drag); assert.ok(Number.isFinite(st.drag)); }
  assert.ok(low < -.05, `overshoots forward (${low})`);
  assert.ok(driftPose(1, 0, low).tx > driftPose(1, 0, 0).tx, 'the tip leans forward');
  assert.ok(Math.abs(driftPose(1, 0, -9).tx - driftPose(1, 0, -OVERSHOOT).tx) < 1e-12, 'the swing is capped');
  assert.equal(st.drag, 0);
  assert.equal(st.vel, 0);
});
