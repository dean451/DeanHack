import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {jawPose, jawReach, jawChatters, chatterPose, CLACK, JAW_GAPE, JAW_REACH, BITE_OPEN_U, BITE_SHUT_U} from './jaw.js';
import {MONSTER_ATTACKS} from './monster-attacks.js';
import {ACTION_TIME} from './actions.js';

const COLON = ':'.charCodeAt(0);
const sample = (f, n = 480) => Array.from({length: n + 1}, (_, i) => f(i / n));

test('jaw poses are finite, never close past rest and end where they should', () => {
  for (const result of ['hit', 'miss']) {
    for (const attack of MONSTER_ATTACKS) {
      const s = sample(u => jawPose('attack', attack, u, result));
      for (const v of s) assert(Number.isFinite(v) && v >= 0 && v <= JAW_GAPE + 1e-9, `${attack} ${result} ${v}`);
      assert(s[0] < 1e-9 && s.at(-1) < 1e-9, `${attack} ${result} starts and ends shut`);
      // no frame-to-frame jumps bigger than the bite's own snap
      for (let i = 1; i < s.length; i++) assert(Math.abs(s[i] - s[i - 1]) < .05, `${attack} ${result} jumps at ${i}`);
    }
  }
  const hit = sample(u => jawPose('hit', 'bite', u));
  assert(hit[0] < 1e-9 && hit.at(-1) < 1e-9 && Math.max(...hit) > .1);
  const die = sample(u => jawPose('die', null, u));
  assert(die[0] === 0 && Math.abs(die.at(-1) - .38) < 1e-9, 'a death leaves the jaw slack');
  for (let i = 1; i < die.length; i++) assert(die[i] >= die[i - 1] - 1e-12, 'the slack jaw only falls');
  assert.equal(jawPose('idle', null, .5), 0);
  assert.equal(jawPose('attack', 'bite', NaN), 0);
});

test('a bite gapes wide in the windup and slams shut before the strike', () => {
  assert(Math.abs(jawPose('attack', 'bite', BITE_OPEN_U) - JAW_GAPE) < 1e-9);
  assert.equal(jawPose('attack', 'bite', BITE_SHUT_U, 'hit'), 0);
  // the close is faster than the opening
  const openTime = BITE_OPEN_U - .04, shutTime = BITE_SHUT_U - BITE_OPEN_U;
  assert(shutTime < openTime / 2);
  // clamped through the worry on a hit; a miss parts and gnashes again
  assert(sample(u => u > BITE_SHUT_U ? jawPose('attack', 'bite', u, 'hit') : 0).every(v => v === 0));
  assert(jawPose('attack', 'bite', .63, 'miss') > .15);
});

test('a crocodile bite, flinch and death drive its jaw and put it back', () => {
  const croc = createCreature({name: 'crocodile', symbol: COLON, color: 2});
  const rest = croc.jaw.rotation.x, q = createActionQueue();
  enqueueAction(q, {kind: 'attack', attack: 'bite', result: 'hit', dir: [1, 0]});
  enqueueAction(q, {kind: 'hit', attack: 'claw', dir: [-1, 0]});
  enqueueAction(q, {kind: 'attack', attack: 'bite', result: 'miss', dir: [0, 1]});
  let widest = 0;
  for (let t = 0; t < 2; t += 1 / 60) {
    clearActionPose(croc, q);
    assert(Math.abs(croc.jaw.rotation.x - rest) < 1e-9, 'rest pose is restored before each frame');
    updateActions(croc, q, 1 / 60);
    const open = croc.jaw.rotation.x - rest;
    assert(Number.isFinite(open) && open >= -1e-9 && open <= JAW_GAPE + 1e-9);
    widest = Math.max(widest, open);
  }
  assert(widest > JAW_GAPE * .95, 'the bite opens the jaw wide');
  assert.equal(updateActions(croc, q, 1 / 60), 'idle');
  clearActionPose(croc, q);
  assert(Math.abs(croc.jaw.rotation.x - rest) < 1e-9, 'back at rest');
  enqueueAction(q, {kind: 'die', style: 'topple', dir: [1, 0]});
  for (let t = 0; t < 2; t += 1 / 60) { clearActionPose(croc, q); updateActions(croc, q, 1 / 60); }
  assert(Math.abs(croc.jaw.rotation.x - rest - .38) < 1e-6, 'dead crocodile hangs its jaw');
});

