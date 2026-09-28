import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {polyMessage, resolveBursts, burstFrame, createPolymorph, BURST_MS} from './polymorph.js';

// A 10×5 room with the hero at (2, 2) and some creatures.
const room = monsters => {
  const cells = [];
  for (let x = 0; x < 10; x++) for (let z = 0; z < 5; z++) {
    const m = monsters.find(m => m.x === x && m.z === z);
    cells.push(m ? {x, z, kind: m.kind ?? 'monster', name: m.name, visible: true} : {x, z, kind: 'terrain', terrain: 'floor', visible: true});
  }
  return {branch: 'main', depth: 2, player: {x: 2, z: 2}, cells};
};

test('polymorph messages are read, others are not', () => {
  assert.deepEqual(polyMessage('The newt turns into a jackal!'), {who: 'monster', from: 'newt', to: 'jackal'});
  assert.deepEqual(polyMessage('It turns into an iron golem.'), {who: 'monster', from: 'it', to: 'iron golem'});
  assert.deepEqual(polyMessage('Your kitten turns into a black dragon!'), {who: 'monster', from: 'kitten', to: 'black dragon'});
  assert.deepEqual(polyMessage('You turn into a vampire!'), {who: 'hero', from: null, to: 'vampire'});
  assert.deepEqual(polyMessage('You turn into an earth elemental!'), {who: 'hero', from: null, to: 'earth elemental'});
  assert.deepEqual(polyMessage('You feel like a new woman!'), {who: 'hero', from: null, to: 'woman'});
  assert.deepEqual(polyMessage('You return to human form!'), {who: 'hero', from: null, to: null});
  for (const t of ['Your mind turns into a pretzel!', 'The newt appears!', 'You hit the jackal.',
    'You feel a change coming over you.', 'The iron golem turns into flesh!', null, 42])
    assert.equal(polyMessage(t), null, String(t));
});

test('bursts land on the tile where the creature changed', () => {
  const prev = room([{x: 5, z: 2, name: 'newt'}, {x: 7, z: 1, name: 'jackal'}]);
  const now = room([{x: 5, z: 2, name: 'jackal'}, {x: 7, z: 1, name: 'jackal'}]);
  // Two jackals: the one that used to be a newt is picked, not the one that was already there.
  assert.deepEqual(resolveBursts([polyMessage('The newt turns into a jackal!')], now, prev), [{x: 5, z: 2, hero: false}]);
  // No previous frame: the nearest jackal to the hero.
  assert.deepEqual(resolveBursts([polyMessage('The newt turns into a jackal!')], now, null), [{x: 5, z: 2, hero: false}]);
  // Hallucinated names: falls back to the tile whose name changed.
  assert.deepEqual(resolveBursts([{who: 'monster', from: 'x', to: 'teletubby'}], now, prev), [{x: 5, z: 2, hero: false}]);
  // The hero's own change goes on the hero tile.
  assert.deepEqual(resolveBursts([polyMessage('You turn into a vampire!')], now, prev), [{x: 2, z: 2, hero: true}]);
  // Nothing to place: dropped.
  assert.deepEqual(resolveBursts([{who: 'monster', from: 'a', to: 'lich'}], now, now), []);
  assert.deepEqual(resolveBursts([polyMessage('You turn into a vampire!')], {cells: []}, null), []);
  // Two changes in one turn use two tiles.
  const p2 = room([{x: 5, z: 2, name: 'newt'}, {x: 4, z: 4, name: 'rat'}]);
  const n2 = room([{x: 5, z: 2, name: 'jackal'}, {x: 4, z: 4, name: 'jackal'}]);
  const two = resolveBursts([polyMessage('The newt turns into a jackal!'), polyMessage('The rat turns into a jackal!')], n2, p2);
  assert.equal(new Set(two.map(b => `${b.x},${b.z}`)).size, 2);
});

