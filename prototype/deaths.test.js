import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {deathStyle, deathPose, DEATH_STYLES, DEATH_TIME, DEATH_BURST_U, createDeathBurst, applyFade, restoreFade, hideDeathRing} from './deaths.js';
import {createCreature} from './creatures.js';

test('death styles come from the seen species name only', () => {
  const cases = {
    'kobold zombie': 'crumble', 'gnome mummy': 'crumble', skeleton: 'crumble', 'master lich': 'lichdust',
    'clay golem': 'crumble', 'ochre jelly': 'splat', 'black pudding': 'splat', 'acid blob': 'splat',
    'brown mold': 'splat', lichen: 'splat', 'fire vortex': 'dissipate', 'fog cloud': 'dissipate',
    ghost: 'dissipate', 'air elemental': 'dissipate', 'yellow light': 'burst', 'gas spore': 'burst',
    'flaming sphere': 'burst', jackal: 'topple', 'Green-elf': 'topple', 'red dragon': 'topple',
    'jellyfish': 'topple', 'golden naga': 'topple',
  };
  for (const [name, style] of Object.entries(cases)) assert.equal(deathStyle(name), style, name);
  assert.equal(deathStyle(null), 'topple');
  assert.equal(deathStyle(''), 'topple');
});

test('liches and demiliches crumble to dust in stages', () => {
  for (const n of ['lich', 'demilich', 'master lich', 'arch-lich']) assert.equal(deathStyle(n), 'lichdust', n);
  assert.equal(deathStyle('lichen'), 'splat');
  assert.ok(DEATH_TIME.lichdust > DEATH_TIME.crumble);
  const sy = u => deathPose('lichdust', u).sy;
  // The drop comes in jolts: flat spells between three falls, and it never rises back.
  assert.ok(sy(.5) < sy(.4) && sy(.7) < sy(.5));
  for (let u = 0; u < .99; u += .01) assert.ok(sy(u + .01) <= sy(u) + 1e-9, `no rebound at ${u}`);
  const end = deathPose('lichdust', 1);
  assert.ok(end.sy < .3 && end.fade === 0);
  assert.ok(deathPose('lichdust', .8).fade > 0, 'the glow outlasts the frame');
});

test('a dying lich lets its arm and wrist go limp before the frame collapses', () => {
  const p = u => deathPose('lichdust', u);
  assert.equal(p(0).arm, 0);
  assert.equal(p(0).wrist, 0);
  assert.ok(p(.3).arm > .6 && p(.3).arm > 3 * (1 - p(.3).sy), 'the arm falls before the frame sags');
  assert.ok(p(.5).wrist > .4);
  for (let u = 0; u <= 1; u += .01) assert.ok(Math.abs(p(u).arm) < 1.3 && Math.abs(p(u).wrist) < 1, `arm in bounds at ${u}`);
  assert.equal(deathPose('splat', 1).arm, 0, 'other deaths leave the arm alone');
  assert.ok(deathPose('crumble', 1).arm > .5 && deathPose('crumble', 0).arm === 0, 'a crumbling corpse lets its arm hang slack');
});

test('a dying lich\'s skull is jolted on each drop of the frame, then rests', () => {
  const head = u => deathPose('lichdust', u).head, base = u => -.7 * ((u - .3) / .5) ** 2 * (3 - 2 * (u - .3) / .5);
  assert.equal(head(0), 0);
  assert.ok(head(.3) - base(.3) > .09, 'the first jolt snaps the skull forward');
  assert.ok(head(.5) - base(.5) > .08 && head(.7) - base(.7) > .08, 'later jolts show too');
  for (let u = 0; u <= 1; u += .01) assert.ok(Math.abs(head(u)) < .85, `head in bounds at ${u}`);
  assert.ok(Math.abs(head(1) + .7) < 1e-9, 'it ends where it did before');
});

test('a dying lich buckles its leg and slumps its hem on separate beats', () => {
  const p = u => deathPose('lichdust', u);
  assert.equal(p(0).leg, 0);
  assert.equal(p(0).tail, 0);
  assert.ok(p(.4).leg > .4 && p(.4).tail < .05, 'the leg goes first');
  assert.ok(p(.8).tail > .5);
  for (let u = 0; u <= 1; u += .01) assert.ok(Math.abs(p(u).leg) < 1 && Math.abs(p(u).tail) < 1, `in bounds at ${u}`);
  assert.equal(deathPose('topple', 1).leg, 0);
});

