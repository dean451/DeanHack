import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {digMessage, chipFlight, createDigChips, pallPuff, gritTrickle, wallCrumble, DIG_LOOKS, MAX_BURSTS, CHIPS, PALL_MAX, GRIT_MAX, WALL_MAX} from './dig-chips.js';

test('dig messages give a kind, others do not', () => {
  assert.equal(digMessage('You hit the rock with all your might.'), 'blow');
  assert.equal(digMessage('You dig a pit in the floor.'), 'pit');
  assert.equal(digMessage('You dig a hole through the floor.'), 'hole');
  assert.equal(digMessage('You succeed in cutting away some rock.'), 'breach');
  assert.equal(digMessage('You make an opening in the wall.'), 'breach');
  for (const t of ['You hit the newt.', 'You dig a pit', null, 4]) assert.equal(digMessage(t), null, String(t));
});

test('chips stay in bounds, stay above the floor and are gone when the burst ends', () => {
  for (const kind of Object.keys(DIG_LOOKS)) {
    const look = DIG_LOOKS[kind];
    for (let i = 0; i < look.chips; i++) {
      for (let t = 0; t < look.life; t += .02) {
        const c = chipFlight(kind, 3, i, t);
        assert.ok(c.y >= .029 && c.y < 1.5, `${kind} ${i} y ${c.y}`);
        assert.ok(Math.hypot(c.x, c.z) < 1, `${kind} ${i} reach`);
        assert.ok(c.alpha >= 0 && c.alpha <= 1);
      }
      assert.equal(chipFlight(kind, 3, i, look.life), null);
    }
    assert.equal(chipFlight(kind, 3, look.chips, 0), null);
    assert.equal(chipFlight(kind, 3, 0, -1), null);
  }
});

test('bursts are capped, expire and clear back to nothing', () => {
  const parent = new THREE.Group(), dig = createDigChips(THREE, parent);
  assert.equal(dig.message('You hit the newt.', 1, 1), null);
  for (let i = 0; i < MAX_BURSTS + 3; i++) dig.message('You dig a hole through the floor.', i, 0);
  const s = dig.update(.016);
  assert.equal(s.bursts, MAX_BURSTS);
  assert.ok(s.chips > 0 && s.chips <= MAX_BURSTS * (CHIPS + PALL_MAX + GRIT_MAX));
  for (let i = 0; i < 40; i++) dig.update(.1);
  assert.equal(dig.update(.1).bursts, 0);
  assert.equal(dig.update(0).chips, 0);
  assert.equal(parent.children.filter(o => o.isMesh).length, 0, 'dust rings removed');
  dig.message('You dig a pit in the floor.', 0, 0);
  dig.clear();
  assert.equal(dig.update(0).bursts, 0);
  dig.dispose();
});

test('the last strike lets go of rubble a beat late, and it drops straight down', () => {
  assert.equal(DIG_LOOKS.blow.slump, 0);
  for (const kind of ['hole', 'breach']) {
    const look = DIG_LOOKS[kind], i = look.chips - 1;
    assert.ok(look.slump > 0 && look.slump < look.chips, kind);
    assert.equal(chipFlight(kind, 5, i, 0).alpha, 0, 'unseen while it hangs');
    let seen = 0, last = null;
    for (let t = 0; t < look.life; t += .02) {
      const c = chipFlight(kind, 5, i, t);
      if (c.alpha > 0) seen++;
      if (last && t > .5) assert.ok(c.y <= last.y + 1e-9, 'never rises once let go');
      assert.ok(Math.hypot(c.x, c.z) <= .3 + 1e-9, 'stays over the tile');
      last = c;
    }
    assert.ok(seen > 10, 'shows up');
    assert.equal(chipFlight(kind, 5, look.chips - look.slump - 1, 0).alpha, 1, 'thrown chips still fly at once');
  }
});

