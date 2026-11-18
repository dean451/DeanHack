import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {createGoblin} from './goblin.js';
import {SETTLE, SETTLING, RISE, NEAR} from './insect-settle.js';
import {updateNagaSettle, restFor, PIVOT_Z} from './naga-settle.js';
import {updateInsectSettle} from './insect-settle.js';
import {updateCockatriceSettle} from './cockatrice-settle.js';
import {updateCanineSettle} from './canine-settle.js';
import {updateWildcatSettle} from './wildcat-settle.js';
import {updateImpSettle} from './imp-settle.js';
import {updateKoboldSettle} from './kobold-settle.js';
import {updateQuadrupedSettle} from './quadruped-settle.js';
import {updateRatSettle} from './rat-settle.js';
import {updateHumanoidSettle} from './humanoid-settle.js';
import {updateGnomeSettle} from './gnome-settle.js';
import {updateKopSettle} from './kop-settle.js';
import {updateLichSettle} from './lich-settle.js';
import {updateMummySettle} from './mummy-settle.js';
import {tailSway} from './tail-sway.js';
import {updateSlither} from './slither.js';
import {REST_POSES} from './naga-rest-poses.js';
import {restPose, coilRings, coilTop} from './naga-rest.js';
import {rolesOf} from './body-roles.js';

// Stage 5 of the creature plan for the nagas (family N), step 1: the brooding rest in play.
const NAMES = ['red', 'black', 'golden', 'guardian', 'white'].flatMap(k => [`${k} naga`, `${k} naga hatchling`]);
const make = name => { const a = createCreature({name, symbol: 78}); a.species = name; a.g.updateMatrixWorld(true); return a; };
const snap = a => JSON.stringify([Object.values(a.joints).map(o => o.rotation.toArray().slice(0, 3)), a.tail.rotation.toArray().slice(0, 3), a.body.position.toArray()]);
const run = (a, secs, busy = false, look = null) => { let p = 0; for (let i = 0; i < Math.round(secs * 20); i++) p = updateNagaSettle(a, .05, busy, look); return p; };
const mouthY = a => { a.g.updateMatrixWorld(true); return rolesOf(a).mouth().y; };
const OTHERS = [updateInsectSettle, updateCockatriceSettle, updateCanineSettle, updateWildcatSettle, updateImpSettle, updateKoboldSettle,
  updateQuadrupedSettle, updateRatSettle, updateHumanoidSettle, updateGnomeSettle, updateKopSettle, updateLichSettle, updateMummySettle];

test('every naga and hatchling has a baked rest that met every goal, so none is solved mid-play; a goblin or cobra is not one', () => {
  for (const name of NAMES) { assert(REST_POSES[name]?.ok, `${name} is baked and ok (node tools/bake-naga-rest.mjs)`); assert(restFor(make(name)), name); }
  const g = createGoblin('goblin'); g.species = 'goblin';
  assert.equal(restFor(g), null); assert.equal(updateNagaSettle(g, .05, false), 0);
  const c = createCreature({name: 'cobra', symbol: 83}); c.species = 'cobra';
  assert.equal(restFor(c), null); assert.equal(updateNagaSettle(c, .05, false), 0);
});

test('the baked rests still match a fresh solve (re-bake after changing a naga or the goals)', () => {
  for (const name of NAMES) {
    const fresh = restPose(make(name)).pose, baked = REST_POSES[name].pose;
    for (const [j, o] of Object.entries(fresh)) if (typeof o === 'object') for (const [ax, v] of Object.entries(o)) assert(Math.abs(v - (baked[j]?.[ax] ?? 0)) < 2e-3, `${name} ${j}.${ax}`);
  }
});

test('left alone it lets its neck down onto the coil after the wait, and not before; no other settle takes it', () => {
  for (const name of NAMES) {
    const a = make(name), built = snap(a), up = mouthY(a);
    assert.equal(run(a, SETTLE - .5), 0, name); assert.equal(snap(a), built, `${name}: untouched while waiting`);
    assert.equal(run(a, SETTLING + 1), 1, name);
    assert(mouthY(a) < up - .05 * a.g.scale.x, `${name}: the head came down off the rear (${up.toFixed(2)} to ${mouthY(a).toFixed(2)})`);
    const b = make(name), still = snap(b);
    for (let i = 0; i < 400; i++) for (const f of OTHERS) assert.equal(f(b, .05, false), 0, `${name}: ${f.name}`);
    assert.equal(snap(b), still, `${name}: no second rest from another settle`);
  }
});