test('a dying lich lets go of what it holds, and a crumbling corpse buckles at the knee', () => {
  const p = u => deathPose('lichdust', u);
  assert.equal(p(0).socket, 0);
  assert.ok(p(.55).socket > .5 && p(.1).socket < .05);
  for (let u = 0; u <= 1; u += .01) assert.ok(Math.abs(p(u).socket) < 1.1, `socket in bounds at ${u}`);
  assert.equal(deathPose('topple', 1).socket, 0);
  assert.equal(deathPose('crumble', 0).leg, 0);
  assert.ok(deathPose('crumble', .4).leg > .25 && deathPose('crumble', .4).leg < .6);
});

test('a crumbling corpse lets its hand loll and its tail slump after the arm', () => {
  const p = u => deathPose('crumble', u);
  assert.equal(p(0).wrist, 0);
  assert.equal(p(0).tail, 0);
  assert.ok(p(.35).wrist < .05 && p(.9).wrist > .5);
  assert.ok(p(.45).tail < .1 && p(1).tail > .45);
  for (let u = 0; u <= 1; u += .01) assert.ok(Math.abs(p(u).wrist) < 1 && Math.abs(p(u).tail) < 1);
});

test('a crumbling corpse lets go of what it holds after its hand goes slack', () => {
  const p = u => deathPose('crumble', u);
  assert.equal(p(0).socket, 0);
  assert.ok(p(.35).socket < .05 && p(.5).wrist > 0 && p(.8).socket > .6);
  for (let u = 0; u <= 1; u += .01) assert.ok(Math.abs(p(u).socket) < 1, `socket in bounds at ${u}`);
  assert.equal(deathPose('splat', 1).socket, 0);
});

test('a toppled body gives one last dead twitch of the arm once it has landed, then rests', () => {
  const p = u => deathPose('topple', u);
  assert.ok(Math.abs(p(0).arm) < 1e-9 && Math.abs(p(.7).arm) < 1e-9);
  assert.ok(Math.max(...Array.from({length: 40}, (_, i) => Math.abs(p(.8 + i * .005).arm))) > .05, 'it twitches');
  assert.ok(Math.abs(p(1).arm) < 1e-9, 'and ends still');
  for (let u = 0; u <= 1; u += .01) assert.ok(Math.abs(p(u).arm) <= .25 + 1e-9);
});

test('every style starts at rest, stays finite and bounded, and ends held', () => {
  for (const style of DEATH_STYLES) {
    const p0 = deathPose(style, 0, [1, 0]);
    for (const k of ['dx', 'dy', 'dz', 'pitch', 'roll', 'spin']) assert.ok(Math.abs(p0[k]) < 1e-9, `${style} ${k} at 0`);
    for (const k of ['scale', 'sx', 'sy', 'fade']) assert.ok(Math.abs(p0[k] - 1) < 1e-9, `${style} ${k} at 0`);
    for (let u = 0; u <= 1.0001; u += .01) {
      const p = deathPose(style, u, [.6, -.8]);
      for (const [k, v] of Object.entries(p)) assert.ok(Number.isFinite(v), `${style} ${k} at ${u}`);
      assert.ok(Math.hypot(p.dx, p.dz) <= .2 && Math.abs(p.dy) <= .3, style);
      assert.ok(p.scale > .5 && p.scale < 1.7 && p.sx > .5 && p.sx < 1.8 && p.sy > .1 && p.sy < 1.4, style);
      assert.ok(p.fade >= 0 && p.fade <= 1, style);
    }
    assert.deepEqual(deathPose(style, 1.5, [1, 0]), deathPose(style, 1, [1, 0]), `${style} held`);
    assert.ok(DEATH_TIME[style] > 0 && DEATH_BURST_U[style] > 0 && DEATH_BURST_U[style] < 1);
  }
  // Styles look different at the end.
  assert.ok(deathPose('topple', 1).roll > 1 && deathPose('topple', 1).fade === 1);
  assert.ok(deathPose('crumble', 1).sy < .4 && deathPose('crumble', 1).fade === 0);
  assert.ok(deathPose('splat', 1).sx > 1.5 && deathPose('splat', 1).sy < .3);
  assert.ok(deathPose('dissipate', 1).dy > .2 && deathPose('dissipate', 1).spin > 5);
  assert.equal(deathPose('burst', .5).fade, 0);
  // Unknown styles fall back to the topple.
  assert.deepEqual(deathPose('nope', .7, [0, 1]), deathPose('topple', .7, [0, 1]));
});

