import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {meltMessage, findMelts, meltFrame, slumpPoint, createBarsMelt, MELT_LOOKS, MAX_MELTS} from './bars-melt.js';

// A 7×5 room with a row of bars at z 2 (x 1..5) between walls, and the hero at (3, 4).
const room = (gone = [], {depth = 3, hidden = []} = {}) => {
  const cells = [];
  for (let x = 0; x < 7; x++) for (let z = 0; z < 5; z++) {
    let terrain = 'floor';
    if (z === 2) terrain = x === 0 || x === 6 ? 'wall' : 'bars';
    if (gone.some(([gx, gz]) => gx === x && gz === z)) terrain = 'floor';
    cells.push({x, z, kind: 'terrain', terrain, visible: !hidden.some(([hx, hz]) => hx === x && hz === z)});
  }
  return {branch: 'main', depth, player: {x: 3, z: 4}, cells};
};

test('messages that remove bars give a cause', () => {
  assert.equal(meltMessage('The iron bars are dissolved!'), 'acid');
  assert.equal(meltMessage('You hear a hissing noise.'), 'acid');
  assert.equal(meltMessage('The black pudding dissolves the iron bars.'), 'disintegrate');
  assert.equal(meltMessage('The rust monster chews through the iron bars.'), 'chew');
  assert.equal(meltMessage('You chew through the iron bars.'), 'chew');
  assert.equal(meltMessage('You hear a crunching noise.'), 'chew');
  for (const t of ['The rust monster squeezes between the iron bars.', 'You hit the newt.', 'Whang!', null, 3])
    assert.equal(meltMessage(t), null, String(t));
});

test('melts are found where bars became floor, facing the way they stood', () => {
  assert.deepEqual(findMelts(room(), room([[3, 2]])), [{x: 3, z: 2, seed: 3 * 53 + 2 * 29, turn: 0}]);
  // A grille in a north-south run turns a quarter.
  const col = fr => { for (const c of fr.cells) c.terrain = c.x === 3 ? (c.z === 0 || c.z === 4 ? 'wall' : 'bars') : 'floor'; return fr; };
  const before = col(room()), after = col(room());
  after.cells.find(c => c.x === 3 && c.z === 2).terrain = 'floor';
  assert.equal(findMelts(before, after)[0].turn, Math.PI / 2);
  // Nothing changed, no previous frame, out of view, or a new level: no melts.
  assert.deepEqual(findMelts(room(), room()), []);
  assert.deepEqual(findMelts(null, room([[3, 2]])), []);
  assert.deepEqual(findMelts(room(), room([[3, 2]], {hidden: [[3, 2]]})), []);
  assert.deepEqual(findMelts(room(), room([[3, 2]], {depth: 4})), []);
});

test('slumped points stay above the floor and near the tile', () => {
  for (const k of [0, .25, .5, .75, 1]) for (const y of [0, .05, .5, .98]) for (const x of [-.44, 0, .44]) {
    const [nx, ny, nz] = slumpPoint(x, y, .02, k, 1);
    assert.ok([nx, ny, nz].every(Number.isFinite));
    assert.ok(ny >= .004 && ny <= Math.max(y, .004) + 1e-9, `y ${ny}`);
    assert.ok(Math.abs(nx) <= .56 && Math.abs(nz) <= .2, `${nx} ${nz}`);
  }
  // Standing bars are untouched; melted ones lie flat.
  assert.deepEqual(slumpPoint(.1, .5, .02, 0), [.1, .5, .02]);
  assert.ok(slumpPoint(.1, .98, .02, 1)[1] < .03);
});

