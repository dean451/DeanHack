import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {slideTo, heavySlide, HEAVY, SPECIES_SLIDE, EASE_RATE} from './slide.js';

const COLON = ':'.charCodeAt(0);
const turtle = () => createCreature({name: 'giant turtle', symbol: COLON, color: 2});
const dog = () => createCreature({name: 'jackal', symbol: 'd'.charCodeAt(0), color: 3});

// Steps an actor at 60 Hz until it reaches its target; returns per-frame positions.
function run(a, to, seconds = 4) {
  a.target = new THREE.Vector3(...to);
  const dt = 1 / 60, out = [];
  for (let i = 0; i < seconds * 60; i++) {
    slideTo(a, dt);
    out.push(a.g.position.clone());
  }
  return out;
}
const walking = (a) => a.g.position.distanceTo(a.target) > .025;

test('the giant turtle slides heavily; other monsters keep the ordinary ease', () => {
  assert.equal(heavySlide(turtle()), HEAVY.turtle);
  assert.equal(heavySlide(dog()), null);
  const d = dog();
  run(d, [1, 0, 0], 1 / 60);
  assert(Math.abs(d.g.position.x - (1 - Math.exp(-EASE_RATE / 60))) < 1e-12);
});

test('one cell: pulls away, cruises, brakes and lands exactly, in about a second', () => {
  for (const to of [[1, 0, 0], [1, 0, -1], [0, 0, -1]]) {
    const a = turtle();
    const path = run(a, to);
    const dist = Math.hypot(...to);
    let prev = new THREE.Vector3(), arrived = -1, maxStep = 0, firstStep = null;
    path.forEach((p, i) => {
      for (const v of p.toArray()) assert(Number.isFinite(v));
      const step = p.distanceTo(prev);
      if (firstStep == null) firstStep = step;
      maxStep = Math.max(maxStep, step);
      // it never overshoots and never moves backward along the line
      assert(p.length() <= dist + 1e-9);
      assert(p.length() >= prev.length() - 1e-12);
      prev = p;
      a.g.position.copy(p);
      if (arrived < 0 && !walking(a)) arrived = i / 60;
    });
    assert(firstStep < .2 / 60, 'starts from rest');
    assert(maxStep <= HEAVY.turtle.cruise / 60 + 1e-9, 'never faster than cruise');
    assert(arrived > .7 && arrived < 1.6, `walking for ${arrived} s over ${dist}`);
    assert.deepEqual(a.g.position.toArray(), to.map(Number), 'lands exactly');
    assert.equal(a.slideSpeed, 0);
  }
});

test('a new move mid-slide keeps going smoothly; a far target catches up with the ease', () => {
  const a = turtle();
  run(a, [1, 0, 0], .5);
  const speed = a.slideSpeed;
  assert(speed > 0);
  // the next move arrives before it has landed: no stop or jump
  a.target.set(2, 0, 0);
  const before = a.g.position.x;
  slideTo(a, 1 / 60);
  assert(a.g.position.x > before && a.g.position.x - before <= HEAVY.turtle.cruise / 60 + 1e-9);
  run(a, [2, 0, 0]);
  assert.equal(a.g.position.x, 2);
  // a teleport five cells off eases in quickly and then lands
  const path = run(a, [7, 0, 0], 3);
  assert(path[0].x - 2 > .5, 'catches up fast');
  assert.equal(a.g.position.x, 7);
});

