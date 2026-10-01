import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import * as E from './elemental-roil.js';

const dt = 1 / 60;
function mon(name, symbol, color = 2) { const a = createCreature({name, symbol: symbol.charCodeAt(0), color}); a.species = name; return a; }
const alphas = p => [...p.geometry.attributes.color.array].filter((_, k) => k % 4 === 3);
const finite = p => p.geometry.attributes.position.array.every(Number.isFinite) && p.geometry.attributes.color.array.every(Number.isFinite);
const pose = a => [a.body, a.swirl, a.tail, a.crown].filter(Boolean).flatMap(o => o.rotation.toArray().slice(0, 3).concat(o.scale.toArray()));
const ELEMENTS = [['air elemental', 'air'], ['fire elemental', 'fire'], ['earth elemental', 'earth'], ['water elemental', 'water'], ['stalker', 'air']];

test('elementals roil; other creatures do not', () => {
  for (const [name, kind] of ELEMENTS) {
    const a = mon(name, 'E');
    assert.equal(a.element, kind, name);
    assert.ok(E.roils(a), name);
    assert.ok(E.updateElementalRoil(a, dt, 0, false), name);
  }
  for (const [name, s] of [['gnome', 'G'], ['water nymph', 'n'], ['fire ant', 'a']]) assert.equal(E.updateElementalRoil(mon(name, s), dt, 0, false), null, name);
});

test('the swirl and crown groups did not move the model', () => {
  for (const [name] of ELEMENTS) {
    const a = mon(name, 'E');
    a.g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(a.g);
    assert.ok(b.max.y > .9 && b.max.y < 1.5 && b.min.y > -.05, `${name} ${b.min.y} ${b.max.y}`);
    if (name.startsWith('fire') || name.startsWith('water')) assert.equal(a.crown.parent, a.body, name);
    else assert.equal(a.crown, undefined, name);
  }
});

test('the surge envelope stays in 0..1 and is 0 at both ends', () => {
  for (let u = -.1; u <= 1.1; u += .005) { const s = E.surgeAt(u); assert.ok(s >= 0 && s <= 1, `${u}`); }
  assert.equal(E.surgeAt(0), 0); assert.equal(E.surgeAt(1), 0);
  assert.ok(E.surgeAt(.5) > .99);
});

test('each element turns to the hero, surges, sheds its particles, flinches, lunges and rests after death', () => {
  for (const [name, kind] of ELEMENTS) {
    const a = mon(name, 'E');
    const hero = new THREE.Vector3(3, 0, 2);
    const rest = pose(a), restY = a.body.position.y;
    E.updateElementalRoil(a, 0, 0, false, hero);
    const st = a.elementalRoil;
    let t = 0, surges = 0, was = false, seen = 0, maxPitch = 0, maxYaw = 0, flinch = 0, lunge = 0, low = Infinity, high = -Infinity;
    for (let i = 0; i < 60 * 30; i++) {
      t += dt;
      a.body.position.y = restY; // live.js writes the bob first
      if (i === 60 * 20) a.actions = {current: {kind: 'hit'}};
      if (i === 60 * 20 + 10) a.actions = null;
      if (i === 60 * 22) a.actions = {current: {kind: 'attack'}, age: 0, u: .4};
      if (i === 60 * 22 + 20) a.actions = null;
      E.updateElementalRoil(a, dt, t, i % 600 > 540, hero);
      if (st.surge != null && !was) surges++;
      was = st.surge != null;
      assert.ok(finite(st.cloud), `${name} ${i}`);
      assert.ok(pose(a).every(Number.isFinite), `${name} ${i}`);
      seen = Math.max(seen, ...alphas(st.cloud));
      for (const m of st.motes) if (m.age < m.life) { low = Math.min(low, m.p.y); high = Math.max(high, m.p.y); assert.ok(Math.hypot(m.p.x, m.p.z) < 1.2, name); }
      maxPitch = Math.max(maxPitch, Math.abs(a.body.rotation.x - rest[0]));
      maxYaw = Math.max(maxYaw, Math.abs(a.body.rotation.y - rest[1]));
      if (i > 60 * 20 && i < 60 * 20 + 20) flinch = Math.min(flinch, a.body.rotation.x - rest[0]);
      if (i > 60 * 22 && i < 60 * 22 + 20) lunge = Math.max(lunge, a.body.rotation.x - rest[0]);
    }
    assert.ok(surges >= 2, `${name} surges ${surges}`);
    assert.ok(seen > .3, `${name} particles ${seen}`);
    assert.ok(low >= 0 && high < 2.2, `${name} particle height ${low} ${high}`);
    assert.ok(maxPitch < .45 && maxYaw <= E.TURN + .25, `${name} ${maxPitch} ${maxYaw}`);
    assert.ok(flinch < -.08 && lunge > .1, `${name} ${flinch} ${lunge}`);
    // it faces the hero (bearing ~.98 rad, clamped to TURN)
    a.actions = {dead: true};
    for (let i = 0; i < 60 * 6; i++) { t += dt; a.body.position.y = restY; E.updateElementalRoil(a, dt, t, false, hero); }
    const now = pose(a);
    rest.forEach((v, k) => assert.ok(Math.abs(now[k] - v) < 1e-6, `${name} ${k} ${now[k]} ${v}`));
    assert.ok(Math.abs(a.body.position.y - restY) < 1e-9, name);
    assert.ok(Math.max(...alphas(st.cloud)) === 0, `${name} particles left`);
  }
});

test('the funnel spins for air, and the fire crown flickers', () => {
  const air = mon('air elemental', 'E'), fire = mon('fire elemental', 'E');
  let t = 0, spun = 0, tall = 0, short = Infinity;
  for (let i = 0; i < 60 * 3; i++) {
    t += dt;
    const y0 = air.tail.rotation.y;
    E.updateElementalRoil(air, dt, t, true); E.updateElementalRoil(fire, dt, t, true);
    spun += Math.abs(Math.atan2(Math.sin(air.tail.rotation.y - y0), Math.cos(air.tail.rotation.y - y0)));
    tall = Math.max(tall, fire.crown.scale.y); short = Math.min(short, fire.crown.scale.y);
  }
  assert.ok(spun > 20, `${spun}`);
  assert.ok(tall - short > .15, `${tall} ${short}`);
});
