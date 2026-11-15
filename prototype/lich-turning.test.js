import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createGoblin} from './goblin.js';
import {NEAR, SETTLE, SETTLING, RISE} from './insect-settle.js';
import {updateLichTurn, shufflesFor, TURNING} from './lich-turning.js';
import {updateLichSettle} from './lich-settle.js';
import {shufflePose, turnPlan} from './lich-turn.js';
import {TURN_POSES} from './lich-turn-poses.js';
import {rolesOf} from './body-roles.js';

// Stage 5 of the creature plan for the liches (family L), step 2: the hero coming near turns the lich to face him.
const FAMILY = [['lich', 2], ['demilich', 1], ['master lich', 5], ['arch-lich', 6]];
const make = ([name, color]) => { const a = createCreature({name, symbol: 76, color}); a.species = name; a.g.updateMatrixWorld(true); return a; };
const snap = a => JSON.stringify([Object.values(a.joints).map(o => o.rotation.toArray().slice(0, 3)), a.body.position.toArray()]);
const wrap = v => Math.atan2(Math.sin(v), Math.cos(v));
const DT = 1 / 30;
// the game's frame order: the turn, then the settle last
const run = (a, secs, look, {busy = false, settle = false, each} = {}) => { for (let i = 0; i < Math.round(secs / DT); i++) { updateLichTurn(a, DT, busy, look); if (settle) updateLichSettle(a, DT, busy, look); each?.(a); } };
// the hero 2.5 m off the lich's side (it faces +z at yaw 0), and well away
const beside = a => ({x: a.g.position.x - 2.5, z: a.g.position.z}), far = a => ({x: a.g.position.x - NEAR - 3, z: a.g.position.z});
const bearing = (a, p) => Math.atan2(p.x - a.g.position.x, p.z - a.g.position.z);
const whole = turnPlan(Math.PI / 2), TURN_SECS = whole.delay + whole.seconds;

test('every lich has baked upright shuffles that met every goal, still matching a fresh solve; a goblin never turns', () => {
  for (const f of FAMILY) {
    assert(TURN_POSES[f[0]]?.ok && shufflesFor(make(f)), `${f[0]} is baked and ok (node tools/bake-lich-turn.mjs)`);
    for (const [key, side] of [['l', -1], ['r', 1]]) {
      const fresh = shufflePose(make(f), side, {upright: true}), baked = TURN_POSES[f[0]][key];
      assert(Math.max(...fresh.residuals.flat().map(Math.abs)) < .02, `${f[0]} ${key}: every goal under 2 cm`);
      for (const [j, o] of Object.entries(fresh.pose)) for (const [ax, v] of Object.entries(o)) assert(Math.abs(v - (baked[j]?.[ax] ?? 0)) < 2e-3, `${f[0]} ${key} ${j}.${ax}`);
    }
  }
  const g = createGoblin('goblin'); g.species = 'goblin';
  const yaw = g.g.rotation.y; assert.equal(updateLichTurn(g, DT, false, {x: 1, z: 0}), 0); assert.equal(g.g.rotation.y, yaw);
});

test('a hero far off, or already in front of it, leaves the lich as it stood', () => {
  for (const f of FAMILY) {
    const a = make(f), built = snap(a);
    run(a, 6, far(a)); assert.equal(a.g.rotation.y, 0, `${f[0]}: far`); assert.equal(snap(a), built);
    run(a, 6, {x: a.g.position.x + .5, z: a.g.position.z + 2.5}); // within TURNING.FACE of its bearing
    assert.equal(a.g.rotation.y, 0, `${f[0]}: ahead`); assert.equal(snap(a), built);
    run(a, 6, null); assert.equal(a.g.rotation.y, 0); assert.equal(snap(a), built);
  }
});

