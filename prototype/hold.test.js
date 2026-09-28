import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {holdShape, holdOf, holdTint, createHold, GRIP_MS, LET_GO_MS, STRANDS, STRAND_BEADS, HOLD_TINT,
  DRIP_MS, DRIP_SWELL, DRIP_R, DRIP_FLOOR, PUDDLE_R, PUDDLE_FLAT, holdSqueeze, poseHeld, SQUEEZE, SQUEEZE_ROLL} from './hold.js';

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

test('strands lean toward the sticky end glyph colour and ease between tints', () => {
  const mon = (x, z, color, extra = {}) => ({x, z, kind: 'monster', color, visible: true, ...extra});
  // Brown owlbear (CLR_BROWN) vs bright green lichen (CLR_BRIGHT_GREEN): different, both off the base.
  const brown = holdTint([mon(6, 5, 3)], 6, 5), green = holdTint([mon(6, 5, 10)], 6, 5);
  assert.notEqual(brown, green);
  assert.notEqual(brown, HOLD_TINT);
  for (const c of [brown, green]) assert.ok(Number.isInteger(c) && c >= 0 && c <= 0xffffff);
  // Green channel dominates the lichen's strands.
  assert.ok(((green >> 8) & 255) > ((green >> 16) & 255));
  // Nothing to read keeps the plain tint.
  assert.equal(holdTint(null, 6, 5), HOLD_TINT);
  assert.equal(holdTint([mon(7, 5, 3)], 6, 5), HOLD_TINT);
  assert.equal(holdTint([mon(6, 5, 8)], 6, 5), HOLD_TINT);
  assert.equal(holdTint([mon(6, 5, 3, {visible: false})], 6, 5), HOLD_TINT);
  assert.equal(holdTint([{x: 6, z: 5, kind: 'object', color: 3}], 6, 5), HOLD_TINT);
  assert.equal(holdTint([{x: 6, z: 5, kind: 'pet', color: 3}], 6, 5), brown);

  const group = new THREE.Group();
  const hold = createHold(THREE, group);
  // Held by the brown thing east of the hero: starts in its colour at once.
  hold.frame({player: {x: 5, z: 5, stuck: {x: 6, z: 5}}, cells: [mon(6, 5, 3), mon(5, 5, 15)]});
  assert.equal(hold.tint, brown);
  const near = (a, b) => [16, 8, 0].every(sh => Math.abs(((a >> sh) & 255) - ((b >> sh) & 255)) <= 2);
  assert.ok(near(hold.color, brown));
  hold.update(.1, {x: 0, z: 0});
  // The displayed glyph changes colour (hallucination): ease, don't snap.
  hold.frame({player: {x: 5, z: 5, stuck: {x: 6, z: 5}}, cells: [mon(6, 5, 10)]});
  assert.equal(hold.tint, green);
  hold.update(1 / 60, {x: 0, z: 0});
  assert.ok(!near(hold.color, green) && !near(hold.color, brown));
  for (let i = 0; i < 120; i++) hold.update(1 / 60, {x: 0, z: 0});
  assert.ok(near(hold.color, green));
  // Holding: the hero's own glyph is the sticky end.
  hold.frame({player: {x: 5, z: 5, stuck: {x: 5, z: 6, holding: true}}, cells: [mon(5, 5, 3), mon(5, 6, 10)]});
  assert.equal(hold.tint, brown);
  hold.clear();
  assert.equal(hold.tint, HOLD_TINT);
  assert.ok(near(hold.color, HOLD_TINT));
  hold.dispose();
});

