import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fxTimeline} from './fx.js';
import {splashesFromFx, splashFromMessage, splashFrame, createSplash, objectSize, SIZES} from './splash.js';

// A 10×5 room with a pool column at x = 6 and the hero at (2, 2).
const room = () => {
  const cells = [];
  for (let x = 0; x < 10; x++) for (let z = 0; z < 5; z++) cells.push({x, z, terrain: x === 6 ? 'water' : 'floor', visible: true});
  return {branch: 'main', depth: 2, player: {x: 2, z: 2}, cells};
};
// A thrown object's fx event: flash mode, one cell per tick from the hero towards +x.
const throwTo = (endX, effect = {kind: 'object', otyp: 17, class: 2, material: 11}) => {
  const steps = [{op: 'start', mode: 'flash', effect}];
  for (let x = 3; x <= endX; x++) steps.push({op: 'draw', x, z: 2}, {op: 'tick'});
  steps.push({op: 'end'});
  return fxTimeline({type: 'fx', steps});
};

test('an object flight that ends on water splashes when it lands', () => {
  const tl = throwTo(6);
  const sp = splashesFromFx(tl, room());
  assert.equal(sp.length, 1);
  assert.deepEqual({x: sp[0].x, z: sp[0].z, size: sp[0].size}, {x: 6, z: 2, size: 'medium'});
  const last = tl.sprites.at(-1);
  assert.equal(sp[0].at, last.until);
  // Passing over water, landing on floor, or a ray don't splash.
  assert.equal(splashesFromFx(throwTo(8), room()).length, 0);
  assert.equal(splashesFromFx(throwTo(5), room()).length, 0);
  assert.equal(splashesFromFx(throwTo(6, {kind: 'zap', zap: 'cold', dir: 'horizontal'}), room()).length, 0);
  assert.equal(splashesFromFx(null, room()).length, 0);
});

test('splash size follows the object class', () => {
  assert.equal(objectSize({class: 14}), 'large');   // boulder
  assert.equal(objectSize({class: 15}), 'large');   // iron ball
  assert.equal(objectSize({class: 12}), 'small');   // gold
  assert.equal(objectSize({class: 13}), 'small');   // gem
  assert.equal(objectSize({class: 2}), 'medium');   // dagger
  assert.equal(objectSize(undefined), 'medium');
});

test('hero messages splash on the hero tile, others do not', () => {
  const f = room();
  assert.equal(splashFromMessage('You fall into the water!', f).size, 'large');
  assert.equal(splashFromMessage('You plunge into the water.', f).size, 'large');
  assert.equal(splashFromMessage('Water gushes forth from the overflowing fountain!', f).size, 'gush');
  assert.equal(splashFromMessage('Water sprays all over you.', f).size, 'gush');
  assert.equal(splashFromMessage('The pipes break!  Water spurts out!', f).size, 'gush');
  assert.equal(splashFromMessage('Splash!', f).size, 'medium');
  assert.equal(splashFromMessage('Plop!', f).size, 'small');
  const s = splashFromMessage('You fall into the water!', f);
  assert.deepEqual([s.x, s.z], [2, 2]);
  for (const t of ['You hear a splash.', 'You hit the jackal.', 'The water is foul!  You gag and vomit.', 'Splat!'])
    assert.equal(splashFromMessage(t, f), null);
  assert.equal(splashFromMessage('Splash!', {cells: []}), null);
  assert.equal(splashFromMessage(null, f), null);
});

test('every size stays finite, bounded, and ends', () => {
  for (const [size, S] of Object.entries(SIZES)) {
    const sp = {x: 4, z: 3, size};
    let peakDrops = 0, sawColumn = false;
    for (let t = 0; t < S.ms; t += 10) {
      const fr = splashFrame(sp, t);
      assert.ok(fr, `${size} at ${t}`);
      peakDrops = Math.max(peakDrops, fr.drops.length);
      for (const d of fr.drops) {
        for (const v of [d.x, d.y, d.z, d.alpha]) assert.ok(Number.isFinite(v));
        assert.ok(d.y >= 0 && d.y < .7, `${size} drop y ${d.y}`);
        assert.ok(Math.hypot(d.x, d.z) < 1, `${size} drop reach`);
        assert.ok(d.alpha >= 0 && d.alpha <= 1);
      }
      for (const r of fr.ripples) {
        assert.ok(r.r > 0 && r.r <= .06 + S.reach + 1e-9);
        assert.ok(r.alpha >= 0 && r.alpha <= .75);
      }
      if (fr.column) {
        sawColumn = true;
        assert.ok(fr.column.h > 0 && fr.column.h <= S.column + 1e-9);
        assert.ok(fr.column.alpha >= 0 && fr.column.alpha <= .7);
      }
    }
    assert.ok(peakDrops > 0, `${size} throws drops`);
    assert.equal(sawColumn, S.column > 0);
    // Back to rest: no drops or column right at the end, then nothing at all.
    const end = splashFrame(sp, S.ms - 1);
    assert.equal(end.drops.length, 0, `${size} drops land`);
    assert.equal(end.column, null);
    assert.equal(splashFrame(sp, S.ms), null);
    assert.equal(splashFrame(sp, -1), null);
  }
  assert.equal(splashFrame({size: 'huge'}, 0), null);
});

test('createSplash delays until the object lands, draws, and ends empty', () => {
  const scene = new THREE.Group();
  const sp = createSplash(THREE, scene);
  const tl = throwTo(6);
  const origin = {x: 2, z: 2};
  assert.equal(sp.fromFx(tl, room()).length, 1);
  assert.ok(sp.fromMessage('Water gushes forth from the overflowing fountain!', room()));
  assert.equal(sp.fromMessage('You hear a splash.', room()), null);
  // The gush starts now; the thrown object's splash waits for the flight.
  let st = sp.update(.03, origin);
  assert.equal(st.count, 1);
  assert.equal(st.columns, 1);
  st = sp.update(tl.duration / 1000, origin);
  assert.equal(st.count, 2);
  let t = 0;
  while (t < 3) { st = sp.update(.05, origin); t += .05; }
  assert.deepEqual(st, {count: 0, drops: 0, ripples: 0, columns: 0});
  const drops = scene.children.find(o => o.userData.part === 'splash-drops');
  for (const v of drops.geometry.attributes.position.array) assert.ok(Number.isFinite(v));
  // More than MAX_SPLASHES at once keeps the newest.
  for (let i = 0; i < 10; i++) sp.add({x: i, z: 0, size: 'large'});
  st = sp.update(.1, origin);
  assert.ok(st.count <= 6 && st.columns <= 6);
  sp.clear();
  assert.equal(sp.update(.1, origin).count, 0);
  sp.dispose();
  assert.equal(scene.children.length, 0);
});
