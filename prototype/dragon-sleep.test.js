import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue} from './actions.js';
import {updateDragonMenace, menaces, TRACK_RANGE} from './dragon-menace.js';
import {SETTLE, DOZE, WAKE, parts, sleepFor} from './dragon-sleep.js';
import {SLEEP_POSES} from './dragon-sleep-poses.js';
import {sleepPose} from './dragon-rest.js';

const D = 68, FPS = 30;
const dragon = (name = 'draken') => { const a = createCreature({name, symbol: D, color: 1}); a.actions = createActionQueue(); a.species = name; return a; };
// runs the frame for `secs` seconds as live.js would after its own writes
const run = (a, secs, {busy = false, walking = busy, look = null, t0 = 0} = {}) => { let r; for (let i = 0; i < secs * FPS; i++) r = updateDragonMenace(a, 1 / FPS, t0 + i / FPS, busy, walking, look); return r; };
const bones = a => Object.entries(a.joints).filter(([, o]) => o.isBone);
const rest = a => new Map(Object.entries(a.joints).map(([n, o]) => [n, o.rotation.clone()]));

test('an idle dragon dozes off into its baked sleeping pose within its settle time: wings fold first, then it lies down, then the head lowers', () => {
  const a = dragon(), before = rest(a), pose = sleepFor(a), body = a.body.position.y;
  assert(pose, 'the draken has a baked pose that passed');
  let r = run(a, SETTLE - .5);
  assert.equal(r.sleep, 0, 'still awake before the settle time');
  // part way: the wings are further along than the head
  r = run(a, .5 + DOZE * .45, {t0: SETTLE});
  const k = parts(r.sleep);
  assert(r.sleep > 0 && r.sleep < 1 && k.wings > k.head, `dozing: ${JSON.stringify(k)}`);
  r = run(a, DOZE, {t0: 20});
  assert.equal(r.sleep, 1, 'asleep');
  for (const [n, o] of bones(a)) for (const ax of ['x', 'y', 'z']) assert(Math.abs(o.rotation[ax] - (before.get(n)[ax] + (pose[n]?.[ax] || 0))) < 1e-9, `${n}.${ax} at its sleeping angle`);
  assert(Math.abs(a.body.position.y - (body + pose.body.y)) < 1e-9, 'the body lies down');
  for (const w of a.wings) assert(Math.abs(w.userData.inner.scale.x - pose[w.name + '_inner'].s) < 1e-9, 'the wings folded');
});

test('a dragon that keeps moving, acting or has the hero in range never dozes; and one with no passing pose never does', () => {
  for (const opts of [{busy: true}, {look: new THREE.Vector3(1, 0, 1)}]) {
    const a = dragon(), r = run(a, SETTLE + DOZE + 5, opts);
    assert.equal(r.sleep, 0, JSON.stringify(opts));
  }
  const hero = new THREE.Vector3(TRACK_RANGE * .5, 0, 0);
  assert.equal(run(dragon(), SETTLE + DOZE + 5, {look: hero}).sleep, 0, 'the hero in range keeps it awake');
  const lev = dragon('leviathan');
  assert(!SLEEP_POSES.leviathan.ok && sleepFor(lev) === null);
  assert.equal(run(lev, SETTLE + DOZE + 5).sleep, 0, 'the leviathan, whose coil does not pass yet, stays awake');
});

test('asleep, it does not mantle or lash; woken, it lifts its head first and every joint goes back exactly to its awake value', () => {
  const a = dragon(), before = rest(a), body = a.body.position.y;
  let r = run(a, SETTLE + DOZE + 1);
  assert.equal(r.sleep, 1);
  for (let i = 0; i < 20 * FPS; i++) { r = updateDragonMenace(a, 1 / FPS, 30 + i / FPS, false, false, null); assert(!r.mantle && !r.lash, 'no mantle or lash in its sleep'); }
  // the hero comes close: the head lifts before the wings open
  const hero = new THREE.Vector3(1, 0, 1);
  r = run(a, WAKE * .3, {look: hero, t0: 60});
  const k = parts(r.sleep);
  assert(k.head < k.wings, `the head lifts first: ${JSON.stringify(k)}`);
  r = run(a, WAKE, {walking: true, busy: true, t0: 61});
  assert.equal(r.sleep, 0, 'awake');
  // what only the sleep writes is exactly back where it was
  for (const [n, o] of bones(a)) for (const ax of ['x', 'y', 'z']) assert.equal(o.rotation[ax], before.get(n)[ax], `${n}.${ax}`);
  assert.equal(a.body.position.y, body);
  assert.equal(a.tail.rotation.x, 0);
  for (const w of a.wings) assert.equal(w.userData.inner.scale.x, 1);
});

test('the baked poses cover every dragon, and the ones marked ok still hold: down on the floor, nothing through it, the tail\'s far half on the floor', () => {
  const names = JSON.parse(readFileSync(new URL('./tools/creature-names.json', import.meta.url))).filter(m => m.letter === 'D').map(m => m.name.toLowerCase());
  const v = new THREE.Vector3();
  for (const name of names) {
    const a = dragon(name); if (!menaces(a)) continue;
    assert(SLEEP_POSES[name], `${name} is baked (node tools/bake-dragon-sleep.mjs)`);
    if (!SLEEP_POSES[name].ok) continue;
    const r = run(a, SETTLE + DOZE + 1); assert.equal(r.sleep, 1, name);
    a.g.updateMatrixWorld(true);
    let low = Infinity; a.g.traverse(o => { if (!o.isMesh) return; if (o.isSkinnedMesh) o.skeleton.update(); const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i += 2) { v.fromBufferAttribute(p, i); if (o.isSkinnedMesh) o.applyBoneTransform(i, v); v.applyMatrix4(o.matrixWorld); low = Math.min(low, v.y); } });
    assert(low > -.015, `${name}: ${(low * 100).toFixed(1)} cm through the floor`);
    const tail = []; for (let i = 0; a.joints['tail' + i]; i++) tail.push(a.joints['tail' + i]);
    for (const b of tail.slice(Math.ceil(tail.length / 2))) assert(b.getWorldPosition(v).y < .16 * a.g.scale.x, `${name} ${b.name} on the floor`);
  }
  assert(Object.values(SLEEP_POSES).filter(e => e.ok).length >= 8, 'most adult forms sleep');
});

test('the baked draken still matches a fresh solve (re-bake after changing a dragon\'s body or the sleep goals)', () => {
  const a = createCreature({name: 'draken', symbol: D}), fresh = sleepPose(a, 'bake-check:draken').pose, baked = SLEEP_POSES.draken.pose;
  for (const [n, o] of Object.entries(fresh)) for (const [ax, val] of Object.entries(o)) assert(Math.abs(val - (baked[n]?.[ax] ?? (ax === 's' ? 1 : 0))) < 2e-3, `${n}.${ax}: baked ${baked[n]?.[ax]}, fresh ${val}`);
});