test('glue drops swell under the strands, fall to the floor, and stop when the hold breaks', () => {
  const h = {dx: 1, dz: 0, holding: false, startAt: 0};
  // Nothing drips while the strands are still shooting across.
  assert.equal(holdShape(h, GRIP_MS - 1).drips.length, 0);
  let fell = false, swelled = false, maxN = 0;
  for (let t = GRIP_MS; t < GRIP_MS + 3 * DRIP_MS; t += 7) {
    const sh = holdShape(h, t);
    maxN = Math.max(maxN, sh.drips.length);
    assert.ok(sh.drips.length <= STRANDS);
    for (const d of sh.drips) {
      assert.ok(Object.values(d).every(Number.isFinite));
      assert.ok(d.r >= 0 && d.r <= DRIP_R + 1e-9);
      assert.ok(d.y >= DRIP_FLOOR - 1e-9 && d.y < .4, `drop at y ${d.y}`);
      // Under the strands, between the two tiles.
      assert.ok(d.x > .1 && d.x < .8 && Math.abs(d.z) < .15);
      if (d.y < .05) fell = true;
      if (d.r > DRIP_R * .9) swelled = true;
    }
  }
  assert.equal(maxN, STRANDS);
  assert.ok(fell && swelled);
  // Breaking the hold: swelling drops vanish, a falling one keeps falling.
  const tBreak = GRIP_MS + DRIP_MS * (DRIP_SWELL + .1);
  const before = holdShape(h, tBreak).drips;
  const after = holdShape({...h, endAt: tBreak}, tBreak + 30).drips;
  assert.ok(after.length >= 1 && after.length < before.length);
  assert.ok(after.every(d => d.y < .3));
  // The fall is shorter than the let-go, so that drop lands before the strands are gone.
  assert.ok(DRIP_MS * (1 - DRIP_SWELL) < LET_GO_MS);
  const late = holdShape({...h, endAt: tBreak}, tBreak + DRIP_MS * (1 - DRIP_SWELL) * .9);
  assert.ok(late.drips.length <= 1 && late.drips.every(d => d.y < .06));
  assert.equal(holdShape({...h, endAt: tBreak}, tBreak + LET_GO_MS), null);
  // Drawn with the strands, and hidden with them under the coil.
  const group = new THREE.Group();
  const hold = createHold(THREE, group);
  hold.frame(frame(5, 5, {x: 6, z: 5, holding: false}));
  const r = hold.update((GRIP_MS + DRIP_MS * 2) / 1000, {x: 0, z: 0});
  assert.equal(r.beads, STRANDS * STRAND_BEADS);
  assert.ok(r.drips >= 1 && r.drips <= STRANDS);
  assert.equal(hold.update(.01, {x: 0, z: 0}, {skip: true}).drips, 0);
  hold.dispose();
});

test('landed drops splat into puddles that spread, then shrink away as the hold breaks', () => {
  const h = {dx: 1, dz: -1, holding: false, startAt: 0};
  // No puddle before the first drop lands.
  assert.equal(holdShape(h, GRIP_MS + DRIP_MS - 1).puddles.length, 0);
  const sizes = [], dripsAt = [];
  let prev = null, maxStep = 0;
  for (let t = GRIP_MS; t < GRIP_MS + 8 * DRIP_MS; t += 4) {
    const sh = holdShape(h, t);
    assert.ok(sh.puddles.length <= STRANDS);
    for (const pd of sh.puddles) {
      assert.ok(Object.values(pd).every(Number.isFinite));
      assert.ok(pd.r > 0 && pd.r <= PUDDLE_R + 1e-9, `r ${pd.r}`);
      // Under the strands, between the two tiles.
      assert.ok(pd.x > .1 && pd.x < .8 && pd.z < -.1 && pd.z > -.8, `at ${pd.x},${pd.z}`);
    }
    // Every puddle sits under a strand's drop (same x, z as the drop that made it).
    for (const d of sh.drips) dripsAt.push([d.x, d.z]);
    const first = sh.puddles[0]?.r ?? 0;
    // Puddles only grow while the hold lasts, smoothly.
    if (prev != null) { assert.ok(first >= prev - 1e-12); maxStep = Math.max(maxStep, first - prev); }
    prev = first; sizes.push(first);
  }
  assert.equal(holdShape(h, GRIP_MS + 8 * DRIP_MS).puddles.length, STRANDS);
  for (const pd of holdShape(h, GRIP_MS + 8 * DRIP_MS).puddles)
    assert.ok(dripsAt.some(([x, z]) => Math.abs(x - pd.x) < 1e-9 && Math.abs(z - pd.z) < 1e-9));
  assert.ok(maxStep < .01, `splat step ${maxStep}`);
  // Each drop spreads it wider, and it nears the cap.
  assert.ok(sizes.at(-1) > PUDDLE_R * .8 && sizes.at(-1) > sizes[Math.floor(sizes.length / 3)] + .005);
  // Breaking the hold: puddles shrink to nothing by the end of the let-go.
  const tBreak = GRIP_MS + 5 * DRIP_MS + 100;
  const broke = {...h, endAt: tBreak};
  // (A drop already falling at the break may still land and spread it a little on the way.)
  let last = holdShape(broke, tBreak).puddles[0].r, start = last;
  for (let t = tBreak; t < tBreak + LET_GO_MS; t += 4) {
    const r = Math.max(0, ...holdShape(broke, t).puddles.map(pd => pd.r));
    assert.ok(Math.abs(r - last) < .01 && r <= start + .01, `smooth fade ${r}`);
    last = r;
  }
  assert.ok(last < .002);
  assert.equal(holdShape(broke, tBreak + LET_GO_MS), null);
  // A drop that fell before the break still adds to its puddle; no later drop does.
  const endN = holdShape(broke, tBreak).puddles.map(pd => pd.r);
  assert.ok(endN.every(r => r > 0));
  // Drawn flat on the floor with the strands, and hidden with them under the coil.
  const group = new THREE.Group();
  const hold = createHold(THREE, group);
  const mesh = group.children.find(c => c.userData.part === 'hold-strands');
  hold.frame(frame(5, 5, {x: 6, z: 4, holding: false}));
  const r = hold.update((GRIP_MS + DRIP_MS * 4) / 1000, {x: 0, z: 0});
  assert.equal(r.puddles, STRANDS);
  assert.equal(r.beads, STRANDS * STRAND_BEADS);
  assert.equal(mesh.count, r.beads + r.drips + r.puddles);
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  mesh.getMatrixAt(mesh.count - 1, m); m.decompose(p, q, sc);
  assert.ok(Math.abs(p.y - sc.y * .5) < 1e-9 && sc.y < .01 && Math.abs(sc.y - sc.x * PUDDLE_FLAT) < 1e-9);
  assert.equal(hold.update(.01, {x: 0, z: 0}, {skip: true}).puddles, 0);
  hold.dispose();
});

