import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import * as W from './were-shudder.js';

const dt = 1 / 60;
function mon(name, symbol) { const a = createCreature({name, symbol: symbol.charCodeAt(0), color: 3}); a.species = name; return a; }
const alphas = p => [...p.geometry.attributes.color.array].filter((_, k) => k % 4 === 3);
const finite = p => p.geometry.attributes.position.array.every(Number.isFinite) && p.geometry.attributes.color.array.every(Number.isFinite);
const parts = a => [a.body, a.head, a.tail, ...(W.wereForm(a) === 'man' ? a.arms : [])].filter(Boolean);
const pose = a => [...parts(a).flatMap(o => o.rotation.toArray().slice(0, 3)), ...a.body.scale.toArray()];

test('weres shudder in both forms; their plain cousins do not', () => {
  for (const [name, s] of [['werejackal', 'd'], ['werewolf', 'd'], ['wererat', 'r']]) {
    assert.equal(W.wereForm(mon(name, s)), 'beast', name);
    assert.equal(W.wereForm(mon(name, '@')), 'man', `${name} @`);
    assert.ok(W.updateWereShudder(mon(name, s), dt, 0, false), name);
  }
  for (const [name, s] of [['jackal', 'd'], ['wolf', 'd'], ['sewer rat', 'r'], ['human', '@']]) assert.equal(W.updateWereShudder(mon(name, s), dt, 0, false), null, name);
});

test('the shudder pose stays in 0..1 and ends at zero', () => {
  for (let u = -.1; u <= 1.1; u += .005) for (const v of Object.values(W.shudderPose(u))) assert.ok(v >= 0 && v <= 1, `${u}`);
  for (const v of Object.values(W.shudderPose(1))) assert.equal(v, 0);
  const p = W.shudderPose(.4), q = W.shudderPose(.82);
  assert.ok(p.fit > .99 && p.crouch > .99 && q.howl > .99);
});

for (const [name, s] of [['werewolf', 'd'], ['wererat', 'r'], ['werejackal', '@']]) {
  test(`a ${name} (${s}) stalks, shudders after a blow, sheds fur and rests after death`, () => {
    const a = mon(name, s);
    const hero = new THREE.Vector3(2, 0, 2);
    const rest = pose(a);
    W.updateWereShudder(a, 0, 0, false, hero);
    const st = a.wereShudder;
    let t = 0, shudders = 0, was = false, fur = 0, roll = 0, throwBack = 0, aim = 0, eyes = 1, clutch = 0;
    for (let i = 0; i < 60 * 30; i++) {
      t += dt;
      if (i === 60 * 20) a.actions = {current: {kind: 'hit'}};
      if (i === 60 * 20 + 10) a.actions = null;
      W.updateWereShudder(a, dt, t, i < 60 * 20 && i % 300 < 60, hero);
      if (st.sh && !was) shudders++;
      was = !!st.sh;
      fur = Math.max(fur, ...alphas(st.cloud));
      assert.ok(finite(st.cloud) && pose(a).every(Number.isFinite));
      roll = Math.max(roll, Math.abs(a.body.rotation.z - st.body.z));
      assert.ok(Math.abs(a.body.rotation.x - st.body.x) < .35 && roll < .2);
      assert.ok(a.body.scale.toArray().every((v, k) => Math.abs(v / st.scale.getComponent(k) - 1) < .15));
      if (a.head) {
        throwBack = Math.min(throwBack, a.head.rotation.x - st.head.x);
        if (!st.sh) aim = Math.max(aim, a.head.rotation.y - st.head.y);
        assert.ok(Math.abs(a.head.rotation.y - st.head.y) < 1.3);
      }
      if (st.eyes) eyes = Math.max(eyes, st.eyes.scale.x / st.eyeScale.x);
      if (st.arms) clutch = Math.min(clutch, ...a.arms.map((arm, k) => arm.rotation.x - st.arms[k].x));
      // tufts stay near the body
      const p = st.cloud.geometry.attributes.position.array;
      for (let k = 0; k < p.length; k++) assert.ok(Math.abs(p[k]) < 1.6);
    }
    assert.ok(shudders >= 2 && shudders <= 6, `${shudders}`);
    assert.ok(fur > .5 && roll > .05, `${fur} ${roll}`);
    // the howl, the stalking head and the eye flare are the beast's; the man (were-man.js) has a
    // head and eyes the shudder leaves be
    const beast = W.wereForm(a) === 'beast';
    if (a.head && beast) assert.ok(throwBack < -.4 && aim > .4, `${throwBack} ${aim}`);
    if (st.eyes && beast) assert.ok(eyes > 1.4);
    if (st.arms) assert.ok(clutch < -.9);
    // death: back to the exact rest pose and the last tufts gone
    a.actions = {dead: true};
    for (let i = 0; i < 60 * 6; i++) { t += dt; W.updateWereShudder(a, dt, t, false, hero); }
    assert.equal(st.life, 0);
    pose(a).forEach((v, k) => assert.ok(Math.abs(v - rest[k]) < 1e-9, `${k}: ${v} vs ${rest[k]}`));
    assert.ok(alphas(st.cloud).every(v => v === 0));
    assert.equal(st.sh, null);
  });
}

test('one cloud per were; a blow mid-shudder does not restart it', () => {
  const a = mon('werewolf', 'd');
  for (let i = 0; i < 5; i++) W.updateWereShudder(a, dt, i * dt, false);
  assert.equal(a.body.children.filter(c => c.userData.part === 'wereTufts').length, 1);
  const st = a.wereShudder;
  st.sh = {u: .5};
  a.actions = {current: {kind: 'hit'}};
  W.updateWereShudder(a, dt, 1, true);
  assert.equal(st.pending, -1);
  assert.ok(st.sh.u > .5);
});