test('never while moving, acting or dead: the wait starts over', () => {
  const a = make(NAMES[0]); run(a, SETTLE - 1);
  assert.equal(run(a, 5, true), 0); assert.equal(run(a, SETTLE - 1), 0, 'the wait began again');
  const c = make(NAMES[0]), built = snap(c); c.actions = {dead: true};
  assert.equal(run(c, SETTLE + SETTLING + 1), 0, 'not once dead'); assert.equal(snap(c), built);
});

test('a hero close by keeps it reared; a far one does not', () => {
  const a = make('red naga'), p = a.g.position, near = {x: p.x + NEAR - 1, z: p.z}, far = {x: p.x + NEAR + 3, z: p.z};
  assert.equal(run(a, SETTLE + SETTLING + 1, false, near), 0);
  assert.equal(run(a, SETTLE + SETTLING + 1, false, far), 1);
});

test('waking, also mid-settle, returns every joint, the neck pivot and the body exactly to the awake values', () => {
  for (const name of NAMES) {
    const a = make(name), built = snap(a);
    run(a, SETTLE + SETTLING + 1); assert.notEqual(snap(a), built, name);
    assert.equal(run(a, RISE + 1, true), 0, name); assert.equal(snap(a), built, `${name}: back exactly`);
    run(a, SETTLE + SETTLING / 2); const mid = updateNagaSettle(a, 0, false); assert(mid > 0 && mid < 1, name);
    run(a, RISE + 1, true); assert.equal(snap(a), built, `${name}: back exactly from mid-settle`);
  }
});

test('under the frame\'s neck sway and slither the chin stays on the coil, and waking leaves the pivot to the sway', () => {
  for (const name of ['red naga', 'white naga', 'red naga hatchling']) {
    const a = make(name), s = a.g.scale.x;
    assert.equal(a.tail.rotation.z, PIVOT_Z, `${name}: the neck pivot is built unturned`);
    const rings = coilRings(a);
    let t = 0, rested = 0, worstPivot = 0, worstChin = 0;
    // the order live-frame.js runs them in: the sway, the slither, then the settle last
    const frame = busy => { t += .05; a.tail.rotation.z = tailSway(a, t); updateSlither(a, .05, t, false); const p = updateNagaSettle(a, .05, busy); return p; };
    for (let i = 0; i < Math.round((SETTLE + SETTLING + 20) * 20); i++) if (frame(false) === 1) {
      rested++; worstPivot = Math.max(worstPivot, Math.abs(a.tail.rotation.z - PIVOT_Z));
      a.g.updateMatrixWorld(true); const c = rolesOf(a).chin(), top = coilTop(rings, c);
      assert(top !== null, `${name}: the chin over the coil`); worstChin = Math.max(worstChin, Math.abs(c.y - top));
    }
    assert(rested > 300, `${name}: it lay still a while`);
    assert(worstPivot < 1e-9, `${name}: the sway did not roll the laid neck (${worstPivot})`);
    assert(worstChin < .03 * s, `${name}: the chin stays on the coil's scales (${worstChin.toFixed(3)} m)`);
    for (let i = 0; i < Math.round((RISE + 1) * 20); i++) frame(true);
    assert.equal(a.tail.rotation.z, tailSway(a, t), `${name}: awake, the pivot is the sway's own value`);
    assert.equal(a.nagaRest.p, 0, name);
  }
});

test('live-frame.js runs it in the actor loop, last, after the mummies\' settle', async () => {
  const {liveSource} = await import('./live-source.js'), src = liveSource();
  const call = src.indexOf('updateNagaSettle(a,dt,busy,heroLook(');
  assert(call > 0, 'called with the hero\'s look'); assert(call > src.indexOf('updateMummySettle(a,dt,busy,'), 'after the other settles');
});
