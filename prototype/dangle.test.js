import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateGait} from './gait.js';
import {DANGLE, dangles, dangleLayout, danglePose, updateDangle} from './dangle.js';

// Mimic live.js's frame: its generic leg swing and body bob, then updateGait (which calls updateDangle).
function frame(a, t, dt, walking) {
  a.legs.forEach((l, i) => l.rotation.x = walking ? Math.sin(t * 22 + i * 2) * .4 : 0);
  a.body.position.y = Math.sin(t * (walking ? 22 : 2.5)) * .015;
  return updateGait(a, dt, walking);
}

test('bee legs hang in flight, trail while flying on, and go slack to rest in death', () => {
  for (const name of ['killer bee', 'queen bee']) {
    const a = createCreature({name});
    assert.ok(dangles(a), name);
    // right legs front to back, then left: the layout reads that from the hips
    assert.deepEqual(dangleLayout(a.legs), {side: [1, 1, 1, -1, -1, -1], rank: [0, 1, 2, 0, 1, 2]});
    const pitch = () => a.legs.map(l => l.rotation.x), splay = () => a.legs.map(l => l.rotation.z);
    let t = 0, prev = null;
    const run = (secs, walking) => {
      for (let k = 0; k < secs * 60; k++, t += 1 / 60) {
        frame(a, t, 1 / 60, walking);
        const now = [...pitch(), ...splay()];
        for (const v of now) { assert.ok(Number.isFinite(v)); assert.ok(Math.abs(v) < .7, `${name} ${v}`); }
        // no snaps as flight starts, stops or the bee dies (the tremble alone moves ~.02 a frame)
        if (prev) now.forEach((v, i) => assert.ok(Math.abs(v - prev[i]) < .06, `${name} jump ${v - prev[i]}`));
        prev = now;
      }
    };
    run(1, false);
    // hovering: hind legs trail behind the front ones and every leg splays outward on its side
    const hover = pitch();
    assert.ok(hover[2] > hover[0] + .15 && hover[5] > hover[3] + .15, `${name} ${hover}`);
    splay().forEach((z, i) => assert.ok(z * (i < 3 ? 1 : -1) > 0, `${name} splay ${i}`));
    // the generic walker swing is replaced, not added to
    run(1, true);
    const fly = pitch();
    assert.ok(fly[2] > hover[2] + .2 && fly[5] > hover[5] + .2, `${name} trail ${fly}`);
    assert.ok(Math.abs(splay()[2]) < DANGLE.splay[2] * (1 - DANGLE.tuck) * 1.2, `${name} tuck`);
    run(1.5, false);
    const st = a.dangle, settled = danglePose(st.layout, st.t, 0, 1, st.seed);
    assert.equal(st.w, 0, `${name} settles back`);
    pitch().forEach((x, i) => assert.ok(Math.abs(x - settled.pitch[i]) < 1e-12, `${name} hover ${i}`));
    // death: the legs go slack to exactly their rest pose and stay there
    a.actions = {dead: true};
    run(1, false);
    assert.deepEqual([...pitch(), ...splay()], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const r = danglePose(dangleLayout(a.legs), 3.3, 1, 0);
    assert.deepEqual([...r.pitch, ...r.splay], Array(12).fill(0));
  }
  // nothing else dangles
  for (const name of ['giant ant', 'cave spider', 'bat', 'hobbit']) assert.ok(!dangles(createCreature({name})), name);
});

test('gallery bees hang their legs too, over main.js\'s small generic sway', () => {
  for (const name of ['killer bee', 'queen bee']) {
    const a = createCreature({name}), phase = .7;
    let prev = null;
    for (let k = 0; k < 240; k++) {
      const t = k / 60;
      // main.js's gallery loop: a ±.08 sway on every leg, then the dangle hook
      a.legs.forEach((l, i) => l.rotation.x = Math.sin(t * 2.2 + i + phase) * .08);
      updateDangle(a, 1 / 60, false);
      const now = a.legs.flatMap(l => [l.rotation.x, l.rotation.z]);
      for (const v of now) { assert.ok(Number.isFinite(v)); assert.ok(Math.abs(v) < .7); }
      if (prev) now.forEach((v, i) => assert.ok(Math.abs(v - prev[i]) < .06, `${name} jump ${v - prev[i]}`));
      prev = now;
    }
    // the generic sway is replaced by the hover pose
    const st = a.dangle, hover = danglePose(st.layout, st.t, 0, 1, st.seed);
    a.legs.forEach((l, i) => assert.ok(Math.abs(l.rotation.x - hover.pitch[i]) < 1e-12, `${name} ${i}`));
    assert.ok(a.legs[2].rotation.x > a.legs[0].rotation.x + .15, `${name} hind legs trail`);
  }
});

test('a hovering bee now and then scrapes its front legs together; in flight or dead it does not', () => {
  const layout = dangleLayout(createCreature({name: 'killer bee'}).legs), D = DANGLE;
  const rank = r => (_, i) => layout.rank[i] === r;
  const front = (t, w = 0, a = 1) => danglePose(layout, t, w, a, 0).pitch.filter(rank(0));
  const hind = t => danglePose(layout, t, 0, 1, 0).pitch.filter(rank(2));
  const base = D.pitch[0], start = D.rubEvery - 1; // seed 0: the window opens 6 s in
  // outside the window the front legs stay near their hover pose; mid-window they lift well clear of it
  front(start - .1).forEach(v => assert.ok(Math.abs(v - base) < .12, `calm ${v}`));
  front(start + D.rubFor / 2).forEach(v => assert.ok(v > base + D.rub - D.rubShake - .12, `rub ${v}`));
  // nothing happens in the first 3 s whatever the seed
  for (let seed = 0; seed < 7; seed++) for (let t = 0; t < 3; t += .05) {
    danglePose(layout, t, 0, 1, seed).pitch.filter(rank(0)).forEach(v => assert.ok(Math.abs(v - base) < .12, `early ${seed} ${t}`));
  }
  // hind legs never join in
  hind(start + D.rubFor / 2).forEach((v, i) => assert.ok(Math.abs(v - hind(start - .1)[i]) < .12));
  // the rub fades out as flight starts, and dead legs are slack
  front(start + D.rubFor / 2, 1).forEach(v => assert.ok(Math.abs(v - (base + D.trail[0])) < .12, `flying ${v}`));
  assert.deepEqual(front(start + D.rubFor / 2, 0, 0), [0, 0]);
  // the window starts and ends at rest (no pop), and comes round again
  front(start).concat(front(start + D.rubFor)).forEach(v => assert.ok(Math.abs(v - base) < .12));
  assert.ok(front(start + D.rubEvery + D.rubFor / 2)[0] > base + D.rub - D.rubShake - .12);
});

test('the legs swing past their new pose when flight starts and stops, then settle', () => {
  const a = createCreature({name: 'killer bee'});
  let t = 0;
  const hind = () => a.legs[2].rotation.x;
  const run = (secs, walking) => { let lo = Infinity, hi = -Infinity; for (let k = 0; k < secs * 60; k++, t += 1 / 60) { frame(a, t, 1 / 60, walking); lo = Math.min(lo, hind()); hi = Math.max(hi, hind()); } return {lo, hi}; };
  run(1, false);
  const hover = hind();
  const up = run(2, true), flying = hind();
  assert.ok(up.hi > flying + .01, 'trails past the cruising pose as it sets off');
  const down = run(2, false);
  assert.ok(down.lo < hover - .02, 'swings forward past the hover pose as it stops');
  const st = a.dangle;
  assert.ok(Math.abs(hind() - danglePose(st.layout, st.t, 0, 1, st.seed).pitch[2]) < 1e-9, 'and settles back');
  const d = createCreature({name: 'killer bee'});
  const pose = danglePose(dangleLayout(d.legs), 1, .5, 1, 0, .5);
  assert.deepEqual(pose.pitch, danglePose(dangleLayout(d.legs), 1, .5, 1, 0).pitch);
});
