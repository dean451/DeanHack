import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as S from './hezrou-slime.js';
import * as THREE from 'three';

const dt = 1 / 60;
function hezrou() { const a = createCreature({name: 'hezrou'}); a.species = 'hezrou'; return a; }
const alphas = p => [...p.geometry.attributes.color.array].filter((_, k) => k % 4 === 3);
const finite = p => p.geometry.attributes.position.array.every(Number.isFinite) && p.geometry.attributes.color.array.every(Number.isFinite);

test('only the hezrou slimes', () => {
  for (const name of ['nalfeshnee', 'ochre jelly', 'giant toad']) assert.equal(S.updateHezrouSlime(createCreature({name}), dt, 0, false, false), null, name);
  assert.ok(S.updateHezrouSlime(hezrou(), dt, 0, false, false));
});

test('helpers stay in bounds', () => {
  for (let u = 0; u <= 1; u += .01) { const b = S.belchPuff(u); assert.ok(b >= 0 && b <= 1); }
  assert.equal(S.belchPuff(.3), 0); assert.ok(S.belchPuff(.7) > .9);
  for (let T = 0; T < 30; T += .37) {
    const h = S.hazeAt([.3, .7, .5, .9], T);
    assert.ok(Math.hypot(h.x, h.z) < .6 && h.y > .2 && h.y < 1.15 && h.size > .3, JSON.stringify(h));
  }
});

test('the hezrou drips gobs that splat into a puddle, hangs in a haze, belches and sprays at a blow; rests after death', () => {
  const hz = hezrou();
  let t = 0, maxGobs = 0, landed = 0, haze = 0, belch = 0, maxWet = 0;
  for (let i = 0; i < 60 * 20; i++) {
    t += dt; updateFidget(hz, dt, t, false);
    const st = hz.hezrouSlime;
    assert.ok(finite(st.gobPts) && finite(st.hazePts));
    for (const o of st.gobs) if (o) { assert.ok(o.y >= .012 - 1e-9 && o.y < 1.5 && Math.hypot(o.x, o.z) < .8, JSON.stringify(o)); if (o.landed !== null) landed++; }
    maxGobs = Math.max(maxGobs, st.gobs.filter(Boolean).length);
    haze = Math.max(haze, ...alphas(st.hazePts));
    belch = Math.max(belch, st.belch);
    maxWet = Math.max(maxWet, st.wet);
    assert.ok(st.wet >= S.WET_MIN && st.wet <= 1);
    assert.ok(st.pool.scale.x > 0 && st.pool.scale.x <= S.POOL_R);
  }
  assert.ok(maxGobs > 0 && landed > 0, 'gobs fall and land');
  assert.ok(maxWet > S.WET0, `landing gobs spread the puddle (${maxWet})`);
  assert.ok(haze > S.HAZE_ALPHA * .7 && haze <= S.BELCH_ALPHA + 1e-6, `haze ${haze}`);
  assert.ok(belch > .5, `a gurgle's belch spews haze (${belch})`);

  // walking dries the puddle back fast
  const st = hz.hezrouSlime;
  st.wet = 1;
  for (let i = 0; i < 60 * 3; i++) { t += dt; updateFidget(hz, dt, t, true); }
  assert.ok(st.wet < .3, `walking dries it (${st.wet})`);

  // a blow travelling +x flings gobs on toward +x (the group isn't turned)
  st.gobs.fill(null);
  hz.actions = {current: {kind: 'hit', dir: [1, 0]}, age: 0, queue: [], dead: false};
  t += dt; updateFidget(hz, dt, t, true);
  const spray = st.gobs.filter(Boolean);
  assert.ok(spray.length >= S.SPRAY);
  hz.actions = {current: null, age: 0, queue: [], dead: false};
  for (let i = 0; i < 20; i++) { t += dt; updateFidget(hz, dt, t, false); }
  const mx = spray.reduce((s, o) => s + o.x, 0) / spray.length;
  assert.ok(mx > .1, `the spray flies away from the attacker (${mx})`);

  // death: nothing new drips, the haze thins away, the puddle stays
  hz.actions = {current: null, age: 0, queue: [], dead: true};
  for (let i = 0; i < 60 * 4; i++) { t += dt; updateFidget(hz, dt, t, false); }
  const wet = st.wet;
  for (let i = 0; i < 60 * 4; i++) { t += dt; updateFidget(hz, dt, t, false); }
  assert.equal(st.gobs.filter(Boolean).length, 0, 'no gobs after death');
  assert.equal(Math.max(...alphas(st.hazePts)), 0, 'the haze is gone');
  assert.equal(st.wet, wet, 'the puddle stays');
});

