import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createGoblin} from './goblin.js';
import {SETTLE, SETTLING, NEAR} from './insect-settle.js';
import {updateNagaSettle} from './naga-settle.js';
import {rearFor, hoodOpen, ALERT, UP, DOWN, DROP, HOOD, SWAY, PIVOT_Z} from './naga-rearing.js';
import {REAR_POSES} from './naga-rear-poses.js';
import {rearPose, hoodSpread, hoodParts} from './naga-rear.js';
import {tailSway} from './tail-sway.js';
import {rolesOf} from './body-roles.js';

// Stage 5 of the creature plan for the nagas (family N), step 2: the hero coming near sets the rear off in play.
const NAMES = ['red', 'black', 'golden', 'guardian', 'white'].flatMap(k => [`${k} naga`, `${k} naga hatchling`]);
const make = name => { const a = createCreature({name, symbol: 78}); a.species = name; a.g.updateMatrixWorld(true); return a; };
const rot = o => o.rotation.toArray().slice(0, 3);
const snap = a => JSON.stringify([Object.values(a.joints).map(rot), rot(a.tail), a.body.position.toArray(), hoodParts(a).map(o => o.scale.toArray())]);
const near = a => ({x: a.g.position.x + 2, z: a.g.position.z + 1}), far = a => ({x: a.g.position.x + NEAR + 4, z: a.g.position.z});
const run = (a, secs, busy = false, look = null) => { for (let i = 0; i < Math.round(secs * 20); i++) updateNagaSettle(a, .05, busy, look); return a.nagaRear.w; };
const mouthY = a => { a.g.updateMatrixWorld(true); return rolesOf(a).mouth().y; };
const fan = a => hoodParts(a).find(o => o.userData.part === 'hood');

test('every naga and hatchling has a baked rear that met every goal, so none is solved mid-play; a goblin or cobra has none', () => {
  for (const name of NAMES) { assert(REAR_POSES[name]?.ok, `${name} is baked and ok (node tools/bake-naga-rear.mjs)`); assert(rearFor(make(name)), name); }
  const g = createGoblin('goblin'); g.species = 'goblin';
  assert.equal(rearFor(g), null);
  const c = createCreature({name: 'cobra', symbol: 83}); c.species = 'cobra';
  assert.equal(rearFor(c), null); assert.equal(updateNagaSettle(c, .05, false, near(c)), 0);
});

test('the baked rears still match a fresh solve (re-bake after changing a naga or the goals)', () => {
  for (const name of ['red naga', 'guardian naga', 'white naga hatchling']) {
    const fresh = rearPose(make(name)).pose, baked = REAR_POSES[name].pose;
    for (const [n, o] of Object.entries(fresh)) if (typeof o === 'object') for (const [ax, v] of Object.entries(o)) assert(Math.abs(v - (baked[n]?.[ax] ?? 0)) < 2e-3, `${name} ${n}.${ax}`);
  }
});

test('the hood opens a beat behind the neck: shut until HOOD of the rise, then full', () => {
  assert.equal(hoodOpen(0), 0); assert.equal(hoodOpen(HOOD), 0); assert.equal(hoodOpen(1), 1);
  assert(hoodOpen((1 + HOOD) / 2) > 0 && hoodOpen((1 + HOOD) / 2) < 1);
});

test('the hero coming near rears it after ALERT: the mouth goes up, the hood spreads; a far or absent hero sets nothing off', () => {
  for (const name of NAMES) {
    const a = make(name), built = snap(a), up = mouthY(a);
    assert.equal(run(a, 20, false, far(a)), 0, `${name}: far`); a.nagaRest.idle = 0;
    const b = make(name);
    assert.equal(run(b, ALERT - .1, false, near(b)), 0, `${name}: not before ALERT`); assert.equal(snap(b), built, `${name}: untouched while waiting`);
    assert.equal(run(b, UP + .3, false, near(b)), 1, `${name}: fully reared`);
    const s = b.g.scale.x;
    assert(mouthY(b) > up + .05 * s, `${name}: the mouth went up (${up.toFixed(2)} to ${mouthY(b).toFixed(2)})`);
    const f = fan(b);
    if (f) assert(Math.abs(f.scale.x - hoodSpread(b)) < 1e-9, `${name}: the hood spread to ${hoodSpread(b)} (${f.scale.x})`);
    else assert.equal(hoodSpread(b), 1, `${name}: a hatchling has no hood`);
    assert.equal(run(b, 30, false, near(b)), 1, `${name}: it holds while he stays`);
  }
});