test('the finishing strike raises a dust pall that outlasts the chips and stays in bounds', () => {
  for (const kind of ['hole', 'breach']) {
    const look = DIG_LOOKS[kind];
    assert.ok(look.pall > 0 && look.pall <= PALL_MAX && look.pallLife > look.life, kind);
    let late = false;
    for (let seed = 1; seed < 6; seed++) for (let i = 0; i < look.pall; i++) for (let t = 0; t < look.pallLife; t += .05) {
      const c = pallPuff(kind, seed, i, t);
      assert.ok(c, `${kind} ${i} ${t}`);
      assert.ok(Math.hypot(c.x, c.z) < .5 && c.y >= .09 && c.y < 1 && c.alpha >= 0 && c.alpha <= .6);
      if (t > look.life + .2 && c.alpha > .02) late = true;
    }
    assert.ok(late, 'still hanging after the chips are gone');
    assert.equal(pallPuff(kind, 1, look.pall, 0), null);
    assert.equal(pallPuff(kind, 1, 0, look.pallLife), null);
    assert.equal(pallPuff(kind, 1, 0, 0).alpha, 0, 'wells up a beat late');
  }
  for (const kind of ['blow', 'pit']) assert.equal(pallPuff(kind, 1, 0, .3), null);
  const dig = createDigChips(THREE, new THREE.Group());
  dig.message('You make an opening in the wall.', 0, 0);
  dig.update(DIG_LOOKS.breach.life + .2);
  assert.ok(dig.update(.1).chips > 0, 'pall still drawn after the chips have gone');
  for (let t = 0; t < 4; t += .1) dig.update(.1);
  assert.equal(dig.update(0).bursts, 0);
  dig.dispose();
});

test('grit sifts down from the ceiling one grain at a time, long after the rubble', () => {
  for (const kind of ['hole', 'breach']) {
    const look = DIG_LOOKS[kind];
    assert.ok(look.grit > 0 && look.grit <= GRIT_MAX && look.gritLife > look.pallLife - 1, kind);
    let late = false;
    for (let seed = 1; seed < 6; seed++) for (let i = 0; i < look.grit; i++) {
      let last = null, seen = false;
      for (let t = 0; t < look.gritLife; t += .02) {
        const c = gritTrickle(kind, seed, i, t);
        assert.ok(c, `${kind} ${i} ${t}`);
        assert.ok(Math.hypot(c.x, c.z) < .5 && c.y >= .04 && c.y <= 1.2 && c.alpha >= 0 && c.alpha <= 1, `${kind} ${i} ${t}`);
        if (c.alpha > 0) { seen = true; if (t > look.life + .3) late = true; }
        if (last && last.alpha > 0 && c.alpha > 0) assert.ok(c.y <= last.y + .02, 'never climbs');
        last = c;
      }
      assert.ok(seen, 'every grain shows');
      assert.equal(gritTrickle(kind, seed, i, look.gritLife), null);
    }
    assert.ok(late, 'grains still falling after the chips are gone');
    assert.equal(gritTrickle(kind, 1, look.grit, 0), null);
    assert.equal(gritTrickle(kind, 1, 0, 0).alpha, 0, 'nothing at first');
  }
  for (const kind of ['blow', 'pit']) assert.equal(gritTrickle(kind, 1, 0, 1), null);
});

test('a breach crumbles the wall ahead from the top down and only with a heading', () => {
  const look = DIG_LOOKS.breach;
  assert.equal(wallCrumble('breach', 1, 0, .3, undefined), null);
  assert.equal(wallCrumble('blow', 1, 0, .3, 0), null);
  for (const face of [0, 1.2, -2.5]) {
    for (let i = 0; i < look.wall; i++) {
      for (let t = 0; t < look.wallLife; t += .02) {
        const c = wallCrumble('breach', 5, i, t, face);
        assert.ok(c.y >= .039 && c.y <= 1, `y ${c.y}`);
        assert.ok(Math.hypot(c.x, c.z) < .9 && c.alpha >= 0 && c.alpha <= 1);
        // the flakes sit on the facing side of the tile
        assert.ok(c.x * Math.sin(face) + c.z * Math.cos(face) > .3);
      }
      assert.equal(wallCrumble('breach', 5, i, look.wallLife, face), null);
    }
  }
  const first = wallCrumble('breach', 5, 0, .15, 0), last = wallCrumble('breach', 5, look.wall - 1, .15, 0);
  assert.ok(first.alpha > 0 && last.alpha === 0);
});

test('the burst cloud holds the wall flakes within its cap', () => {
  const dig = createDigChips(THREE, new THREE.Group());
  for (let i = 0; i < MAX_BURSTS + 2; i++) dig.message('You make an opening in the wall.', 0, 0, i);
  let peak = 0;
  for (let t = 0; t < 4; t += .05) peak = Math.max(peak, dig.update(.05).chips);
  assert.ok(peak <= MAX_BURSTS * (CHIPS + PALL_MAX + GRIT_MAX + WALL_MAX));
});