test('the hero coming near to one side: a pause, then it ratchets round to face him, rocking foot to foot, and every joint comes back exactly', () => {
  for (const f of FAMILY) for (const sign of [1, -1]) {
    const a = make(f), built = snap(a), look = {x: a.g.position.x + sign * 2.5, z: a.g.position.z};
    const yaws = [], rolls = [];
    const P = rolesOf(a);
    run(a, TURN_SECS + .5, look, {each: o => { yaws.push(o.g.rotation.y); o.g.updateMatrixWorld(true); const d = o.g.worldToLocal(P.withers()).sub(o.g.worldToLocal(P.rump())); rolls.push(d.x); }});
    // still through the pause
    assert.equal(yaws[Math.floor(whole.delay / DT) - 2], 0, `${f[0]}: no turn before the pause is out`);
    // faces him at the end, exactly, and every joint is back as built
    assert(Math.abs(wrap(a.g.rotation.y - bearing(a, look))) < 1e-9, `${f[0]} ${sign}: faces the hero (${a.g.rotation.y})`);
    run(a, DT, look);
    assert.equal(snap(a), built, `${f[0]} ${sign}: every joint back exactly`);
    // the ratchet: the yaw only ever moves toward him, and stands still a good share of the turn
    let held = 0, moving = 0;
    for (let i = 1; i < yaws.length; i++) { const d = (yaws[i] - yaws[i - 1]) * sign; assert(d > -1e-12, `${f[0]}: the yaw never backs`); if (yaws[i] !== 0 && yaws[i - 1] !== 0 && Math.abs(wrap(yaws[i] - bearing(a, look))) > 1e-9) d === 0 ? held++ : moving++; }
    assert(held / (held + moving) > .3, `${f[0]}: held ${(held / (held + moving) * 100).toFixed(0)}% of the turn`);
    // the weight rocks out over each foot in turn: the trunk leans both ways by a few centimetres
    const base = rolls[0];
    assert(Math.max(...rolls) - base > .03 && base - Math.min(...rolls) > .03, `${f[0]} ${sign}: rocks ${((Math.max(...rolls) - base) * 100).toFixed(1)} / ${((base - Math.min(...rolls)) * 100).toFixed(1)} cm`);
  }
});

test('in one piece: the skull never turns on the neck, and the staff hand stays on its grip all the way round', () => {
  for (const f of FAMILY) {
    const a = make(f), P = rolesOf(a), neck = Object.keys(a.joints).filter(n => /^neck|^head|^jaw/.test(n));
    const still = JSON.stringify(neck.map(n => a.joints[n].rotation.toArray()));
    const grip = a.g.worldToLocal(P['paw:rf']());
    let worst = 0;
    run(a, TURN_SECS, beside(a), {each: o => { o.g.updateMatrixWorld(true); worst = Math.max(worst, o.g.worldToLocal(P['paw:rf']()).distanceTo(grip));
      assert.equal(JSON.stringify(neck.map(n => o.joints[n].rotation.toArray())), still, `${f[0]}: the neck turned`); }});
    assert(worst < .02, `${f[0]}: the staff hand left its grip by ${(worst * 100).toFixed(1)} cm`);
  }
});

test('walking, acting or dying breaks the turn off at once and leaves every joint exact; the next waits GAP', () => {
  const a = make(FAMILY[0]), built = snap(a), look = beside(a);
  run(a, whole.delay + whole.seconds / 3, look);
  const yaw = a.g.rotation.y; assert(yaw !== 0 && a.lichTurning.turn, 'mid-turn');
  assert.equal(updateLichTurn(a, DT, true, look), 0);
  assert.equal(a.lichTurning.turn, null); assert.equal(snap(a), built, 'joints exact'); assert.equal(a.g.rotation.y, yaw, 'the heading it had');
  run(a, TURNING.GAP - .2, look); assert.equal(a.lichTurning.turn, null, 'not before GAP');
  run(a, .4, look); assert(a.lichTurning.turn, 'turns again after GAP');
  const d = make(FAMILY[0]), still = snap(d); d.actions = {dead: true};
  run(d, TURN_SECS, beside(d)); assert.equal(d.g.rotation.y, 0); assert.equal(snap(d), still, 'not once dead');
});

test('a stooped lich, the hero walking up beside it, straightens, turns to him and ends with every joint exact', () => {
  for (const f of FAMILY) {
    const a = make(f), built = snap(a);
    run(a, SETTLE + SETTLING + 1, far(a), {settle: true});
    assert.equal(a.lichRest.p, 1, `${f[0]}: stooped`); assert.equal(a.g.rotation.y, 0);
    const look = beside(a);
    run(a, TURN_SECS + RISE + .5, look, {settle: true});
    assert.equal(a.lichRest.p, 0, `${f[0]}: upright`);
    assert(Math.abs(wrap(a.g.rotation.y - bearing(a, look))) < 1e-9, `${f[0]}: faces the hero`);
    assert.equal(snap(a), built, `${f[0]}: every joint exact after the stoop and the turn`);
  }
});