test('zombies, heavy golems and oozes slide heavily by species; quick kin keep the ease', () => {
  const mk = (species, symbol) => {
    const a = createCreature({name: species, symbol: symbol.charCodeAt(0), color: 7});
    a.species = species;
    return a;
  };
  const heavy = [['kobold zombie', 'Z', 'zombie'], ['giant zombie', 'Z', 'zombie'],
    ['iron golem', "'", 'golem'], ['clay golem', "'", 'golem'], ['wood golem', "'", 'golem'],
    ['gelatinous cube', 'b', 'ooze'], ['black pudding', 'P', 'ooze'], ['ghoul', 'Z', 'ghoul'], ['skeleton', 'Z', 'skeleton']];
  for (const [species, sym, kind] of heavy) assert.equal(heavySlide(mk(species, sym)), SPECIES_SLIDE[kind], species);
  for (const [species, sym] of [['kobold mummy', 'M'], ['straw golem', "'"], ['paper golem', "'"],
    ['acid blob', 'b'], ['jackal', 'd']]) assert.equal(heavySlide(mk(species, sym)), null, species);

  for (const [species, sym, kind] of heavy) {
    const prof = SPECIES_SLIDE[kind];
    for (const to of [[1, 0, 0], [1, 0, 1]]) {
      const a = mk(species, sym);
      const path = run(a, to, 5);
      const dist = Math.hypot(...to);
      let prev = new THREE.Vector3(), arrived = -1, maxStep = 0, first = null;
      path.forEach((p, i) => {
        for (const v of p.toArray()) assert(Number.isFinite(v));
        const step = p.distanceTo(prev);
        if (first == null) first = step;
        maxStep = Math.max(maxStep, step);
        assert(p.length() <= dist + 1e-9 && p.length() >= prev.length() - 1e-12);
        prev = p;
        if (arrived < 0 && p.distanceTo(a.target) <= .025) arrived = i / 60;
      });
      assert(first < .2 / 60, `${species} starts from rest`);
      assert(maxStep <= prof.cruise / 60 + 1e-9, `${species} never faster than cruise`);
      assert(arrived > .6 && arrived < 2, `${species} walks ${dist} in ${arrived} s`);
      assert.deepEqual(a.g.position.toArray(), to.map(Number), `${species} lands exactly`);
      assert.equal(a.slideSpeed, 0);
    }
  }
});

// Perches: occupants of furniture tiles stand on the model's top, not inside it.
import {PERCH, perchHeight} from './perch.js';
import {HOP, hopArc} from './slide.js';
import {createAltar} from './altar.js';
import {createThrone} from './throne.js';
import {createSink} from './sink.js';
import {createGrave} from './grave.js';
import {createStairs} from './stairs.js';

// Height of the highest surface straight down through (x, z).
function surface(g, x, z) {
  g.updateMatrixWorld(true);
  const hit = new THREE.Raycaster(new THREE.Vector3(x, 5, z), new THREE.Vector3(0, -1, 0)).intersectObject(g, true)[0];
  return hit ? hit.point.y : 0;
}

test('perch heights match the furniture models they stand on', () => {
  const models = {altar: () => createAltar(), throne: () => createThrone(), sink: () => createSink(),
    up: s => createStairs('up', s), down: s => createStairs('down', s), grave: s => createGrave(s)};
  assert.deepEqual(Object.keys(models).sort(), Object.keys(PERCH).sort());
  for (const [name, make] of Object.entries(models)) {
    for (const seed of [1, 2, 3, 4]) {
      // Within a stair step (.095) over a foot-sized patch round the tile centre, toward the front (the throne back and the sink tap rise behind).
      for (const [x, z] of [[0, 0], [.08, 0], [-.08, 0], [0, .08], [0, -.04]]) {
        const y = surface(make(seed), x, z);
        assert.ok(Math.abs(y - PERCH[name]) <= .1, `${name} seed ${seed} at ${x},${z}: surface ${y.toFixed(3)} vs perch ${PERCH[name]}`);
      }
    }
  }
});

test('perchHeight is 0 on plain ground and unknown terrain', () => {
  for (const t of ['floor', 'water', 'lava', 'door', 'fountain', 'tree', 'unknown', undefined, null])
    assert.equal(perchHeight(t), 0);
  assert.equal(perchHeight('altar'), PERCH.altar);
});