test('every look runs its course with finite, bounded values', () => {
  for (const [cause, look] of Object.entries(MELT_LOOKS)) {
    assert.ok(Math.abs(look.heat + look.slump + look.cool - 1) < 1e-9, cause);
    const melt = {x: 3, z: 2, seed: 188, cause};
    let last = 0, sawGlow = false, sawDrop = false;
    for (let t = 0; t < look.ms; t += 7) {
      const fr = meltFrame(melt, t);
      assert.ok(fr, `${cause} ${t}`);
      assert.ok(fr.slump >= last - 1e-9 && fr.slump <= 1, 'slump only grows');
      last = fr.slump;
      assert.ok(fr.alpha >= 0 && fr.alpha <= 1);
      if (fr.glow) { sawGlow = true; assert.ok(fr.glow.k > 0 && fr.glow.k <= 1 && fr.glow.white >= 0 && fr.glow.white <= 1); }
      for (const d of fr.drops) {
        sawDrop = true;
        assert.ok([d.x, d.y, d.z, d.size, d.alpha].every(Number.isFinite));
        assert.ok(d.y >= 0 && d.y < .7 && Math.abs(d.x) < .45 && d.alpha >= 0 && d.alpha <= 1);
      }
      for (const f of fr.fumes) {
        assert.ok([f.x, f.y, f.z, f.alpha].every(Number.isFinite));
        assert.ok(f.y >= 0 && f.y < 1.7 && Math.abs(f.x) < .5 && f.alpha >= 0 && f.alpha <= 1);
      }
      if (fr.puddle) assert.ok(fr.puddle.r > 0 && fr.puddle.r <= .38 && fr.puddle.alpha <= 1 && fr.puddle.heat <= 1);
    }
    assert.equal(sawGlow, look.glow != null, `${cause} glow`);
    assert.equal(sawDrop, look.drop != null, `${cause} drops`);
    // It ends fully slumped and faded out, then stops.
    const end = meltFrame(melt, look.ms - 1);
    assert.ok(end.slump > .999 && end.alpha < .01 && !end.glow, cause);
    assert.equal(meltFrame(melt, look.ms), null);
    assert.equal(meltFrame(melt, -1), null);
  }
});

test('the renderer plays a melt on the right tile and cleans up', () => {
  const scene = new THREE.Group();
  const baseline = scene.children.length;
  const fx = createBarsMelt(THREE, scene);
  const pieces = scene.children.length;
  fx.frame(room());
  assert.ok(fx.message('The iron bars are dissolved!'));
  const started = fx.frame(room([[3, 2]]));
  assert.equal(started.length, 1);
  assert.equal(started[0].cause, 'acid');
  assert.equal(scene.children.length, pieces + 1);
  const ghost = scene.children.at(-1);
  const iron = [];
  ghost.traverse(o => { if (o.isMesh && o.userData.part === 'iron') iron.push(o); });
  assert.equal(iron.length, 1);
  const top0 = (() => { iron[0].geometry.computeBoundingBox(); return iron[0].geometry.boundingBox.max.y; })();
  const origin = {x: 3, z: 4};
  let peakGlow = 0, drops = 0, fumes = 0;
  for (let t = 0; t < MELT_LOOKS.acid.ms + 100; t += 16) {
    const out = fx.update(.016, origin);
    drops = Math.max(drops, out.drops); fumes = Math.max(fumes, out.fumes);
    if (out.count) {
      assert.deepEqual([ghost.position.x, ghost.position.z], [0, -2]);
      peakGlow = Math.max(peakGlow, iron[0].material.emissiveIntensity);
      const p = iron[0].geometry.attributes.position.array;
      for (let i = 0; i < p.length; i++) assert.ok(Number.isFinite(p[i]));
    }
    if (t === 1600) {
      iron[0].geometry.computeBoundingBox();
      assert.ok(iron[0].geometry.boundingBox.max.y < top0 * .6, 'sagged by mid-melt');
      assert.ok(iron[0].geometry.boundingBox.min.y >= 0);
    }
  }
  assert.ok(peakGlow > 1, `glowed ${peakGlow}`);
  assert.ok(drops > 0 && fumes > 0);
  // Over: the ghost is gone and only the shared pieces remain.
  assert.equal(scene.children.length, pieces);
  // More melts than the cap drop the oldest; clear and dispose remove everything.
  for (let i = 0; i < MAX_MELTS + 2; i++) fx.add({x: i, z: 0, seed: i, cause: 'heat'});
  assert.equal(scene.children.length, pieces + MAX_MELTS);
  assert.equal(fx.update(.016, origin).count, MAX_MELTS);
  fx.clear();
  assert.equal(scene.children.length, pieces);
  // A level change doesn't melt anything.
  fx.frame(room());
  assert.equal(fx.frame(room([[3, 2]], {depth: 5})).length, 0);
  fx.dispose();
  assert.equal(scene.children.length, baseline);
});
