import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {holdShape, holdOf, createHold, GRIP_MS, LET_GO_MS, STRANDS, STRAND_BEADS} from './hold.js';

const finite = sh => sh.beads.every(b => Object.values(b).every(Number.isFinite));
const frame = (x, z, stuck) => ({player: stuck ? {x, z, stuck} : {x, z}, cells: []});

test('holdOf reads the frame and ignores bad fields', () => {
  assert.deepEqual(holdOf({x: 5, z: 5, stuck: {x: 6, z: 4, holding: false}}), {dx: 1, dz: -1, holding: false});
  assert.equal(holdOf({x: 5, z: 5, stuck: {x: 6, z: 4, holding: true}}).holding, true);
  assert.equal(holdOf({x: 5, z: 5}), null);
  assert.equal(holdOf({x: 5, z: 5, stuck: {x: NaN, z: 4}}), null);
  assert.equal(holdOf(null), null);
});

test('strands shoot across, tug, and snap back to nothing', () => {
  for (const holding of [false, true]) for (const [dx, dz] of [[1, 0], [-1, 1], [0, -1]]) {
    const h = {dx, dz, holding, startAt: 1000};
    assert.equal(holdShape(h, 999), null);
    const first = holdShape(h, 1000);
    assert.ok(first.beads.every(b => b.r < .02));
    let sags = [];
    for (let t = 1000; t < 4000; t += 7) {
      const sh = holdShape(h, t);
      assert.ok(finite(sh));
      assert.ok(sh.grip >= 0 && sh.grip <= 1 && sh.tug >= 0 && sh.tug <= 1);
      for (const b of sh.beads) {
        assert.ok(b.y > .1 && b.y < .45, `y ${b.y}`);
        assert.ok(b.r > 0 && b.r < .025);
        assert.ok(Math.abs(b.x) <= 1 && Math.abs(b.z) <= 1);
      }
      if (t > 1000 + GRIP_MS) {
        assert.equal(sh.beads.length, STRANDS * STRAND_BEADS);
        sags.push(Math.min(...sh.beads.map(b => b.y)));
      }
    }
    // The tug changes the sag.
    assert.ok(Math.max(...sags) - Math.min(...sags) > .02);
    // Held strands start at the holder; holding strands start at the hero.
    const full = holdShape(h, 1000 + GRIP_MS + 10).beads[0];
    const toOther = Math.hypot(full.x - dx, full.z - dz), toHero = Math.hypot(full.x, full.z);
    assert.ok(holding ? toHero < toOther : toOther < toHero);
    h.endAt = 5000;
    const mid = holdShape(h, 5000 + LET_GO_MS * .5);
    assert.ok(mid.grip < .6 && finite(mid));
    assert.equal(holdShape(h, 5000 + LET_GO_MS), null);
  }
  assert.equal(holdShape({dx: 0, dz: 0, startAt: 0}, 10), null);
});

test('createHold follows the frame and lets go', () => {
  const group = new THREE.Group();
  const hold = createHold(THREE, group);
  const mesh = group.children.find(c => c.userData.part === 'hold-strands');
  hold.frame(frame(5, 5));
  assert.equal(hold.update(.1, {x: 0, z: 0}).held, false);
  hold.frame(frame(5, 5, {x: 6, z: 5, holding: false}));
  let r = hold.update(.5, {x: 0, z: 0});
  assert.equal(r.held, true);
  assert.equal(r.beads, STRANDS * STRAND_BEADS);
  // Drawn at the hero's tile relative to the origin.
  const m = new THREE.Matrix4(), p = new THREE.Vector3();
  mesh.getMatrixAt(0, m); p.setFromMatrixPosition(m);
  assert.ok(p.x > 5 && p.x < 6.1 && Math.abs(p.z - 5) < .2);
  // The coil hides the strands.
  assert.equal(hold.update(.01, {x: 0, z: 0}, {skip: true}).beads, 0);
  // Displaced hero stays held.
  hold.frame(frame(4, 5, {x: 5, z: 5, holding: false}));
  assert.equal(hold.state.dx, 1);
  assert.equal(hold.state.endAt, undefined);
  // The field going away lets go.
  hold.frame(frame(4, 5));
  assert.ok(hold.update(LET_GO_MS / 2000, {x: 0, z: 0}).held);
  assert.equal(hold.update(LET_GO_MS / 1000, {x: 0, z: 0}).held, false);
  assert.equal(hold.state, null);
  assert.equal(mesh.count, 0);
  hold.frame(frame(4, 5, {x: 5, z: 6, holding: true}));
  hold.update(.3);
  hold.clear();
  assert.equal(hold.state, null);
  assert.equal(mesh.count, 0);
  hold.dispose();
  assert.equal(group.children.length, 0);
});