test('an actor hops up onto a perch and back down to the floor', () => {
  const a = dog(), up = new THREE.Vector3(1, perchHeight('altar'), 0);
  a.target = up;
  const ys = [];
  for (let i = 0; i < 120; i++) { slideTo(a, 1 / 60); ys.push(a.g.position.y); }
  assert.ok(ys.every(Number.isFinite));
  assert.equal(a.g.position.y, PERCH.altar, 'lands exactly on top');
  const peak = Math.max(...ys), lift = HOP.lift + HOP.k * PERCH.altar;
  assert.ok(peak > PERCH.altar && peak <= PERCH.altar + lift, `springs up and drops on (peak ${peak.toFixed(3)})`);
  // Halfway across it is clear of the straight ramp by the full lift.
  assert.ok(Math.abs(hopArc(0, PERCH.altar, .5) - (PERCH.altar / 2 + lift)) < 1e-12);
  assert.ok(ys.every(y => y >= -1e-12), 'never dips below the floor');
  const frames = [];
  a.target = new THREE.Vector3(2, 0, 0);
  for (let i = 0; i < 120; i++) { slideTo(a, 1 / 60); frames.push(a.g.position.y); }
  assert.equal(a.g.position.y, 0, 'back on the floor');
  assert.ok(Math.max(...frames) > PERCH.altar, 'hops off rather than sinking through the edge');
  assert.ok(frames.every(y => y >= -1e-12));
  // Per-frame height change stays a smooth hop, not a pop.
  const all = [...ys, ...frames];
  assert.ok(all.every((y, i) => i === 0 || Math.abs(y - all[i - 1]) < .12));
});

test('no hop on a low step, a teleport, or furniture appearing underfoot', () => {
  const a = dog();
  a.target = new THREE.Vector3(1, perchHeight('down'), 0);
  const ys = [];
  for (let i = 0; i < 90; i++) { slideTo(a, 1 / 60); ys.push(a.g.position.y); }
  assert.ok(Math.max(...ys) <= PERCH.down + 1e-9, 'the down stair just ramps');
  const b = dog();
  b.target = new THREE.Vector3(5, PERCH.throne, 0);
  const far = [];
  for (let i = 0; i < 90; i++) { slideTo(b, 1 / 60); far.push(b.g.position.y); }
  assert.ok(Math.max(...far) <= PERCH.throne + 1e-9, 'a teleport eases');
  b.target = new THREE.Vector3(5, PERCH.altar, 0);
  const under = [];
  for (let i = 0; i < 90; i++) { slideTo(b, 1 / 60); under.push(b.g.position.y); }
  assert.ok(Math.max(...under) <= PERCH.altar + 1e-9 && Math.abs(b.g.position.y - PERCH.altar) < 1e-3, 'standing still, it just rises');
});

test('a hop interrupted by the next step carries on from where it is', () => {
  const a = dog();
  a.target = new THREE.Vector3(1, PERCH.altar, 0);
  for (let i = 0; i < 6; i++) slideTo(a, 1 / 60);
  const mid = a.g.position.y;
  a.target = new THREE.Vector3(2, 0, 0);
  slideTo(a, 1 / 60);
  assert.ok(Math.abs(a.g.position.y - mid) < .12, 'no jump in height');
  for (let i = 0; i < 120; i++) slideTo(a, 1 / 60);
  assert.equal(a.g.position.y, 0);
});

test('heavy movers hop too, at their own pace, and others can pose y in between', () => {
  const a = turtle();
  a.target = new THREE.Vector3(1, PERCH.grave, 0);
  const ys = [];
  for (let i = 0; i < 240; i++) {
    slideTo(a, 1 / 60);
    ys.push(a.g.position.y);
    a.g.position.y += .3; a.g.position.y -= .3; // an action pose, taken back
  }
  assert.ok(Math.max(...ys) > PERCH.grave);
  assert.ok(Math.abs(a.g.position.y - PERCH.grave) < 1e-9);
  // Something else moving the actor (a level change) starts it afresh from there.
  a.g.position.set(7, 0, 7);
  a.target = new THREE.Vector3(7, 0, 7);
  slideTo(a, 1 / 60);
  assert.equal(a.g.position.y, 0);
});
