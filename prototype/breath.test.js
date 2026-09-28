import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fxTimeline} from './fx.js';
import {BREATH_LOOKS, BREATH_PARTICLES, CONE_REACH, MOUTH_Y, PARTICLE_MS, breathMessage, breathsFromFx, breathFrame, createBreath} from './breath.js';

// buzz() from (sx, sz) in direction (dx, dz): each cell drawn, then a tick.
const beam = (zap, sx, sz, dx, dz, cells = 6) => {
  const dir = dx && dz ? (dx === dz ? 'lslant' : 'rslant') : dx ? 'horizontal' : 'vertical';
  const steps = [{op: 'start', mode: 'beam', glyph: 1, effect: {kind: 'zap', zap, dir}}];
  for (let i = 1; i <= cells; i++) steps.push({op: 'draw', x: sx + dx * i, z: sz + dz * i}, {op: 'tick'});
  return fxTimeline({steps: [...steps, {op: 'end'}]});
};
const frameWith = (...mons) => ({player: {x: 1, z: 1}, cells: mons.map(([x, z]) => ({x, z, visible: true, kind: 'monster'}))});

test('breath messages arm; self-inflicted fire and other lines do not', () => {
  assert.deepEqual(breathMessage('The red dragon breathes fire!'), {what: 'fire'});
  assert.deepEqual(breathMessage('The winter wolf breathes frost!'), {what: 'frost'});
  assert.ok(breathMessage('It breathes a disintegration blast!'));
  assert.equal(breathMessage('The dragon breathes fire on itself.'), null);
  assert.equal(breathMessage('The bolt of fire hits you!'), null);
  assert.equal(breathMessage(null), null);
});

test('the breather is found one step behind the first beam cell', () => {
  const b = breathsFromFx(beam('fire', 10, 5, -1, 0), frameWith([10, 5]));
  assert.equal(b.length, 1);
  assert.deepEqual([b[0].x, b[0].z, b[0].dir, b[0].zap], [10, 5, [-1, 0], 'fire']);
  assert.ok(b[0].t1 > b[0].t0);
  // A one-cell beam: the axis comes from the glyph, the side from the frame.
  const one = breathsFromFx(beam('cold', 4, 4, 1, 1, 1), frameWith([4, 4]));
  assert.deepEqual([one[0].x, one[0].z, one[0].dir], [4, 4, [1, 1]]);
  // Nobody behind the beam (a wand zapped by the hero from off to the side): no cone.
  assert.equal(breathsFromFx(beam('fire', 10, 5, -1, 0), frameWith([3, 3])).length, 0);
});

test('every look stays finite and inside the cone, then dies away', () => {
  for (const zap of Object.keys(BREATH_LOOKS)) {
    const [b] = breathsFromFx(beam(zap, 0, 0, 1, 1), null);
    let peak = 0, glowSeen = false;
    for (let t = 0; t < b.t1 + PARTICLE_MS; t += 7) {
      const f = breathFrame(b, t);
      assert.ok(f, `${zap} ended early at ${t}`);
      assert.ok(f.glow >= 0 && f.glow <= 1);
      if (f.glow > .5) glowSeen = true;
      peak = Math.max(peak, f.particles.length);
      for (const p of f.particles) {
        for (const v of [p.x, p.y, p.z, p.size, p.alpha, p.color]) assert.ok(Number.isFinite(v), `${zap} not finite`);
        assert.ok(p.alpha >= 0 && p.alpha <= 1);
        assert.ok(p.size > 0 && p.size < .45);
        assert.ok(p.y >= .03 && p.y < MOUTH_Y + 1.2);
        // Forward along the diagonal, never behind the mouth, never past the reach.
        const fwd = (p.x + p.z) / Math.SQRT2, side = (p.x - p.z) / Math.SQRT2;
        assert.ok(fwd > 0 && Math.hypot(fwd, side) <= CONE_REACH + .2, `${zap} out of cone`);
        assert.ok(Math.abs(side) <= fwd * Math.tan(.4) + .1);
      }
    }
    assert.ok(peak > BREATH_PARTICLES / 4, `${zap} peak ${peak}`);
    assert.equal(breathFrame(b, b.t1 + PARTICLE_MS), null);
    if (zap !== 'death') assert.ok(glowSeen, `${zap} never glowed`);
  }
});

test('the renderer only plays after a message, and ends empty', () => {
  const group = new THREE.Group();
  const br = createBreath(THREE, group);
  const tl = beam('fire', 10, 5, -1, 0), frame = frameWith([10, 5]);
  assert.equal(br.fromFx(tl, frame), 0, 'a plain zap has no cone');
  br.message('The red dragon breathes fire!');
  assert.ok(br.armed);
  assert.equal(br.fromFx(tl, frame), 1);
  assert.equal(br.armed, false);
  let most = 0, glow = 0;
  for (let i = 0; i < 120; i++) {
    const r = br.update(1 / 60, {x: 8, z: 4});
    most = Math.max(most, r.particles); glow = Math.max(glow, r.glow);
    if (r.glow > .5) assert.deepEqual([r.x, r.z], [10, 5]);
    for (let k = 0; k < br.mesh.count; k++) {
      const m = new THREE.Matrix4(); br.mesh.getMatrixAt(k, m);
      const p = new THREE.Vector3().setFromMatrixPosition(m);
      assert.ok(p.x <= 2.2 && p.x > 2 - CONE_REACH - .3, `x ${p.x}`);
    }
  }
  assert.ok(most > 10 && glow > .9);
  const end = br.update(1 / 60, {x: 8, z: 4});
  assert.deepEqual([end.count, end.particles, br.mesh.count], [0, 0, 0]);
  // Arming wears off.
  br.message('The red dragon breathes fire!');
  br.update(3, null);
  assert.equal(br.armed, false);
  br.clear(); br.dispose();
  assert.equal(group.children.length, 0);
});