test('reared, the column weaves on its root and the head rolls back against it, so the face sways less than the neck', () => {
  for (const name of ['red naga', 'white naga']) {
    const a = make(name), look = near(a);
    run(a, ALERT + UP + .5, false, look);
    const pivots = [], tilts = [], heads = [];
    const up = new THREE.Vector3(), q = new THREE.Quaternion();
    for (let i = 0; i < 60; i++) {
      updateNagaSettle(a, .05, false, look); a.g.updateMatrixWorld(true);
      pivots.push(a.tail.rotation.z);
      a.joints.neck4.getWorldQuaternion(q); tilts.push(up.set(0, 1, 0).applyQuaternion(q).x);
      a.joints.head.getWorldQuaternion(q); heads.push(up.set(0, 1, 0).applyQuaternion(q).x);
    }
    const spread = v => Math.max(...v) - Math.min(...v);
    assert(spread(pivots) > SWAY && Math.max(...pivots.map(Math.abs)) <= SWAY + 1e-9, `${name}: the pivot weaves within SWAY (${spread(pivots).toFixed(3)})`);
    assert(spread(heads) < spread(tilts) / 2, `${name}: the head holds steadier than the neck (${spread(heads).toFixed(3)} against ${spread(tilts).toFixed(3)})`);
  }
});

test('never while moving, acting or dead, nor while brooding: it waits until it is up and still', () => {
  const a = make('red naga'), built = snap(a);
  assert.equal(run(a, 5, true, near(a)), 0, 'not while moving'); assert.equal(snap(a), built);
  const d = make('red naga'); d.actions = {dead: true};
  assert.equal(run(d, 5, false, near(d)), 0, 'not once dead');
  const r = make('red naga');
  run(r, SETTLE + SETTLING + 1); assert.equal(r.nagaRest.p, 1, 'brooding');
  for (let i = 0; i < 4; i++) { updateNagaSettle(r, .05, false, near(r)); assert.equal(r.nagaRear.w, 0, 'not while the rest is still in'); }
  assert.equal(run(r, 3, false, near(r)), 1, 'once the head is up, it rears');
});

test('ending and breaking off, also mid-rise, return every joint, the pivot and the hood exactly', () => {
  for (const name of NAMES) {
    const a = make(name), built = snap(a);
    run(a, ALERT + UP + 2, false, near(a)); assert.notEqual(snap(a), built, name);
    assert.equal(run(a, DOWN + .2, false, far(a)), 0, `${name}: sank back once he went`); assert.equal(snap(a), built, `${name}: back exactly after sinking`);
    run(a, ALERT + UP + 2, false, near(a));
    assert.equal(run(a, DROP + .1, true, near(a)), 0, `${name}: dropped when it moved`); assert.equal(snap(a), built, `${name}: back exactly when broken off`);
    run(a, ALERT + UP / 2, false, near(a)); assert(a.nagaRear.w > 0 && a.nagaRear.w < 1, `${name}: mid-rise`);
    run(a, DROP + .1, true, near(a)); assert.equal(snap(a), built, `${name}: back exactly from mid-rise`);
  }
});

test('under the frame\'s own neck sway, the rear holds the pivot and ending leaves the pivot to the sway', () => {
  const a = make('red naga'), look = near(a);
  let t = 0;
  const frame = (busy, l) => { t += .05; a.tail.rotation.z = tailSway(a, t); updateNagaSettle(a, .05, busy, l); };
  for (let i = 0; i < Math.round((ALERT + UP + 1) * 20); i++) frame(false, look);
  assert.equal(a.nagaRear.w, 1);
  assert(Math.abs(a.tail.rotation.z - PIVOT_Z) <= SWAY + 1e-9, `the rear's weave, not the sway (${a.tail.rotation.z})`);
  for (let i = 0; i < Math.round((DOWN + .5) * 20); i++) frame(false, far(a));
  assert.equal(a.nagaRear.w, 0); assert.equal(a.tail.rotation.z, tailSway(a, t), 'down, the pivot is the sway\'s own value');
});