test('creatures without a jaw are left alone', () => {
  const lizard = createCreature({name: 'newt', symbol: COLON, color: 3});
  assert.equal(lizard.jaw, undefined);
  const q = createActionQueue();
  enqueueAction(q, {kind: 'attack', attack: 'bite', result: 'hit', dir: [1, 0]});
  for (let t = 0; t < 1; t += 1 / 60) { clearActionPose(lizard, q); updateActions(lizard, q, 1 / 60); }
});

test('smaller jaws open less, and every jawed model returns to rest', () => {
  const Q = 'q'.charCodeAt(0);
  const models = {
    crocodile: createCreature({name: 'crocodile', symbol: COLON, color: 2}),
    leocrotta: createCreature({name: 'leocrotta', symbol: Q, color: 7}),
    wumpus: createCreature({name: 'wumpus', symbol: Q, color: 6}),
    rothe: createCreature({name: 'rothe', symbol: Q, color: 3}),
  };
  const widest = {};
  for (const [name, m] of Object.entries(models)) {
    assert(m.jaw, `${name} has a jaw`);
    assert.equal(jawReach(m), JAW_REACH[name]);
    const rest = m.jaw.rotation.x, q = createActionQueue();
    enqueueAction(q, {kind: 'attack', attack: 'bite', result: 'hit', dir: [1, 0]});
    enqueueAction(q, {kind: 'hit', attack: 'bite', dir: [-1, 0]});
    enqueueAction(q, {kind: 'attack', attack: 'breath', result: 'miss', dir: [0, 1]});
    let w = 0, last = 0;
    for (let t = 0; t < 4; t += 1 / 120) {
      clearActionPose(m, q);
      assert(Math.abs(m.jaw.rotation.x - rest) < 1e-9, `${name} rest restored`);
      updateActions(m, q, 1 / 120);
      const open = m.jaw.rotation.x - rest;
      assert(Number.isFinite(open) && open >= -1e-9 && open <= JAW_GAPE * JAW_REACH[name] + 1e-9, `${name} ${open}`);
      // only the bite's deliberate snap moves fast, and it shrinks with the jaw
      assert(Math.abs(open - last) < .55 * JAW_REACH[name], `${name} jumps`);
      w = Math.max(w, open); last = open;
    }
    clearActionPose(m, q);
    assert(Math.abs(m.jaw.rotation.x - rest) < 1e-9, `${name} back at rest`);
    widest[name] = w;
  }
  assert(widest.crocodile > JAW_GAPE * .95);
  assert(widest.crocodile > widest.leocrotta && widest.leocrotta > widest.wumpus && widest.wumpus > widest.rothe);
  assert(widest.rothe > .25, 'a rothe still visibly opens its mouth');
  // an override on the handle wins, and junk falls back to the full gape
  assert.equal(jawReach({g: {name: 'rothe'}, jaw: {userData: {reach: .3}}}), .3);
  assert.equal(jawReach({g: {name: 'x'}, jaw: {userData: {reach: NaN}}}), 1);
  assert.equal(jawReach(null), 1);
});

// Local maxima above a threshold: how many times the jaw opened.
const peaks = (s, min) => s.filter((v, i) => i > 0 && i < s.length - 1 && v > min && v >= s[i - 1] && v > s[i + 1]).length;

