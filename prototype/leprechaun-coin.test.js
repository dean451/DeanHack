import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import * as L from './leprechaun-coin.js';

const dt = 1 / 60;
function mon(name, symbol, color = 2) { const a = createCreature({name, symbol: symbol.charCodeAt(0), color}); a.species = name; return a; }
const alphas = p => [...p.geometry.attributes.color.array].filter((_, k) => k % 4 === 3);
const finite = p => p.geometry.attributes.position.array.every(Number.isFinite) && p.geometry.attributes.color.array.every(Number.isFinite);
const pose = a => [a.body, a.head, a.hat, a.loot].flatMap(o => o.rotation.toArray().slice(0, 3)).concat(a.hat.position.y);

test('leprechauns flip coins; other creatures do not', () => {
  for (const [name, s] of [['leprechaun', 'l'], ['something', 'l']]) {
    const a = mon(name, s);
    assert.ok(L.flips(a), name);
    assert.ok(L.updateLeprechaunCoin(a, dt, 0, false), name);
  }
  for (const [name, s] of [['gnome', 'G'], ['water nymph', 'n'], ['troll', 'T']]) assert.equal(L.updateLeprechaunCoin(mon(name, s), dt, 0, false), null, name);
});

test('the head moved onto a neck pivot without moving the model', () => {
  const a = mon('leprechaun', 'l');
  a.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(a.g);
  assert.ok(Math.abs(b.max.y - .955) < .01 && Math.abs(b.min.y) < .01, `${b.min.y} ${b.max.y}`);
  assert.equal(a.hat.parent, a.head);
  assert.equal(a.loot, a.tail);
});

test('the flip pose stays in 0..1, the arc starts and ends at the hand and ends at zero', () => {
  for (let u = -.1; u <= 1.1; u += .005) for (const v of Object.values(L.flipPose(u))) assert.ok(v >= 0 && v <= 1, `${u}`);
  for (const v of Object.values(L.flipPose(1))) assert.equal(v, 0);
  assert.ok(L.flipPose(.44).h > .99 && L.flipPose(.73).snatch > .99 && L.flipPose(.84).chuckle > .99);
  assert.ok(L.coinAt(0).distanceTo(L.HAND) < 1e-9 && L.coinAt(1).distanceTo(L.HAND) < 1e-9);
  assert.ok(Math.abs(L.coinAt(.5).y - L.APEX_Y) < 1e-9);
});

test('he leers, flips and palms coins, hops his hat at a blow, darts to attack and rests after death', () => {
  const a = mon('leprechaun', 'l');
  const hero = new THREE.Vector3(2, 0, 2);
  const rest = pose(a);
  L.updateLeprechaunCoin(a, 0, 0, false, hero);
  const st = a.leprechaunCoin;
  let t = 0, flipsSeen = 0, palms = 0, was = false, coinTop = 0, spark = 0, hop = 0, aim = 0, dart = 0;
  for (let i = 0; i < 60 * 40; i++) {
    t += dt;
    if (i === 60 * 30) a.actions = {current: {kind: 'hit'}};
    if (i === 60 * 30 + 10) a.actions = null;
    if (i === 60 * 32) a.actions = {current: {kind: 'attack'}, age: 0, u: .4};
    if (i === 60 * 32 + 20) a.actions = null;
    L.updateLeprechaunCoin(a, dt, t, i % 600 > 540, hero);
    if (st.flip && !was) { flipsSeen++; if (st.flip.palm) palms++; }
    was = !!st.flip;
    if (st.coin.visible) {
      coinTop = Math.max(coinTop, st.coin.position.y);
      assert.ok(st.coin.position.distanceTo(L.HAND) < .8);
    }
    spark = Math.max(spark, ...alphas(st.cloud));
    hop = Math.max(hop, a.hat.position.y - st.hatY);
    dart = Math.max(dart, a.body.rotation.x - st.body.x);
    if (!st.flip) aim = Math.max(aim, Math.abs(a.head.rotation.y - st.head.y));
    assert.ok(finite(st.cloud) && pose(a).every(Number.isFinite) && st.coin.position.toArray().every(Number.isFinite));
    assert.ok(Math.abs(a.body.rotation.x - st.body.x) < .35 && Math.abs(a.body.rotation.z - st.body.z) < .1);
    assert.ok(Math.abs(a.head.rotation.x - st.head.x) < .6 && Math.abs(a.head.rotation.y - st.head.y) < 1.1);
    const p = st.cloud.geometry.attributes.position.array;
    for (let k = 0; k < p.length; k++) assert.ok(Math.abs(p[k]) < 1.6);
  }
  assert.ok(flipsSeen >= 4, `flips ${flipsSeen}`);
  assert.ok(palms >= 1 && palms < flipsSeen, `palms ${palms}/${flipsSeen}`);
  assert.ok(coinTop > .95, `coin top ${coinTop}`);
  assert.ok(spark > .5, `spark ${spark}`);
  assert.ok(hop > .05, `hop ${hop}`);
  assert.ok(dart > .15, `dart ${dart}`);
  assert.ok(aim > .5, `aim ${aim}`);
  // death: everything eases back to the rest pose
  a.actions = {dead: true};
  for (let i = 0; i < 60 * 6; i++) { t += dt; L.updateLeprechaunCoin(a, dt, t, true, hero); }
  pose(a).forEach((v, k) => assert.ok(Math.abs(v - rest[k]) < 1e-6, `${k}: ${v} vs ${rest[k]}`));
  assert.equal(st.coin.visible, false);
  assert.ok(alphas(st.cloud).every(v => v === 0));
});