test('a held hero is squeezed and struggles, then returns to rest; a holding hero is not', () => {
  assert.equal(holdSqueeze({dx: 1, dz: 0, holding: true, startAt: 0}, 1000), null);
  const h = {dx: 1, dz: 0, holding: false, startAt: 1000, endAt: 5000};
  assert.equal(holdSqueeze(h, 999), null);
  let prev = null, maxStep = 0, minSx = 1, maxRoll = 0, minRoll = 0;
  for (let t = 1000; t < 5000 + LET_GO_MS + 50; t += 4) {
    const q = holdSqueeze(h, t);
    if (t >= 5000 + LET_GO_MS) { assert.equal(q, null); continue; }
    assert.ok([q.sx, q.sy, q.roll].every(Number.isFinite));
    assert.ok(q.sx >= 1 - SQUEEZE - 1e-9 && q.sx <= 1 && q.sy >= 1 && q.sy <= 1 + SQUEEZE);
    assert.ok(Math.abs(q.roll) <= SQUEEZE_ROLL + 1e-9);
    if (prev) maxStep = Math.max(maxStep, Math.abs(q.sx - prev.sx), Math.abs(q.roll - prev.roll));
    minSx = Math.min(minSx, q.sx); maxRoll = Math.max(maxRoll, q.roll); minRoll = Math.min(minRoll, q.roll);
    prev = q;
  }
  assert.ok(minSx < 1 - SQUEEZE * .8, `squeezes (${minSx})`);
  assert.ok(maxRoll > SQUEEZE_ROLL * .8 && minRoll < -SQUEEZE_ROLL * .8, 'rocks both ways');
  assert.ok(maxStep < .01, `smooth (${maxStep})`);
  // Nearly at rest just before the strands vanish.
  const end = holdSqueeze(h, 5000 + LET_GO_MS - 4);
  assert.ok(Math.abs(end.sx - 1) < .005 && Math.abs(end.roll) < .005);
});

test('poseHeld stacks with other scale and roll and comes off exactly', () => {
  const actor = {g: new THREE.Group()};
  actor.g.scale.set(1.2, .9, 1.2); actor.g.rotation.z = .1;
  for (const pose of [{sx: .93, sy: 1.03, roll: .05}, {sx: .95, sy: 1.02, roll: -.04}, {sx: NaN, sy: 1, roll: 0}])
    poseHeld(actor, pose);
  assert.equal(actor.holdPose, null);
  poseHeld(actor, {sx: .92, sy: 1.04, roll: .06});
  assert.ok(Math.abs(actor.g.scale.x - 1.2 * .92) < 1e-9 && Math.abs(actor.g.rotation.z - .16) < 1e-9);
  poseHeld(actor, null);
  assert.ok(Math.abs(actor.g.scale.x - 1.2) < 1e-9 && Math.abs(actor.g.scale.y - .9) < 1e-9 && Math.abs(actor.g.rotation.z - .1) < 1e-9);
  poseHeld({}, {sx: 1, sy: 1, roll: 0});
});

test('createHold reports a squeeze only while held and not skipped', () => {
  const parent = new THREE.Group(), hold = createHold(THREE, parent);
  hold.frame(frame(5, 5, {x: 6, z: 5, holding: false}));
  let r = hold.update(.5, {x: 0, z: 0});
  assert.ok(r.squeeze && r.squeeze.sx < 1);
  assert.equal(hold.update(.01, {x: 0, z: 0}, {skip: true}).squeeze, null);
  hold.frame(frame(5, 5, {x: 6, z: 5, holding: true}));
  hold.update(.6, {x: 0, z: 0});
  r = hold.update(.3, {x: 0, z: 0});
  assert.equal(r.squeeze, null);
  hold.dispose();
});