test('a burst stays finite and in bounds and ends at rest', () => {
  for (const hero of [false, true]) {
    const b = {x: 3, z: 1, hero};
    let sawFlash = false, sawRing = false, minSx = 1, maxSy = 1;
    for (let t = 0; t < BURST_MS; t += 10) {
      const f = burstFrame(b, t);
      assert.ok(f, `frame at ${t}`);
      assert.equal(f.motes.length, 36);
      for (const m of f.motes) {
        for (const v of [m.x, m.y, m.z, m.hue, m.alpha]) assert.ok(Number.isFinite(v));
        assert.ok(Math.hypot(m.x, m.z) <= 1.1, 'motes stay near the tile');
        assert.ok(m.y >= 0 && m.y <= 1.4, `mote y ${m.y}`);
        assert.ok(m.alpha >= 0 && m.alpha <= 1 && m.hue >= 0 && m.hue < 1);
      }
      if (f.flash) { sawFlash = true; assert.ok(f.flash.r > 0 && f.flash.r < .7 && f.flash.alpha >= 0 && f.flash.alpha <= 1); }
      if (f.ring) { sawRing = true; assert.ok(f.ring.r > 0 && f.ring.r < 1.1 && f.ring.alpha >= 0 && f.ring.alpha <= 1); }
      const {sx, sy} = f.pose;
      assert.ok(Number.isFinite(sx) && Number.isFinite(sy));
      assert.ok(sx > .2 && sx < 1.4 && sy > .2 && sy < 1.4, `pose ${sx} ${sy} at ${t}`);
      minSx = Math.min(minSx, sx); maxSy = Math.max(maxSy, sy);
    }
    assert.ok(sawFlash && sawRing);
    assert.ok(minSx < .5 && maxSy > 1.1, 'the body squeezes and stretches');
    // Starts and ends at rest; nothing after the end or before the start.
    const first = burstFrame(b, 0).pose, last = burstFrame(b, BURST_MS - .01).pose;
    assert.ok(Math.abs(first.sx - 1) < 1e-6 && Math.abs(first.sy - 1) < 1e-6);
    assert.ok(Math.abs(last.sx - 1) < .01 && Math.abs(last.sy - 1) < .01, `ends at ${last.sx} ${last.sy}`);
    assert.equal(burstFrame(b, BURST_MS), null);
    assert.equal(burstFrame(b, -1), null);
    // No jumps in the pose between samples.
    let lp = first;
    for (let t = 5; t < BURST_MS; t += 5) {
      const q = burstFrame(b, t).pose;
      assert.ok(Math.abs(q.sx - lp.sx) < .12 && Math.abs(q.sy - lp.sy) < .12, `jump at ${t}`);
      lp = q;
    }
  }
  assert.equal(burstFrame(null, 0), null);
});

test('createPolymorph plays a heard change over the next frame and cleans up', () => {
  const g = new THREE.Group();
  const poly = createPolymorph(THREE, g);
  assert.equal(g.children.length, 3);
  poly.frame(room([{x: 5, z: 2, name: 'newt'}]));
  assert.equal(poly.message('The newt turns into a jackal!'), true);
  assert.equal(poly.message('You hit the jackal.'), false);
  const placed = poly.frame(room([{x: 5, z: 2, name: 'jackal'}]));
  assert.equal(placed.length, 1);
  let r = poly.update(.3, {x: 0, z: 0});
  assert.equal(r.count, 1);
  assert.equal(r.motes, 36);
  assert.ok(r.poses.has('5,2'));
  const pos = g.children[0].geometry.attributes.position.array;
  for (let i = 0; i < r.motes * 3; i++) assert.ok(Number.isFinite(pos[i]));
  // The heard queue was used up; a frame with nothing heard adds nothing.
  assert.equal(poly.frame(room([{x: 5, z: 2, name: 'jackal'}])).length, 0);
  r = poly.update(BURST_MS / 1000, {x: 0, z: 0});
  assert.equal(r.count, 0);
  assert.equal(r.motes, 0);
  assert.equal(r.poses.size, 0);
  poly.message('You turn into a vampire!');
  poly.clear();
  assert.equal(poly.frame(room([])).length, 0);
  poly.dispose();
  assert.equal(g.children.length, 0);
});
