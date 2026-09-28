import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {findPrey, stalkPose, updateStalk, clearStalk, STALK_RANGE} from './stalk.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {foreLegs} from './monster-attacks.js';

const make = (name, x, z) => { const a = createCreature({name}); a.species = name; a.g.position.set(x, 0, z); return a; };
const snap = a => ({
  scale: a.g.scale.toArray(), rot: [a.g.rotation.x, a.g.rotation.z], pos: a.g.position.toArray(),
  tail: a.tail.rotation.x, fore: foreLegs(a).map(l => l.rotation.x),
});
const close = (a, b, eps = 1e-9) => {
  const fa = JSON.stringify(a, (k, v) => typeof v === 'number' ? Math.round(v / eps) : v);
  const fb = JSON.stringify(b, (k, v) => typeof v === 'number' ? Math.round(v / eps) : v);
  assert.equal(fa, fb);
};

test('cats find the nearest prey in range; others and non-prey are ignored', () => {
  const kitten = make('kitten', 0, 0), rat = make('sewer rat', 2, 0), newt = make('newt', 1, 1), jackal = make('jackal', 1, 0);
  const all = [kitten, rat, newt, jackal];
  const p = findPrey(kitten, all);
  assert.equal(p.actor, newt);
  assert.ok(Math.abs(p.d - Math.SQRT2) < 1e-9);
  assert.equal(findPrey(jackal, all), null, 'not a cat');
  assert.equal(findPrey(kitten, [kitten, make('sewer rat', STALK_RANGE + .1, 0)]), null, 'out of range');
  newt.actions = {dead: true};
  assert.equal(findPrey(kitten, all).actor, rat, 'dead prey is skipped');
  assert.equal(findPrey(make('tiger', 0, 0), [jackal]).actor, jackal, 'large cats take bigger prey');
});

test('the crouch pose is finite and bounded at every blend and time, and rest at blend 0', () => {
  for (let w = 0; w <= 1; w += .25) for (let t = 0; t < 12; t += .037) {
    const p = stalkPose(w, t, 3.1);
    for (const [k, v] of Object.entries(p)) assert.ok(Number.isFinite(v), `${k} at w=${w} t=${t}`);
    assert.ok(p.stretch >= .88 && p.stretch <= 1);
    assert.ok(Math.abs(p.roll) <= .05 + 1e-9 && Math.abs(p.flick) <= .38 + 1e-9);
  }
  assert.deepEqual(stalkPose(0, 5), {stretch: 1, pitch: 0, roll: 0, fore: 0, tail: 0, flick: 0});
});

test('a still kitten near a rat crouches facing it, twitches, and settles exactly when it moves off', () => {
  const kitten = make('kitten', 0, 0), rat = make('sewer rat', 1, 0), actors = [kitten, rat];
  const rest = snap(kitten);
  const dt = 1 / 60;
  let t = 0, minScaleY = Infinity, flicks = new Set();
  // Frame loop: clear, (rest pose would be written here), stalk.
  const frame = busy => {
    clearStalk(kitten);
    kitten.tail.rotation.z = 0;
    const w = updateStalk(kitten, dt, t, findPrey(kitten, actors), busy);
    t += dt;
    return w;
  };
  for (let i = 0; i < 240; i++) {
    const w = frame(false);
    minScaleY = Math.min(minScaleY, kitten.g.scale.y / rest.scale[1]);
    flicks.add(Math.sign(Math.round(kitten.tail.rotation.z * 20)));
    for (const v of [...kitten.g.scale.toArray(), kitten.g.rotation.x, kitten.g.rotation.y, kitten.g.rotation.z]) assert.ok(Number.isFinite(v));
    assert.ok(w >= 0 && w <= 1);
  }
  assert.ok(minScaleY < .9, 'crouched low');
  assert.ok(Math.abs(kitten.g.rotation.y - Math.PI / 2) < .02, `faces the rat (${kitten.g.rotation.y})`);
  assert.ok(flicks.has(1) && flicks.has(-1), 'the tail tip twitches both ways');
  assert.ok(foreLegs(kitten).every(l => l.rotation.x < -.15), 'forepaws set forward');
  // Starts walking: eases out within a second and is back at its rest pose (heading kept).
  for (let i = 0; i < 60; i++) frame(true);
  assert.equal(kitten.stalk.w, 0);
  clearStalk(kitten);
  close(snap(kitten), rest);
});

test('the crouch hands over to a pounce and both come off cleanly', () => {
  const kitten = make('kitten', 0, 0), rat = make('sewer rat', 1, 0), actors = [kitten, rat];
  const rest = snap(kitten);
  kitten.actions = createActionQueue();
  const dt = 1 / 60;
  let t = 0;
  const frame = () => {
    clearActionPose(kitten, kitten.actions);
    clearStalk(kitten);
    kitten.tail.rotation.z = 0;
    const q = kitten.actions;
    updateStalk(kitten, dt, t, findPrey(kitten, actors), !!q.current || q.queue.length > 0);
    updateActions(kitten, q, dt);
    t += dt;
  };
  for (let i = 0; i < 90; i++) frame();
  assert.ok(kitten.stalk.w > .5);
  enqueueAction(kitten.actions, {kind: 'attack', attack: 'bite', result: 'hit', dir: [1, 0], cat: 'pounce', size: .75});
  for (let i = 0; i < 180; i++) frame();
  assert.equal(kitten.actions.current, null);
  // Idle again next to the rat: it crouches again. Take both layers off to compare with rest.
  clearActionPose(kitten, kitten.actions);
  clearStalk(kitten);
  const now = snap(kitten);
  close({...now, rot: null}, {...rest, rot: null});
  assert.ok(Math.abs(now.rot[0]) < 1e-9 && Math.abs(now.rot[1]) < 1e-9);
});

test('non-cats and model-swapped cats are left alone', () => {
  const jackal = make('jackal', 0, 0), rat = make('sewer rat', 1, 0);
  assert.equal(updateStalk(jackal, .1, 0, {actor: rat, dx: 1, dz: 0, d: 1}, false), 0);
  assert.equal(jackal.stalk, undefined);
  const kitten = make('kitten', 0, 0);
  kitten.asset = {};
  assert.equal(updateStalk(kitten, .1, 0, findPrey(kitten, [kitten, rat]), false), 0);
});