test('chatter poses clack, start and end shut, and stay in bounds', () => {
  for (const kind of ['attack', 'hit']) {
    for (const result of ['hit', 'miss']) {
      for (const attack of MONSTER_ATTACKS) {
        const s = sample(u => chatterPose(kind, attack, u, result));
        for (const v of s) assert(Number.isFinite(v) && v >= 0 && v <= CLACK * JAW_GAPE + 1e-9, `${kind} ${attack} ${result} ${v}`);
        assert(s[0] < 1e-9 && s.at(-1) < 1e-9, `${kind} ${attack} ${result} starts and ends shut`);
        for (let i = 1; i < s.length; i++) assert(Math.abs(s[i] - s[i - 1]) < .05, `${kind} ${attack} ${result} jumps at ${i}`);
      }
    }
  }
  // two in the windup, then a three-clack cackle on a hit or two wide clacks on a miss
  assert.equal(peaks(sample(u => chatterPose('attack', 'weapon', u, 'hit')), .05), 5);
  assert.equal(peaks(sample(u => chatterPose('attack', 'weapon', u, 'miss')), .05), 4);
  // a blow rattles it twice, dying away
  const hit = sample(u => chatterPose('hit', null, u));
  assert.equal(peaks(hit, .02), 2);
  // every clack is slow enough to see: at least 55 ms, over three frames at 60 fps
  for (const [kind, result, len] of [['attack', 'hit', ACTION_TIME.attack], ['attack', 'miss', ACTION_TIME.attack], ['hit', 'hit', ACTION_TIME.hit]]) {
    const s = sample(u => chatterPose(kind, 'weapon', u, result), 4000);
    const at = s.map((v, i) => i).filter(i => i > 0 && i < s.length - 1 && s[i] > .01 && s[i] >= s[i - 1] && s[i] > s[i + 1]).map(i => i / 4000 * len);
    assert(at.length >= 2, `${kind} ${result} peaks`);
    for (let i = 1; i < at.length; i++) assert(at[i] - at[i - 1] > .055, `${kind} ${result} clacks ${at[i] - at[i - 1]} s apart`);
  }
  assert.equal(chatterPose('die', null, .5), 0);
  assert.equal(chatterPose('idle', null, .5), 0);
  assert.equal(chatterPose('attack', 'weapon', NaN), 0);
});

test('a skeleton chatters through its attack and flinch; a crocodile does not', () => {
  const Z = 'Z'.charCodeAt(0);
  const skel = createCreature({name: 'skeleton', symbol: Z, color: 15});
  const croc = createCreature({name: 'crocodile', symbol: COLON, color: 2});
  assert(jawChatters(skel) && !jawChatters(croc));
  assert(!jawChatters(null) && !jawChatters({g: {}}), 'no jaw, no chatter');
  assert(!jawChatters({jaw: {userData: {chatter: 1}}}), 'only a real true opts in');
  const run = (m, events) => {
    const rest = m.jaw.rotation.x, q = createActionQueue(), s = [];
    for (const e of events) enqueueAction(q, e);
    for (let t = 0; t < 4; t += 1 / 120) {
      clearActionPose(m, q);
      assert(Math.abs(m.jaw.rotation.x - rest) < 1e-9, 'rest restored before each frame');
      updateActions(m, q, 1 / 120);
      const open = m.jaw.rotation.x - rest;
      assert(Number.isFinite(open) && open >= -1e-9 && open <= JAW_GAPE * jawReach(m) + 1e-9, `${m.g.name} ${open}`);
      s.push(open);
    }
    clearActionPose(m, q);
    assert(Math.abs(m.jaw.rotation.x - rest) < 1e-9, `${m.g.name} back at rest`);
    return s;
  };
  const events = [{kind: 'attack', attack: 'weapon', result: 'hit', dir: [1, 0]}, {kind: 'hit', attack: 'weapon', dir: [-1, 0]}];
  const s = run(skel, events);
  assert(peaks(s, .03) >= 6, `skeleton clacks ${peaks(s, .03)}`);
  assert(Math.max(...s) > .15, 'the clacks are visible');
  assert(s.at(-1) < 1e-9, 'shut again at the end');
  // the crocodile keeps its plain snarl: one small parting, no clacking
  assert(peaks(run(croc, events), .03) <= 2);
});