test('the print mask and fades stay in bounds', () => {
  for (let u = -1; u <= 1; u += .05) for (let w = -1; w <= 1; w += .05) { const m = S.printMask(u, w); assert.ok(m >= 0 && m <= 1.01, `${u},${w}: ${m}`); }
  assert.ok(S.printMask(0, -.42) > .65, 'heel pad'); assert.ok(S.printMask(0, .38) > .65, 'middle toe');
  assert.ok(S.printMask(.95, -.95) < .05 && S.printMask(-.95, -.95) < .05, 'empty corners');
  for (let age = -1; age < 10; age += .05) { const f = S.printFade(age); assert.ok(f >= 0 && f <= 1); }
  assert.equal(S.printFade(0), 0); assert.ok(S.printFade(1) > .99); assert.equal(S.printFade(S.PRINT_LIFE), 0);
  assert.ok(S.printStrength(1) > .99 && Math.abs(S.printStrength(S.WET_MIN) - .45) < 1e-9);
});

test('walking leaves wet prints that stay put on the floor, alternate feet, dry away; a jump or death leaves none', () => {
  const hz = hezrou(), parent = new THREE.Group();
  parent.position.set(3, 0, -2); parent.add(hz.g);
  let t = 0;
  const step = (walk, dx = 0, dz = 0) => { hz.g.position.x += dx; hz.g.position.z += dz; t += dt; updateFidget(hz, dt, t, walk); };
  const live = st => st.prints.filter(Boolean);
  // where a print's quad sits in the world, read back from the mesh
  const quadWorld = (st, i) => {
    const pos = st.printMesh.geometry.attributes.position, c = new THREE.Vector3();
    for (let k = 0; k < 4; k++) c.add(new THREE.Vector3().fromBufferAttribute(pos, i * 4 + k));
    return st.printMesh.localToWorld(c.multiplyScalar(.25));
  };
  for (let i = 0; i < 30; i++) step(false);
  const st = hz.hezrouSlime;
  assert.equal(live(st).length, 0, 'standing leaves no prints');

  // walk 1.2 east, turned that way
  hz.g.rotation.y = Math.PI / 2;
  for (let i = 0; i < 60; i++) step(true, .02);
  const first = live(st);
  assert.ok(first.length >= 3 && first.length <= 5, `about one print per ${S.STEP} (${first.length})`);
  for (let i = 1; i < first.length; i++) assert.equal(first[i].foot, -first[i - 1].foot, 'the feet alternate');
  assert.ok(first[0].strength > first.at(-1).strength, 'the first prints off the puddle are wettest');
  for (const p of first) assert.ok(Math.abs(Math.abs(p.z - (-2)) - S.FOOT_X) < .03, `beside the path (${p.z})`);
  const i0 = st.prints.indexOf(first[0]), w0 = quadWorld(st, i0);
  assert.ok(Math.hypot(w0.x - first[0].x, w0.z - first[0].z) < 1e-4 && Math.abs(w0.y - first[0].y) < 1e-4, 'the quad sits on its spot');

  // walk on north, turning: the old prints don't move with it
  hz.g.rotation.y = 0;
  for (let i = 0; i < 40; i++) step(true, 0, .02);
  const w1 = quadWorld(st, i0);
  assert.ok(w1.distanceTo(w0) < 1e-4, `the print stays where it was trodden (${w1.distanceTo(w0)})`);
  const pos = st.printMesh.geometry.attributes.position.array, col = st.printMesh.geometry.attributes.color.array;
  assert.ok(pos.every(Number.isFinite) && col.every(Number.isFinite));
  assert.ok(Math.max(...[...col].filter((_, k) => k % 4 === 3)) <= S.PRINT_ALPHA + 1e-6);

  // a jump (teleport) treads nothing on the way
  const before = live(st).length;
  step(true, 4);
  assert.equal(live(st).length, before, 'no prints across a jump');

  // they dry away
  for (let i = 0; i < 60 * (S.PRINT_LIFE + .5); i++) step(false);
  assert.equal(live(st).length, 0, 'all dried');
  assert.equal(Math.max(...[...st.printMesh.geometry.attributes.color.array].filter((_, k) => k % 4 === 3)), 0);

  // a dead one slid along leaves none
  hz.actions = {current: null, age: 0, queue: [], dead: true};
  for (let i = 0; i < 60; i++) step(true, .02);
  assert.equal(live(st).length, 0, 'no prints after death');
});