test('a crumbling body jerks its head up in a last double take before it sags', () => {
  const head = u => deathPose('crumble', u).head;
  assert.equal(head(0), 0);
  assert.ok(head(.37) > .25, 'head snaps up after the shudder');
  assert.ok(head(.37) > head(.3) && head(.37) > head(.6), 'then drops');
  assert.ok(Math.abs(head(1) + .5) < 1e-9, 'still ends sagged');
});

test('death particles stay finite, land on or above the floor and all expire', () => {
  const fx = createDeathBurst(THREE);
  for (const style of DEATH_STYLES) {
    assert.ok(fx.burst(style, {x: 2, y: 0, z: -3}, {dir: [1, 0], color: [.2, .3, .9], height: .8}) > 0);
  }
  const pos = fx.points.geometry.attributes.position.array, col = fx.points.geometry.attributes.color.array;
  let maxY = 0;
  for (let t = 0; t < 2; t += 1 / 60) {
    fx.update(1 / 60);
    for (let i = 0; i < pos.length; i += 3) {
      if (pos[i] === -999) continue;
      assert.ok(Number.isFinite(pos[i]) && Number.isFinite(pos[i + 1]) && Number.isFinite(pos[i + 2]));
      assert.ok(pos[i + 1] >= .01 - 1e-6 && Math.hypot(pos[i] - 2, pos[i + 2] + 3) < 2.5);
      maxY = Math.max(maxY, pos[i + 1]);
    }
    for (const c of col) assert.ok(c >= 0 && c <= 1);
  }
  assert.ok(maxY < 2);
  assert.equal(fx.alive, 0);
  fx.dispose();
});

test('fading an actor clones its materials, and restoring puts the shared ones back', () => {
  const actor = createCreature({name: 'ochre jelly'});
  const meshes = [];
  actor.g.traverse(o => { if (o.isMesh && !Array.isArray(o.material)) meshes.push([o, o.material, o.material.opacity, o.visible]); });
  assert.ok(meshes.length > 0);
  applyFade(actor, 1);
  assert.equal(actor.fadeSaved, undefined, 'full opacity touches nothing');
  applyFade(actor, .4);
  for (const [o, mat, opacity] of meshes) {
    assert.notEqual(o.material, mat);
    assert.ok(Math.abs(o.material.opacity - opacity * .4) < 1e-9 && o.material.transparent);
    assert.equal(mat.opacity, opacity, 'the shared material is untouched');
  }
  applyFade(actor, 0);
  for (const [o] of meshes) assert.equal(o.visible, false);
  restoreFade(actor);
  for (const [o, mat, , visible] of meshes) { assert.equal(o.material, mat); assert.equal(o.visible, visible); }
  assert.equal(actor.fadeSaved, null);
});

test('the topple falls faster as it goes over, rebounds a little off the floor and ends exactly down', () => {
  const roll = u => deathPose('topple', u, [1, 0]).roll, end = roll(1);
  // accelerating: the second half of the fall covers more angle than the first
  const a = .15, b = .9, mid = (a + b) / 2;
  assert.ok(roll(b) - roll(mid) > (roll(mid) - roll(a)) * 1.2, 'fastest at the landing');
  // rebound: lifts back off the floor angle just after landing, then returns to it
  assert.ok(roll(.95) < end - .03, 'rebounds');
  assert.ok(roll(.95) > 1, 'but stays mostly down');
  assert.equal(roll(1), roll(1.5));
  for (let i = 0; i <= 100; i++) assert.ok(roll(i / 100) <= end + 1e-9 && roll(i / 100) >= 0, 'in bounds');
});

test('a dying monster loses its disposition ring at once, and restoreFade brings it back', () => {
  const g = new THREE.Group(), ring = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)), body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  ring.userData.ring = true;
  g.add(ring, body);
  const actor = {g};
  hideDeathRing(actor);
  hideDeathRing(actor);
  assert.equal(ring.visible, false);
  assert.equal(body.visible, true);
  restoreFade(actor);
  assert.equal(ring.visible, true);
});

test('a splatted body quivers as it settles, and the ripples die away', () => {
  const sx = u => deathPose('splat', u).sx;
  let turns = 0, prev = sx(.42) - sx(.4);
  for (let u = .43; u <= .7; u += .01) { const d = sx(u) - sx(u - .01); if (d * prev < 0) turns++; prev = d; }
  assert.ok(turns >= 2, 'wobbles back and forth');
  assert.equal(deathPose('splat', 1).sx, 1.7);
  assert.ok(Math.abs(sx(.4) - deathPose('splat', .4).sx) < 1e-12);
});
